// engine/ad-intel/stage-a-competitors.mjs
//
// Stage A — Competitor identification → Swipe Pages.
// For a given brand, returns 10 competitors sourced via Anthropic web_search
// against public data (SimilarWeb, Crunchbase, market reports, category lists).
// Each is classified as direct / adjacent / aspirational.
//
// Writes one Swipe Pages record per competitor.
//
// Run: ANTHROPIC_KEY=... node engine/ad-intel/stage-a-competitors.mjs <brand>

import { insert, update, audit, list, backendInfo } from "../db/storage.mjs";

const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;
if (!ANTHROPIC_KEY) { console.error("Set ANTHROPIC_KEY"); process.exit(1); }

const SYSTEM = `You are a competitive-intelligence researcher. Given a brand and its category, identify exactly 10 competitors using public data (SimilarWeb category neighbors, Crunchbase market-segment lists, category roundups, e-commerce comparison sites).

For each competitor, return:
- brand_name (canonical English name)
- page_url (the brand's main website, https://)
- meta_page_url (the brand's Meta Ad Library URL — pattern: https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=BRAND_NAME — use this pattern; we don't need to verify a Meta Page ID resolves)
- verticals (array of 2-4 short category tags)
- spend_tier (one of: "small" <$10K/mo, "mid" $10-100K/mo, "large" >$100K/mo — best effort, may be null)
- classification (one of: "direct", "adjacent", "aspirational")
- evidence (one sentence citing where you confirmed they're a competitor)

Mix: aim for ~5 direct, ~3 adjacent, ~2 aspirational. Be honest if a category is sparse.

Return ONLY JSON, no markdown:
{"competitors": [{...}, ...]}`;

async function findCompetitors(brand, category) {
  const t0 = Date.now();
  console.log(`→ Finding 10 competitors for "${brand}" via web_search…`);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 6000,
      system: SYSTEM,
      messages: [{ role: "user", content: `Brand: ${brand}\nCategory: ${category}\n\nFind 10 competitors. Use web_search to verify each one is real, currently in market, and operationally adjacent to ${brand}.` }],
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 10 }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";
  const clean = text.replace(/```json\s*/g, "").replace(/```/g, "").trim();
  const first = clean.indexOf("{"); const last = clean.lastIndexOf("}");
  const parsed = JSON.parse(clean.slice(first, last + 1));

  console.log(`  ✓ ${parsed.competitors?.length || 0} competitors in ${((Date.now()-t0)/1000).toFixed(1)}s`);
  return parsed.competitors || [];
}

export async function runStageA({ brand, category, project_id }) {
  console.log(`\n── Stage A · Competitor identification ──`);
  console.log(`Brand: ${brand} · Project: ${project_id}`);
  console.log(`Storage:`, backendInfo());

  await audit("stage_a_start", { brand, project_id });

  const competitors = await findCompetitors(brand, category);

  const inserted = [];
  for (const c of competitors) {
    const record = {
      project_id,
      brand_name: c.brand_name,
      page_url: c.page_url,
      meta_page_url: c.meta_page_url,
      meta_page_id: null, // resolved in Stage B if we ever get Meta API access
      verticals: [...(c.verticals || []), c.classification].filter(Boolean),
      spend_tier: c.spend_tier || null,
      classification: c.classification,
      evidence: c.evidence,
      scrape_status: "pending",
      ad_count: 0,
      last_scraped_at: null,
      added_at: new Date().toISOString(),
    };
    const rec = await insert("swipe_pages", record);
    inserted.push(rec);
    console.log(`  · ${c.classification.padEnd(13)} ${c.brand_name}`);
  }

  await audit("stage_a_complete", { brand, project_id, count: inserted.length });
  return inserted;
}

// ── CLI entry ──────────────────────────────────────────────────────────
import { pathToFileURL } from "node:url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const brand = process.argv[2];
  const category = process.argv[3];
  const project_id = process.argv[4];

  if (!brand || !category || !project_id) {
    console.error("Usage: node stage-a-competitors.mjs <brand-name> <category-description> <project_id>");
    console.error('Example: node stage-a-competitors.mjs "Acme Apparel" "premium DTC athleisure for women, US" "acme_001"');
    process.exit(1);
  }

  runStageA({ brand, category, project_id })
    .then(records => {
      console.log(`\n✓ Stage A complete · ${records.length} Swipe Pages written`);
    })
    .catch(err => {
      console.error("Stage A failed:", err.message);
      process.exit(1);
    });
}
