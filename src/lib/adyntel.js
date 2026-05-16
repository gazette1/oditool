// src/lib/adyntel.js
//
// Engine v1.8 scaffold · Adyntel third-party ad-library API client.
//
// Adyntel is the canonical Stage B source for the Ad-Intel pipeline as of
// the v1.8 spec amendment (2026-05-16). See full spec:
//   <vault>/08a - Ad-Intel Stage B Spec (v2 · Adyntel Canonical).md
//
// Service: https://platform.adyntel.com · docs: https://docs.adyntel.com
// Base URL: https://api.adyntel.com
//
// Auth: `email` + `api_key` sent as request body fields (NOT a header).
// Both required on every call. The email MUST match the account that owns
// the API key. Configure both in the user's `.env.local` or Config drawer:
//   VITE_ADYNTEL_API_KEY=hd-…
//   VITE_ADYNTEL_EMAIL=user@example.com   ← user-supplied at session start
//
// Credit model: Adyntel exposes NO credit-balance endpoint. The client
// tracks credits LOCALLY by decrementing from documented per-endpoint
// costs after each successful call. Source of truth for billing remains
// the Adyntel dashboard. Local counter exists for the v1.8 spec's
// debug-log requirement (AC #8).
//
// Endpoints + credit costs (from docs.adyntel.com as of 2026-05-16):
//   POST /facebook                  · 1 cr · Meta page or domain
//   POST /google                    · 1 cr · Google Ads by domain
//   POST /linkedin                  · 1 cr · LinkedIn page or domain
//   POST /tiktok_search             · 1 cr (assumed · docs unclear)
//   POST /tiktok_ad_details         · 1 cr (assumed · docs unclear)
//   POST /facebook_ad_search        · 1 cr (assumed · docs unclear)
//   POST /linkedin-keyword-search   · 1 cr (assumed · docs unclear)
//   POST /domain-keywords           · 2 cr
//   POST /google_shopping           · 1 or 2 cr (2 if shopping=true)
//   GET  /google_shopping_status    · 0 cr · used for validation workaround
//
// Async jobs: `/facebook`, `/google`, `/linkedin`, `/google_shopping` may
// return `JobStartedResponse {status, jobId}` for large queries. Client
// detects this shape and polls with `continuation_token` until ready or
// 60s timeout.
//
// Validation: no 0-cost validation endpoint exists. The `validateKey()`
// method pings `GET /google_shopping_status` with a bogus id. 401 means
// invalid auth; 400/other means auth passed (just a bad id). See AC #9
// in the spec.

const ADYNTEL_BASE = "https://api.adyntel.com";

// Documented per-endpoint credit costs. Used by the LOCAL credit counter
// (Adyntel does not return remaining credits in any response). Costs marked
// `null` are unknown from docs · the client assumes 1 and the user can
// reconcile against their dashboard.
export const ADYNTEL_COSTS = Object.freeze({
  "/facebook":                 1,
  "/google":                   1,
  "/linkedin":                 1,
  "/tiktok_search":            1, // assumed · docs unclear
  "/tiktok_ad_details":        1, // assumed · docs unclear
  "/facebook_ad_search":       1, // assumed · docs unclear
  "/linkedin-keyword-search":  1, // assumed · docs unclear
  "/domain-keywords":          2,
  "/google_shopping":          1, // 2 if shopping=true · handled in fetchGoogleShopping()
  "/google_shopping_status":   0,
});

// Platform priority within a single competitor (from spec §6).
// Meta has highest creative density per credit; Google ads are mostly
// text and offer lower value to multimodal Stage C eval.
export const PLATFORM_PRIORITY = ["facebook", "tiktok", "google"];

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 60_000;
const REQUEST_TIMEOUT_MS = 30_000;
const RETRY_BACKOFF_MS = [200, 1000];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Adyntel HTTP error · attaches `status`, `endpoint`, and parsed body
 * so callers can branch on 401/402/5xx without re-parsing.
 */
export class AdyntelError extends Error {
  constructor(message, { status, endpoint, body } = {}) {
    super(message);
    this.name = "AdyntelError";
    this.status = status || 0;
    this.endpoint = endpoint || "";
    this.body = body || null;
  }
}

/**
 * Run-level credit tracker. One instance per Stage B run. Tracks
 * cumulative cost, exposes a `wouldExceed()` cap check, and produces
 * the debug-log lines the spec requires.
 */
export class CreditCounter {
  constructor({ maxCreditsPerRun = 100, usdPerCredit = null } = {}) {
    this.used = 0;
    this.max = maxCreditsPerRun;
    this.usdPerCredit = usdPerCredit; // null = skip $ math in logs
  }
  charge(endpoint, multiplier = 1) {
    const base = ADYNTEL_COSTS[endpoint] ?? 1;
    this.used += base * multiplier;
  }
  wouldExceed(endpoint, multiplier = 1) {
    const base = ADYNTEL_COSTS[endpoint] ?? 1;
    return this.used + (base * multiplier) > this.max;
  }
  remaining() {
    return Math.max(0, this.max - this.used);
  }
  perCompetitorLine() {
    return `Ad-Intel · credits used this run: ${this.used} · remaining: ${this.remaining()} / ${this.max}`;
  }
  endOfRunLine() {
    const $ = (typeof this.usdPerCredit === "number" && this.usdPerCredit > 0)
      ? ` · ~$${(this.used * this.usdPerCredit).toFixed(2)}`
      : "";
    return `Ad-Intel complete · ${this.used} credits used${$}`;
  }
}

/**
 * Adyntel API client. Stateless across calls except for the auth tuple
 * passed at construction. Per-run state (credits, cache) lives in the
 * CreditCounter and the stageB wrapper that consumes this client.
 */
export class AdyntelClient {
  constructor({ apiKey, email, baseUrl = ADYNTEL_BASE } = {}) {
    if (!apiKey) throw new Error("AdyntelClient: apiKey is required");
    if (!email)  throw new Error("AdyntelClient: email is required (Adyntel auth requires both fields)");
    this.apiKey = apiKey;
    this.email = email;
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  /**
   * Validate the apiKey+email tuple WITHOUT consuming credits.
   * Adyntel doesn't publish a /me or /credits endpoint, so we ping
   * GET /google_shopping_status (documented free) with a bogus id.
   * 401 → invalid auth · 400/other → auth passed (just a bad id) → ✓.
   */
  async validateKey() {
    try {
      await this._request("/google_shopping_status", "GET", { id: "__validate__" });
      return { valid: true, reason: "auth_passed" };
    } catch (e) {
      if (e.status === 401) return { valid: false, reason: "invalid_credentials" };
      if (e.status === 400 || (e.status >= 400 && e.status < 500)) {
        // 400 typically means auth passed but request payload is bad.
        // Treat anything in the 4xx range that isn't 401 as "auth ok".
        return { valid: true, reason: "auth_passed_payload_rejected" };
      }
      // 5xx or network errors → can't confirm
      return { valid: false, reason: e.message || "unreachable", transient: e.status >= 500 };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Platform-specific fetchers (split per Adyntel API shape)
  // ─────────────────────────────────────────────────────────────

  /**
   * Meta (Facebook + Instagram) ads for a competitor.
   * Accepts either `facebook_url` or `company_domain` (Adyntel resolves
   * one to the other server-side). Returns the synchronous response or
   * polls a jobId to completion.
   */
  async fetchFacebookAds({ facebook_url, company_domain, country_code, media_type, all_ads = false }) {
    const body = { facebook_url, company_domain, country_code, media_type, all_ads };
    return this._requestAndMaybePoll("/facebook", body);
  }

  /** Google Ads for a competitor by domain. */
  async fetchGoogleAds({ company_domain, country_code, all_ads = false, extract_text = true }) {
    const body = { company_domain, country_code, all_ads, extract_text };
    return this._requestAndMaybePoll("/google", body);
  }

  /** LinkedIn Ads for a competitor by page id or domain. */
  async fetchLinkedInAds({ linkedin_page_id, company_domain, all_ads = false }) {
    const body = { linkedin_page_id, company_domain, all_ads };
    return this._requestAndMaybePoll("/linkedin", body);
  }

  /** TikTok ad-library keyword search (no per-competitor endpoint exists). */
  async searchTikTok({ keyword, country_code }) {
    return this._request("/tiktok_search", "POST", { keyword, country_code });
  }

  /** Details for a specific TikTok ad by id (from search results). */
  async fetchTikTokAdDetails({ id }) {
    return this._request("/tiktok_ad_details", "POST", { id });
  }

  /** Google Shopping ads by domain. shopping=true costs 2 credits, else 1. */
  async fetchGoogleShopping({ company_domain, shopping = false }) {
    const body = { company_domain, shopping };
    return this._requestAndMaybePoll("/google_shopping", body, { statusEndpoint: "/google_shopping_status" });
  }

  /** Paid + organic keyword counts for SEO competitive analysis. */
  async fetchDomainKeywords({ company_domain, language, limit }) {
    return this._request("/domain-keywords", "POST", { company_domain, language, limit });
  }

  // ─────────────────────────────────────────────────────────────
  // Internals
  // ─────────────────────────────────────────────────────────────

  /**
   * Single HTTP call with retry on 5xx + structured error throws.
   * Auth fields are merged into every request body / query string.
   */
  async _request(endpoint, method = "POST", payload = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const auth = { email: this.email, api_key: this.apiKey };
    const merged = { ...auth, ...payload };

    let lastErr;
    const attempts = [0, ...RETRY_BACKOFF_MS];
    for (const delay of attempts) {
      if (delay) await sleep(delay);
      try {
        let res;
        if (method === "GET") {
          const qs = new URLSearchParams(
            Object.entries(merged).filter(([, v]) => v !== undefined && v !== null)
          ).toString();
          res = await this._fetchWithTimeout(`${url}?${qs}`, { method });
        } else {
          res = await this._fetchWithTimeout(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(merged),
          });
        }

        const text = await res.text();
        let parsed = null;
        try { parsed = text ? JSON.parse(text) : null; } catch { parsed = { _raw: text }; }

        if (res.ok) return parsed;

        // Retry only on 5xx · 4xx is permanent (auth/payload error)
        if (res.status >= 500) {
          lastErr = new AdyntelError(`Adyntel ${res.status} at ${endpoint}`, {
            status: res.status, endpoint, body: parsed,
          });
          continue; // retry
        }
        throw new AdyntelError(parsed?.error || parsed?.message || `Adyntel ${res.status}`, {
          status: res.status, endpoint, body: parsed,
        });
      } catch (e) {
        if (e instanceof AdyntelError && e.status < 500) throw e;
        lastErr = e instanceof AdyntelError ? e : new AdyntelError(e.message, { status: 0, endpoint });
      }
    }
    throw lastErr || new AdyntelError("Adyntel: exhausted retries", { status: 0, endpoint });
  }

  /**
   * Wraps `_request` with the JobStartedResponse polling pattern.
   * If the response includes a `jobId`, poll the same endpoint with
   * `continuation_token` (or a separate `statusEndpoint` for shopping)
   * until ready or 60s timeout.
   */
  async _requestAndMaybePoll(endpoint, payload, { statusEndpoint = null } = {}) {
    const first = await this._request(endpoint, "POST", payload);
    if (!first || typeof first !== "object") return first;

    // JobStartedResponse shape: { status, jobId } (sometimes also `continuation_token`)
    const jobId = first.jobId || first.job_id || null;
    if (!jobId) return first;

    const started = Date.now();
    let continuation = first.continuation_token || null;
    while (Date.now() - started < POLL_TIMEOUT_MS) {
      await sleep(POLL_INTERVAL_MS);
      let pollRes;
      if (statusEndpoint) {
        pollRes = await this._request(statusEndpoint, "GET", { id: jobId });
      } else {
        pollRes = await this._request(endpoint, "POST", {
          ...payload,
          ...(continuation ? { continuation_token: continuation } : {}),
          jobId,
        });
      }
      if (pollRes && (pollRes.ads || pollRes.is_last_page || pollRes.total_ad_count !== undefined)) {
        return pollRes;
      }
      if (pollRes && pollRes.continuation_token) continuation = pollRes.continuation_token;
    }
    throw new AdyntelError(`Adyntel: poll timeout after ${POLL_TIMEOUT_MS}ms`, {
      status: 408, endpoint, body: { jobId },
    });
  }

  async _fetchWithTimeout(url, init = {}) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(url, { ...init, signal: ctrl.signal });
    } finally {
      clearTimeout(t);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Cache helpers (Airtable-backed · 24h default TTL)
// ─────────────────────────────────────────────────────────────

/**
 * Check whether a fresh AdIntel response already exists for a competitor.
 * Used before each fetch to skip the API call (and credit charge) when
 * the cached row is younger than the TTL. Defaults match the spec.
 *
 * @param {object} args
 * @param {object} args.airtable  AirtableClient instance
 * @param {string} args.projectId
 * @param {string} args.swipePageId  natural key for the competitor's Swipe Page row
 * @param {number} args.ttlHours   default 24
 * @returns {Promise<{hit: boolean, ads: Array, age_h: number} | null>}
 */
export async function checkCachedAds({ airtable, projectId, swipePageId, ttlHours = 24 }) {
  if (!airtable || !projectId || !swipePageId || ttlHours <= 0) return { hit: false };
  try {
    // AirtableClient doesn't yet expose a query-by-fields method for Swipe Ads;
    // until that lands (v1.8 PR), fall back to "no cache available" rather
    // than guess at the underlying _request shape.
    if (typeof airtable.queryRecentSwipeAds !== "function") return { hit: false };
    const rows = await airtable.queryRecentSwipeAds({ projectId, swipePageId, ttlHours });
    if (!rows || !rows.length) return { hit: false };
    const ageMs = Date.now() - new Date(rows[0].created_at).getTime();
    return { hit: true, ads: rows, age_h: Math.round(ageMs / 3_600_000) };
  } catch {
    return { hit: false };
  }
}

// ─────────────────────────────────────────────────────────────
// Top-level factory
// ─────────────────────────────────────────────────────────────

/**
 * Construct an Adyntel client from the current Config + .env.local state.
 * Returns null when credentials are absent (caller should fall back to the
 * existing web_search Stage B path).
 *
 * @param {object} cfg  the project's Config object (localStorage merged with env)
 */
export function createAdyntelClient(cfg = {}) {
  const apiKey = cfg.adyntelKey || (typeof import.meta !== "undefined" ? import.meta.env?.VITE_ADYNTEL_API_KEY : "");
  const email  = cfg.adyntelEmail || (typeof import.meta !== "undefined" ? import.meta.env?.VITE_ADYNTEL_EMAIL  : "");
  if (!apiKey || !email) return null;
  return new AdyntelClient({ apiKey, email });
}

/**
 * Pull max-credits-per-run + USD-per-credit + cache TTL from Config (or env
 * defaults). Used by the stageB wrapper to instantiate the CreditCounter.
 */
export function adyntelConfigDefaults(cfg = {}) {
  const env = (typeof import.meta !== "undefined" && import.meta.env) ? import.meta.env : {};
  const maxCreditsPerRun =
    Number(cfg.adyntelMaxCreditsPerRun ?? env.VITE_ADYNTEL_MAX_CREDITS_PER_RUN ?? 100);
  const usdPerCreditRaw = cfg.adyntelUsdPerCredit ?? env.VITE_ADYNTEL_USD_PER_CREDIT;
  const usdPerCredit = (usdPerCreditRaw === "" || usdPerCreditRaw == null) ? null : Number(usdPerCreditRaw);
  const cacheTtlHours =
    Number(cfg.adyntelCacheTtlHours ?? env.VITE_ADYNTEL_CACHE_TTL_HOURS ?? 24);
  return { maxCreditsPerRun, usdPerCredit, cacheTtlHours };
}
