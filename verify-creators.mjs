// Verify the 8 creator handles from §13 against the live web.
// For each, confirm: handle exists, platform, approximate follower range, niche
// fit, and recent posting activity. Returns a "verified | unverified | drift"
// status with notes.

import fs from "node:fs/promises";

const KEY = process.env.ANTHROPIC_KEY;
if (!KEY) { console.error("Set ANTHROPIC_KEY"); process.exit(1); }

const CANDIDATES = [
  { handle: "@prina_fit", platform: "tiktok", expected_tier: "7K-15K", niche: "Black women fitness + lifestyle" },
  { handle: "@fit_niquee", platform: "tiktok", expected_tier: "7K-15K", niche: "Black mom fitness + lifestyle" },
  { handle: "@gymhooky", platform: "tiktok", expected_tier: "7K-15K", niche: "Fitness + wellness + travel + family" },
  { handle: "@angeliquemiles8", platform: "tiktok", expected_tier: "15K-50K", niche: "Mature Black women beauty + wellness 50+" },
  { handle: "@fitnessbyke", platform: "tiktok", expected_tier: "7K-15K", niche: "Lifestyle + lifting Black holistic-wellness" },
  { handle: "@nov4.k", platform: "tiktok", expected_tier: "7K-15K", niche: "Personal-diary-style fitness + lifestyle" },
  { handle: "@lifewithdesidee", platform: "instagram", expected_tier: "7K-15K", niche: "Black women lifestyle + beauty" },
  { handle: "@tyeraa", platform: "tiktok", expected_tier: "15K-50K", niche: "Beauty, hair, salon entrepreneur" },
];

const SYSTEM = `You are verifying creator handles for a Black-women-led brand's outreach list. For each handle, use web_search to check:
1. Does the account exist on the named platform?
2. What's the actual current follower count (best estimate)?
3. Does the recent content match the named niche?
4. Are they posting actively (last 30 days)?

For each, return a status:
- "VERIFIED" — account exists, follower count in named tier, niche matches
- "DRIFT" — account exists but follower count or niche has shifted from what's expected
- "UNVERIFIED" — could not confirm the account exists, or it appears inactive
- "NOT_FOUND" — search returned nothing

Return ONLY JSON in this exact shape:
{"results": [{"handle": "@...", "status": "VERIFIED|DRIFT|UNVERIFIED|NOT_FOUND", "actual_followers": "...", "actual_niche": "...", "recent_activity": "...", "notes": "..."}]}`;

const USER = `Verify these 8 creator handles. For each, web_search for the handle on its platform (TikTok or Instagram) and confirm whether it matches the expected tier and niche:

${CANDIDATES.map(c => `- ${c.handle} on ${c.platform} · expected ${c.expected_tier} · niche: ${c.niche}`).join("\n")}

Be honest in the status. If you can't confirm a handle, mark UNVERIFIED — don't guess. Return only the JSON.`;

console.log("Verifying 8 creator handles via Claude + web_search…");
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
    max_tokens: 6000,
    system: SYSTEM,
    messages: [{ role: "user", content: USER }],
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 16 }],
  }),
});

if (!res.ok) { console.error("HTTP", res.status, await res.text()); process.exit(1); }
const data = await res.json();
console.log(`Done in ${((Date.now()-t0)/1000).toFixed(1)}s · stop_reason=${data.stop_reason}`);

const text = data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";
const clean = text.replace(/```json\s*/g, "").replace(/```/g, "").trim();
const first = clean.indexOf("{");
const last = clean.lastIndexOf("}");
const jsonText = (first !== -1 && last !== -1) ? clean.slice(first, last + 1) : clean;

const parsed = JSON.parse(jsonText);
await fs.writeFile("creator-verification.json", JSON.stringify(parsed, null, 2));
console.log("→ creator-verification.json");

console.log("\n── VERIFICATION RESULTS ──");
for (const r of parsed.results) {
  const icon = r.status === "VERIFIED" ? "✓" : r.status === "DRIFT" ? "~" : r.status === "NOT_FOUND" ? "✗" : "?";
  console.log(`${icon} ${r.handle} · ${r.status}`);
  console.log(`    actual followers: ${r.actual_followers}`);
  console.log(`    actual niche: ${r.actual_niche}`);
  console.log(`    activity: ${r.recent_activity}`);
  if (r.notes) console.log(`    notes: ${r.notes}`);
}
