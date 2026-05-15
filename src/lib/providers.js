// src/lib/providers.js
//
// Engine v1.6.12 · Pattern F — Fallback Provider Chain
//
// Activates via Pattern E hooks. When Anthropic returns 529/503 (overloaded)
// or a network error after retries are exhausted, the chain rotates:
//
//     anthropic  →  openrouter (Claude proxy)  →  openai (GPT-5)
//
// Each provider implementation exposes:
//   - id           · string identifier
//   - configured() · returns true if its API key / env var is set
//   - call({apiKey,system,userMessage,opts}) → Promise<rawData>
//   - normalize(rawData) → anthropic-shaped { content, stop_reason, ... }
//
// `normalize` solves the stop_reason mismatch noted in Known Issue #10:
//   - Anthropic:   end_turn / max_tokens / tool_use
//   - OpenAI/OR:   stop / length / tool_calls
//   `extractJSON()` and the TRUNCATED check downstream assume the Anthropic
//   shape, so every provider's output is normalized to that shape here.
//
// Hook registration happens in `installFallbackChain()` below. Call it once
// at app boot (or on demand) to wire the chain. Behavior is idempotent.

import { registerHook, _internalCallAnthropic } from "./anthropic.js";

// ─────────────────────────────────────────────────────────────
// Retry knobs
// ─────────────────────────────────────────────────────────────
const RETRY_STATUSES = new Set([429, 500, 502, 503, 504, 529]);
const MAX_RETRIES = 2;                  // 3 total attempts including initial
const BASE_BACKOFF_MS = 800;             // 0.8s, then 1.6s, then 3.2s

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────
// Provider definitions
// ─────────────────────────────────────────────────────────────

const ANTHROPIC = {
  id: "anthropic",
  configured: () => true,    // primary · always available if apiKey set
  call: ({ apiKey, system, userMessage, opts }) =>
    _internalCallAnthropic({ apiKey, system, userMessage, opts }),
  normalize: (data) => data,    // already anthropic-shaped
};

const OPENROUTER = {
  id: "openrouter",
  configured: () => !!import.meta.env.VITE_OPENROUTER_API_KEY,
  async call({ system, userMessage, opts }) {
    const key = import.meta.env.VITE_OPENROUTER_API_KEY;
    const model = import.meta.env.VITE_OPENROUTER_MODEL || "anthropic/claude-sonnet-4";
    const body = {
      model,
      max_tokens: opts?.maxTokens || 4000,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMessage },
      ],
    };
    if (opts?.tools) body.tools = opts.tools;

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        // Help OpenRouter route correctly
        "HTTP-Referer": "https://github.com/gazette1/oditool",
        "X-Title": "Alchemical Growth Engine",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const e = new Error(`OpenRouter ${res.status}: ${err.error?.message || res.statusText}`);
      e.status = res.status;
      e.provider = "openrouter";
      throw e;
    }
    return res.json();
  },
  normalize(data) {
    // OpenRouter uses OpenAI-compatible shape
    const choice = data?.choices?.[0];
    if (!choice) return { content: [], stop_reason: "end_turn" };
    return {
      content: [{ type: "text", text: choice.message?.content || "" }],
      stop_reason: _normalizeOpenAIStopReason(choice.finish_reason),
      // Preserve original for debugging
      _provider: "openrouter",
      _raw: data,
    };
  },
};

const OPENAI = {
  id: "openai",
  configured: () => !!import.meta.env.VITE_OPENAI_API_KEY,
  async call({ system, userMessage, opts }) {
    const key = import.meta.env.VITE_OPENAI_API_KEY;
    const model = import.meta.env.VITE_OPENAI_FALLBACK_MODEL || "gpt-4o-mini";
    const body = {
      model,
      max_tokens: opts?.maxTokens || 4000,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMessage },
      ],
    };
    // OpenAI ignores Anthropic-style tools; skip them in the fallback path.
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const e = new Error(`OpenAI ${res.status}: ${err.error?.message || res.statusText}`);
      e.status = res.status;
      e.provider = "openai";
      throw e;
    }
    return res.json();
  },
  normalize(data) {
    const choice = data?.choices?.[0];
    if (!choice) return { content: [], stop_reason: "end_turn" };
    return {
      content: [{ type: "text", text: choice.message?.content || "" }],
      stop_reason: _normalizeOpenAIStopReason(choice.finish_reason),
      _provider: "openai",
      _raw: data,
    };
  },
};

// OpenAI-style stop reasons → Anthropic-style
function _normalizeOpenAIStopReason(finishReason) {
  const map = {
    stop: "end_turn",
    length: "max_tokens",
    tool_calls: "tool_use",
    content_filter: "end_turn",   // closest approximation
    function_call: "tool_use",
  };
  return map[finishReason] || "end_turn";
}

const CHAIN = [ANTHROPIC, OPENROUTER, OPENAI];

export function getProviderChain() {
  return CHAIN.filter((p) => p.configured());
}

// ─────────────────────────────────────────────────────────────
// installFallbackChain() · the one-line wire-up for the app
// ─────────────────────────────────────────────────────────────
let _installed = false;

export function installFallbackChain({ onProviderSwitch, onRetry } = {}) {
  if (_installed) return;
  _installed = true;

  // Single post-hook that handles BOTH retry (same provider) AND fallback
  // (next provider in chain). Returning a new result tells callClaude to
  // use it instead of throwing the original error.
  registerHook("post_llm_call", async (result) => {
    if (!result.error) return result;

    const status = result.error?.status;
    const isRetryable = RETRY_STATUSES.has(status) || /network|fetch/i.test(result.error.message || "");
    if (!isRetryable) return result;

    // Retry on the SAME provider first
    const currentProviderId = result.provider || "anthropic";
    const currentProvider = CHAIN.find((p) => p.id === currentProviderId) || ANTHROPIC;
    let lastErr = result.error;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const wait = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
      onRetry?.({ provider: currentProvider.id, attempt, wait_ms: wait, error: lastErr.message });
      // eslint-disable-next-line no-console
      console.warn(`[Pattern F] retry ${attempt}/${MAX_RETRIES} on ${currentProvider.id} after ${wait}ms · ${lastErr.message}`);
      await sleep(wait);
      try {
        const raw = await currentProvider.call(result);
        const data = currentProvider.normalize(raw);
        return { ...result, data, error: null, attempt: attempt + 1 };
      } catch (e) {
        lastErr = e;
      }
    }

    // All same-provider retries exhausted · rotate to the next configured provider
    const idx = CHAIN.findIndex((p) => p.id === currentProvider.id);
    const fallbacks = CHAIN.slice(idx + 1).filter((p) => p.configured());

    for (const next of fallbacks) {
      onProviderSwitch?.({ from: currentProvider.id, to: next.id, error: lastErr.message });
      // eslint-disable-next-line no-console
      console.warn(`[Pattern F] rotating ${currentProvider.id} → ${next.id} · last error: ${lastErr.message}`);
      try {
        const raw = await next.call(result);
        const data = next.normalize(raw);
        return { ...result, data, error: null, provider: next.id };
      } catch (e) {
        lastErr = e;
      }
    }

    // Every provider failed · surface the last error
    return { ...result, error: lastErr };
  });

  // eslint-disable-next-line no-console
  console.info(`[Pattern F] fallback chain installed · providers: ${getProviderChain().map((p) => p.id).join(" → ")}`);
}

export function isFallbackInstalled() {
  return _installed;
}
