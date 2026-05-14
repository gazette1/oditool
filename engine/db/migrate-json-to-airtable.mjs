// engine/db/migrate-json-to-airtable.mjs
//
// One-time migration: push every record from db/*.json into the real
// Airtable base, applying field-name + enum-value mapping per the
// schema we inspected.
//
// Order matters: Projects → Swipe Pages → Swipe Ads → Creative Briefs
// → Brief Iterations. Each downstream table references upstream records
// via Airtable record IDs, so we maintain a key→record_id map as we go.
//
// Run: AIRTABLE_KEY=... AIRTABLE_BASE=... node engine/db/migrate-json-to-airtable.mjs

import fs from "node:fs/promises";
import path from "node:path";

const KEY = process.env.AIRTABLE_KEY;
const BASE = process.env.AIRTABLE_BASE;
const PROJECT_NAME = process.env.PROJECT_NAME;
const PROJECT_ID = process.env.PROJECT_ID;

if (!KEY || !BASE) { console.error("Set AIRTABLE_KEY + AIRTABLE_BASE"); process.exit(1); }
if (!PROJECT_NAME || !PROJECT_ID) {
  console.error("Set PROJECT_NAME + PROJECT_ID env vars.");
  console.error('Example: PROJECT_NAME="Acme Apparel" PROJECT_ID="acme_001" AIRTABLE_KEY=... AIRTABLE_BASE=... node migrate-json-to-airtable.mjs');
  process.exit(1);
}

const USER_ID = "engine_internal"; // single-user mode for now

// ── Airtable client ─────────────────────────────────────────────
async function at(table, opts = {}) {
  const enc = encodeURIComponent(table);
  const url = `https://api.airtable.com/v0/${BASE}/${enc}${opts.path || ""}${opts.query ? "?" + opts.query : ""}`;
  const res = await fetch(url, {
    method: opts.method || "GET",
    headers: { "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) throw new Error(`${table} ${opts.method || "GET"}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function findRecord(table, formula) {
  const data = await at(table, { query: `filterByFormula=${encodeURIComponent(formula)}&maxRecords=1` });
  return data.records[0] || null;
}

async function insertRecord(table, fields) {
  const data = await at(table, { method: "POST", body: { records: [{ fields }] } });
  return data.records[0];
}

// ── Value remappers ─────────────────────────────────────────────
function mapSpendTier(t) {
  // My script used small/mid/large. Airtable uses dollar bands.
  return ({ small: "<$100K/mo", mid: "$100K-1M/mo", large: "$1M-10M/mo" }[t]) || "unknown";
}
function mapScrapeStatus(s) {
  return ({ pending: "pending", success_partial: "success", success: "success", failed: "error" }[s]) || s;
}
function mapTagStatus(s) {
  return ({ pending: "pending", tagged: "tagged", failed: "error", error: "error" }[s]) || s;
}
function mapFormat(f) {
  return ["image", "video", "carousel", "dco"].includes(f) ? f : "unknown";
}
function stringify(v) { return Array.isArray(v) ? v.join(", ") : (typeof v === "object" && v !== null ? JSON.stringify(v) : (v ?? "")); }
function dateOnly(s) { return s ? String(s).split("T")[0] : null; }
function dropNull(o) { const r = {}; for (const k of Object.keys(o)) if (o[k] != null && o[k] !== "") r[k] = o[k]; return r; }

// ── Read JSON tables ────────────────────────────────────────────
async function readJson(file) {
  try { return JSON.parse(await fs.readFile(path.resolve("db", file), "utf-8")); }
  catch { return {}; }
}

// ── Step 0 · Project ────────────────────────────────────────────
async function ensureProject() {
  console.log("→ Resolving Project record…");
  let proj = await findRecord("Projects", `{project_id} = "${PROJECT_ID}"`);
  if (proj) {
    console.log(`  ✓ Found existing Project ${PROJECT_ID} · airtable_id=${proj.id}`);
    return proj;
  }
  proj = await insertRecord("Projects", {
    project_id: PROJECT_ID,
    user_id: USER_ID,
    name: PROJECT_NAME,
    sector: "luxury sleepwear and loungewear for Black women, US market",
    audience: "Black women 28-48 in the 'soft life' movement; founder-led trust hierarchy",
    product_context: "TENCEL Modal three-piece sets in Petal / Daisy / Oat at $78. Velour-outside / terrycloth-inside Signature Robe + Black Is Love variant. Founder: Shantay.",
    status: "active",
    created_at: new Date().toISOString().split("T")[0],
    brand_color: "#F7B5A4",
  });
  console.log(`  ✓ Created Project ${PROJECT_ID} · airtable_id=${proj.id}`);
  return proj;
}

// ── Step 1 · Swipe Pages ────────────────────────────────────────
async function migrateSwipePages() {
  console.log("\n→ Migrating Swipe Pages…");
  const pages = await readJson("swipe_pages.json");
  const map = {}; // json id → airtable record id

  for (const p of Object.values(pages)) {
    const existing = await findRecord("Swipe Pages", `{page_key} = "${p.id}"`);
    if (existing) { map[p.id] = existing.id; console.log(`  · ${p.brand_name} (exists)`); continue; }

    const rec = await insertRecord("Swipe Pages", dropNull({
      page_key: p.id,
      user_id: USER_ID,
      brand_name: p.brand_name,
      page_url: p.page_url,
      meta_page_id: p.meta_page_id,
      verticals: stringify([...(p.verticals || []), `[${p.classification}]`, p.evidence ? `evidence: ${p.evidence}` : null].filter(Boolean)),
      spend_tier: mapSpendTier(p.spend_tier),
      scrape_status: mapScrapeStatus(p.scrape_status),
      scrape_error: p.scrape_notes || null,
      ad_count: p.ad_count || 0,
      last_scraped_at: dateOnly(p.last_scraped_at),
      added_at: dateOnly(p.added_at),
    }));
    map[p.id] = rec.id;
    console.log(`  ✓ ${p.brand_name} (${p.classification})`);
  }
  return map;
}

// ── Step 2 · Swipe Ads ──────────────────────────────────────────
async function migrateSwipeAds(pageMap) {
  console.log("\n→ Migrating Swipe Ads…");
  const ads = await readJson("swipe_ads.json");
  const map = {};

  for (const a of Object.values(ads)) {
    const existing = await findRecord("Swipe Ads", `{ad_key} = "${a.id}"`);
    if (existing) { map[a.id] = existing.id; console.log(`  · ${a.brand_name} (exists)`); continue; }

    // Encode the eval scores + evidence + reasoning into addressed_beliefs since
    // there are no dedicated score fields on Swipe Ads. JSON-stringified so we
    // can parse it back later if needed.
    const evalPayload = {
      scores: {
        attention_capture: a.attention_capture, emotional_valence: a.emotional_valence,
        memory_encoding: a.memory_encoding, brand_recall: a.brand_recall,
        purchase_intent: a.purchase_intent, total: a.score_total,
      },
      evidence: {
        attention_capture: a.attention_capture_evidence,
        emotional_valence: a.emotional_valence_evidence,
        memory_encoding: a.memory_encoding_evidence,
        brand_recall: a.brand_recall_evidence,
        purchase_intent: a.purchase_intent_evidence,
      },
      addressed_beliefs: a.addressed_beliefs || [],
      verdict: a.overall_verdict,
      data_caveat: a.data_caveat,
    };

    const rec = await insertRecord("Swipe Ads", dropNull({
      ad_key: a.id,
      swipe_page_link: pageMap[a.swipe_page_id] ? [pageMap[a.swipe_page_id]] : undefined,
      user_id: USER_ID,
      meta_ad_id: a.meta_ad_id,
      creative_url: a.creative_url,
      thumbnail_url: a.thumbnail_url,
      copy_text: a.copy_text,
      headline: a.headline,
      cta: a.cta,
      format: mapFormat(a.format),
      awareness_level: a.awareness_level,
      hook_type: a.hook_type,
      addressed_beliefs: JSON.stringify(evalPayload, null, 2),
      platforms: stringify(a.platforms),
      run_start: dateOnly(a.run_start),
      run_end: dateOnly(a.run_end),
      impression_estimate: a.impression_estimate ? String(a.impression_estimate) : null,
      tag_status: mapTagStatus(a.tag_status),
      fetched_at: dateOnly(a.fetched_at),
    }));
    map[a.id] = rec.id;
    console.log(`  ✓ ${a.brand_name} · ${a.hook_type} · ${a.score_total}/50`);
  }
  return map;
}

// ── Step 3 · Creative Briefs ────────────────────────────────────
async function migrateBriefs(projectAirtableId, adMap) {
  console.log("\n→ Migrating Creative Briefs…");
  const briefs = await readJson("creative_briefs.json");
  const map = {};

  for (const b of Object.values(briefs)) {
    const existing = await findRecord("Creative Briefs", `{brief_id} = "${b.id}"`);
    if (existing) { map[b.id] = existing.id; console.log(`  · ${b.source_angle_code} (exists)`); continue; }

    // The schema's `brief` field is a single multilineText. Pack the full
    // brief structure into it so it's readable in Airtable.
    const briefText = [
      `Outcome anchor:`,
      `  Job ${b.source_outcome_job_id} · opp ${b.source_outcome_score}`,
      `  ${b.source_outcome_statement}`,
      ``,
      `Hook:`,
      `  ${b.hook}`,
      ``,
      `Body:`,
      `  ${b.body}`,
      ``,
      `CTA:`,
      `  ${b.cta}`,
      ``,
      `Shot list:`,
      ...(b.shot_list || []).map(s => `  ${s}`),
      ``,
      `Belief to shift: ${b.belief_to_shift}`,
      `Evidence to use: ${b.evidence_to_use}`,
      `Predicted scores: ${JSON.stringify(b.predicted_scores || {})}`,
    ].join("\n");

    const rec = await insertRecord("Creative Briefs", dropNull({
      brief_id: b.id,
      user_id: USER_ID,
      project_id_link: projectAirtableId ? [projectAirtableId] : undefined,
      name: `${b.source_angle_code} · Job ${b.source_outcome_job_id} · ${b.source_outcome_score}`,
      status: b.status || "draft",
      source_belief_session: b.source_belief_session || null,
      source_cell_id: b.source_cell_id || null,
      source_angle_code: b.source_angle_code,
      linked_competitive_id: b.linked_competitive_id || null,
      linked_swipe_ad_id: adMap[b.linked_swipe_ad_id] || b.linked_swipe_ad_id,
      brief: briefText,
      tool: ["higgsfield", "editframe", "mitte", "remotion"].includes(b.tool) ? b.tool : "higgsfield",
      preset_mode: b.preset_mode,
      format: b.format,
      duration_seconds: b.duration_seconds,
      iteration_count: b.iteration_count || 1,
      created_at: new Date().toISOString().split("T")[0],
    }));
    map[b.id] = rec.id;
    console.log(`  ✓ ${b.source_angle_code} · Job ${b.source_outcome_job_id}`);
  }
  return map;
}

// ── Step 4 · Brief Iterations ───────────────────────────────────
async function migrateIterations(briefMap) {
  console.log("\n→ Migrating Brief Iterations…");
  const iters = await readJson("brief_iterations.json");
  let count = 0;

  for (const i of Object.values(iters)) {
    const existing = await findRecord("Brief Iterations", `{iteration_id} = "${i.id}"`);
    if (existing) { console.log(`  · iteration ${i.iteration_number} (exists)`); continue; }

    await insertRecord("Brief Iterations", dropNull({
      iteration_id: i.id,
      brief_link: briefMap[i.creative_brief_id] ? [briefMap[i.creative_brief_id]] : undefined,
      iteration_number: i.iteration_number,
      edit_prompt: i.edit_prompt,
      brief_json: typeof i.brief_json === "string" ? i.brief_json : JSON.stringify(i.brief_json, null, 2),
      shell_command: i.shell_command,
      air_score: i.air_score,
      stepps_breakdown: i.stepps_breakdown ? JSON.stringify(i.stepps_breakdown) : null,
      verdict: i.verdict,
      created_at: new Date().toISOString().split("T")[0],
    }));
    count++;
    console.log(`  ✓ iteration ${i.iteration_number}`);
  }
  return count;
}

// ── Run ─────────────────────────────────────────────────────────
console.log("Engine v1.2 · JSON → Airtable migration\n");
const t0 = Date.now();

const project = await ensureProject();
const pageMap = await migrateSwipePages();
const adMap = await migrateSwipeAds(pageMap);
const briefMap = await migrateBriefs(project.id, adMap);
const iterCount = await migrateIterations(briefMap);

console.log(`\n✓ Migration complete in ${((Date.now()-t0)/1000).toFixed(1)}s`);
console.log(`  Project:          ${project.id}`);
console.log(`  Swipe Pages:      ${Object.keys(pageMap).length}`);
console.log(`  Swipe Ads:        ${Object.keys(adMap).length}`);
console.log(`  Creative Briefs:  ${Object.keys(briefMap).length}`);
console.log(`  Brief Iterations: ${iterCount}`);
