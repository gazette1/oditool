// Engine v1.1 keyword discovery for Siraj.
// Pulls: Google autocomplete, People-Also-Ask, Reddit phrases (via Claude
// + web_search), competitor PDP value-prop quotes (via WebFetch).
// Saves to siraj-keywords.json — consumed by phase1-strategy-v2.
//
// Run: SERPAPI_KEY=... ANTHROPIC_KEY=... node run-keyword-discovery-siraj.mjs

import fs from "node:fs/promises";

const SERPAPI = process.env.SERPAPI_KEY;
const ANTHROPIC = process.env.ANTHROPIC_KEY;
if (!SERPAPI || !ANTHROPIC) {
  console.error("Set SERPAPI_KEY + ANTHROPIC_KEY");
  process.exit(1);
}

const SEED_QUERIES = [
  "sleepwear for",
  "pajamas for black women",
  "luxury pajamas",
  "best pajamas for postpartum",
  "tencel modal pajamas",
  "pajamas that feel like",
  "monogrammed bridesmaid robes",
  "soft pajamas for",
  "loungewear for curvy",
  "best robe for",
];

// ── Google autocomplete via SerpAPI ──
async function fetchAutocomplete(q) {
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_autocomplete");
  url.searchParams.set("q", q);
  url.searchParams.set("api_key", SERPAPI);
  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const d = await res.json();
  return (d.suggestions || []).map(s => s.value).filter(Boolean);
}

// ── People-Also-Ask via SerpAPI Google ──
async function fetchPAA(q) {
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", q);
  url.searchParams.set("api_key", SERPAPI);
  url.searchParams.set("gl", "us");
  url.searchParams.set("hl", "en");
  url.searchParams.set("num", "10");
  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const d = await res.json();
  return (d.related_questions || []).map(q => q.question).filter(Boolean);
}

// ── Reddit mining via Claude + web_search ──
async function mineReddit() {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: `You are mining Reddit for verbatim customer language about sleepwear and loungewear. Use web_search to find recent threads on r/loungewear, r/femalefashionadvice, r/SkincareAddiction (sleep-adjacent), r/BlackHair (rest/recovery posts), and r/Postpartum.

Pull 15-25 short verbatim phrases the customer uses — not your summary, their literal words. Things they say about what works, what doesn't, what they wish existed.

Return ONLY JSON: {"reddit_phrases": ["phrase 1", "phrase 2", ...]}. No preamble.`,
      messages: [{ role: "user", content: "Mine the listed subreddits for verbatim customer phrases about sleepwear, loungewear, robes, and rest. Focus on phrases that name a specific outcome the customer wants (sensory, recovery, ritual, fit, fabric)." }],
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 10 }],
    }),
  });
  if (!res.ok) { console.error("Reddit mining failed:", await res.text()); return []; }
  const data = await res.json();
  const text = data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";
  const clean = text.replace(/```json\s*/g, "").replace(/```/g, "").trim();
  const first = clean.indexOf("{"); const last = clean.lastIndexOf("}");
  try {
    return JSON.parse(clean.slice(first, last + 1)).reddit_phrases || [];
  } catch { return []; }
}

// ── Competitor PDP value-prop quotes ──
// Uses WebFetch-equivalent via Claude with web_search to extract the literal
// homepage / hero copy from named competitors. Source URL is preserved.
async function fetchCompetitorCopy() {
  const competitors = [
    { name: "Lunya", url: "https://www.lunya.co/" },
    { name: "Eberjey", url: "https://eberjey.com/" },
    { name: "Cozy Earth", url: "https://cozyearth.com/" },
    { name: "Soma Cool Nights", url: "https://www.soma.com/store/category/sleepwear/pajamas/cool-nights" },
  ];

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      system: `For each competitor named, use web_search to pull their CURRENT stated value proposition — the hero headline + subhead from their homepage or sleepwear category page. Quote verbatim. Do not paraphrase. Cite the exact URL you found the copy at.

Return ONLY JSON: {"competitors": [{"name": "...", "url_visited": "...", "hero_headline": "...", "hero_subhead": "...", "implicit_outcome": "..."}]}

implicit_outcome is your interpretation of which customer outcome they're pricing for, based on their copy. Be specific.`,
      messages: [{ role: "user", content: `Fetch hero copy from:\n${competitors.map(c => `- ${c.name} · ${c.url}`).join("\n")}\n\nQuote verbatim. Cite URL.` }],
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 8 }],
    }),
  });
  if (!res.ok) { console.error("Competitor fetch failed:", await res.text()); return []; }
  const data = await res.json();
  const text = data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";
  const clean = text.replace(/```json\s*/g, "").replace(/```/g, "").trim();
  const first = clean.indexOf("{"); const last = clean.lastIndexOf("}");
  try {
    return JSON.parse(clean.slice(first, last + 1)).competitors || [];
  } catch { return []; }
}

// ── Run all in parallel ──
console.log("Engine v1.1 keyword discovery for Siraj…\n");
const t0 = Date.now();

console.log(`→ Google autocomplete for ${SEED_QUERIES.length} seed queries`);
const autoResults = await Promise.all(SEED_QUERIES.map(fetchAutocomplete));
const autocomplete = [...new Set(autoResults.flat())];
console.log(`  ✓ ${autocomplete.length} unique suggestions`);

console.log(`→ People-Also-Ask for ${SEED_QUERIES.length} seed queries`);
const paaResults = await Promise.all(SEED_QUERIES.map(fetchPAA));
const peopleAlsoAsk = [...new Set(paaResults.flat())];
console.log(`  ✓ ${peopleAlsoAsk.length} unique questions`);

console.log(`→ Reddit mining via Claude + web_search`);
const redditPhrases = await mineReddit();
console.log(`  ✓ ${redditPhrases.length} verbatim phrases`);

console.log(`→ Competitor hero copy via web_search`);
const competitors = await fetchCompetitorCopy();
console.log(`  ✓ ${competitors.length} competitor value props`);

const out = {
  generated_at: new Date().toISOString(),
  sector: "luxury sleepwear and loungewear for Black women, US",
  seeds: SEED_QUERIES,
  autocomplete,
  peopleAlsoAsk,
  redditPhrases,
  competitors,
};

await fs.writeFile("siraj-keywords.json", JSON.stringify(out, null, 2));
console.log(`\n✓ Saved to siraj-keywords.json in ${((Date.now()-t0)/1000).toFixed(1)}s`);
