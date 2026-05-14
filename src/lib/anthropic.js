/**
 * Anthropic API calls for the three-pass ODI analysis.
 *
 * Pass 1: Discover core functional jobs
 * Pass 2: Universal Job Map + Desired Outcomes (ONE JOB AT A TIME — see note below)
 * Pass 3: Search validation via Claude web_search tool
 */

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

async function callClaude(apiKey, system, userMessage, { tools = null, maxTokens = 4000 } = {}) {
  const body = {
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: userMessage }],
  };
  if (tools) body.tools = tools;

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Claude API error (${res.status}): ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();

  // CRITICAL: detect truncation BEFORE trying to parse JSON.
  if (data.stop_reason === "max_tokens") {
    throw new Error("TRUNCATED: Claude response hit max_tokens before completing. Reduce scope or raise max_tokens.");
  }

  return data;
}

function extractJSON(data) {
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
export async function summarizeProjectContext(apiKey, inputs) {
  const fileBlocks = (inputs.files || [])
    .filter(f => f.text && f.text.length > 0)
    .map(f => `── FILE: ${f.fileName} (${f.kind}) ──\n${f.text}`)
    .join("\n\n");
  const urlBlocks = (inputs.urls || [])
    .filter(u => u.content && u.content.length > 0)
    .map(u => `── URL: ${u.url} ──\n${u.content}`)
    .join("\n\n");

  const corpus = [fileBlocks, urlBlocks].filter(Boolean).join("\n\n");
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

  const data = await callClaude(
    apiKey,
    `You are an Outcome-Driven Innovation analyst preparing a Project Context for a Mode 1 Earth engine run. Given raw text extracted from a brand's uploaded documents (PDFs, decks, agreements, shot lists, brand briefs) and from a scrape of the brand's homepage, produce a single structured Project Context that downstream passes (job discovery, positioning, value-prop comparison) will read.

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
- If the corpus is thin on a field (e.g., no brand_voice content), leave that field empty and add a red_flag.`,
    `Project context corpus:\n\n${corpus}`,
    { maxTokens: 4000 }
  );
  return extractJSON(data);
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
export async function comparePositioning(apiKey, brand, positioning, competitors, scoredOutcomes) {
  if (!competitors?.length) return { comparisons: [] };

  const data = await callClaude(
    apiKey,
    `You are an ODI analyst. For each named competitor, produce a structured comparison row against the brand's chosen positioning.

For each competitor, return:
- competitor_name
- their_stated_value_prop (quoted verbatim from source)
- source_url (where the quote came from)
- outcome_they_price_for: which outcome from the scored input they implicitly serve well
- outcome_they_leave_unserved: which outcome from the scored input they fail to serve
- where_brand_wins: 1-2 sentences naming the specific outcome and score where the brand can take this customer

CRITICAL: do not invent competitor positioning. Use only the quoted value props provided. If a quote is thin, say so in a "data_note" field on that row.

Brand: ${brand}
Brand positioning: "${positioning}"

RESPOND WITH ONLY RAW JSON:
{"comparisons": [{"competitor_name": "...", "their_stated_value_prop": "...", "source_url": "...", "outcome_they_price_for": "...", "outcome_they_leave_unserved": "...", "where_brand_wins": "...", "citation_score": 14.4, "data_note": null}]}`,
    `Competitors:\n${JSON.stringify(competitors, null, 2)}\n\nScored outcomes (use these in citations):\n${JSON.stringify(scoredOutcomes, null, 2)}`,
    { maxTokens: 4000 }
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
