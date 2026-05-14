// engine/ad-intel/stage-d-storyboards.mjs
//
// Stage D — Storyboard generation → Creative Briefs + Brief Iterations.
//
// For each high-opportunity Desired Outcome with low or zero coverage in
// tagged Swipe Ads, generate a Creative Brief. Each brief carries:
//   - source_outcome (the underserved Desired Outcome anchored to a score)
//   - source_angle_code (a short code for the angle: founder_pov, fabric_macro, …)
//   - linked_swipe_ad_id (the highest-scoring tagged Swipe Ad in the same
//     hook family, used as the winning pattern to model)
//   - linked_competitive_id (if Competitive Analysis schema lands; else null)
//   - brief (hook + body + CTA storyboard text)
//   - tool, preset_mode, format, duration_seconds (project defaults)
//   - status: draft
//
// Belief Sessions / Belief Cells references are kept out for now (schema
// not in base). When they land, populate source_belief_session +
// source_cell_id by best-fit to the outcome.
//
// For each new Creative Brief, an initial Brief Iteration is also written
// with iteration_number = 1 and a shell_command ready for Higgsfield CLI.

import { insert, list, audit } from "../db/storage.mjs";
import fs from "node:fs/promises";

const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;
const OPP_THRESHOLD = 10; // opportunity score gate

// Project defaults (would live on the Project record once Projects table exists)
const PROJECT_DEFAULTS = {
  siraj_001: {
    tool: "higgsfield",
    preset_mode: "soul-id-portrait",
    format: "9:16",
    duration_seconds: 8,
    brand_voice: "founder-as-friend, sis-coded, sensory-forward, no exclamation points, no em-dashes",
    palette: "pillow-pink #F9D6D2, siraj-salmon #F7B5A4, smile-yellow #F6D38D, warm cream",
  },
};

const SYSTEM = `You are an ODI-trained creative director. Given (a) one underserved Desired Outcome scored under Ulwick's opportunity formula, and (b) a winning ad pattern from a competitor with its evaluated scores and hook type, write a storyboard brief that:

- Targets the named Desired Outcome directly
- Borrows the winning ad's hook mechanic but flips the cultural / brand layer
- Stays within the brand voice rules

Brief structure (return all four):
- angle_code (short snake_case: founder_pov, fabric_macro, ritual_pov, before_after, fake_podcast, etc.)
- hook (first 1-2 seconds, the scroll-stopper) — one sentence
- body (3-6 lines, the build) — one short paragraph
- cta (the ask) — one phrase, no exclamation points
- shot_list (5-8 numbered shot directions for a 8-second 9:16 video)

Plus:
- belief_to_shift (one sentence — the belief in the prospect's mind that the ad must move)
- evidence_to_use (the specific brand evidence the ad should cite — fabric name, founder line, etc.)
- predicted_scores (1-10 on the same 5 behavioral signals: attention_capture, emotional_valence, memory_encoding, brand_recall, purchase_intent)

Return ONLY JSON:
{"angle_code": "...", "hook": "...", "body": "...", "cta": "...", "shot_list": ["1. ...", "2. ...", ...], "belief_to_shift": "...", "evidence_to_use": "...", "predicted_scores": {"attention_capture": 8, "emotional_valence": 7, "memory_encoding": 7, "brand_recall": 8, "purchase_intent": 7}}`;

async function generateBrief(outcome, winning_ad, project_defaults, project_context) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2500,
      system: SYSTEM,
      messages: [{ role: "user", content: `Project: ${project_context}

Brand voice rules: ${project_defaults.brand_voice}
Format: ${project_defaults.format} · ${project_defaults.duration_seconds}s

DESIRED OUTCOME (underserved, opportunity score ${outcome.score}):
${outcome.statement}
Anchor quote from customer: "${outcome.anchor_quote}"

WINNING AD PATTERN (the mechanic to borrow, not the brand):
Brand: ${winning_ad.brand_name}
Hook type: ${winning_ad.hook_type}
Total score: ${winning_ad.score_total}/50
Headline: ${winning_ad.headline}
Copy: ${winning_ad.copy_text}
What worked: ${winning_ad.attention_capture_evidence || ""} | ${winning_ad.memory_encoding_evidence || ""}

Write a brief for Siraj that targets the Desired Outcome and uses the winning pattern's mechanic, in Siraj's voice.` }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";
  const clean = text.replace(/```json\s*/g, "").replace(/```/g, "").trim();
  const first = clean.indexOf("{"); const last = clean.lastIndexOf("}");
  return JSON.parse(clean.slice(first, last + 1));
}

// Load the Desired Outcomes from the v3 evidence table.
// Once Desired Outcomes lives in Airtable, swap this for list("desired_outcomes", …).
async function loadOutcomes() {
  // Hard-coded from the §02 Evidence table in phase1-strategy-v3.html.
  // Future: read from db/desired_outcomes.json populated by the ODI pipeline.
  return [
    { job_id: 3, label: "Recover from a depleting season", statement: "Minimize the likelihood that the fabric pinches a recovery scar, tugs at a changing body, or feels different on the body after the third wash.", anchor_quote: "any ultra-wide elastic bands that might cut into my sides are out", importance: 8.7, satisfaction: 3.0, score: 14.4 },
    { job_id: 1, label: "Reclaim my body from the demands of the day", statement: "Minimize the time between her body realizing the day is over and her body believing it.", anchor_quote: "I love having nice sleepwear as a very attainable form of self care", importance: 8.2, satisfaction: 2.8, score: 13.6 },
    { job_id: 4, label: "Mark a transition moment with a tactile, ownable ritual", statement: "Minimize the likelihood that the bridal / postpartum / milestone gift gets photographed once and forgotten in a drawer.", anchor_quote: "What to do instead of bridesmaid robes?", importance: 7.5, satisfaction: 2.4, score: 12.6 },
    { job_id: 5, label: "Stop apologizing for choosing rest", statement: "Minimize the cultural friction Black women carry when they choose softness over hustle.", anchor_quote: "sleepwear for black women / silk pajamas for black women — standing demand, no premium brand answers it", importance: 7.2, satisfaction: 2.2, score: 12.2 },
    { job_id: 2, label: "Move from public-presentation to private-being without losing identity", statement: "Minimize the likelihood that what she wears at home contradicts the aesthetic she's curated everywhere else.", anchor_quote: "fits well enough to make it appropriate for wearing outside your home", importance: 7.0, satisfaction: 2.6, score: 11.8 },
  ];
}

export async function runStageD({ project_id, project_context }) {
  console.log(`\n── Stage D · Storyboard generation ──`);
  console.log(`Project: ${project_id} · threshold: opp ≥ ${OPP_THRESHOLD}`);

  await audit("stage_d_start", { project_id });

  const outcomes = (await loadOutcomes()).filter(o => o.score >= OPP_THRESHOLD);
  const taggedAds = await list("swipe_ads", a => a.project_id === project_id && a.tag_status === "tagged");

  // v1.3 hook-matching fix.
  //
  // Replaces "pick top-1 by raw score" with affinity matching: each
  // outcome carries a preferred-hook profile (the hook types that
  // historically work for that customer-job pattern). Pick the
  // highest-scoring ad whose hook_type appears in the outcome's
  // preference list. If no match, fall back to top score for outcome.
  // Bonus: log which ad was picked per outcome so the human can sanity-check.
  if (!taggedAds.length) {
    console.log("✗ No tagged ads available to model. Aborting Stage D.");
    return { briefs: 0 };
  }
  console.log(`Tagged ad pool: ${taggedAds.length}`);
  console.log(`Top 3 by raw score: ${taggedAds.slice().sort((a,b)=>(b.score_total||0)-(a.score_total||0)).slice(0,3).map(a=>`${a.brand_name}/${a.hook_type}/${a.score_total}`).join(", ")}`);

  // Outcome → preferred hook profile. Encoded from the §02 evidence
  // table + verified §13 personas + customer-psychology PDF.
  const OUTCOME_HOOK_AFFINITY = {
    3: ["problem_statement", "founder_pov", "ugc_testimonial", "demonstration"], // recovery
    1: ["ritual_pov", "before_after", "founder_pov", "demonstration"],            // reclaim body
    4: ["social_proof", "ugc_testimonial", "before_after", "founder_pov"],        // transition / gift
    5: ["founder_pov", "category_pivot", "pattern_interrupt", "list"],            // cultural permission
    2: ["before_after", "category_pivot", "comparison", "demonstration"],         // public/private
  };
  function pickAdForOutcome(outcome) {
    const affinity = OUTCOME_HOOK_AFFINITY[outcome.job_id] || [];
    // Pass 1: ads whose hook_type appears in affinity list, ranked by raw score
    const matches = taggedAds.filter(a => affinity.includes(a.hook_type)).sort((x,y)=>(y.score_total||0)-(x.score_total||0));
    if (matches.length) return { ad: matches[0], reason: "hook_type affinity match" };
    // Pass 2: fall back to highest-scoring overall, flag the mismatch
    const fallback = taggedAds.slice().sort((x,y)=>(y.score_total||0)-(x.score_total||0))[0];
    return { ad: fallback, reason: "fallback · no affinity match in pool · flag for v1.4 hook diversification" };
  }

  const defaults = PROJECT_DEFAULTS[project_id] || PROJECT_DEFAULTS.siraj_001;
  console.log(`\nGenerating ${outcomes.length} briefs (one per underserved outcome)…\n`);

  let count = 0;
  for (const outcome of outcomes) {
    const t0 = Date.now();
    const { ad: winning, reason } = pickAdForOutcome(outcome);
    console.log(`  → Job ${outcome.job_id} · ${outcome.label} (opp ${outcome.score})`);
    console.log(`    pattern: ${winning.brand_name}/${winning.hook_type}/${winning.score_total} · ${reason}`);
    try {
      const brief = await generateBrief(outcome, winning, defaults, project_context);

      const briefRecord = await insert("creative_briefs", {
        project_id,
        source_outcome_job_id: outcome.job_id,
        source_outcome_statement: outcome.statement,
        source_outcome_score: outcome.score,
        source_angle_code: brief.angle_code,
        linked_swipe_ad_id: winning.id,
        linked_competitive_id: null, // schema not in base
        source_belief_session: null, // schema not in base
        source_cell_id: null,        // schema not in base
        hook: brief.hook,
        body: brief.body,
        cta: brief.cta,
        shot_list: brief.shot_list,
        belief_to_shift: brief.belief_to_shift,
        evidence_to_use: brief.evidence_to_use,
        predicted_scores: brief.predicted_scores,
        tool: defaults.tool,
        preset_mode: defaults.preset_mode,
        format: defaults.format,
        duration_seconds: defaults.duration_seconds,
        status: "draft",
        iteration_count: 1,
      });

      // Initial iteration with a shell command ready for Higgsfield CLI
      const editPrompt = `${brief.hook}\n\n${brief.body}\n\nCTA: ${brief.cta}\n\nShot list:\n${brief.shot_list.join("\n")}`;
      const shellCommand = `# Higgsfield Soul-ID brief ${briefRecord.id}\nhiggsfield generate \\\n  --preset "${defaults.preset_mode}" \\\n  --format "${defaults.format}" \\\n  --duration ${defaults.duration_seconds} \\\n  --brand "Siraj Beauty" \\\n  --prompt-file briefs/${briefRecord.id}.txt`;

      await insert("brief_iterations", {
        project_id,
        creative_brief_id: briefRecord.id,
        iteration_number: 1,
        edit_prompt: editPrompt,
        brief_json: brief,
        shell_command: shellCommand,
        air_score: null,
        stepps_breakdown: null,
        verdict: null,
        status: "ready_to_render",
      });

      console.log(`    ✓ ${brief.angle_code} · "${brief.hook.slice(0, 60)}…" · ${((Date.now()-t0)/1000).toFixed(1)}s`);
      count++;
    } catch (e) {
      console.log(`    ✗ ${e.message}`);
    }
  }

  await audit("stage_d_complete", { project_id, briefs: count });
  console.log(`\n✓ Stage D complete · ${count}/${outcomes.length} briefs + iterations written`);
  return { briefs: count };
}

import { pathToFileURL } from "node:url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const project_id = process.argv[2] || "siraj_001";
  const context = "Siraj Beauty — luxury sleepwear for Black women in the soft-life movement. Primary positioning: 'Sleepwear made by a Black woman, for the bodies the category never built for' (Job 05, opp 12.2). TENCEL Modal three-piece sets in Petal / Daisy / Oat at $78. Founder: Shantay.";
  runStageD({ project_id, project_context: context })
    .then(r => console.log(JSON.stringify(r, null, 2)))
    .catch(err => { console.error("Stage D failed:", err.message); process.exit(1); });
}
