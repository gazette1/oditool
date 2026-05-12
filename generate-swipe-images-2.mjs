// Second wave: the remaining 12 swipe ads. Phrasing tuned to avoid OpenAI
// content-policy triggers (no "bath", no "bed", no "lingerie", no anatomy).
// Run: OPENAI_KEY=sk-... node generate-swipe-images-2.mjs
// Cost: 12 × $0.04 = $0.48 at DALL-E 3 standard.

import fs from "node:fs/promises";
import path from "node:path";

const KEY = process.env.OPENAI_KEY;
if (!KEY) { console.error("Set OPENAI_KEY env var"); process.exit(1); }
const OUT_DIR = path.resolve("deploy/img");
await fs.mkdir(OUT_DIR, { recursive: true });

const ADS = [
  { id: "SWP-N-02", size: "1024x1024", prompt: "Editorial still-life photograph: side-by-side macro view of two contrasting fabrics, soft pink TENCEL modal weave on the left and shiny synthetic polyester satin on the right, both neatly folded on a warm wooden surface, soft window light, no people, magazine fashion editorial, dusty pink and warm cream color palette, sharp focus on the texture difference" },
  { id: "SWP-N-03", size: "1024x1792", prompt: "Editorial photograph from a first-person perspective: hands holding a small ceramic coffee cup with steam rising, soft pink silk robe sleeves visible at the edges of the frame, warm morning sunlight streaming through gauzy linen curtains in a quiet kitchen, no face, only hands and arms visible, dusty pink and warm cream palette, magazine quality, intimate slow lifestyle atmosphere" },
  { id: "SWP-N-05", size: "1024x1792", prompt: "Editorial photograph: a soft pink silk pajama sleeve in the foreground with a vintage gold wristwatch on the wrist showing 7:30 AM, warm morning light through a window, an open leather notebook and fountain pen on a table in soft focus behind, no face visible, only an arm and hand, dusty pink and cream color palette, magazine fashion editorial" },
  { id: "SWP-A-02", size: "1024x1024", prompt: "Editorial still-life photograph: a stretched out plain white cotton t-shirt draped over the back of a wooden chair beside a neatly folded soft pink silk pajama set, contrast between worn cotton and elegant silk, warm afternoon window light, no people, magazine quality, dusty pink and cream color palette" },
  { id: "SWP-A-03", size: "1024x1792", prompt: "Editorial photograph: a dimly lit nursery corner at night, soft amber lamp light, a folded pink silk pajama set resting on a wooden rocking chair, a small ceramic mug and stack of soft cloths nearby in soft focus, no people, warm intimate quiet atmosphere, dusty pink and amber color palette, magazine fashion editorial" },
  { id: "SWP-A-04", size: "1024x1792", prompt: "Editorial still-life photograph: a beautifully wrapped gift box with cream textured paper and dusty pink silk ribbon, partly opened to reveal folded pink silk pajamas inside, warm afternoon window light, soft shadows, no people, dusty pink and cream palette, intimate gift-giving atmosphere, magazine quality" },
  { id: "SWP-S-02", size: "1024x1024", prompt: "Editorial photograph: a chaotic pile of cheap shiny synthetic polyester bridesmaid robes in faded fast-fashion colors, on top of which sits a single neatly folded cream silk robe with embroidered monogram, dramatic contrast between cheap and refined, warm window light, no people, magazine fashion editorial, dusty pink and warm cream palette" },
  { id: "SWP-S-04", size: "1024x1792", prompt: "Editorial photograph: a row of five matching cream and soft pink silk robes hanging side by side from a horizontal wooden rod in a sunlit dressing room, soft afternoon light streaming through tall windows, dusty pink walls, no people, warm cream and salmon color palette, magazine fashion editorial, quiet luxury aesthetic" },
  { id: "SWP-S-05", size: "1024x1024", prompt: "Editorial still-life photograph: a neat stack of four folded matching pink and cream silk robes on a marble surface, soft window light, monogrammed cursive initials embroidered in dusty pink thread visible on the top robe, no people, magazine fashion editorial, dusty pink and warm cream color palette" },
  { id: "SWP-M-02", size: "1024x1024", prompt: "Editorial still-life photograph: a handwritten cursive letter on cream paper next to a neatly folded soft pink silk robe, a small porcelain teacup with steam, and an open hardcover journal on a warm wooden table, warm window light, no people, dusty pink and cream color palette, magazine fashion editorial, quiet contemplative atmosphere" },
  { id: "SWP-M-03", size: "1024x1792", prompt: "Editorial photograph: a hand reaching to open gauzy linen curtains revealing soft morning sunlight streaming into a quiet interior, a soft pink silk robe draped over a wooden chair in frame, dusty pink walls, no face visible, only the hand, warm cream palette, magazine fashion editorial, slow contemplative morning atmosphere" },
  { id: "SWP-M-05", size: "1024x1792", prompt: "Editorial photograph: an empty quiet kitchen at morning with a soft pink silk robe draped over the back of a wooden chair, an unfinished ceramic cup of coffee on the wooden table, an open hardcover book, soft natural window light, no people, dusty pink and warm cream color palette, magazine fashion editorial, intimate atmosphere" },
];

async function generateOne(ad) {
  const t0 = Date.now();
  console.log(`→ ${ad.id} generating…`);
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "dall-e-3", prompt: ad.prompt, n: 1, size: ad.size, quality: "standard", response_format: "b64_json" }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${ad.id}: HTTP ${res.status} — ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error(`${ad.id}: no image in response`);
  const buf = Buffer.from(b64, "base64");
  const outPath = path.join(OUT_DIR, `${ad.id}.png`);
  await fs.writeFile(outPath, buf);
  const sizeKB = (buf.length / 1024).toFixed(0);
  const tookS = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`✓ ${ad.id} saved · ${sizeKB} KB · ${tookS}s`);
  return { id: ad.id, size: buf.length };
}

console.log(`Generating ${ADS.length} images in parallel…\n`);
const t0 = Date.now();
const results = await Promise.allSettled(ADS.map(generateOne));
const tookS = ((Date.now() - t0) / 1000).toFixed(1);
const ok = results.filter(r => r.status === "fulfilled");
const fail = results.filter(r => r.status === "rejected");
console.log(`\nDone in ${tookS}s · ${ok.length}/${ADS.length} succeeded`);
if (fail.length) {
  console.log("\nFailures:");
  fail.forEach(r => console.log(`  ✗ ${r.reason.message}`));
}
