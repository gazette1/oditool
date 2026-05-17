/**
 * Anthropic API calls for the three-pass ODI analysis.
 *
 * Pass 1: Discover core functional jobs
 * Pass 2: Universal Job Map + Desired Outcomes (ONE JOB AT A TIME — see note below)
 * Pass 3: Search validation via Claude web_search tool
 */

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

// ─────────────────────────────────────────────────────────────
// Pattern E · Hook system on callClaude (Engine v1.6.12)
// ─────────────────────────────────────────────────────────────
// Foundation for retry, throttle, validation, token logging, and
// fallback-provider routing. Anyone (including the engine itself) can
// register a hook to fire before or after every Claude call.
//
//   registerHook("pre_llm_call",  async (ctx)     => ctx_or_undefined)
//   registerHook("post_llm_call", async (result)  => result_or_undefined)
//
// Pre-hook signature  · receives { apiKey, system, userMessage, opts }
//                     · may return a NEW ctx to mutate the outgoing call
//                     · throwing aborts the call entirely
// Post-hook signature · receives { ...ctx, data, error, ms, attempt, provider }
//                     · may return a NEW result (e.g. retry result · or
//                       a transformed `data`)
//                     · `error` is non-null when the call failed; a
//                       post-hook may handle it (return { data, error:null })
//                       to swallow and recover
//
// Hooks fire in registration order. Returning undefined keeps the ctx
// unchanged. Returning null is treated as undefined (safety).
//
// Pattern F (fallback chain) registers itself as the LAST post_llm_call
// hook · it checks for 529/503 + retry-exhaustion and rotates providers.
// ─────────────────────────────────────────────────────────────
const _hooks = { pre_llm_call: [], post_llm_call: [] };

export function registerHook(type, fn) {
  if (!(type in _hooks)) throw new Error(`Unknown hook type: ${type}. Use pre_llm_call or post_llm_call.`);
  if (typeof fn !== "function") throw new Error("Hook must be a function");
  _hooks[type].push(fn);
  // Return an unsubscribe handle so callers can detach later
  return () => { _hooks[type] = _hooks[type].filter((h) => h !== fn); };
}

export function clearHooks(type) {
  if (type) _hooks[type] = [];
  else { _hooks.pre_llm_call = []; _hooks.post_llm_call = []; }
}

export function _internalCallAnthropic({ apiKey, system, userMessage, opts }) {
  // The raw Anthropic call. Exported under `_internal*` for Pattern F
  // (fallback providers) to use when reconstructing a retry.
  const { tools = null, maxTokens = 4000 } = opts || {};
  const body = {
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: userMessage }],
  };
  if (tools) body.tools = tools;

  return fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify(body),
  }).then(async (res) => {
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const e = new Error(`Claude API error (${res.status}): ${err.error?.message || res.statusText}`);
      e.status = res.status;
      e.provider = "anthropic";
      throw e;
    }
    return res.json();
  });
}

export async function callClaude(apiKey, system, userMessage, { tools = null, maxTokens = 4000 } = {}) {
  // Build the initial ctx · pre-hooks can mutate everything except the
  // shape (apiKey/system/userMessage/opts stays the contract).
  let ctx = { apiKey, system, userMessage, opts: { tools, maxTokens } };

  for (const hook of _hooks.pre_llm_call) {
    try {
      const out = await hook(ctx);
      if (out) ctx = out;
    } catch (e) {
      // A pre-hook may intentionally abort by throwing. Propagate.
      throw e;
    }
  }

  const start = Date.now();
  let data = null, error = null;
  try {
    data = await _internalCallAnthropic(ctx);
    // Truncation detection lives here (was the old return path)
    if (data?.stop_reason === "max_tokens") {
      error = new Error("TRUNCATED: Claude response hit max_tokens before completing. Reduce scope or raise max_tokens.");
      error.truncated = true;
    }
  } catch (e) {
    error = e;
  }

  let result = {
    ...ctx,
    data,
    error,
    ms: Date.now() - start,
    attempt: 1,
    provider: "anthropic",
  };

  for (const hook of _hooks.post_llm_call) {
    try {
      const out = await hook(result);
      if (out) result = out;
    } catch (e) {
      // A post-hook error does not abort the call · log + continue.
      // eslint-disable-next-line no-console
      console.warn("[post_llm_call hook] threw:", e.message);
    }
  }

  if (result.error) throw result.error;
  return result.data;
}

export function extractJSON(data) {
  const text = data.content?.filter((b) => b.type === "text").map((b) => b.text).join("") || "";
  // Strip markdown code fences if Claude wrapped the JSON in them.
  const clean = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();

  // Try direct parse first.
  try {
    return JSON.parse(clean);
  } catch {
    // Fallback: locate the outermost {...} block and parse that.
    const first = clean.indexOf("{");
    const last = clean.lastIndexOf("}");
    if (first !== -1 && last !== -1 && last > first) {
      try {
        return JSON.parse(clean.slice(first, last + 1));
      } catch (e) {
        throw new Error(`Failed to parse Claude response as JSON: ${e.message}`);
      }
    }
    throw new Error("Failed to parse Claude response as JSON: no JSON object found");
  }
}

// ── PASS 0: Project Context Summarizer ──
//
// Engine v1.4 add. Consumes raw text from uploaded files + scraped URLs,
// produces a structured Project Context object that downstream passes
// (Pass 1 discovery, Pass 4 positioning, Pass 5 value-prop) read from.
//
// Replaces the "type a sector string" UX with "drop a folder + paste a URL
// and the engine figures out the sector, audience, product context, voice,
// and key facts on its own."
//
// Returns the shape:
//   {
//     sector, audience, product_context, brand_voice,
//     key_facts: [...], sources: [...],
//     positioning_hints: [...], red_flags: [...]
//   }
//
// `inputs` shape:
//   { files: [{ fileName, kind, text }, ...], urls: [{ url, content }, ...] }
// Engine v1.6.10 · Pass 0 corpus cap.
//   Bounded total-corpus size: per-file 30K char cap (parse-files.js) +
//   total 120K char cap here. Prevents "prompt is too long" on large
//   folder drops · proportionally clips each source when totalLen
//   exceeds cap · surfaces a ⚑ red_flag so the user knows context
//   was elided.
//
// Engine v1.6.11 · optional `refocusGuidance` parameter.
//   Lets the user re-run Pass 0 with a natural-language nudge
//   ("focus more on pricing", "ignore the founder bio"). Passed as a
//   named option to preserve backward compatibility with 2-arg callers.
const MAX_CORPUS_CHARS = 120_000;

// Engine v1.6.12 · Pattern B · `priorBrandMemory` optional 3rd-arg field.
// When passed, the accumulated brand_memory string from prior runs gets
// prepended to the corpus inside a `── PRIOR BRAND MEMORY ──` block so
// Pass 0 can carry insights across sessions WITHOUT mid-run mutation.
// Counted against MAX_CORPUS_CHARS · clipped proportionally if total
// exceeds cap.
export async function summarizeProjectContext(apiKey, inputs, { refocusGuidance = "", priorBrandMemory = "" } = {}) {
  const fileBlocksList = (inputs.files || [])
    .filter(f => f.text && f.text.length > 0)
    .map(f => `── FILE: ${f.fileName} (${f.kind}) ──\n${f.text}`);
  const urlBlocksList = (inputs.urls || [])
    .filter(u => u.content && u.content.length > 0)
    .map(u => `── URL: ${u.url} ──\n${u.content}`);
  // Pattern B · prior brand memory leads the corpus (highest priority)
  const memoryBlock = priorBrandMemory && priorBrandMemory.trim()
    ? [`── PRIOR BRAND MEMORY (from earlier runs · use as background context, do not over-weight) ──\n${priorBrandMemory.trim()}`]
    : [];
  const allBlocks = [...memoryBlock, ...fileBlocksList, ...urlBlocksList];
  const totalLen = allBlocks.reduce((s, b) => s + b.length, 0);

  let corpus = "";
  let truncationNote = "";
  if (totalLen <= MAX_CORPUS_CHARS) {
    corpus = allBlocks.join("\n\n");
  } else {
    // Proportional clip: each block keeps (MAX_CORPUS_CHARS / totalLen)
    // of its length from the front. Same fraction lost from every source.
    const ratio = MAX_CORPUS_CHARS / totalLen;
    const clipped = allBlocks.map(b => {
      const keep = Math.max(500, Math.floor(b.length * ratio));
      return b.length <= keep ? b : `${b.slice(0, keep)}\n[…truncated · ${b.length - keep} chars elided…]`;
    });
    corpus = clipped.join("\n\n");
    truncationNote = `Corpus was ${totalLen.toLocaleString()} chars · clipped proportionally to fit ${MAX_CORPUS_CHARS.toLocaleString()} cap. ${allBlocks.length} sources each kept ~${Math.round(ratio * 100)}% of their original length.`;
    // eslint-disable-next-line no-console
    console.warn("[Pass 0]", truncationNote);
  }

  if (!corpus.trim()) {
    return {
      sector: "",
      audience: "",
      product_context: "",
      brand_voice: "",
      key_facts: [],
      sources: [],
      positioning_hints: [],
      red_flags: ["No usable content extracted from inputs."],
    };
  }

  const refocusPrefix = refocusGuidance && refocusGuidance.trim()
    ? `REFOCUS GUIDANCE: ${refocusGuidance.trim()}\n\n`
    : "";

  const data = await callClaude(
    apiKey,
    `${refocusPrefix}You are an Outcome-Driven Innovation analyst preparing a Project Context for a Mode 1 Earth engine run. Given raw text extracted from a brand's uploaded documents (PDFs, decks, agreements, shot lists, brand briefs) and from a scrape of the brand's homepage, produce a single structured Project Context that downstream passes (job discovery, positioning, value-prop comparison) will read.

Return ONLY valid JSON (no markdown):
{
  "sector": "One sentence naming the customer + category + price tier",
  "audience": "1-3 sentence description of who this serves, anchored to specifics from the inputs (geography, life stage, identity)",
  "product_context": "2-4 sentence description of what is sold, with named SKUs, materials, price points, and any product roadmap signals visible in the inputs",
  "brand_voice": "1-2 sentence description of voice rules — tone, forbidden words, signature phrases — pulled verbatim from voice guides or inferred from copy samples",
  "key_facts": ["6-12 specific facts that any downstream pass should anchor to (founder name, SKU details, price points, social-proof counts, key sentiments)"],
  "sources": ["fileName or url for each input that contributed a fact"],
  "positioning_hints": ["3-5 candidate positioning angles surfaced by the corpus, in priority order"],
  "red_flags": ["any contradictions, inconsistencies, or gaps you spotted in the corpus"]
}

Rules:
- Every fact must be defensible against a quote from the input. No invention.
- If the corpus contradicts itself, surface that in red_flags rather than picking one side silently.
- If the corpus is thin on a field (e.g., no brand_voice content), leave that field empty and add a red_flag.${refocusPrefix ? "\n- Honor the REFOCUS GUIDANCE at the top of this prompt: re-weight your reading of the corpus accordingly while still obeying the no-invention rule." : ""}`,
    `Project context corpus:\n\n${corpus}${truncationNote ? `\n\n[ENGINE NOTE — corpus was clipped: ${truncationNote}]` : ""}`,
    { maxTokens: 4000 }
  );
  const result = extractJSON(data);
  // v1.6.10 · prepend truncation red_flag so the user can see context was elided
  if (truncationNote) {
    result.red_flags = [`⚑ ${truncationNote}`, ...(result.red_flags || [])];
  }
  return result;
}

// ── PASS 1: Discover Core Functional Jobs ──
//
// Engine v1.1: customer keywords are now the PRIMARY input source.
// Ad creative is opt-in secondary (Pass 5 only). Without keywords,
// Pass 1 emits a warning and falls back to sector-only inference.
//
// `keywords` shape: { autocomplete: string[], peopleAlsoAsk: string[],
//   redditPhrases: string[], pdpReviews: { source: string, quote: string }[] }
// `projectContext` shape (Engine v1.4+, from Pass 0 summarizeProjectContext):
//   { sector, audience, product_context, brand_voice, key_facts,
//     sources, positioning_hints, red_flags }
export async function discoverJobs(apiKey, sector, keywords = null, projectContext = null) {
  // Engine v1.4: prefer projectContext.sector/audience over the sector arg
  // when both are present. Sector arg stays for backward compatibility.
  const effectiveSector = projectContext?.sector || sector;
  const audience = projectContext?.audience || null;
  const productContext = projectContext?.product_context || null;
  const brandVoice = projectContext?.brand_voice || null;
  const keyFacts = (projectContext?.key_facts || []);
  const positioningHints = (projectContext?.positioning_hints || []);

  const contextBlock = projectContext ? `

PROJECT CONTEXT (Pass 0 summary — anchor your job statements to these specifics):
- Audience: ${audience || "(not specified)"}
- Product context: ${productContext || "(not specified)"}
- Brand voice rules: ${brandVoice || "(not specified)"}
- Key facts (cite at least 2 in evidence_quotes per job):
${keyFacts.map(f => `  - ${f}`).join("\n") || "  (none)"}
- Candidate positioning hints (use to validate Pass 4 later, not Pass 1):
${positioningHints.map(h => `  - ${h}`).join("\n") || "  (none)"}` : "";

  const hasKeywords = keywords && (
    (keywords.autocomplete?.length || 0) +
    (keywords.peopleAlsoAsk?.length || 0) +
    (keywords.redditPhrases?.length || 0) +
    (keywords.pdpReviews?.length || 0)
  ) > 0;

  const keywordBlock = hasKeywords ? `

CUSTOMER-LANGUAGE INPUT (primary source for this run):

Google autocomplete suggestions:
${(keywords.autocomplete || []).map(s => "  - " + s).join("\n") || "  (none)"}

People-Also-Ask questions:
${(keywords.peopleAlsoAsk || []).map(s => "  - " + s).join("\n") || "  (none)"}

Reddit phrases (verbatim from the customer's threads):
${(keywords.redditPhrases || []).map(s => "  - " + s).join("\n") || "  (none)"}

Competitor PDP review quotes (one-star and five-star):
${(keywords.pdpReviews || []).map(r => `  - "${r.quote}" — ${r.source}`).join("\n") || "  (none)"}

Anchor every core job to the verbs and outcomes the customer actually uses above. Do not invent jobs the data does not support. If the data is thin in an area, say so.` : `

⚠ No customer-keyword input provided. Fall back to sector inference but flag this in the output (set "discovery_warning" in the returned JSON).`;

  const data = await callClaude(
    apiKey,
    `You are an Outcome-Driven Innovation (ODI) analyst trained in Tony Ulwick's methodology. Given a sector and (preferably) verbatim customer-language input, discover the core functional jobs that customers/job executors are trying to get done.

Rules for defining a core functional job (from Ulwick):
- Format: verb + object of the verb (noun) + contextual clarifier
- Must be solution-agnostic (no product references)
- Must be stable over time (the job doesn't change, only solutions do)
- Must be functional (emotional/social jobs come later)
- A job has no geographical boundaries
- Examples: "cut a piece of wood in a straight line", "monitor a patient's vital signs", "pass on life lessons to children"

For each job, also identify:
- The primary job executor (who is trying to get this done)
- 3 related jobs (other functional jobs the executor may try to accomplish alongside)
- 2 emotional jobs (how they want to feel)
- 2 social jobs (how they want to be perceived)
- 3 consumption chain jobs (purchase, setup, learn to use, maintain, upgrade, dispose)
- 2-3 search queries real people would type when trying to get this job done
- evidence_quotes: 1-3 verbatim phrases from the keyword input that anchor this job (REQUIRED when keyword input is provided)
${contextBlock}
${keywordBlock}

Return ONLY valid JSON, no markdown:
{"discovery_warning": "..." or null, "core_jobs": [{"id": 1, "job_statement": "verb + object + context", "job_executor": "who", "related_jobs": ["..."], "emotional_jobs": ["..."], "social_jobs": ["..."], "consumption_chain_jobs": ["..."], "search_queries": ["..."], "evidence_quotes": ["..."]}]}

Find exactly 5 core functional jobs. Be exhaustive — find jobs incumbents miss.`,
    `Sector: ${effectiveSector}`,
    { maxTokens: 5000 }
  );
  return extractJSON(data);
}

// ── PASS 2: Universal Job Map + Desired Outcome Statements ──
//
// IMPORTANT: This MUST process one job at a time. Generating maps + outcomes for
// all jobs in a single Claude call reliably truncates against max_tokens because
// each job produces ~1500 tokens of structured output.
//
// `onProgress(jobId, status, error?)` is called as each job is processed so the UI
// can show per-job progress and tolerate individual failures.
export async function mapJobsAndOutcomes(apiKey, jobs, onProgress = () => {}) {
  const job_maps = [];
  const errors = [];

  for (const job of jobs) {
    onProgress(job.id, "start");
    try {
      const data = await callClaude(
        apiKey,
        `You are an ODI analyst using Tony Ulwick's methodology. For ONE core functional job, create:

1. A Universal Job Map breaking the job into 8 steps: Define, Locate, Prepare, Confirm, Execute, Monitor, Modify, Conclude.
   For each step, write what the job executor is trying to accomplish (NOT what they're doing with a product — what they're trying to GET DONE). Keep each step description to 1-2 sentences.

2. Exactly 5 Desired Outcome Statements. Ulwick's format MUST be:
   "Minimize the [time/likelihood] [that/it takes to] [object of control] [contextual clarifier]"
   Examples:
   - "Minimize the time it takes to determine which materials are needed for the job"
   - "Minimize the likelihood that the cut goes off track at the end of the pass"
   - "Minimize the time it takes to verify that all components are properly aligned"

   Rules: statements must be measurable, controllable, actionable, devoid of solutions, stable over time.
   Spread the 5 outcomes across different job map steps. Focus on UNDERSERVED outcomes (high importance, low satisfaction).

3. For each outcome, estimate based on your knowledge of the market:
   - importance (1-10 scale): how critical is this to the job executor
   - satisfaction (1-10 scale): how well do CURRENT solutions satisfy this
   Then compute: opportunity_score = importance + max(importance - satisfaction, 0)
   Score >= 10 = underserved. Score < 6 with high satisfaction = overserved.

Return ONLY valid JSON, no markdown:
{"job_id": ${job.id}, "steps": {"Define": "...", "Locate": "...", "Prepare": "...", "Confirm": "...", "Execute": "...", "Monitor": "...", "Modify": "...", "Conclude": "..."}, "outcomes": [{"id": "${job.id}-1", "step": "Execute", "statement": "Minimize the...", "importance": 8.2, "satisfaction": 3.1, "opportunity_score": 13.3}]}`,
        `Job ${job.id}: ${job.job_statement}\nExecutor: ${job.job_executor}`,
        { maxTokens: 3000 }
      );
      const parsed = extractJSON(data);
      job_maps.push(parsed);
      onProgress(job.id, "done");
    } catch (e) {
      errors.push({ job_id: job.id, error: e.message });
      onProgress(job.id, "error", e.message);
      // Continue with remaining jobs — individual failures are non-fatal.
    }
  }

  return { job_maps, errors };
}

// ── PASS 4: Positioning + Market Entry ──
//
// Engine v1.1: this pass now produces the POSITIONING SPINE first (1 sentence
// claim + 2-3 alternatives ranked by underserved-outcome score), then the
// entry recommendations that flow from it. Every positioning claim must cite
// the specific job_id and outcome statement that justifies it — Pass 6
// validation rejects any claim without a citation.
export async function generateEntryRecommendations(apiKey, mergedJobs) {
  // Build compact summary so we stay well under the token ceiling.
  const summary = mergedJobs.map((j) => {
    const outcomes = j.outcomes || [];
    const underserved = outcomes
      .filter((o) => (o.opportunity_score || 0) >= 10)
      .map((o) => ({ statement: o.statement, score: Number((o.opportunity_score || 0).toFixed(1)) }));
    const overserved = outcomes
      .filter((o) => (o.opportunity_score || 0) < 6 && (o.satisfaction || 0) > 7)
      .map((o) => ({ statement: o.statement, score: Number((o.opportunity_score || 0).toFixed(1)) }));
    const table_stakes = outcomes
      .filter((o) => (o.importance || 0) >= 7 && (o.satisfaction || 0) >= 7)
      .map((o) => o.statement);

    return {
      id: j.id,
      job_statement: j.job_statement,
      executor: j.job_executor,
      search_volume_signal: j.search_volume_signal || 0,
      trend: j.trend || "stable",
      competition: j.competition || "medium",
      underserved,
      overserved,
      table_stakes,
    };
  });

  const data = await callClaude(
    apiKey,
    `You are a growth strategist using Ulwick's JTBD Growth Strategy Matrix. Engine v1.1: the OUTPUT spine is positioning, not findings.

Produce two things in order:

(A) POSITIONING SPINE — exactly one primary positioning sentence the brand should claim, plus 2-3 alternative positioning sentences. Each one must cite:
- citation_job_id: the job that supports it
- citation_outcome: the specific outcome statement that justifies it
- citation_score: the opportunity_score number
Rank the alternatives by the score that backs them. The primary is the highest-scoring candidate.

A positioning sentence is one clause, no semicolons, no "for X who Y because Z" template — just the claim. Example: "Sleepwear for recovery — postpartum, surgery, grief, burnout."

(B) ENTRY RECOMMENDATIONS — 3-5 ranked entry strategies that operationalize the chosen positioning. Each uses one of Ulwick's 5 strategies (Differentiated / Dominant / Disruptive / Discrete / Sustaining). Include the same citation fields plus first_move, belief_change_required, risk.

Strategy reference:
- Differentiated: target underserved outcomes (score≥10), get job done better
- Dominant: get job done better AND cheaper
- Disruptive: target overserved customers with simpler/cheaper solution
- Discrete: focus on ONE high-value underserved outcome
- Sustaining: incremental improvement on table stakes

CRITICAL: every positioning claim and every recommendation MUST cite a job_id, outcome statement, and opportunity_score from the input data. Claims without citations are rejected by Pass 6 validation.

RESPOND WITH ONLY RAW JSON:
{
  "positioning_spine": {
    "primary": {"sentence": "...", "citation_job_id": 1, "citation_outcome": "Minimize the...", "citation_score": 14.4, "rationale": "..."},
    "alternatives": [
      {"sentence": "...", "citation_job_id": 2, "citation_outcome": "...", "citation_score": 13.2, "rationale": "..."}
    ]
  },
  "recommendations": [
    {"rank": 1, "strategy": "Differentiated", "target_job_id": 1, "target_job": "...", "target_outcomes": ["..."], "citation_score": 14.4, "rationale": "...", "estimated_difficulty": "medium", "estimated_market_signal": 82, "first_move": "...", "belief_change_required": "...", "risk": "..."}
  ]
}`,
    `Scored ODI data:\n${JSON.stringify(summary, null, 2)}`,
    { maxTokens: 5000 }
  );
  return extractJSON(data);
}

// ── PASS 5: Competitor Value-Prop Comparison ──
//
// Engine v1.1 (NEW). For each named competitor, captures their stated value
// prop (quoted, with source URL), the outcome they implicitly price for, the
// outcome they leave unserved, and where the brand wins on the underserved one.
// Ad creative is the ONLY allowed input here; PDP copy is preferred when
// available.
//
// `competitors` shape: [{ name, stated_value_prop, source_url, ad_quote? }]
//
// v1.7.2 · Pass 5 now runs in two phases when no pre-discovered competitors
// are passed:
//   Phase A · Discovery — uses web_search to find 4-6 competitors with their
//             actual stated value props quoted from their sites
//   Phase B · Comparison — the original structured-comparison pass against
//             the brand's chosen positioning and scored outcomes
// The "every company on earth has a competitor" reality means Pass 5 should
// NEVER silently drop § 03 because the user's key_facts didn't happen to
// match a regex. If web_search comes back thin, the row carries a `data_note`
// explaining what we know vs. don't.
export async function comparePositioning(apiKey, brand, positioning, competitors, scoredOutcomes, projectContext = null) {
  // ── Phase A · Auto-discover competitors when none were pre-supplied ──
  let resolvedCompetitors = competitors || [];

  if (!resolvedCompetitors.length) {
    const sector = projectContext?.sector || "";
    const audience = projectContext?.audience || "";
    const productSummary = (projectContext?.product_context || "").slice(0, 800);

    try {
      const discoveryRaw = await callClaude(
        apiKey,
        `You are a competitive-research analyst. Given a brand, find 4-6 REAL competitors using web_search. For each one return:

- name: the brand's actual trading name (no descriptors like "the leading…")
- stated_value_prop: a verbatim quote ≤ 24 words from their homepage or hero, in their own words. Use double quotes. If you cannot find a clean quote, return null and explain in data_note.
- source_url: the page the quote came from
- ad_quote: optional · a verbatim quote from an active ad of theirs if visible in search results
- evidence: 1 sentence on why this is a real competitor (same job, overlapping audience)

CRITICAL RULES:
1. Every named company must be a REAL brand you confirmed via search (not invented). If you can't find at least 3 real competitors, return what you found honestly · do not pad the list.
2. NEVER use the word "Likely" or "Probably" in evidence · cite specific signals (price tier, channel mix, founder origin, etc.).
3. Prefer brands one tier ABOVE and one tier BELOW the brand's price point, plus 1-2 aspirational. Avoid only-direct or only-aspirational lists.

RESPOND WITH ONLY RAW JSON:
{"competitors": [{"name":"...","stated_value_prop":"...","source_url":"https://...","ad_quote":null,"evidence":"...","data_note":null}]}`,
        `BRAND: ${brand}\nSECTOR: ${sector}\nAUDIENCE: ${audience}\n\nPRODUCT CONTEXT:\n${productSummary}`,
        { tools: [{ type: "web_search_20250305", name: "web_search" }], maxTokens: 4000 }
      );
      const discovered = extractJSON(discoveryRaw);
      resolvedCompetitors = (discovered?.competitors || []).filter(c => c?.name);
    } catch (e) {
      // Discovery failed (web_search timeout, etc.) · fall through with empty.
      // The compare step below will return a single placeholder row noting
      // the data gap rather than silently dropping the section.
      console.warn("[Pass 5] competitor auto-discovery failed:", e.message);
    }
  }

  // If we STILL have zero competitors after discovery, return one honest
  // placeholder row so § 03 renders rather than silently disappearing.
  if (!resolvedCompetitors.length) {
    return {
      comparisons: [{
        competitor_name: "(competitor discovery returned no results)",
        their_stated_value_prop: "",
        source_url: "",
        outcome_they_price_for: "",
        outcome_they_leave_unserved: "",
        where_brand_wins: "",
        citation_score: null,
        data_note: "Pass 5 ran web_search for competitors but returned an empty set · check the Pass 0 sector + audience fields, or run Ad-Intel Stage A to discover competitors before regenerating the strategy doc.",
      }],
    };
  }

  // ── Phase B · Structured comparison ──
  const data = await callClaude(
    apiKey,
    `You are an Outcome-Driven Innovation strategist. For each named competitor, produce ONE structured comparison row against the brand's chosen positioning.

For each competitor, return:
- competitor_name: their actual brand name
- their_stated_value_prop: the quote we have (verbatim, in their words)
- source_url: where the quote came from
- outcome_they_price_for: which outcome from the scored list they implicitly serve well, in the exact Ulwick phrasing
- outcome_they_leave_unserved: which outcome from the scored list they implicitly fail · prefer outcomes with high opportunity_score (>= 10)
- where_brand_wins: 1-2 sentences naming the specific outcome statement AND its score (e.g. "We take this customer on 'Minimize the time it takes to mentally disconnect from work stress when changing into sleepwear' · opportunity 13.8") — be concrete and quote the outcome.
- citation_score: the opportunity_score number behind where_brand_wins
- data_note: optional · ONLY use when the source quote is genuinely thin (e.g. you couldn't find a clean homepage hero). Never use this to hedge; use it to flag a real data gap.

ABSOLUTE RULES:
1. Do NOT invent competitor copy. If we only have a name and no quote, leave their_stated_value_prop empty and note it.
2. Do NOT use "Likely", "Probably", "Seems to", "Appears to". Either you have evidence or you say so in data_note.
3. Where the brand wins must cite ONE specific scored outcome. If you can't pick one for a competitor, return data_note: "no clean outcome anchor against this competitor" rather than fudging.

Brand: ${brand}
Brand positioning: "${positioning}"

RESPOND WITH ONLY RAW JSON:
{"comparisons": [{"competitor_name": "...", "their_stated_value_prop": "...", "source_url": "...", "outcome_they_price_for": "...", "outcome_they_leave_unserved": "...", "where_brand_wins": "...", "citation_score": 14.4, "data_note": null}]}`,
    `Competitors:\n${JSON.stringify(resolvedCompetitors, null, 2)}\n\nScored outcomes (use these EXACT statements in citations):\n${JSON.stringify(scoredOutcomes, null, 2)}`,
    { maxTokens: 4500 }
  );
  return extractJSON(data);
}

// ── PASS 6: Positioning Validator ──
//
// Engine v1.1 (NEW). Rejects any positioning claim or recommendation that
// doesn't cite a job_id, outcome statement, AND a numeric score. Returns
// validation errors as an array so the caller can decide whether to abort
// or surface warnings in the output.
//
// Pure JavaScript — no API call, runs at the end of the pipeline.
export function validatePositioning(passFourOutput, mergedJobs) {
  const errors = [];
  const validOutcomes = new Set();
  const jobsById = {};
  for (const job of mergedJobs || []) {
    jobsById[job.id] = job;
    for (const o of (job.outcomes || [])) {
      validOutcomes.add(o.statement);
    }
  }

  const check = (claim, label) => {
    if (!claim) { errors.push(`${label}: missing entirely`); return; }
    if (!claim.citation_job_id) errors.push(`${label}: missing citation_job_id`);
    if (!claim.citation_outcome) errors.push(`${label}: missing citation_outcome`);
    if (claim.citation_score == null) errors.push(`${label}: missing citation_score`);
    if (claim.citation_job_id && !jobsById[claim.citation_job_id]) {
      errors.push(`${label}: citation_job_id ${claim.citation_job_id} does not exist`);
    }
    if (claim.citation_outcome && !validOutcomes.has(claim.citation_outcome)) {
      errors.push(`${label}: citation_outcome not in scored outcome set`);
    }
  };

  const ps = passFourOutput?.positioning_spine;
  check(ps?.primary, "positioning.primary");
  (ps?.alternatives || []).forEach((a, i) => check(a, `positioning.alternative[${i}]`));
  (passFourOutput?.recommendations || []).forEach((r, i) => {
    if (!r.citation_score) errors.push(`recommendation[${i}] (${r.strategy}): missing citation_score`);
    if (!r.target_job_id) errors.push(`recommendation[${i}]: missing target_job_id`);
  });

  return { valid: errors.length === 0, errors };
}

// ── PASS 7: Personas (Engine v1.5) ──
export async function generatePersonas(apiKey, projectContext, mergedJobs) {
  const ctx = projectContext ? `PROJECT CONTEXT:
- Sector: ${projectContext.sector || ""}
- Audience: ${projectContext.audience || ""}
- Product: ${projectContext.product_context || ""}
- Brand voice: ${projectContext.brand_voice || ""}
- Key facts: ${(projectContext.key_facts || []).slice(0,8).join("; ")}` : "";

  const jobsSummary = mergedJobs.map(j => `Job ${j.id}: ${j.job_statement} (executor: ${j.job_executor})`).join("\n");

  const data = await callClaude(apiKey,
    `You are an ODI analyst. Produce 4 Ulwick-format buyer personas anchored to the Project Context + scored jobs. Each persona is one of the 4 customer-psychology archetypes: Sensory Romantic, Cautious Indulger, Soft-Life Loyalist, Reflective Rewarder.

For each persona return:
- name (real first name fitting the audience)
- age
- archetype (one of 4 above)
- one_liner (1 italicized sentence in her voice)
- job_to_be_done (which scored Job she's hiring the brand for; cite Job N)
- underserved_outcome (1 sentence quoting an outcome from Pass 2)
- currently_uses (1-2 sentences naming real competitor products / behaviors)
- trigger_moment (1 sentence)
- lives_online_at (4-6 named accounts/publications/communities — must fit the audience identity)
- switch_cost (1 sentence on order economics)
- first_message (1 italicized line — the first ad headline aimed at her)

Return ONLY valid JSON: {"personas": [{...}, {...}, {...}, {...}]}`,
    `${ctx}\n\nScored jobs:\n${jobsSummary}`,
    { maxTokens: 4500 }
  );
  return extractJSON(data);
}

// ── PASS 8: Swipe File concepts (Engine v1.5) ──
export async function generateSwipeFile(apiKey, projectContext, positioning, personas) {
  const ctx = projectContext ? `PROJECT CONTEXT:\n- Sector: ${projectContext.sector}\n- Audience: ${projectContext.audience}\n- Brand voice: ${projectContext.brand_voice}\n- Key facts: ${(projectContext.key_facts || []).slice(0,6).join("; ")}` : "";
  const pos = positioning?.primary ? `Primary positioning: "${positioning.primary.sentence}" (Job ${positioning.primary.citation_job_id}, score ${positioning.primary.citation_score})` : "";
  const personaList = (personas || []).map(p => `- ${p.name} (${p.archetype}): ${p.one_liner}`).join("\n");

  const data = await callClaude(apiKey,
    `You are a senior creative director. Produce a 20-card swipe file — exactly 5 ad concepts per persona — that operationalizes the positioning.

Each card needs:
- id (e.g., SWP-NAME-01 using persona's first initial)
- persona_name (which persona this targets)
- format (one of: Meta 4:5, Meta carousel, TikTok 9:16, TikTok UGC)
- stage (Unaware / Problem aware / Solution aware / Product aware / Most aware)
- title (concept name, 2-5 words)
- headline (the actual scroll-stopping copy, 1-2 lines, no exclamation points, no em-dashes)
- body (1-2 sentences of body copy in the brand voice)
- cta (3-5 word phrase)
- framework (PAS / BAB / AIDA / Compare / Founder POV / UGC testimonial / Trend pivot / Day-in-life / Sensory / etc.)
- visual_brief (1-2 sentences describing the visual — used later for image generation; specify model casting if a person is shown, otherwise still-life)

Return ONLY JSON: {"swipe_file": [{...}, ...]}  (exactly 20 cards)`,
    `${ctx}\n\n${pos}\n\nPersonas:\n${personaList}`,
    { maxTokens: 8000 }
  );
  return extractJSON(data);
}

// ── PASS 9: TikTok Scripts (Engine v1.5) ──
export async function generateScripts(apiKey, projectContext, positioning, personas) {
  const ctx = projectContext ? `Brand voice: ${projectContext.brand_voice || ""}\nKey facts: ${(projectContext.key_facts || []).slice(0,5).join("; ")}` : "";
  const pos = positioning?.primary?.sentence ? `Primary positioning: "${positioning.primary.sentence}"` : "";
  const personaList = (personas || []).map(p => `- ${p.name} (${p.archetype})`).join("\n");

  const data = await callClaude(apiKey,
    `You are a creative director writing TikTok / IG Reels scripts. Produce 8 shot-by-shot scripts — 2 per persona — using a mix of hook patterns (POV / day-in-life / founder confession / fake podcast / trend-jack / before-after / honest review / sensory).

Each script:
- id (e.g., TT-01 through TT-08)
- title (4-6 word concept name)
- persona_name
- format ("9:16 · Xs · Tier 1 Founder / Tier 2 UGC / Spark Ads")
- hook (the literal first 1-second line shown on screen)
- shots: array of {time: "0.0 → 2.0s", cue: "Hook" / "Build" / "Reveal" / "Payoff" / "CTA", detail: "what happens", ost: "on-screen text", vo: "voiceover line if any"} — 5-8 shots per script
- sound_note (1 line)
- creator_brief (1 line)
- kpi (1 line)

Return ONLY JSON: {"scripts": [{...}, ...]} (exactly 8)`,
    `${ctx}\n\n${pos}\n\nPersonas:\n${personaList}`,
    { maxTokens: 8000 }
  );
  return extractJSON(data);
}

// ── PASS 10: Email Flows (Engine v1.5) ──
export async function generateEmailFlows(apiKey, projectContext, positioning) {
  const ctx = projectContext ? `Brand: ${projectContext.sector}\nVoice: ${projectContext.brand_voice}\nFounder/audience signals: ${(projectContext.key_facts || []).slice(0,4).join("; ")}` : "";
  const pos = positioning?.primary?.sentence || "";

  const data = await callClaude(apiKey,
    `Produce 4 Klaviyo-ready email flows in the brand voice. Sentence-case subject lines, no exclamation points, no em-dashes, slow urgency only.

Flows:
1. Welcome series (3 emails: Day 0 / Day 2 / Day 5)
2. Abandoned cart (3 emails: Hour 1 / Day 1 / Day 3)
3. Post-purchase (3 emails: Day 0 shipped / Day 7 first wear / Day 30 second nudge)
4. Win-back (2 emails: Day 60 check-in / Day 90 exit offer)

Each email needs:
- when ("Day 0 · sent immediately")
- subject (sentence case)
- preview (1 sentence)
- body (full email copy, 80-200 words, in voice — paragraphs separated by blank lines)
- cta_label (button text)

Return ONLY JSON: {"flows": [{"name": "...", "trigger": "...", "description": "1 sentence framing", "emails": [{...}, ...]}, ...]} (4 flows)`,
    `${ctx}\n\nPositioning: "${pos}"`,
    { maxTokens: 8000 }
  );
  return extractJSON(data);
}

// ── PASS 11: Channel Plan + Targeting Matrix (Engine v1.6) ──
export async function generateChannelPlan(apiKey, projectContext, positioning, personas) {
  const ctx = projectContext ? `Sector: ${projectContext.sector}\nAudience: ${projectContext.audience}\nBrand voice: ${projectContext.brand_voice}` : "";
  const pos = positioning?.primary?.sentence ? `Positioning: "${positioning.primary.sentence}"` : "";
  const personaList = (personas || []).map(p => `- ${p.name} (${p.archetype}) — lives at: ${p.lives_online_at || "?"}`).join("\n");

  const data = await callClaude(apiKey,
    `You are a paid + organic media strategist. Produce a channel plan and a targeting matrix for the launch.

Return ONLY JSON:
{
  "channels": [
    { "channel": "Meta Ads (FB+IG)", "role": "Prospecting · feed + reels", "budget_pct": 40, "primary_kpi": "CPA under $X", "first_test": "1-sentence first test to run", "creative_format": "Meta 4:5 + 9:16", "audience_hook": "1-sentence targeting note" },
    ... (8-10 channels — include Meta, TikTok Ads, TikTok organic, IG organic, Klaviyo email, Google branded search, Pinterest, influencer/UGC, PR/earned, retargeting)
  ],
  "targeting_matrix": [
    { "persona_name": "...", "channel": "Meta Ads", "interest_targets": ["3-5 interest layers"], "lookalike_seeds": ["seed1","seed2"], "exclusions": ["exclude1"], "creative_angle": "1 sentence", "spend_share_pct": 25 },
    ... (one row per persona × top-3 channel pairing — 9-12 rows total)
  ]
}`,
    `${ctx}\n\n${pos}\n\nPersonas:\n${personaList}`,
    { maxTokens: 6000 }
  );
  return extractJSON(data);
}

// ── PASS 12: Landing Page Variants (Engine v1.6) ──
export async function generateLandingVariants(apiKey, projectContext, positioning, personas) {
  const ctx = projectContext ? `Brand: ${projectContext.sector}\nVoice: ${projectContext.brand_voice}\nKey facts: ${(projectContext.key_facts || []).slice(0,5).join("; ")}` : "";
  const pos = positioning?.primary?.sentence ? `Primary positioning: "${positioning.primary.sentence}"` : "";
  const personaList = (personas || []).map(p => `- ${p.name} (${p.archetype}): ${p.one_liner}`).join("\n");

  const data = await callClaude(apiKey,
    `Produce 3 landing-page variants — one per top persona. Each variant is a conversion page tuned to that persona's awareness level and trigger.

Each variant:
- variant_id (LP-01..LP-03)
- persona_name
- url_slug (3-4 lowercase words separated by hyphens)
- hero_headline (1-2 lines, brand voice, no exclamation points, no em-dashes)
- hero_sub (1 sentence)
- hero_cta (3-5 words)
- proof_strip (array of 3-5 short proof phrases — review stars, press mentions, founder credentials)
- sections: array of 5-6 {label: "Problem"/"Solution"/"How it works"/"Proof"/"Compare"/"FAQ"/"Founder note"/"Final CTA", headline: "...", body: "2-3 sentence section body"}
- visual_direction (1-2 sentences for the art director)
- primary_kpi (1 line, e.g. "Conversion rate >2.4% from cold Meta traffic")

Return ONLY JSON: {"variants": [{...}, {...}, {...}]}`,
    `${ctx}\n\n${pos}\n\nPersonas:\n${personaList}`,
    { maxTokens: 7000 }
  );
  return extractJSON(data);
}

// ── PASS 13: 90-Day Rollout (Engine v1.6) ──
export async function generateRollout(apiKey, projectContext, positioning, recommendations) {
  const ctx = projectContext ? `Brand: ${projectContext.sector}\nAudience: ${projectContext.audience}` : "";
  const pos = positioning?.primary?.sentence ? `Positioning: "${positioning.primary.sentence}"` : "";
  const topRecs = (recommendations || []).slice(0, 3).map(r => `- Rank ${r.rank}: ${r.target_job} (${r.strategy}) — first move: ${r.first_move}`).join("\n");

  const data = await callClaude(apiKey,
    `Produce a 90-day rollout plan in 3 phases (Weeks 1-4 / Weeks 5-8 / Weeks 9-12). Each phase has a clear theme, objectives, deliverables, channels live, budget allocation, KPIs, and gating decision to advance.

Return ONLY JSON:
{
  "phases": [
    {
      "phase": "Phase 1 · Weeks 1-4",
      "theme": "5-8 word theme name",
      "objective": "1 sentence",
      "deliverables": ["6-8 concrete shippable items"],
      "channels_live": ["which channels run this phase"],
      "budget_pct": 25,
      "kpis": [{"metric":"CAC","target":"under $X"},{"metric":"CTR","target":">1.2%"},{"metric":"Add-to-cart","target":">3%"}],
      "gate_to_next": "1 sentence: what must be true to advance"
    },
    { phase 2 ... },
    { phase 3 ... }
  ],
  "weekly_cadence": [
    "1-line weekly ritual",
    "1-line weekly ritual",
    "..." (4-6 rituals — creative reviews, performance readouts, etc.)
  ],
  "kill_criteria": [
    "1-line kill condition",
    "..." (3-5 conditions — e.g. 'Pause Meta if CAC > 2× LTV after 14 days')
  ]
}`,
    `${ctx}\n\n${pos}\n\nTop entry recommendations:\n${topRecs}`,
    { maxTokens: 6000 }
  );
  return extractJSON(data);
}

// ── PASS 14: Creator Outreach Briefs (Engine v1.6.2) ──
//
// Produces 5 paid-creator outreach packets — one per persona (or top
// hypothesis if more personas than budget allows). Each packet is
// copy-paste ready: archetype + audience fit + concept + format +
// talking points + DM template + comp range + usage rights + guardrails.
//
// Anchors:
//   - persona.lives_online_at → platform inference
//   - persona.first_message → DM voice
//   - positioning.primary.sentence → talking points
//   - top entry rec → CTA wedge
//
// We DON'T return real creator handles. v1.3 verify-creators.mjs
// established the rule that handles must be human-verified to avoid
// hallucinated accounts. Pass 14 outputs the ARCHETYPE we'd hire and
// the BRIEF we'd hand them — the human sourcer matches to a real handle.
export async function generateCreatorBriefs(apiKey, projectContext, positioning, personas, recommendations) {
  const ctx = projectContext ? `Brand: ${projectContext.sector}\nAudience: ${projectContext.audience}\nVoice: ${projectContext.brand_voice}` : "";
  const pos = positioning?.primary?.sentence ? `Positioning: "${positioning.primary.sentence}"` : "";
  const personaList = (personas || []).slice(0, 5).map(p => `- ${p.name} (${p.archetype}) · lives at: ${p.lives_online_at || "?"} · trigger: ${p.trigger_moment || "?"} · first message: "${p.first_message || ""}"`).join("\n");
  const topRec = (recommendations || [])[0];
  const recLine = topRec ? `Top entry wedge: ${topRec.target_job} (${topRec.strategy}) · first move: ${topRec.first_move}` : "";

  const data = await callClaude(apiKey,
    `You are a paid-influencer producer briefing 5 creators. Produce 5 outreach packets — one per persona — each anchoring a different creator archetype to the persona's online habitat. We do NOT have real creator handles yet; output the archetype + sourcing criteria so a human sourcer can match a real account.

Brand voice rules: sentence case, no exclamation points, no em-dashes, slow urgency.

Each packet:
- packet_id (CR-01 .. CR-05)
- target_persona_name (one of the personas)
- creator_archetype (3-6 word descriptor: e.g. "Soft-life Black wellness creator 10k-100k", "Sleep journalist with newsletter 20k+")
- platform (TikTok / IG / Substack / YouTube / Podcast)
- audience_fit (1-2 sentences on the overlap between the creator's audience and the persona)
- sourcing_criteria (array of 4-6 specific filter rules a sourcer would apply: follower band, content vertical, posting cadence, audience demographics, brand-safety notes)
- content_concept (2-3 sentences describing what we'd ask them to make)
- deliverables (array of concrete deliverable lines: e.g. "1 hero 9:16 video 30-45s", "3 IG stories", "1 carousel of 5 slides", "1 newsletter mention 150 words")
- talking_points (4-6 short bullets in brand voice — the creator picks 2-3 to weave in)
- cta (the action the creator's audience should take, 3-7 words)
- dos (3-5 short phrases — what we WANT them to do)
- donts (3-5 short phrases — what we explicitly want avoided)
- usage_rights (one sentence on paid-media rights ask)
- comp_range (suggested USD range with rationale, e.g. "$1.5k-3k · gifted product + flat fee · 30-day usage rights")
- outreach_dm (3-5 sentence DM template in brand voice, sentence case, includes a specific personalization hook in [brackets])
- success_metric (1 line — what makes this a hit)

Return ONLY JSON: {"creator_briefs": [...5 packets]}`,
    `${ctx}\n\n${pos}\n${recLine}\n\nPersonas:\n${personaList}`,
    { maxTokens: 7000 }
  );
  return extractJSON(data);
}

// ── PASS 15: Competitive Teardown (Engine v1.6.3) ──
//
// Renders as §15 of the strategy doc. Deeper than Pass 5's value-prop
// comparison: Pass 15 produces a 6-row competitive matrix where each row
// has category position, price anchor, primary promise, creative pattern,
// where-we-win, where-we-lose, the specific wedge to attack, and a first-
// punch tactic. Plus an axis summary that names the open quadrant.
//
// Inputs:
//   - projectContext (Pass 0)
//   - positioning (Pass 4 positioning_spine)
//   - valueProp (Pass 5 comparisons array — provides competitor names if available)
//   - adIntelCompetitors (Ad-Intel Stage A — richer competitor data if available)
//
// Pass 5 ≠ Pass 15:
//   - Pass 5: brand vs N incumbents on stated value prop. Quick, surface.
//   - Pass 15: same N incumbents (or derived if no Pass 5) but with the
//     full strategic frame: how to attack each one + the empty quadrant.
export async function generateCompetitiveTeardown(apiKey, projectContext, positioning, valueProp = null, adIntelCompetitors = null) {
  const ctx = projectContext ? `Brand: ${projectContext.sector}\nAudience: ${projectContext.audience}\nVoice: ${projectContext.brand_voice}\nKey facts: ${(projectContext.key_facts || []).slice(0, 6).join("; ")}` : "";
  const pos = positioning?.primary?.sentence ? `Positioning: "${positioning.primary.sentence}"\nRationale: ${positioning.primary.rationale || ""}` : "";

  // Prefer ad-intel competitor data (richer · has classification + spend tier).
  // Fall back to Pass 5 value-prop comparison data. If neither, ask Claude to
  // derive 6 competitors from projectContext.key_facts (best-effort).
  const competitorBlock = (() => {
    if (adIntelCompetitors && adIntelCompetitors.length) {
      return `Known competitors (from Ad-Intel Stage A — use these exact 6-8):\n${adIntelCompetitors.slice(0, 8).map(c => `- ${c.brand_name} (${c.classification || "direct"}) · ${c.spend_tier || "spend tier unknown"} · ${c.page_url || ""} · ${c.evidence || ""}`).join("\n")}`;
    }
    if (valueProp?.comparisons?.length) {
      return `Known competitors (from Pass 5 value-prop comparison — use these as anchors and add 1-2 more if needed to reach 6):\n${valueProp.comparisons.map(c => `- ${c.competitor_name} · value prop: "${c.their_stated_value_prop || ""}" · ${c.source_url || ""}`).join("\n")}`;
    }
    return "No prior competitor list. Identify 6 plausible competitors from the project context key facts (named incumbents in the same category that customers would name-drop). Be honest if the category is sparse.";
  })();

  const data = await callClaude(apiKey,
    `You are a competitive strategist producing the deep §15 teardown — the matrix that lets the founder know exactly which incumbent to attack first and why.

For 6 competitors, return:
- competitor_name (canonical English name)
- category_position (3-6 words: "established luxury", "DTC challenger", "mass-market incumbent", "aspirational outlier", "trend-cycle native", etc.)
- price_anchor (USD range with format like "$120-180 per set" or "$45-90 entry")
- primary_promise (the ONE sentence the brand sells on — verbatim if known, otherwise paraphrased; should be the line their ads or hero copy actually use)
- creative_pattern (the hook archetype they consistently run — e.g. "founder POV + fabric macro", "before-after + percentage off", "celebrity placement + lifestyle", "UGC testimonial wall")
- where_we_win (2-3 things our brand does better, anchored to project context · 1 sentence)
- where_we_lose (2-3 things THEY do better that we have to live with · 1 sentence · be honest)
- wedge_to_attack (1 sentence: the specific gap in their positioning we can press)
- first_punch (1 sentence: a concrete tactic — ad concept, channel placement, or content angle — to start the attack within 4 weeks)

Plus an axis summary mapping the 2D competitive landscape:
- x_axis_label (the spectrum that separates competitors horizontally — e.g. "Price tier" or "Trend-cycle dependent ↔ Heritage")
- y_axis_label (the spectrum that separates them vertically — e.g. "Aesthetic-led ↔ Sensory-led")
- brand_position (where our brand lands on both axes · 1 short phrase)
- open_quadrant (the empty corner of the 2D map · 1 sentence on which incumbent set is absent there)
- summary_sentence (1 sentence: the strategic thesis · what quadrant we claim and why no one else can take it from us inside 12 months)

Return ONLY JSON:
{
  "competitive_matrix": [{...}, {...}, {...}, {...}, {...}, {...}],
  "axis_summary": {
    "x_axis_label": "...",
    "y_axis_label": "...",
    "brand_position": "...",
    "open_quadrant": "...",
    "summary_sentence": "..."
  }
}

Rules:
- 6 competitors. Not 5, not 8. The matrix renders best at exactly 6.
- where_we_win and where_we_lose must be specific, not generic ("smaller team" is NOT a win — "size inclusivity to 4X" IS).
- first_punch must be a tactic that can ship in 4 weeks. No "build brand awareness" non-tactics.
- If the brand is genuinely strongest in one quadrant, name it. If it's contested, say so in summary_sentence.`,
    `${ctx}\n\n${pos}\n\n${competitorBlock}`,
    { maxTokens: 6000 }
  );
  return extractJSON(data);
}

// ── PASS 16: Brand Audit (Engine v1.6.6) ──
//
// Renders as §15 of the strategy doc. A state-of-the-brand checkup
// across 8-10 public surfaces. Anchored to underserved Ulwick outcomes
// so the audit knows what "broken" means relative to THIS brand's
// strategic goal — not generic marketing best practices.
//
// Inputs:
//   - projectContext (Pass 0) — required, gives brand voice + key facts
//   - mergedJobs (Pass 1+2) — required, gives the outcomes the audit anchors to
//   - scrapedContent (optional) — raw scrape of brand site from ingestion
// v1.7.2 · Pass 16 prompt rewritten to BAN the "Likely / Probably / Seems
// to / Appears to" hedging the v1.6.6 version produced on every row when
// the scrape was missing. New rule: each row is either OBSERVED (from
// scrape) or marked `data_status: "no_visibility"` with explicit instruction
// to skip the current_state field rather than guess. The renderer surfaces
// no-visibility rows with a dashed border + "scrape required" tag so the
// user sees the data gap instead of believing fabricated audit text.
export async function generateBrandAudit(apiKey, projectContext, mergedJobs, scrapedContent = "") {
  const ctx = projectContext ? `Brand: ${projectContext.sector}\nAudience: ${projectContext.audience}\nVoice rules: ${projectContext.brand_voice}\nKey facts:\n${(projectContext.key_facts || []).map(f => `- ${f}`).join("\n")}` : "";

  const topOutcomes = (mergedJobs || []).flatMap(j =>
    (j.outcomes || []).map(o => ({ job_id: j.id, statement: o.statement, score: o.opportunity_score }))
  ).sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 5);

  const outcomeBlock = topOutcomes.length
    ? `Top underserved outcomes the audit must anchor to (a surface is "broken" if it fails one of these):\n${topOutcomes.map(o => `- Job ${o.job_id} (opp ${o.score}): ${o.statement}`).join("\n")}`
    : "No scored outcomes available — audit will be limited.";

  const hasScrape = !!(scrapedContent && scrapedContent.length > 200);
  const sourcesBlock = hasScrape
    ? `\n\nSCRAPED BRAND SITE CONTENT (this is the ONLY source of truth · only audit surfaces you can SEE in this scrape · do NOT fabricate copy not present):\n${scrapedContent.slice(0, 12000)}`
    : `\n\nNO SCRAPED SITE CONTENT WAS PROVIDED. You have ZERO direct visibility into this brand's public surfaces. You MUST mark every visual surface (homepage, PDP, about page, email opt-in, reviews, cart, FAQ, press) with data_status: "no_visibility" · current_state: "" · what_works: "" · what_breaks: "" · recommended_fix: "" instead of inferring from the project context. Only social-channel rows are exceptions IF the project context provides verbatim signals.`;

  const data = await callClaude(apiKey,
    `You are auditing a brand's public-facing surfaces against its underserved-outcome targets. Return 8-10 surface rows. Each row is EITHER observed (you can see it in the scraped content) OR explicitly marked no_visibility — never hedged.

Cover these surfaces (skip ones that genuinely don't apply to this brand):
- Homepage hero (the first 2 seconds above the fold)
- Product detail page (PDP) — hero + benefit copy
- About / Founder page
- Email opt-in (the lead magnet + capture form)
- Primary social channel — content patterns
- Secondary social channel — content patterns
- Reviews / UGC presentation
- Cart / Checkout (friction, trust signals)
- FAQ / objection handling
- Press / earned-media surface

For each surface:
- area_name (exact label from the list above)
- data_status: "observed" if you can quote from the scrape · "no_visibility" if you cannot · "context_only" if the project context contains a verbatim signal about this surface (rare)
- current_state: for "observed" → 1-2 sentences quoting/paraphrasing what's actually on the surface. For "no_visibility" → return EMPTY STRING "". Do NOT speculate.
- what_works: 1-2 sentences on what's pointing at the right outcome · empty string for no_visibility rows
- what_breaks: 1-2 sentences on the specific gap measured against an underserved outcome (cite the outcome by its exact phrasing or job_id) · empty string for no_visibility rows
- ulwick_anchor_job_id: number · which top-outcome job this surface should serve
- fix_priority: "high" / "medium" / "low" · for no_visibility rows, use "scrape_first" instead
- recommended_fix: 1 sentence concrete + ship-in-2-weeks · for no_visibility rows return "" and put a scrape-instruction in scrape_hint instead
- scrape_hint: optional · for no_visibility rows only · 1 sentence telling the user how to capture this surface (e.g. "Paste a PDF export of the homepage in the next Pass 0 run.")

Plus top-level:
- audit_summary: 1-2 sentence top-line verdict · explicitly mention how many surfaces were observed vs. no_visibility (e.g. "Audited 8 surfaces: 5 observed via scrape, 3 require additional ingestion")
- voice_consistency: { score: 1-10 ONLY on observed surfaces · strongest_surface (must be one in observed/context_only) · weakest_surface (same) · drift_notes }
- discoverability: { branded_search: "good"/"spotty"/"weak" · unbranded_search: "good"/"spotty"/"weak" · notes — only assess if you can see the brand name in search-relevant context }

Return ONLY JSON:
{
  "audit_summary": "...",
  "areas": [{...}, ...],
  "voice_consistency": {...},
  "discoverability": {...}
}

ABSOLUTE RULES:
1. The words "Likely", "Probably", "Seems to", "Appears to", "Should be", "May be", "Could be" are BANNED in every output field. If you don't have evidence, set data_status: "no_visibility" and leave the fields empty.
2. Every "what_breaks" on an observed surface MUST quote or paraphrase a specific underserved outcome (use the exact Ulwick phrasing where possible) or a project-context key fact.
3. Every "recommended_fix" must be ship-in-2-weeks specific with a named asset (e.g. "Add a 'Made by hand · TENCEL Modal' strip above the fold") · not generic ("improve brand awareness").
4. voice_consistency.score must reflect ONLY observed surfaces · null if zero surfaces observed.
5. If data_status === "no_visibility", do NOT fabricate fix recommendations · use scrape_hint instead.`,
    `${ctx}\n\n${outcomeBlock}${sourcesBlock}`,
    { maxTokens: 7500 }
  );
  return extractJSON(data);
}

// ── PASS 17: Demand Landscape (Engine v1.6.6) ──
//
// Renders as §16 of the strategy doc. Deeper than Pass 3 web validation:
// Pass 17 maps the CATEGORY's demand by funnel stage (TOFU/MOFU/BOFU)
// + names white-space keywords + identifies seasonal pulse + reads
// category temperature.
//
// Inputs:
//   - projectContext (Pass 0)
//   - positioning (Pass 4 positioning_spine)
//   - mergedJobs (Pass 1+2) — with search_queries
//   - searchVolumeData (optional) — SerpAPI cache from Pass 3
export async function generateDemandLandscape(apiKey, projectContext, positioning, mergedJobs, searchVolumeData = null) {
  const ctx = projectContext ? `Brand: ${projectContext.sector}\nAudience: ${projectContext.audience}` : "";
  const pos = positioning?.primary?.sentence ? `Positioning: "${positioning.primary.sentence}"` : "";

  const queryBlock = (mergedJobs || []).flatMap(j => j.search_queries || []).slice(0, 30);
  const querySeed = queryBlock.length
    ? `Seed search queries surfaced during job discovery (start here, fan out from these):\n${queryBlock.map(q => `- ${q}`).join("\n")}`
    : "No seed queries available — derive from the brand context.";

  const volumeBlock = searchVolumeData && Object.keys(searchVolumeData).length
    ? `\n\nKnown search volume data (use exact numbers when present):\n${Object.values(searchVolumeData).flat().slice(0, 20).map(v => `- "${v.keyword}" · ${v.monthly_volume || "?"}/mo · comp ${v.competition_index || "?"}`).join("\n")}`
    : "";

  const data = await callClaude(apiKey,
    `You are a search-demand analyst mapping the category's demand landscape. Produce a 3-stage funnel view (TOFU awareness · MOFU consideration · BOFU purchase) + white-space keywords + seasonal pulse + category temperature read.

For each funnel stage:
- stage (exact label: "TOFU · Awareness" / "MOFU · Consideration" / "BOFU · Purchase")
- audience_intent (1 sentence describing the mindset at this stage)
- top_keywords (5-7 keywords) — each: { kw, volume_estimate: "high"/"medium"/"low", competition: "high"/"medium"/"low", wedge: "what makes this a wedge for our brand specifically · 1 sentence" }
- question_patterns (4-6 short phrases — what people literally type into Google · "how to ...", "what is ...", "best ... for ...", etc.)

Plus:
- demand_summary (1-2 sentence read on the category's overall demand temperature + where the wedge is biggest)
- white_space_keywords (3-5 keywords) — each: { kw, why: "1 sentence on why this is open · low competition + high intent + brand-fit", first_test: "1 sentence on a concrete 2-week test" }
- seasonal_pulse (2-4 periods) — each: { period (e.g. "Q4 holiday gifting", "Back-to-school"), lift: "estimated % vs baseline · be honest if unknown", play: "1 sentence on how to lean in" }
- category_temperature: { label: "Heating" / "Stable" / "Cooling", evidence: "1-2 sentences citing trend signals visible in the seed queries or volume data" }

Return ONLY JSON:
{
  "demand_summary": "...",
  "funnel_stages": [{...}, {...}, {...}],
  "white_space_keywords": [...],
  "seasonal_pulse": [...],
  "category_temperature": {...}
}

Rules:
- Be honest about volume estimates when uncertain — "low" is a valid answer, not a failure.
- White-space keywords must score on BOTH dimensions (low competition AND high intent). A high-volume keyword with no competition is suspicious — flag it.
- Seasonal pulse %s are estimates · always frame as estimates not facts.`,
    `${ctx}\n\n${pos}\n\n${querySeed}${volumeBlock}`,
    { maxTokens: 6000 }
  );
  return extractJSON(data);
}

// ── Budget validator (Engine v1.6.8 · pure JS, no LLM call) ──
//
// Pass 11 sometimes emits a `channels[]` whose `budget_pct` values don't
// sum to 100 (LLM rounding drift). This validator normalizes proportionally
// to 100 and surfaces the original sum so the user knows it happened.
// Idempotent · safe to call multiple times.
export function validateAndNormalizeChannelPlan(channelPlan) {
  if (!channelPlan?.channels?.length) {
    return { ...(channelPlan || {}), _validation: { ok: true, applied: false } };
  }
  const channels = channelPlan.channels.map(c => ({ ...c }));
  const originalSum = channels.reduce((acc, c) => acc + (Number(c.budget_pct) || 0), 0);
  // Accept 99-101 as already-good (rounding tolerance)
  if (Math.abs(originalSum - 100) <= 1 || originalSum === 0) {
    return { ...channelPlan, channels, _validation: { ok: true, applied: false, original_sum: originalSum } };
  }
  const factor = 100 / originalSum;
  channels.forEach(c => {
    c.budget_pct = Math.round((Number(c.budget_pct) || 0) * factor);
  });
  // Rounding remainder lands on the largest channel
  const newSum = channels.reduce((a, c) => a + c.budget_pct, 0);
  if (newSum !== 100 && channels.length) {
    const largest = channels.reduce((max, c, i) =>
      c.budget_pct > channels[max].budget_pct ? i : max, 0);
    channels[largest].budget_pct += (100 - newSum);
  }
  return {
    ...channelPlan,
    channels,
    _validation: { ok: true, applied: true, original_sum: originalSum, final_sum: 100 },
  };
}

// ── HERMES META-PASS · generateRunRetrospective (Engine v1.6.12) ──
//
// Not a strategy-doc section. Meta-pass that reads outputs from
// Passes 1-18 and proposes prompt-improvement candidates for the user
// to approve. Accepted candidates append to the project's brand_learned
// Airtable field (Pattern B) so future runs benefit.
//
// Spec'd in v1.7 backlog row #18 as "Pass 15 generateRunRetrospective"
// but renamed here to avoid collision with the now-shipped Pass 15
// generateCompetitiveTeardown. Internally referred to as the "Hermes
// retrospective pass" · not numbered in the strategy doc.
//
// Inputs:
//   - projectContext (Pass 0 output)
//   - allOutputs · { mergedJobs, entryRecs, positioning, personas,
//                    swipeFile, scripts, emailFlows, channelPlan,
//                    landing, rollout, creators, competitive,
//                    brandAudit, demandLandscape, tribe }
//
// Output:
//   {
//     overall_verdict: "1-2 sentence read on the run's quality",
//     candidates: [
//       {
//         pass_id: 1-18,
//         pass_name: "discoverJobs",
//         severity: "high" | "medium" | "low",
//         observation: "What looked weak",
//         improvement: "Concrete prompt-level fix (1-2 sentences)",
//         brand_learned_entry: "If accepted, this is what appends to brand_learned",
//       }
//     ],
//     wins: ["What worked well · keep doing this"]
//   }
export async function generateRunRetrospective(apiKey, projectContext, allOutputs) {
  const ctx = projectContext ? `Brand: ${projectContext.sector}\nAudience: ${projectContext.audience}` : "";

  // Compact summary of each pass output · keep prompt under ~20K chars
  const summarize = (pass, val, getLabel) => {
    if (!val) return `${pass}: (not run)`;
    if (Array.isArray(val)) return `${pass}: ${val.length} entries · samples: ${val.slice(0, 2).map(getLabel).join(" · ")}`;
    return `${pass}: ${getLabel(val)}`;
  };

  const passDigest = [
    summarize("Pass 1 jobs", allOutputs.mergedJobs, (j) => `[${j.id}] ${j.job_statement?.slice(0, 80)}`),
    summarize("Pass 4 positioning", allOutputs.positioning?.primary, (p) => `"${p.sentence?.slice(0, 100)}" (score ${p.citation_score})`),
    summarize("Pass 4 entry recs", allOutputs.entryRecs, (r) => `${r.strategy}: ${r.target_job?.slice(0, 60)}`),
    summarize("Pass 7 personas", allOutputs.personas, (p) => `${p.name} (${p.archetype})`),
    summarize("Pass 8 swipe file", allOutputs.swipeFile, (s) => `${s.id} ${s.framework}`),
    summarize("Pass 11 channels", allOutputs.channelPlan?.channels, (c) => `${c.channel} ${c.budget_pct}%`),
    summarize("Pass 13 rollout", allOutputs.rollout?.phases, (p) => `${p.theme}`),
    summarize("Pass 14 creators", allOutputs.creators?.creator_briefs, (b) => `${b.packet_id} ${b.creator_archetype}`),
    summarize("Pass 15 competitive", allOutputs.competitive?.competitive_matrix, (c) => `${c.competitor_name}: ${c.wedge_to_attack?.slice(0, 60)}`),
    summarize("Pass 16 audit", allOutputs.brandAudit?.areas, (a) => `${a.area_name} [${a.fix_priority}]`),
    summarize("Pass 17 demand", allOutputs.demandLandscape?.white_space_keywords, (w) => `"${w.kw}"`),
    summarize("Pass 18 tribe", allOutputs.tribe?.creators?.filter(c => c.verified !== false), (c) => `${c.handle} (${c.tier})`),
  ].join("\n");

  const data = await callClaude(apiKey,
    `You are a meta-reviewer auditing an ODI engine's full-run output for prompt-quality issues. Your job: scan the digest below and surface concrete, schema-anchored improvements that would make the NEXT run better. Be honest · severity should reflect real signal, not LLM politeness.

For each issue you flag:
- pass_id (1-18)
- pass_name (exact function name from the engine)
- severity ("high" / "medium" / "low")
- observation (1 sentence describing what looked weak in THIS run · cite specifics from the digest)
- improvement (1-2 sentences proposing a concrete prompt-level fix · phrased as a rule the prompt should add)
- brand_learned_entry (1-3 sentences · what to write to brand_learned if the user accepts this candidate · written as a brand-specific learning, not a generic rule)

Plus an overall_verdict (1-2 sentences · honest, e.g. "Strong on positioning + entry wedge. Weak on creator briefs — too generic.") and a wins array (3-5 things that worked well · keep-doing-this signals).

Cap candidates at 5 high/medium issues. Skip cosmetic complaints. No generic marketing advice — every candidate must reference a specific pass output you saw in the digest.

Return ONLY JSON:
{
  "overall_verdict": "...",
  "candidates": [{...}, ...0-5],
  "wins": ["...", ...]
}`,
    `${ctx}\n\nRun digest:\n${passDigest}`,
    { maxTokens: 5000 }
  );
  return extractJSON(data);
}

// ── PASS 18: Tribe Readout (Engine v1.6.7) ──
//
// Renders as §17. Finds and VERIFIES creators via web_search.
// The v1.3 verify-creators rule is non-negotiable: every `handle`
// listed must be confirmed real via a web_search result. Candidates
// the model couldn't verify are demoted to `search_paths` (sourcing
// queries for a human matcher) — never listed as "creators".
//
// Different from Pass 14 (creator briefs):
//   - Pass 14 outputs ARCHETYPES + sourcing criteria · no handles
//   - Pass 18 outputs VERIFIED HANDLES + tier + audience-fit evidence
//
// Inputs:
//   - projectContext (Pass 0)
//   - personas (Pass 7) — who each creator should reach
//   - creatorBriefs (Pass 14) — optional · archetypes to hunt for
export async function generateTribeReadout(apiKey, projectContext, personas, creatorBriefs = null) {
  const ctx = projectContext ? `Brand: ${projectContext.sector}\nAudience: ${projectContext.audience}\nVoice: ${projectContext.brand_voice}` : "";
  const personaList = (personas || []).slice(0, 5).map(p =>
    `- ${p.name} (${p.archetype}) · lives at: ${p.lives_online_at || "?"}`
  ).join("\n");

  const briefSeed = creatorBriefs?.creator_briefs?.length
    ? `Archetype hunt list from Pass 14:\n${creatorBriefs.creator_briefs.map(b => `- ${b.creator_archetype} on ${b.platform} for ${b.target_persona_name}`).join("\n")}`
    : "No prior archetype seeds. Derive from personas.";

  const data = await callClaude(apiKey,
    `You are a creator-research analyst. Your single most important rule: DO NOT FABRICATE HANDLES. Every handle you list must be confirmed real by a web_search result you cite as evidence. If you can't verify, demote that candidate to a search_path query for a human sourcer.

Use web_search to find creators who match the personas + archetypes below. For each verified creator, return:
- handle (the @-handle, exact spelling · must match what web_search returned)
- platform ("TikTok" / "Instagram" / "YouTube" / "Substack" / "Podcast")
- verified (boolean) — TRUE only if web_search returned a result confirming this exact handle exists and is active
- follower_band ("under 10k" / "10k-50k" / "50k-100k" / "100k-500k" / "500k-1M" / "1M+")
- primary_content (1 sentence describing what they post about · use what web_search showed)
- audience_fit (1 sentence on how their audience overlaps with our target persona)
- target_persona (which persona name from the list this creator reaches)
- outreach_priority ("high" / "medium" / "low")
- tier ("Tier 1 hero" / "Tier 2 UGC" / "Tier 3 spark" / "Aspirational")
- evidence (the specific web_search snippet that confirmed this handle exists · verbatim quote if possible · NO QUOTE = NOT VERIFIED = demote to search_paths)

Plus:
- tribe_summary (1-2 sentence read on the creator landscape · honest if sparse)
- search_paths (3-5 records) — for archetypes you couldn't verify a handle for: { platform, query: "specific search a human sourcer should run", why: "what creator type we're hunting" }
- honest_caveats (array of strings) — anything the model wasn't able to verify or surfaces with low confidence

Return ONLY JSON:
{
  "tribe_summary": "...",
  "creators": [{...}, ...],   // 6-12 entries · all verified=true
  "search_paths": [{...}, ...],
  "honest_caveats": ["..."]
}

Rules:
- Aim for 6-12 verified creators. If you can only find 4, return 4 — do NOT pad.
- If web_search returns nothing for a category, add a search_path query instead of a fake handle.
- "evidence" must be a verbatim phrase or URL from a search result · NO PARAPHRASE.
- Tier mapping: Tier 1 hero = 50k-500k follower band, longform content · Tier 2 UGC = 10k-50k, scrappy content · Tier 3 spark = under 10k, micro-niche · Aspirational = 500k+ as reach play.`,
    `${ctx}\n\nPersonas:\n${personaList}\n\n${briefSeed}\n\nFind verified creators per the rules. Use web_search aggressively. Demote anything you can't verify.`,
    {
      maxTokens: 8000,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 12 }],
    }
  );
  return extractJSON(data);
}

// ── PASS D · Strategic Diagnostic (Engine v1.7.0) ──
//
// Classifies a project across four axes BEFORE any downstream pass runs:
//   1. Business Model Archetype (one of 11 controlled-vocab values)
//   2. Market Maturity (3 stages, Demand Curve PM101)
//   3. Market Sophistication (5 stages, Schwartz/Halbert)
//   4. Emotional Journey (From → To paradigm, Map of Consciousness)
// Plus a recommended Brand Archetype + awareness distribution.
//
// is_supported + phase_target are populated DETERMINISTICALLY from the
// BUSINESS_MODELS registry · Claude classifies, the registry gates.
//
// PM101 framework definitions are embedded VERBATIM (no paraphrase) per
// the v3 build-plan spec. When the user ports PM101 to their vault,
// these definitions can be loaded from there instead.
import { BUSINESS_MODELS, DEFAULT_BUSINESS_MODEL, getControlledVocabulary, resolveBusinessModel } from "./business-models.js";

const PM101_DEFINITIONS = `
─── MARKET MATURITY (3 stages · Demand Curve) ───
Measures how familiar the Target Customer is with the activity / workflow your product enables.

Stage 1 · Immature Market
  Customers are not yet performing the core activity your product enables. They are unaware
  that the activity is a path to their desired outcome.
  Customer Mindset: "Why should I even consider doing this new activity?"
  Positioning Approach: Position your new Activity against Alternative Activities to prove
  it's the best way to achieve a desired Outcome.

Stage 2 · Emerging Market
  Customers are now performing the activity, but often with a mix of ill-fitting, generic,
  or manual tools.
  Customer Mindset: "What is the best type of tool for this activity I'm already doing?"
  Positioning Approach: Position your Product Category against Alternative Categories to
  prove it's the best tool for an established Activity.

Stage 3 · Mature Market
  The market is well-defined. Customers know the activity, the correct product category,
  and the major players.
  Customer Mindset: "Why is your specific product better than the others I already know?"
  Positioning Approach: Position Your Product against Alternative Products to prove
  superior Differentiation within an established Category.

─── MARKET SOPHISTICATION (5 stages · Schwartz/Halbert) ───
Measures the market's exposure to claims related to a desire. More claims seen = more
sophisticated = more specific message required.

Stage 1 · The First to Market
  Market has never heard a claim like yours. No competition.
  Messaging: Direct and simple. Name the desire and your solution.
  Example: "Now you can lose weight."

Stage 2 · The Claim Elaborated
  Market has heard the initial claim from competitors. Simple promise no longer enough.
  Messaging: Make the original claim bigger, better, or more extreme.
  Example: "Lose 30 pounds in 30 days."

Stage 3 · The Mechanism
  Market is skeptical of big claims. Needs to know HOW it works.
  Messaging: Introduce a unique Mechanism — the specific process or component that
  makes your claim possible.
  Example: "Lose weight by boosting your metabolism with our unique herbal formula."

Stage 4 · The Mechanism Elaborated
  Competitors have copied your mechanism. Market understands how this type of product works.
  Messaging: Make your mechanism better, faster, or more efficient than competitors.
  Example: "Our new formula boosts your metabolism 2X faster than anything else."

Stage 5 · Identification
  Market is saturated and exhausted. Doesn't believe new claims about features or mechanisms.
  Desire remains but belief in new solutions is gone.
  Messaging: Shift from what the product DOES to who it's FOR. Connect product to identity.
  Example: "The weight loss solution for busy moms."

─── MAP OF CONSCIOUSNESS (Hawkins · 4 paradigms · 17 levels) ───
Vertical measure of emotional state. The From→To journey defines the emotional transformation
your product promises.

Survival Paradigm (Shame → Pride) · Realm of Pain
  Shame · Guilt · Apathy · Grief · Fear · Desire (as Craving) · Anger · Pride
  Customers driven by negative emotions, problems feel threatening or overwhelming.
  Marketing meets them where they are (validate the fear) then shows path to higher state.

Tipping Point · Courage
  Customer must be at Courage or higher to actively seek a new solution.
  View of Life becomes Feasible. Believes change is possible.

Reason & Integrity Paradigm (Neutrality → Reason) · Realm of solution evaluation
  Neutrality · Willingness · Acceptance · Reason
  Customers have Trust + Optimism to explore your Solution. Reason-level customers logically
  evaluate Value Proposition, Features, Advantages.

Spiritual Paradigm (Love and Above) · Realm of ultimate Benefit + brand evangelism
  Love · Joy · Peace · Enlightenment
  When product delivers on promise, can elevate customer to evangelist state.

─── BRAND ARCHETYPES (Jung · 12) ───
The personality that delivers your Value Proposition. Chosen based on customer's emotional
From→To journey.

PROVIDE STRUCTURE: Creator (LEGO, Adobe · enduring value via creation) · Ruler
  (Mercedes, Rolex · order via control and quality) · Caregiver (Johnson & Johnson, Dove ·
  protect and care)

CONNECT WITH OTHERS: Everyman (IKEA · belong via authenticity) · Jester (Old Spice, M&M's ·
  enjoy via humor) · Lover (Victoria's Secret · intimate sensory pleasure)

YEARN FOR PARADISE: Innocent (Coca-Cola, Disney · goodness via simplicity) · Sage (Google,
  BBC News · truth via intelligence) · Explorer (North Face, Jeep · find self via adventure)

LEAVE A MARK: Outlaw (Harley-Davidson, early Apple · overturn what isn't working) · Magician
  (Dyson, Tesla · transformative experiences) · Hero (Nike · prove worth via mastery)

─── AWARENESS LEVELS (Schwartz · 7) ───
Customer's knowledge of Problem → Outcome → Solution. Marketing must match level.

1 Unaware · doesn't know they have a problem · symptoms felt but unnamed
2 Problem-Aware · has named the problem · focused on pain
3 Outcome-Aware · focus on desired Outcome / JTBD · envisioning a better future
4 Use Case-Aware · comparing methods/strategies (not products) to achieve outcome
5 Product Category-Aware · evaluating tool TYPES that enable the use case
6 Product-Aware · comparing specific brands/products in chosen category
7 Most Aware · decided on product · needs the close (offer + urgency)

Audience is largest at Unaware, smallest at Most Aware.
`.trim();

const DIAGNOSTIC_SYSTEM_PROMPT = `You are a senior product-marketing strategist classifying a brand across 4 strategic axes BEFORE any downstream marketing plan is built. The classification drives pass routing + persona variant + library priors. Be honest · classifying a brand into the wrong archetype produces a wrong-shape strategy doc.

CONTROLLED VOCABULARY · business_model.primary MUST be one of:
${getControlledVocabulary().map((id) => `  - ${id} · ${BUSINESS_MODELS[id].label}`).join("\n")}

${PM101_DEFINITIONS}

Return ONLY JSON, no markdown:
{
  "business_model": {
    "primary": "<one of the controlled vocab IDs>",
    "sub_signals": ["specific signals from project_context that drove this classification"],
    "confidence": 0.0-1.0,
    "evidence": "1-2 sentences from project_context grounding the classification"
  },
  "market_maturity": {
    "stage": 1|2|3,
    "stage_label": "Immature Market" | "Emerging Market" | "Mature Market",
    "rationale": "1-2 sentences",
    "positioning_implication": "What this means for positioning approach (Activity-vs-Activity / Category-vs-Category / Product-vs-Product)"
  },
  "market_sophistication": {
    "stage": 1|2|3|4|5,
    "stage_label": "The First to Market" | "The Claim Elaborated" | "The Mechanism" | "The Mechanism Elaborated" | "Identification",
    "rationale": "1-2 sentences citing competitor claims observed in project_context",
    "messaging_approach": "What the message must do at this stage"
  },
  "emotional_journey": {
    "from_state": "<one of the 17 MoC levels>",
    "from_paradigm": "Survival" | "Reason & Integrity" | "Spiritual",
    "to_state": "<one of the 17 MoC levels · must be higher than from_state>",
    "to_paradigm": "Survival" | "Reason & Integrity" | "Spiritual",
    "rationale": "1-2 sentences"
  },
  "recommended_archetype": {
    "primary": "<one of the 12 archetypes>",
    "alternative": "<another archetype as backup>",
    "rationale": "Why this archetype fits the From→To journey"
  },
  "awareness_distribution": {
    "unaware": 0.0-1.0,
    "problem_aware": 0.0-1.0,
    "outcome_aware": 0.0-1.0,
    "use_case_aware": 0.0-1.0,
    "product_category_aware": 0.0-1.0,
    "product_aware": 0.0-1.0,
    "most_aware": 0.0-1.0
  }
}

Rules:
- Every classification anchored to specific evidence from the project_context. No invention.
- business_model.primary MUST be from controlled vocab.
- awareness_distribution sums to 1.0 ± 0.02.
- from_state and to_state must both be valid MoC levels; to_state must be higher than from_state.
- recommended_archetype must be from the 12 Jung archetypes.`;

export async function diagnoseStrategicContext(apiKey, projectContext) {
  const ctxBlock = projectContext
    ? `Project context (Pass 0 output):\n${JSON.stringify(projectContext, null, 2)}`
    : "No project context provided · derive from the brand's sector field if available.";

  const data = await callClaude(apiKey, DIAGNOSTIC_SYSTEM_PROMPT, ctxBlock, { maxTokens: 3000 });
  const parsed = extractJSON(data);

  // ── Post-process · registry decides support, not Claude ──
  const primaryId = parsed.business_model?.primary;
  const inVocab = !!BUSINESS_MODELS[primaryId];
  if (!inVocab) {
    console.warn(`[Pass D] business_model.primary "${primaryId}" not in vocab · coerced to ${DEFAULT_BUSINESS_MODEL}`);
    parsed.business_model = { ...(parsed.business_model || {}), primary: DEFAULT_BUSINESS_MODEL };
  }
  const resolvedBm = resolveBusinessModel(parsed.business_model.primary);
  parsed.business_model.is_supported = resolvedBm.is_supported;
  parsed.business_model.phase_target = resolvedBm.phase_target;
  parsed.business_model.library_priors = resolvedBm.library_priors;

  // ── Validate + normalize awareness_distribution ──
  const aw = parsed.awareness_distribution || {};
  const keys = ["unaware","problem_aware","outcome_aware","use_case_aware","product_category_aware","product_aware","most_aware"];
  keys.forEach((k) => { if (typeof aw[k] !== "number") aw[k] = 0; });
  const sum = keys.reduce((s, k) => s + aw[k], 0);
  if (Math.abs(sum - 1.0) > 0.02 && sum > 0) {
    const factor = 1.0 / sum;
    keys.forEach((k) => { aw[k] = Math.round(aw[k] * factor * 100) / 100; });
    // round-drift fix on the largest bucket
    const newSum = keys.reduce((s, k) => s + aw[k], 0);
    if (Math.abs(newSum - 1.0) > 0.001) {
      const largest = keys.reduce((max, k) => aw[k] > aw[max] ? k : max, keys[0]);
      aw[largest] = Math.round((aw[largest] + (1 - newSum)) * 100) / 100;
    }
  }
  parsed.awareness_distribution = aw;

  parsed.diagnostic_version = "1.0";
  parsed.generated_at = new Date().toISOString();
  return parsed;
}

// ── PASS L · Apply Playbook Library (Engine v1.7.0) ──
//
// Three-step:
//   1. rankByPriors against the resolved archetype's library_priors
//   2. LLM retrieval call · select 8-12 from top-80 by applicability
//   3. Per-concept apply · pull full markdown, generate anchored card
//
// Anchoring rule: every playbook MUST anchor to a real persona name
// AND a real Ulwick outcome statement from the input · drop if can't.
// Same discipline as v1.3 verify-creators · no fabrication.
import { rankByPriors } from "./library-reader.js";

const PL_RETRIEVAL_SYSTEM = `You are a marketing-playbook curator. You have a library of growth playbooks (each is a single named tactic/framework). Given a brand's strategic diagnostic + positioning + personas + a ranked candidate list of playbooks, pick the 8-12 that would most concretely move the needle for THIS brand in the next 12 weeks.

Return ONLY JSON:
{ "selected": [{ "id": "<concept id from candidates>", "rationale": "1 sentence on why this brand specifically" }, ...] }

Rules:
- Pick 8-12. No fewer, no more.
- Every "id" must match a candidate exactly.
- Rationale must reference the brand · not the playbook generically.
- Prefer playbooks the brand could actually start within 2 weeks.`;

const PL_APPLY_SYSTEM = `You are translating a generic marketing playbook into a project-specific applied entry. You see the playbook's full content, plus the brand's diagnostic, positioning, personas list, and ranked Ulwick outcomes.

You MUST anchor the applied entry to:
- A REAL persona name from the personas list (exact spelling)
- A REAL Ulwick outcome statement from the merged jobs (exact verbatim or close paraphrase)
- A concrete first_move shippable in 2 weeks

If you cannot anchor BOTH a real persona AND a real outcome, return { "drop": true, "reason": "..." }.

Otherwise return ONLY JSON:
{
  "anchored_to_persona": "<exact persona name>",
  "anchored_to_outcome": "<exact Ulwick outcome statement>",
  "why_it_applies": "1-2 sentences tied to THIS brand's diagnostic + positioning · no generic claims",
  "first_move": "Concrete project-specific first move · 8-20 words · ships in 2 weeks",
  "owner": "Founder | Marketing lead | Agency",
  "kpi": "What to measure with a numeric target",
  "success_signal": "1 line · what makes this a hit"
}`;

export async function applyPlaybookLibrary(apiKey, {
  projectContext,
  diagnostic,
  positioning,
  personas,
  mergedJobs,
  conceptIndex,
}) {
  const concepts = conceptIndex?.concepts || conceptIndex || [];
  if (!concepts.length) {
    return { applied_playbooks: [], note: "No concept library loaded · skip" };
  }

  // Step 1 · rank by priors
  const ranked = rankByPriors({ concepts }, diagnostic?.business_model?.library_priors || {});
  const top80 = ranked.slice(0, 80);

  // Step 2 · retrieval call
  const ctxSummary = [
    projectContext?.sector ? `Brand: ${projectContext.sector}` : null,
    diagnostic?.business_model?.primary ? `Archetype: ${diagnostic.business_model.primary}` : null,
    diagnostic?.market_maturity?.stage_label ? `Maturity: ${diagnostic.market_maturity.stage_label}` : null,
    diagnostic?.market_sophistication?.stage_label ? `Sophistication: ${diagnostic.market_sophistication.stage_label}` : null,
    positioning?.primary?.sentence ? `Positioning: "${positioning.primary.sentence}"` : null,
    `Personas: ${(personas || []).map((p) => p.name).join(", ") || "(none)"}`,
  ].filter(Boolean).join("\n");

  const candidateList = top80.map((c) => `  - id: ${c.id} · ${c.name} (${c.theme}) · ${c.summary || ""}`).join("\n");

  const retrieval = await callClaude(apiKey, PL_RETRIEVAL_SYSTEM,
    `${ctxSummary}\n\nCandidates (ranked by archetype priors · top 80):\n${candidateList}`,
    { maxTokens: 4000 });
  const retParsed = extractJSON(retrieval);
  const selected = retParsed?.selected || [];

  // Step 3 · per-concept apply
  const applied_playbooks = [];
  const outcomesList = (mergedJobs || [])
    .flatMap((j) => (j.outcomes || []).map((o) => o.statement))
    .filter(Boolean);
  const personaNames = (personas || []).map((p) => p.name).filter(Boolean);

  for (const sel of selected) {
    const concept = concepts.find((c) => c.id === sel.id);
    if (!concept) continue;
    if (!concept.full_content && !concept.summary) continue;

    const applyCtx = `Brand diagnostic + positioning:\n${ctxSummary}\n\nPersonas available (anchor to one by exact name):\n${personaNames.map((n) => `  - ${n}`).join("\n") || "(no personas available · drop)"}\n\nRanked Ulwick outcomes (anchor to one verbatim or close paraphrase):\n${outcomesList.slice(0, 12).map((o) => `  - ${o}`).join("\n") || "(no outcomes available · drop)"}\n\nPlaybook · "${concept.name}" (${concept.theme}):\n${concept.full_content || concept.summary}`;

    try {
      const applyRes = await callClaude(apiKey, PL_APPLY_SYSTEM, applyCtx, { maxTokens: 1500 });
      const applied = extractJSON(applyRes);
      if (applied?.drop) continue;
      if (!applied?.anchored_to_persona || !applied?.anchored_to_outcome) continue;
      // Sanity-check the persona/outcome are real
      if (!personaNames.includes(applied.anchored_to_persona)) continue;
      const matchedOutcome = outcomesList.find((o) =>
        o === applied.anchored_to_outcome ||
        o.toLowerCase().includes(applied.anchored_to_outcome.toLowerCase().slice(0, 40)) ||
        applied.anchored_to_outcome.toLowerCase().includes(o.toLowerCase().slice(0, 40))
      );
      if (!matchedOutcome) continue;

      applied_playbooks.push({
        id: concept.id,
        name: concept.name,
        theme: concept.theme,
        category: concept.category,
        why_it_applies: applied.why_it_applies || sel.rationale || "",
        anchored_to_persona: applied.anchored_to_persona,
        anchored_to_outcome: matchedOutcome,
        first_move: applied.first_move || "",
        owner: applied.owner || "Marketing lead",
        kpi: applied.kpi || "",
        success_signal: applied.success_signal || "",
        references: [concept.source || `Library: ${concept.id}`],
      });
    } catch (e) {
      // per-concept failure · skip
      console.warn(`[Pass L] apply failed for ${concept.id}:`, e.message);
    }
  }

  return { applied_playbooks };
}

// ── PASS 3: Validate against search (uses Claude web_search tool) ──
export async function validateWithSearch(apiKey, jobs) {
  const data = await callClaude(
    apiKey,
    `Validate these Jobs-to-be-Done against real search data. For each job, search its queries and assess real-world demand signals. Return ONLY valid JSON (no markdown):
{"validations": [{"job_id": 1, "search_volume_signal": 75, "trend": "rising", "competition": "medium", "evidence": "brief summary of what search revealed", "top_keyword": "best keyword found", "related_keywords": ["kw1", "kw2"]}]}

search_volume_signal: 0-100 based on richness of search results, ad presence, content volume
trend: "rising", "stable", or "declining"
competition: "low", "medium", or "high"`,
    `Validate:\n${jobs.map((j) => `ID ${j.id}: ${j.job_statement}\nQueries: ${(j.search_queries || []).join(", ")}`).join("\n\n")}`,
    { tools: [{ type: "web_search_20250305", name: "web_search" }], maxTokens: 4000 }
  );
  return extractJSON(data);
}
