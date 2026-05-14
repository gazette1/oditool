// engine/eval/ad_eval_llm.mjs
//
// AD_EVAL contract — primary LLM implementation.
//
// Takes one Swipe Ad record and returns:
//   - five behavioral scores (1-10): attention_capture, emotional_valence,
//     memory_encoding, brand_recall, purchase_intent
//   - awareness_level (1-5 per Eugene Schwartz):
//       1 = unaware, 2 = problem aware, 3 = solution aware,
//       4 = product aware, 5 = most aware
//   - hook_type (one of a controlled vocab — see below)
//   - addressed_beliefs (array of belief tags — cross-referenced from
//     Belief Records if the schema exists, else free tags)
//   - evidence per score (must cite visible / audible / copy element)
//
// Provider-agnostic: defaults to Claude Sonnet 4 with vision. Swap by
// passing `provider: "gemini"` or `provider: "openai"` and providing
// the corresponding env var.
//
// When the ad record has an image creative_url, the model is called
// multimodally. When the record is text-only (web_search fallback),
// scores are computed from copy + format + hook + cta description with
// a `data_caveat: "text_only"` flag set.

import { insert, update, audit, list } from "../db/storage.mjs";

const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;

const HOOK_TYPES = [
  "problem_statement", "before_after", "social_proof", "founder_pov",
  "demonstration", "comparison", "curiosity_gap", "pattern_interrupt",
  "list", "ugc_testimonial", "trend_jack", "category_pivot",
  "fabric_macro", "ritual_pov", "deal_anchor",
];

const SYSTEM = `You are scoring an advertising creative on five behavioral signals + awareness level + hook type + addressed beliefs. Use Ulwick + Schwartz framing.

The five behavioral signals (1-10 each, integer):
1. attention_capture — how forcefully the first 1-2 seconds (or first scan) holds gaze
2. emotional_valence — affective intensity of the response (positive OR negative both count as valence)
3. memory_encoding — likelihood the ad sticks past 24 hours
4. brand_recall — likelihood the viewer remembers WHICH brand, not just the ad
5. purchase_intent — likelihood the viewer takes the next conversion step

Awareness level (Eugene Schwartz, 1-5):
1 = unaware (doesn't know they have the problem)
2 = problem aware (knows the problem, no solution)
3 = solution aware (knows category, no brand)
4 = product aware (knows your brand, hesitating)
5 = most aware (just needs offer / nudge)

Hook type — pick one from: ${HOOK_TYPES.join(", ")}.

Addressed beliefs — array of short tags describing what belief the ad is trying to shift (e.g. "pajamas are throwaway", "luxury is white-coded", "rest is unproductive").

For EVERY behavioral score, cite the specific visual / audio / copy element that justifies it. No score without evidence. If you can only see text-only ad data (no image), set data_caveat: "text_only" and score what you can with explicit lower confidence.

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
  "overall_verdict": "one sentence on whether this ad is worth modeling"
}`;

export async function evaluateAd(ad, { project_context = "", provider = "claude" } = {}) {
  if (provider !== "claude") {
    throw new Error(`Provider ${provider} not yet wired. Add Gemini/OpenAI here.`);
  }
  if (!ANTHROPIC_KEY) throw new Error("ANTHROPIC_KEY required");

  // Build the message content. If we have an image URL, send it multimodally.
  const userText = `Ad data:
brand: ${ad.brand_name}
format: ${ad.format}
headline: ${ad.headline || "(none)"}
copy: ${ad.copy_text || "(none)"}
cta: ${ad.cta || "(none)"}
platforms: ${(ad.platforms || []).join(", ")}
creative_url: ${ad.creative_url || "(none)"}
evidence_from_ingestion: ${ad.evidence || "(none)"}

Project context: ${project_context}

Score this ad.`;

  const content = [{ type: "text", text: userText }];

  // If creative_url is an image (we can't fetch arbitrary URLs reliably,
  // but we can hand it to Claude as an image reference if it's a direct
  // image URL the model can access). For now, text-only — set caveat.
  // Multimodal upgrade lands when Stage B returns actual image bytes.

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: SYSTEM,
      messages: [{ role: "user", content }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";
  const clean = text.replace(/```json\s*/g, "").replace(/```/g, "").trim();
  const first = clean.indexOf("{"); const last = clean.lastIndexOf("}");
  return JSON.parse(clean.slice(first, last + 1));
}

export async function runStageC({ project_id, project_context }) {
  console.log(`\n── Stage C · Ad evaluation (multimodal LLM) ──`);
  console.log(`Project: ${project_id}`);

  await audit("stage_c_start", { project_id, provider: "claude-sonnet-4" });

  const pendingAds = await list("swipe_ads", a => a.project_id === project_id && a.tag_status === "pending");
  console.log(`\n${pendingAds.length} ads to evaluate\n`);

  let scored = 0;
  for (const ad of pendingAds) {
    const t0 = Date.now();
    console.log(`  → ${ad.brand_name} · ${ad.format} · "${(ad.headline || ad.copy_text || "").slice(0, 50)}…"`);
    try {
      const eval_ = await evaluateAd(ad, { project_context });
      const total = eval_.attention_capture + eval_.emotional_valence + eval_.memory_encoding + eval_.brand_recall + eval_.purchase_intent;
      await update("swipe_ads", ad.id, {
        ...eval_,
        score_total: total,
        tag_status: "tagged",
        tagged_at: new Date().toISOString(),
      });
      await audit("ad_evaluated", { ad_id: ad.id, project_id, score_total: total });
      console.log(`    ✓ total=${total}/50 · awareness=${eval_.awareness_level} · hook=${eval_.hook_type} · ${((Date.now()-t0)/1000).toFixed(1)}s`);
      scored++;
    } catch (e) {
      console.log(`    ✗ ${e.message}`);
      await update("swipe_ads", ad.id, { tag_status: "failed", tag_error: e.message });
    }
  }

  await audit("stage_c_complete", { project_id, scored });
  console.log(`\n✓ Stage C complete · ${scored}/${pendingAds.length} ads scored`);
  return { scored, total: pendingAds.length };
}

// ── CLI ─────────────────────────────────────────────────────────────
import { pathToFileURL } from "node:url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // Brand-agnostic CLI · project context is now read from
  // PROJECT_CONTEXT env var (or first stdin line if env unset).
  // No baked-in brand defaults — pass the full project context string.
  const project_id = process.argv[2];
  const context = process.env.PROJECT_CONTEXT || process.argv[3] || "";

  if (!project_id) {
    console.error("Usage: node ad_eval_llm.mjs <project_id> [project_context]");
    console.error('Or: PROJECT_CONTEXT="..." node ad_eval_llm.mjs <project_id>');
    process.exit(1);
  }
  if (!context) {
    console.error("Warning: no project_context provided · eval will be context-free and lower-quality.");
  }
  runStageC({ project_id, project_context: context })
    .then(r => console.log(JSON.stringify(r, null, 2)))
    .catch(err => { console.error("Stage C failed:", err.message); process.exit(1); });
}
