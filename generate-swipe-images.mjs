// Generates DALL-E 3 images for selected swipe-file ads in the Siraj strategy doc.
// Saves images to deploy/img/SWP-X-Y.png ready to be referenced from the HTML.
//
// Run: OPENAI_KEY=sk-... node generate-swipe-images.mjs
// Cost: $0.04/image × N images at standard quality, 1024x1792 portrait.

import fs from "node:fs/promises";
import path from "node:path";

const KEY = process.env.OPENAI_KEY;
if (!KEY) {
  console.error("Set OPENAI_KEY env var");
  process.exit(1);
}

const OUT_DIR = path.resolve("deploy/img");
await fs.mkdir(OUT_DIR, { recursive: true });

// Each prompt deliberately avoids faces, medical language, and brand names
// that might trigger content policy. Focus is on fabric, light, still-life
// scenes, hands-only shots — the editorial direction Siraj already uses.
const ADS = [
  {
    id: "SWP-N-01",
    size: "1024x1792",
    prompt: "Editorial still-life photograph: a folded soft pink and salmon silk pajama set on an unmade linen bed, a closed laptop next to it, warm evening light through a window casting long soft shadows, dusty pink and warm cream color palette with subtle yellow ambient light, no people, intimate slow lifestyle atmosphere, magazine quality, shallow depth of field, focus on fabric texture",
  },
  {
    id: "SWP-N-04",
    size: "1024x1792",
    prompt: "Editorial still-life photograph: a cream silk pajama set draped over a low upholstered chair beside a lit beeswax candle in a quiet bathroom, soft pink and golden yellow ambient light, dusty pink walls, steam from a bath in background out of focus, no people, focus on fabric and ritual objects, warm romantic atmosphere, magazine quality",
  },
  {
    id: "SWP-A-01",
    size: "1024x1792",
    prompt: "Editorial photograph: a pink and salmon silk robe draped over a wooden chair in a quiet bedroom at dawn, soft morning light through linen curtains, a folded knit blanket on the chair, a small porcelain mug on a side table, no people, warm dusty pink and cream palette, intimate atmosphere, focus on fabric texture, magazine quality",
  },
  {
    id: "SWP-A-05",
    size: "1024x1024",
    prompt: "Extreme macro photograph of soft pink TENCEL modal fabric draping with visible weave and texture, warm golden window light, shallow depth of field, no people, editorial fashion photography quality, color palette dusty blush pink, salmon, warm cream",
  },
  {
    id: "SWP-S-01",
    size: "1024x1792",
    prompt: "Editorial photograph: a row of five cream and soft pink silk robes hanging on simple wooden hangers from a wall hook in a sunlit room, warm late afternoon light, soft shadows on a dusty pink wall, no people, focus on fabric variation and quiet luxury, magazine quality",
  },
  {
    id: "SWP-S-03",
    size: "1024x1792",
    prompt: "Extreme macro photograph of cursive monogram embroidery in dusty pink thread on cream silk fabric, soft natural window light, very shallow depth of field, no people, editorial quality, warm color palette, visible thread texture",
  },
  {
    id: "SWP-M-01",
    size: "1024x1792",
    prompt: "Editorial photograph: a soft salmon-pink silk robe folded neatly on a crumpled white linen bed, soft natural light through linen curtains, a small porcelain teacup and a hardcover book on a bedside table, no people, dusty pink and cream palette, quiet contemplative morning atmosphere, magazine quality",
  },
  {
    id: "SWP-M-04",
    size: "1024x1792",
    prompt: "Editorial photograph: a single still hand resting on softly draped pink modal fabric, warm window light, shallow depth of field, fabric texture in focus, very minimal composition, magazine quality, dusty pink and salmon color palette",
  },
];

async function generateOne(ad) {
  const t0 = Date.now();
  console.log(`→ ${ad.id} generating…`);

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: ad.prompt,
      n: 1,
      size: ad.size,
      quality: "standard",
      response_format: "b64_json",
    }),
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
  return { id: ad.id, path: outPath, size: buf.length };
}

// Fire all 8 in parallel — OpenAI default rate limit is plenty for this volume.
console.log(`Generating ${ADS.length} images in parallel via DALL-E 3 standard…\n`);
const t0 = Date.now();
const results = await Promise.allSettled(ADS.map(generateOne));
const tookS = ((Date.now() - t0) / 1000).toFixed(1);

const ok = results.filter((r) => r.status === "fulfilled");
const fail = results.filter((r) => r.status === "rejected");
console.log(`\nDone in ${tookS}s · ${ok.length}/${ADS.length} succeeded`);
if (fail.length) {
  console.log("\nFailures:");
  fail.forEach((r) => console.log(`  ✗ ${r.reason.message}`));
}
const totalKB = ok.reduce((s, r) => s + r.value.size, 0) / 1024;
console.log(`Total saved: ${(totalKB / 1024).toFixed(2)} MB across ${ok.length} images`);
