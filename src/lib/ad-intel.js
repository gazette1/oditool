// src/lib/ad-intel.js
//
// Engine v1.7 — Ad-Intel Module (React wire-in).
//
// Browser port of the four CLI stages from engine/ad-intel/*.mjs.
// Re-uses callClaude/extractJSON from ./anthropic.js. Persists through
// AirtableClient when one is provided; otherwise just returns in-memory
// objects (useful for testing without a base).
//
// Public API:
//   runAdIntel({
//     apiKey, airtable?, projectId, projectContext,
//     mergedJobs, brand, category,
//     onProgress?
//   }) → { competitors, ads, briefs }
//
// You can also call the stages individually:
//   stageA({ apiKey, brand, category })
//   stageB({ apiKey, competitors })
//   stageC({ apiKey, ads, projectContext })
//   stageD({ apiKey, outcomes, taggedAds, projectContext, projectDefaults })

import { callClaude, extractJSON } from "./anthropic.js";

// ─────────────────────────────────────────────────────────────
// Stage A · Competitor identification
// ─────────────────────────────────────────────────────────────

const STAGE_A_SYSTEM = `You are a competitive-intelligence researcher. Given a brand and its category, identify exactly 10 competitors using public data (SimilarWeb category neighbors, Crunchbase market-segment lists, category roundups, e-commerce comparison sites).

For each competitor, return:
- brand_name (canonical English name)
- page_url (the brand's main website, https://)
- meta_page_url (the brand's Meta Ad Library URL — pattern: https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=BRAND_NAME)
- verticals (array of 2-4 short category tags)
- spend_tier (one of: "small" <$10K/mo, "mid" $10-100K/mo, "large" >$100K/mo — best effort, may be null)
- classification (one of: "direct", "adjacent", "aspirational")
- evidence (one sentence citing where you confirmed they're a competitor)

Mix: aim for ~5 direct, ~3 adjacent, ~2 aspirational. Be honest if a category is sparse.

Return ONLY JSON, no markdown:
{"competitors": [{...}, ...]}`;

export async function stageA({ apiKey, brand, category }) {
  const data = await callClaude(apiKey,
    STAGE_A_SYSTEM,
    `Brand: ${brand}\nCategory: ${category}\n\nFind 10 competitors. Use web_search to verify each one is real, currently in market, and operationally adjacent to ${brand}.`,
    {
      maxTokens: 6000,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 10 }],
    }
  );
  const parsed = extractJSON(data);
  return parsed.competitors || [];
}

// ─────────────────────────────────────────────────────────────
// Stage B · Ad ingestion (web_search fallback until Meta API token)
// ─────────────────────────────────────────────────────────────

const STAGE_B_SYSTEM = `You are an ad-library analyst. For a given competitor brand, use web_search to find ads currently running on Meta (Facebook + Instagram) via the Meta Ad Library.

Search pattern: site:facebook.com/ads/library "BRAND_NAME"
Also try: BRAND_NAME meta ads review 2025
Also try: BRAND_NAME instagram ad copy

For each ad you can identify, return:
- meta_ad_id (the Ad Library ID if visible, else null)
- creative_url (link to the ad in Meta Ad Library, or to a third-party screenshot)
- format (one of: image, video, carousel, dco — best inference from description)
- copy_text (verbatim primary text from the ad)
- headline (verbatim headline, if separate from copy)
- cta (the call-to-action button text — Shop Now, Learn More, etc.)
- platforms (array — facebook, instagram, messenger, audience_network)
- run_start (YYYY-MM-DD if visible, else null)
- run_end (YYYY-MM-DD if visible, else null — null also means still running)
- evidence (one sentence quoting the search result that gave you this ad)

Be honest: if you can only find 2-3 ads per brand, return 2-3. Do not fabricate.

Return ONLY JSON, no markdown:
{"ads": [{...}, ...], "search_notes": "what worked / what didn't"}`;

async function stageBForCompetitor({ apiKey, competitor }) {
  try {
    const data = await callClaude(apiKey,
      STAGE_B_SYSTEM,
      `Brand: ${competitor.brand_name}\nSite: ${competitor.page_url}\nMeta Ad Library: ${competitor.meta_page_url}\n\nFind currently-running Meta ads for this brand. Return up to 5.`,
      {
        maxTokens: 4000,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 6 }],
      }
    );
    const parsed = extractJSON(data);
    return parsed.ads || [];
  } catch (e) {
    return [];
  }
}

export async function stageB({ apiKey, competitors, onProgress }) {
  const allAds = [];
  let i = 0;
  for (const c of competitors) {
    onProgress?.(`Stage B · ${++i}/${competitors.length} · ${c.brand_name}`);
    const ads = await stageBForCompetitor({ apiKey, competitor: c });
    for (const ad of ads) {
      allAds.push({
        swipe_page_id: c.id || c.brand_name,
        brand_name: c.brand_name,
        meta_ad_id: ad.meta_ad_id || null,
        creative_url: ad.creative_url || c.meta_page_url,
        thumbnail_url: null,
        copy_text: ad.copy_text || "",
        headline: ad.headline || "",
        cta: ad.cta || "",
        format: ad.format || "image",
        platforms: ad.platforms || ["facebook", "instagram"],
        run_start: ad.run_start || null,
        run_end: ad.run_end || null,
        evidence: ad.evidence || "",
        ingestion_method: "web_search_fallback",
        tag_status: "pending",
        fetched_at: new Date().toISOString(),
      });
    }
  }
  return allAds;
}

// ─────────────────────────────────────────────────────────────
// Stage C · LLM evaluation (text-only until multimodal lands)
// ─────────────────────────────────────────────────────────────

export const HOOK_TYPES = [
  "problem_statement", "before_after", "social_proof", "founder_pov",
  "demonstration", "comparison", "curiosity_gap", "pattern_interrupt",
  "list", "ugc_testimonial", "trend_jack", "category_pivot",
  "fabric_macro", "ritual_pov", "deal_anchor",
];

const STAGE_C_SYSTEM = `You are scoring an advertising creative on five behavioral signals + awareness level + hook type + addressed beliefs. Use Ulwick + Schwartz framing.

The five behavioral signals (1-10 each, integer):
1. attention_capture — how forcefully the first 1-2 seconds (or first scan) holds gaze
2. emotional_valence — affective intensity (positive OR negative both count)
3. memory_encoding — likelihood the ad sticks past 24 hours
4. brand_recall — likelihood the viewer remembers WHICH brand, not just the ad
5. purchase_intent — likelihood the viewer takes the next conversion step

Awareness level (Eugene Schwartz, 1-5):
1 = unaware · 2 = problem aware · 3 = solution aware · 4 = product aware · 5 = most aware

Hook type — pick one from: ${HOOK_TYPES.join(", ")}.

Addressed beliefs — array of short tags describing what belief the ad is trying to shift.

Cite the specific element justifying each score. No score without evidence. If text-only ad data, set data_caveat: "text_only" and score with explicit lower confidence.

Return ONLY JSON, no markdown:
{
  "attention_capture": 7, "attention_capture_evidence": "...",
  "emotional_valence": 5, "emotional_valence_evidence": "...",
  "memory_encoding": 6, "memory_encoding_evidence": "...",
  "brand_recall": 4, "brand_recall_evidence": "...",
  "purchase_intent": 6, "purchase_intent_evidence": "...",
  "awareness_level": 3,
  "hook_type": "problem_statement",
  "addressed_beliefs": ["...", "..."],
  "data_caveat": null,
  "overall_verdict": "one sentence"
}`;

export async function evaluateAd({ apiKey, ad, projectContext = "" }) {
  const userText = `Ad data:
brand: ${ad.brand_name}
format: ${ad.format}
headline: ${ad.headline || "(none)"}
copy: ${ad.copy_text || "(none)"}
cta: ${ad.cta || "(none)"}
platforms: ${(ad.platforms || []).join(", ")}
creative_url: ${ad.creative_url || "(none)"}
evidence_from_ingestion: ${ad.evidence || "(none)"}

Project context: ${projectContext}

Score this ad.`;

  const data = await callClaude(apiKey, STAGE_C_SYSTEM, userText, { maxTokens: 2000 });
  return extractJSON(data);
}

export async function stageC({ apiKey, ads, projectContext, onProgress }) {
  const out = [];
  let i = 0;
  for (const ad of ads) {
    onProgress?.(`Stage C · ${++i}/${ads.length} · scoring ${ad.brand_name}`);
    try {
      const evalResult = await evaluateAd({ apiKey, ad, projectContext });
      const score_total =
        (evalResult.attention_capture || 0) +
        (evalResult.emotional_valence || 0) +
        (evalResult.memory_encoding || 0) +
        (evalResult.brand_recall || 0) +
        (evalResult.purchase_intent || 0);
      out.push({
        ...ad,
        ...evalResult,
        score_total,
        tag_status: "tagged",
        tagged_at: new Date().toISOString(),
      });
    } catch (e) {
      out.push({ ...ad, tag_status: "failed", tag_error: e.message });
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// Stage D · Storyboard generation (with hook-affinity picker)
// ─────────────────────────────────────────────────────────────

// v1.3 hook-matching fix — same map as engine/ad-intel/stage-d-storyboards.mjs.
// Keys are job_id; values are the hook types that historically work for that
// job's customer pattern. Outcomes outside this set fall through to the
// generic "diversify across all hooks" path below.
const OUTCOME_HOOK_AFFINITY_BY_JOB = {
  1: ["ritual_pov", "before_after", "founder_pov", "demonstration"],
  2: ["before_after", "category_pivot", "comparison", "demonstration"],
  3: ["problem_statement", "founder_pov", "ugc_testimonial", "demonstration"],
  4: ["social_proof", "ugc_testimonial", "before_after", "founder_pov"],
  5: ["founder_pov", "category_pivot", "pattern_interrupt", "list"],
};

// Generic fallback for jobs > 5 — rotate through the hook palette so we
// never bias toward a single mechanic when affinity is unknown.
const HOOK_PALETTE_ROTATION = [
  "founder_pov", "ritual_pov", "problem_statement", "ugc_testimonial",
  "before_after", "demonstration", "category_pivot", "social_proof",
];

function pickAdForOutcome(outcome, taggedAds, rotationIdx) {
  const affinity =
    OUTCOME_HOOK_AFFINITY_BY_JOB[outcome.job_id] ||
    [HOOK_PALETTE_ROTATION[rotationIdx % HOOK_PALETTE_ROTATION.length]];
  const matches = taggedAds
    .filter(a => affinity.includes(a.hook_type))
    .sort((x, y) => (y.score_total || 0) - (x.score_total || 0));
  if (matches.length) return { ad: matches[0], reason: "hook_type affinity match" };
  const fallback = taggedAds
    .slice()
    .sort((x, y) => (y.score_total || 0) - (x.score_total || 0))[0];
  return { ad: fallback, reason: "fallback · no affinity match · flag for hook diversification" };
}

const STAGE_D_SYSTEM = `You are an ODI-trained creative director. Given (a) one underserved Desired Outcome scored under Ulwick's opportunity formula, and (b) a winning ad pattern from a competitor with its evaluated scores and hook type, write a storyboard brief that:

- Targets the named Desired Outcome directly
- Borrows the winning ad's hook mechanic but flips the cultural / brand layer
- Stays within the brand voice rules

Return all four:
- angle_code (short snake_case: founder_pov, fabric_macro, ritual_pov, before_after, fake_podcast, etc.)
- hook (first 1-2 seconds, the scroll-stopper) — one sentence
- body (3-6 lines, the build) — one short paragraph
- cta (the ask) — one phrase, no exclamation points
- shot_list (5-8 numbered shot directions for an 8-second 9:16 video)

Plus:
- belief_to_shift (one sentence — the belief in the prospect's mind that the ad must move)
- evidence_to_use (the specific brand evidence the ad should cite — fabric name, founder line, etc.)
- predicted_scores (1-10 on the same 5 behavioral signals)

Return ONLY JSON:
{"angle_code": "...", "hook": "...", "body": "...", "cta": "...", "shot_list": ["1. ...", ...], "belief_to_shift": "...", "evidence_to_use": "...", "predicted_scores": {"attention_capture": 8, "emotional_valence": 7, "memory_encoding": 7, "brand_recall": 8, "purchase_intent": 7}}`;

async function generateBrief({ apiKey, outcome, winningAd, projectDefaults, projectContext }) {
  const userText = `Project: ${projectContext}

Brand voice rules: ${projectDefaults.brand_voice}
Format: ${projectDefaults.format} · ${projectDefaults.duration_seconds}s

DESIRED OUTCOME (underserved, opportunity score ${outcome.opportunity_score}):
${outcome.statement}
Anchor quote: "${outcome.anchor_quote || "(none)"}"

WINNING AD PATTERN (the mechanic to borrow, not the brand):
Brand: ${winningAd.brand_name}
Hook type: ${winningAd.hook_type}
Total score: ${winningAd.score_total}/50
Headline: ${winningAd.headline || ""}
Copy: ${winningAd.copy_text || ""}
What worked: ${winningAd.attention_capture_evidence || ""} | ${winningAd.memory_encoding_evidence || ""}

Write a brief that targets the Desired Outcome and uses the winning pattern's mechanic, in the brand voice.`;

  const data = await callClaude(apiKey, STAGE_D_SYSTEM, userText, { maxTokens: 2500 });
  return extractJSON(data);
}

const DEFAULT_PROJECT_DEFAULTS = {
  tool: "higgsfield",
  preset_mode: "soul-id-portrait",
  format: "9:16",
  duration_seconds: 8,
  brand_voice: "founder-as-friend, sensory-forward, no exclamation points, no em-dashes",
  palette: "warm cream + brand tokens",
};

export async function stageD({ apiKey, outcomes, taggedAds, projectContext, projectDefaults, onProgress }) {
  const defaults = { ...DEFAULT_PROJECT_DEFAULTS, ...(projectDefaults || {}) };
  if (!taggedAds?.length) {
    return { briefs: [], note: "No tagged ads available to model" };
  }

  const briefs = [];
  let i = 0;
  for (const outcome of outcomes) {
    onProgress?.(`Stage D · ${++i}/${outcomes.length} · job ${outcome.job_id}`);
    const { ad: winning, reason } = pickAdForOutcome(outcome, taggedAds, i - 1);
    try {
      const brief = await generateBrief({
        apiKey,
        outcome,
        winningAd: winning,
        projectDefaults: defaults,
        projectContext,
      });
      briefs.push({
        source_outcome_job_id: outcome.job_id,
        source_outcome_statement: outcome.statement,
        source_outcome_score: outcome.opportunity_score,
        source_angle_code: brief.angle_code,
        linked_swipe_ad_id: winning.id || null,
        linked_swipe_ad_brand: winning.brand_name,
        linked_swipe_ad_score: winning.score_total,
        pick_reason: reason,
        hook: brief.hook,
        body: brief.body,
        cta: brief.cta,
        shot_list: brief.shot_list || [],
        belief_to_shift: brief.belief_to_shift,
        evidence_to_use: brief.evidence_to_use,
        predicted_scores: brief.predicted_scores || {},
        tool: defaults.tool,
        preset_mode: defaults.preset_mode,
        format: defaults.format,
        duration_seconds: defaults.duration_seconds,
        status: "draft",
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      briefs.push({
        source_outcome_job_id: outcome.job_id,
        source_outcome_statement: outcome.statement,
        status: "failed",
        error: e.message,
      });
    }
  }
  return { briefs };
}

// ─────────────────────────────────────────────────────────────
// Orchestrator — A → B → C → D with optional Airtable persistence
// ─────────────────────────────────────────────────────────────

/**
 * Pull the underserved outcomes (opportunity_score ≥ 10) from Pass 1+2
 * merged jobs. Returns flat array tagged with job_id.
 */
function deriveUnderservedOutcomes(mergedJobs, threshold = 10) {
  return (mergedJobs || []).flatMap(j =>
    (j.outcomes || [])
      .filter(o => (o.opportunity_score || 0) >= threshold)
      .map(o => ({
        job_id: j.id,
        statement: o.statement,
        importance: o.importance,
        satisfaction: o.satisfaction,
        opportunity_score: o.opportunity_score,
        anchor_quote: j.anchor_quote || "",
      }))
  ).sort((a, b) => (b.opportunity_score || 0) - (a.opportunity_score || 0));
}

export async function runAdIntel({
  apiKey,
  airtable = null,
  projectId,
  projectContext,
  mergedJobs = [],
  brand,
  category,
  projectDefaults = null,
  onProgress = () => {},
}) {
  const log = (phase) => onProgress(phase);
  const ctxString = typeof projectContext === "string"
    ? projectContext
    : [
        projectContext?.sector,
        projectContext?.audience,
        projectContext?.brand_voice,
        ...(projectContext?.key_facts || []).slice(0, 3),
      ].filter(Boolean).join(" · ");

  // ── Stage A ──
  log("Stage A · finding 10 competitors via web_search…");
  const rawCompetitors = await stageA({ apiKey, brand, category });
  const competitors = rawCompetitors.map((c, idx) => ({
    ...c,
    id: `comp-${idx + 1}`,
    project_id: projectId,
    scrape_status: "pending",
    ad_count: 0,
    added_at: new Date().toISOString(),
  }));
  if (airtable) {
    try {
      await airtable.saveSwipePages?.(projectId, competitors);
    } catch (e) { log(`Stage A · Airtable save failed (non-fatal): ${e.message}`); }
  }

  // ── Stage B ──
  const ads = await stageB({ apiKey, competitors, onProgress: log });
  ads.forEach((a, idx) => { a.id = `ad-${idx + 1}`; a.project_id = projectId; });
  if (airtable) {
    try {
      await airtable.saveSwipeAds?.(projectId, ads);
    } catch (e) { log(`Stage B · Airtable save failed (non-fatal): ${e.message}`); }
  }

  // ── Stage C ──
  const taggedAds = ads.length
    ? await stageC({ apiKey, ads, projectContext: ctxString, onProgress: log })
    : [];
  if (airtable && taggedAds.length) {
    try {
      await airtable.updateSwipeAds?.(projectId, taggedAds);
    } catch (e) { log(`Stage C · Airtable update failed (non-fatal): ${e.message}`); }
  }

  // ── Stage D ──
  const outcomes = deriveUnderservedOutcomes(mergedJobs);
  let briefs = [];
  if (outcomes.length && taggedAds.length) {
    const result = await stageD({
      apiKey,
      outcomes,
      taggedAds: taggedAds.filter(a => a.tag_status === "tagged"),
      projectContext: ctxString,
      projectDefaults,
      onProgress: log,
    });
    briefs = result.briefs;
    if (airtable && briefs.length) {
      try {
        await airtable.saveCreativeBriefs?.(projectId, briefs);
      } catch (e) { log(`Stage D · Airtable save failed (non-fatal): ${e.message}`); }
    }
  } else {
    log(`Stage D · skipped (${outcomes.length} outcomes, ${taggedAds.length} tagged ads)`);
  }

  return {
    competitors,
    ads: taggedAds.length ? taggedAds : ads,
    briefs,
    summary: {
      competitor_count: competitors.length,
      ad_count: ads.length,
      tagged_count: taggedAds.filter(a => a.tag_status === "tagged").length,
      brief_count: briefs.filter(b => b.status === "draft").length,
      outcomes_addressed: outcomes.length,
    },
  };
}
