// engine/ad-intel/stage-b-ad-ingest.mjs
//
// Stage B — Ad ingestion → Swipe Ads.
//
// CURRENT IMPLEMENTATION: best-effort via Anthropic web_search.
// The user does not yet have a Meta Ad Library API token (`ads_archive`
// permission), and the Meta Ad Library public site is React-rendered so
// curl returns essentially nothing. So we ask Claude to web_search the
// Meta Ad Library page for each competitor and return whatever it can
// extract — typically 2-5 representative recently-running ads per brand
// with copy, format, hook, and the Ad Library URL.
//
// When the Meta API token lands, swap `ingestViaWebSearch` for a real
// `ingestViaMetaAPI` that hits /ads_archive directly. The Swipe Ads
// record shape is identical.
//
// TikTok Creative Center ingestion: deferred to v2.1 per spec.
//
// Run: ANTHROPIC_KEY=... node engine/ad-intel/stage-b-ad-ingest.mjs

import { insert, update, audit, list, backendInfo } from "../db/storage.mjs";

const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;
if (!ANTHROPIC_KEY) { console.error("Set ANTHROPIC_KEY"); process.exit(1); }

const SYSTEM = `You are an ad-library analyst. For a given competitor brand, use web_search to find ads currently running on Meta (Facebook + Instagram) via the Meta Ad Library.

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

async function ingestForPage(page) {
  const t0 = Date.now();
  console.log(`  → ${page.brand_name}…`);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: SYSTEM,
      messages: [{ role: "user", content: `Brand: ${page.brand_name}\nSite: ${page.page_url}\nMeta Ad Library: ${page.meta_page_url}\n\nFind currently-running Meta ads for this brand. Return up to 5.` }],
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 6 }],
    }),
  });

  if (!res.ok) {
    console.log(`    ✗ HTTP ${res.status}`);
    return [];
  }
  const data = await res.json();
  const text = data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";
  const clean = text.replace(/```json\s*/g, "").replace(/```/g, "").trim();
  const first = clean.indexOf("{"); const last = clean.lastIndexOf("}");

  let parsed;
  try { parsed = JSON.parse(clean.slice(first, last + 1)); }
  catch (e) { console.log(`    ✗ parse failed: ${e.message}`); return []; }

  const ads = parsed.ads || [];
  console.log(`    ✓ ${ads.length} ads · ${((Date.now()-t0)/1000).toFixed(1)}s`);
  return ads;
}

export async function runStageB({ project_id }) {
  console.log(`\n── Stage B · Ad ingestion (best-effort web_search) ──`);
  console.log(`Project: ${project_id}`);
  console.log(`Storage:`, backendInfo());
  console.log(`Note: Meta Ad Library API token not yet available. Using web_search fallback.`);

  await audit("stage_b_start", { project_id, mode: "web_search_fallback" });

  const pages = await list("swipe_pages", p => p.project_id === project_id && p.scrape_status === "pending");
  console.log(`\nFound ${pages.length} pending Swipe Pages\n`);

  let totalAds = 0;
  for (const page of pages) {
    let ads = [];
    try { ads = await ingestForPage(page); } catch (e) { console.log(`    ✗ ${e.message}`); }

    for (const ad of ads) {
      await insert("swipe_ads", {
        project_id,
        swipe_page_id: page.id,
        brand_name: page.brand_name,
        meta_ad_id: ad.meta_ad_id || null,
        creative_url: ad.creative_url || page.meta_page_url,
        thumbnail_url: null,
        copy_text: ad.copy_text || "",
        headline: ad.headline || "",
        cta: ad.cta || "",
        format: ad.format || "image",
        platforms: ad.platforms || ["facebook", "instagram"],
        run_start: ad.run_start || null,
        run_end: ad.run_end || null,
        impression_estimate: null,
        evidence: ad.evidence || "",
        ingestion_method: "web_search_fallback",
        tag_status: "pending",
        fetched_at: new Date().toISOString(),
      });
      totalAds++;
    }

    await update("swipe_pages", page.id, {
      scrape_status: ads.length > 0 ? "success_partial" : "failed",
      last_scraped_at: new Date().toISOString(),
      ad_count: ads.length,
      scrape_notes: ads.length === 0 ? "No ads surfaced via web_search; needs Meta API token" : null,
    });
  }

  await audit("stage_b_complete", { project_id, pages_scraped: pages.length, ads_total: totalAds });
  console.log(`\n✓ Stage B complete · ${totalAds} ads across ${pages.length} pages`);
  return { pages: pages.length, ads: totalAds };
}

// ── CLI ─────────────────────────────────────────────────────────
import { pathToFileURL } from "node:url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const project_id = process.argv[2] || "siraj_001";
  runStageB({ project_id })
    .then(r => console.log(JSON.stringify(r, null, 2)))
    .catch(err => { console.error("Stage B failed:", err.message); process.exit(1); });
}
