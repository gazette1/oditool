// Use Claude (with the web_search tool) to gather:
//   1. Viral content in the Black soft-life / sleepwear / loungewear space
//   2. Real Black micro-creators (7K–15K) for outreach
//   3. Competitor ads running in the sector (Meta + TikTok)
//   4. Positioning of existing Black-owned sleepwear brands
//
// Run: ANTHROPIC_KEY=sk-ant-... node research-tribe.mjs

import fs from "node:fs/promises";

const KEY = process.env.ANTHROPIC_KEY;
if (!KEY) { console.error("Set ANTHROPIC_KEY"); process.exit(1); }

const SYSTEM = `You are a social/paid-media researcher for a Black-women-led luxury sleepwear brand called Siraj Beauty. The brand sells TENCEL Modal 3-piece sets and velour/terrycloth robes at $78. Customer is Black women 28–48 in the "soft life" movement.

Your job: use the web_search tool to find real, current data — not generic advice. Return ONLY valid JSON (no markdown) in this exact shape:

{
  "viral_content": [
    {"platform": "tiktok|instagram", "creator_handle": "@...", "concept": "...", "hook": "...", "why_it_worked": "...", "transferable_to_siraj": "..."}
  ],
  "creators_to_approach": [
    {"handle": "@...", "platform": "tiktok|instagram", "followers_estimate": "7K-15K|15K-50K", "niche": "...", "why_fit_siraj": "...", "outreach_angle": "..."}
  ],
  "competitor_ads": [
    {"brand": "Eberjey|Lunya|Cozy Earth|Hatch|Skims|other", "platform": "meta|tiktok", "hook_used": "...", "creative_format": "...", "what_siraj_should_learn": "..."}
  ],
  "competing_black_brands": [
    {"brand": "...", "url": "...", "positioning": "...", "price_range": "...", "what_they_do_well": "...", "where_siraj_can_differentiate": "..."}
  ]
}

Find 5-8 entries per category. Be specific — real handles, real brand names, real concepts. If you can't verify something via search, don't include it.`;

const USER = `Search the web for:

1. VIRAL CONTENT (2025-2026) — TikToks and Instagram Reels in the Black women's loungewear / sleepwear / "soft life" / "rest as resistance" / postpartum recovery / bridal robes space that got high engagement (saves, shares, comments). I want the actual hooks they used.

2. BLACK MICRO-CREATORS (7K-15K followers) on TikTok and Instagram in: slow living, soft-life lifestyle, Black motherhood/postpartum, Black bridal, Black wellness. Real handles. These are people we'd brief for UGC partnerships at $100-300 + product.

3. COMPETITOR ADS — what's currently running on Meta and TikTok for: Eberjey, Lunya, Cozy Earth, Hatch (postpartum), Skims sleepwear, Lake Pajamas. Also any Black-owned sleepwear brand running paid ads. What hooks/formats are they using?

4. COMPETING BLACK-OWNED SLEEPWEAR/LOUNGEWEAR BRANDS — actual names, their positioning, pricing, what they do well, gaps Siraj can exploit. Search "black owned sleepwear brands", "black owned loungewear", "black owned pajama brands".

Return only the JSON, no preamble.`;

console.log("Running tribe research via Claude + web_search…");
const t0 = Date.now();

const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "x-api-key": KEY,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    system: SYSTEM,
    messages: [{ role: "user", content: USER }],
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 12 }],
  }),
});

if (!res.ok) {
  console.error("HTTP", res.status, await res.text());
  process.exit(1);
}

const data = await res.json();
const tookS = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`Done in ${tookS}s · stop_reason=${data.stop_reason}`);

// Save raw response for debugging
await fs.writeFile("tribe-raw.json", JSON.stringify(data, null, 2));

const text = data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";
const clean = text.replace(/```json\s*/g, "").replace(/```/g, "").trim();
const first = clean.indexOf("{");
const last = clean.lastIndexOf("}");
const jsonText = (first !== -1 && last !== -1) ? clean.slice(first, last + 1) : clean;

try {
  const parsed = JSON.parse(jsonText);
  await fs.writeFile("tribe-research.json", JSON.stringify(parsed, null, 2));
  console.log("→ tribe-research.json");
  console.log("\n── SUMMARY ──");
  console.log(`Viral content found: ${parsed.viral_content?.length || 0}`);
  console.log(`Creators to approach: ${parsed.creators_to_approach?.length || 0}`);
  console.log(`Competitor ads: ${parsed.competitor_ads?.length || 0}`);
  console.log(`Competing Black brands: ${parsed.competing_black_brands?.length || 0}`);
} catch (e) {
  console.error("JSON parse failed:", e.message);
  console.log("Raw text first 500 chars:", text.slice(0, 500));
}
