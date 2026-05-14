/**
 * Anthropic API calls for the three-pass ODI analysis.
 *
 * Pass 1: Discover core functional jobs
 * Pass 2: Universal Job Map + Desired Outcomes (ONE JOB AT A TIME — see note below)
 * Pass 3: Search validation via Claude web_search tool
 */

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

export async function callClaude(apiKey, system, userMessage, { tools = null, maxTokens = 4000 } = {}) {
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
export async function generateBrandAudit(apiKey, projectContext, mergedJobs, scrapedContent = "") {
  const ctx = projectContext ? `Brand: ${projectContext.sector}\nAudience: ${projectContext.audience}\nVoice rules: ${projectContext.brand_voice}\nKey facts:\n${(projectContext.key_facts || []).map(f => `- ${f}`).join("\n")}` : "";

  const topOutcomes = (mergedJobs || []).flatMap(j =>
    (j.outcomes || []).map(o => ({ job_id: j.id, statement: o.statement, score: o.opportunity_score }))
  ).sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 5);

  const outcomeBlock = topOutcomes.length
    ? `Top underserved outcomes the audit must anchor to (a surface is "broken" if it fails one of these):\n${topOutcomes.map(o => `- Job ${o.job_id} (opp ${o.score}): ${o.statement}`).join("\n")}`
    : "No scored outcomes available — audit based on brand voice + best practices only.";

  const sourcesBlock = scrapedContent && scrapedContent.length
    ? `\n\nScraped brand site content (use as ground truth · do NOT fabricate copy not present):\n${scrapedContent.slice(0, 8000)}`
    : "\n\nNo scraped site content provided. Reason about what the brand likely has at each surface based on the project context.";

  const data = await callClaude(apiKey,
    `You are auditing a brand's public-facing surfaces against its underserved-outcome targets. For each of 8-10 surfaces, return: what they have today, what works, what breaks (specifically against an underserved outcome), the anchor job ID, fix priority, and a concrete fix.

Cover these surfaces (use the ones that apply to this brand · skip irrelevant ones):
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
- area_name (one of the surfaces above, exact label)
- current_state (1-2 sentences describing what's there today — anchored to scraped content if available, else "likely state" inferred from project context)
- what_works (1-2 sentences on what's already pointing at the right outcome · honest, can be "nothing yet")
- what_breaks (1-2 sentences on the specific gap measured against an underserved outcome)
- ulwick_anchor_job_id (number · which top-outcome job this surface should serve)
- fix_priority ("high" / "medium" / "low")
- recommended_fix (1 sentence on what to change · concrete, shippable in 2 weeks)

Plus:
- audit_summary (1-2 sentence top-line verdict)
- voice_consistency: { score: 1-10, strongest_surface, weakest_surface, drift_notes }
- discoverability: { branded_search: "good"/"spotty"/"weak", unbranded_search: "good"/"spotty"/"weak", notes }

Return ONLY JSON:
{
  "audit_summary": "...",
  "areas": [{...}, ...],
  "voice_consistency": {...},
  "discoverability": {...}
}

Rules:
- Every "what_breaks" must reference an underserved outcome or a project-context key fact. No generic marketing complaints.
- Every "recommended_fix" must be ship-in-2-weeks specific. No "improve brand awareness" filler.
- Score voice consistency honestly — if the audit doesn't have visibility into a surface, set the score on what IS visible.`,
    `${ctx}\n\n${outcomeBlock}${sourcesBlock}`,
    { maxTokens: 7000 }
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
