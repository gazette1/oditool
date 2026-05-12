// Probe SerpAPI for Siraj-relevant demand signals.
// Captures total_results, ad presence, related searches, top organic titles.
// Run: SERPAPI_KEY=... node run-serpapi-siraj.mjs

import fs from "node:fs/promises";

const KEY = process.env.SERPAPI_KEY;
if (!KEY) { console.error("Set SERPAPI_KEY"); process.exit(1); }

// Queries chosen to map onto specific personas/jobs/competitive lanes:
const QUERIES = [
  // Brand + category baseline
  { q: "siraj beauty pajamas", lane: "Branded search" },
  { q: "luxury black-owned sleepwear", lane: "Category positioning · Black-owned" },
  { q: "soft life pajamas", lane: "Category positioning · cultural" },
  // Persona-coded
  { q: "best pajamas for postpartum recovery", lane: "Amira · postpartum" },
  { q: "monogrammed bridesmaid robes", lane: "Simone · bridal" },
  { q: "tencel modal pajamas vs satin", lane: "Imani · fabric education" },
  { q: "black-owned loungewear brands", lane: "Maya · slow return discovery" },
  // Competitive
  { q: "eberjey vs lunya vs siraj", lane: "Competitive comparison" },
  { q: "cozy earth alternative", lane: "Competitive (defector)" },
];

async function probe({ q, lane }) {
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", q);
  url.searchParams.set("api_key", KEY);
  url.searchParams.set("num", "10");
  url.searchParams.set("gl", "us");
  url.searchParams.set("hl", "en");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`${q}: HTTP ${res.status}`);
  const d = await res.json();

  return {
    q, lane,
    total_results: d.search_information?.total_results || 0,
    total_results_formatted: d.search_information?.total_results_formatted || "n/a",
    has_ads: (d.ads || []).length > 0,
    ad_count: (d.ads || []).length,
    ads_top: (d.ads || []).slice(0, 3).map(a => ({ title: a.title, source: a.source })),
    related_searches: (d.related_searches || []).slice(0, 6).map(r => r.query),
    related_questions: (d.related_questions || []).slice(0, 4).map(r => r.question),
    top_organic: (d.organic_results || []).slice(0, 5).map(o => ({
      title: o.title,
      source: o.displayed_link || o.source,
      snippet: (o.snippet || "").slice(0, 140),
    })),
  };
}

console.log(`Probing ${QUERIES.length} SerpAPI queries…\n`);
const t0 = Date.now();
const results = await Promise.all(QUERIES.map(async (q) => {
  try {
    const r = await probe(q);
    const vol = r.total_results;
    const volBand = vol > 1e9 ? "≥1B" : vol > 1e8 ? "≥100M" : vol > 1e7 ? "≥10M" : vol > 1e6 ? "≥1M" : vol > 1e5 ? "≥100K" : "<100K";
    console.log(`✓ "${q.q}" · ${volBand} · ${r.has_ads ? r.ad_count + " ads" : "no ads"} · ${r.related_searches.length} related`);
    return { ...q, ...r };
  } catch (e) {
    console.log(`✗ "${q.q}" — ${e.message}`);
    return { ...q, error: e.message };
  }
}));
console.log(`\nDone in ${((Date.now()-t0)/1000).toFixed(1)}s`);

await fs.writeFile("serpapi-siraj-results.json", JSON.stringify(results, null, 2));
console.log("→ saved to serpapi-siraj-results.json");

// Print compact table
console.log("\n── SUMMARY ──");
for (const r of results) {
  if (r.error) continue;
  console.log(`\n${r.lane.toUpperCase()}`);
  console.log(`  "${r.q}"`);
  console.log(`  Total results: ${r.total_results_formatted} · Ads: ${r.has_ads ? r.ad_count : "none"}`);
  if (r.related_searches.length) {
    console.log(`  Related: ${r.related_searches.slice(0, 4).join(" · ")}`);
  }
  if (r.top_organic[0]) {
    console.log(`  Top result: "${r.top_organic[0].title}" — ${r.top_organic[0].source}`);
  }
}
