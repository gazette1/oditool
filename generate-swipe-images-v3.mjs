// gpt-image-1 generation for all 20 Siraj swipe ads.
// Grounded in: the real product line (Petal/Daisy/Oat 3-piece sets, Signature
// Robe in cream/black), the Shot List casting brief (women of color, varied
// sizes, "real women not editorial", "exhale energy"), and the customer
// psychology doc (founder-led, soft-life aesthetic, lived-in not studio).
//
// Run: OPENAI_KEY=sk-... node generate-swipe-images-v2.mjs

import fs from "node:fs/promises";
import path from "node:path";

const KEY = process.env.OPENAI_KEY;
if (!KEY) { console.error("Set OPENAI_KEY env var"); process.exit(1); }
const OUT_DIR = path.resolve("deploy/img");
await fs.mkdir(OUT_DIR, { recursive: true });

// Shared brief that gets prepended to every prompt. Encodes the Siraj
// casting + styling rules so every image feels on-brand by default.
const BRAND_BRIEF = `Editorial lifestyle photograph for a luxury sleepwear brand. Real lived-in domestic setting — warm soft natural lighting, golden hour or morning light, no studio backdrop. Photographic, not illustrated. Subject feels like a friend you'd text, not a celebrity. Natural unforced expression, visible "exhale energy", calm body language. Brand palette is soft pink, salmon, smile yellow, and warm cream. `;

// Product silhouette descriptions, used to anchor what the woman is wearing.
const PRODUCT = {
  petal: "wearing the Siraj Petal pajama set — a soft pink three-piece set with a fitted tank top, matching capped-sleeve top layered over it, and matching wide-leg pants in soft pink TENCEL Modal fabric",
  daisy: "wearing the Siraj Daisy pajama set — a warm soft yellow three-piece set with a fitted tank top, matching capped-sleeve top, and matching wide-leg pants in TENCEL Modal fabric",
  oat: "wearing the Siraj Oat pajama set — a neutral cream three-piece set with a fitted tank top, matching capped-sleeve top, and matching wide-leg pants in TENCEL Modal fabric",
  robe_cream: "wearing the Siraj Signature Robe — a cream-colored knee-length wrap robe with velour-soft outer surface and plush terrycloth inner lining, tied at the waist",
  robe_black: "wearing the Siraj Black Is Love robe — a deep black knee-length wrap robe with velour-soft outer surface and plush terrycloth lining, tied at the waist",
};

const ADS = [
  // NOOR — wellness-native (5)
  { id: "SWP-N-01", size: "1024x1536", prompt: BRAND_BRIEF + "A Black woman in her early thirties with natural hair, mid-size body, " + PRODUCT.petal + ". She is seated on the edge of an unmade bed in her own bedroom, a closed laptop beside her, soft evening lamplight through a window. She looks down at her phone with a small private smile. Warm dusty pink and cream interior, candle on nightstand. The vibe is 'I closed my laptop early tonight'." },

  { id: "SWP-N-02", size: "1024x1024", prompt: BRAND_BRIEF + "Side-by-side macro comparison of two fabrics, held in the hands of a brown-skinned woman with manicured nails: on the left her hand pinches soft pink TENCEL Modal fabric showing its natural drape and matte texture; on the right her other hand holds shiny synthetic polyester satin showing its plastic-y sheen. Warm window light. Sharp focus on the textural difference. No face, hands and fabric only. Dusty pink and cream palette." },

  { id: "SWP-N-03", size: "1024x1536", prompt: BRAND_BRIEF + "First-person point-of-view photograph: looking down at a South Asian woman's hands cradling a ceramic mug of coffee with rising steam, soft pink TENCEL Modal pajama sleeves visible at the edges of the frame, a small notebook and pen on a warm wooden table, sunlight streaming through linen curtains in a real kitchen corner. No face visible. The vibe is 'slow morning, no rush'." },

  { id: "SWP-N-04", size: "1024x1536", prompt: BRAND_BRIEF + "A mixed-race woman in her early thirties with curly hair, mid-size body, " + PRODUCT.oat + ". She is in her own bathroom in soft warm light, leaning to light a beeswax candle on the counter with a match. A folded towel and ceramic dish nearby. Steam softly visible. Her expression is calm and focused on the ritual. Dusty pink walls, warm cream palette." },

  { id: "SWP-N-05", size: "1024x1536", prompt: BRAND_BRIEF + "A South Asian woman in her late twenties with long dark hair, slim build, " + PRODUCT.petal + ". She is at a small wooden desk in her home, vintage gold wristwatch visible on her wrist, an open leather notebook and fountain pen in front of her, warm morning sunlight through a window. She is mid-sip of coffee from a ceramic mug. The vibe is 'pajamas with a long shift'." },

  // AMIRA — postpartum mother (5)
  { id: "SWP-A-01", size: "1024x1536", prompt: BRAND_BRIEF + "A Black woman in her mid-thirties with a soft round natural body shape, " + PRODUCT.robe_cream + ", seated in a wooden rocking chair in a softly lit nursery corner at dawn. A folded knit blanket on the chair, a small ceramic mug on a side table nearby. Warm amber lamp light. Her expression is tender, eyes downcast, hands resting in her lap. Dusty pink and warm cream palette." },

  { id: "SWP-A-02", size: "1024x1024", prompt: BRAND_BRIEF + "Split-composition still life on a soft pink interior wall: on the left, a stretched-out plain white men's cotton t-shirt draped over the back of a wooden chair; on the right, a neatly folded soft pink Siraj Petal pajama set on the same chair seat. Warm afternoon window light. No people. Visual contrast between worn cotton and refined modal fabric. Dusty pink and cream palette." },

  { id: "SWP-A-03", size: "1024x1536", prompt: BRAND_BRIEF + "A Black woman in her early thirties with a soft natural body, " + PRODUCT.oat + ", seated in a dimly-lit nursery corner at 4am, soft amber lamp light, holding a sleeping baby cradled in her arm against her chest. Her face is tired but peaceful. A small bottle warmer and stack of cloth bibs in soft focus nearby. Warm dusty pink and amber palette. The vibe is 'the long quiet shift'." },

  { id: "SWP-A-04", size: "1024x1536", prompt: BRAND_BRIEF + "A mixed-race woman in her thirties with curly hair, mid-size body, sitting cross-legged on her living room floor in soft afternoon light, unwrapping a beautifully wrapped gift box with cream textured paper and dusty pink silk ribbon. Inside the box, neatly folded soft pink Siraj pajamas are visible. Her face shows quiet emotional surprise — a small smile, eyes wet. Warm cream and pink palette." },

  { id: "SWP-A-05", size: "1024x1024", prompt: BRAND_BRIEF + "Close-up macro photograph: a Black woman's hand with manicured nails resting gently on her own waist over the soft pink elastic-free waistband of Siraj Petal TENCEL Modal pajama pants. Visible fabric weave and drape. Warm window light. No face, hand and fabric only. The vibe is 'no pinching, no pulling'. Dusty pink and warm cream palette." },

  // SOPHIA — bridal (5)
  { id: "SWP-S-01", size: "1024x1536", prompt: BRAND_BRIEF + "A group of four women of varied races (Black, Latina, South Asian, mixed) and varied body sizes (slim, mid-size, plus-size) standing together in a sunlit bedroom getting ready for a wedding morning, all wearing matching cream Siraj Signature Robes tied at the waist. Soft afternoon light through tall windows, warm cream walls, real lived-in space. Their expressions are joyful and natural, not posed. Dusty pink and warm cream palette." },

  { id: "SWP-S-02", size: "1024x1024", prompt: BRAND_BRIEF + "Still life on a warm wooden floor: on the left half, a chaotic pile of five cheap shiny synthetic polyester bridesmaid robes in faded fast-fashion pinks; on the right half, a single neatly folded cream Siraj Signature Robe with a small monogram embroidered in dusty pink thread on the chest. Warm window light. No people. The contrast between cheap and refined is dramatic. Dusty pink and cream palette." },

  { id: "SWP-S-03", size: "1024x1536", prompt: BRAND_BRIEF + "Extreme macro photograph of cursive monogram embroidery — the letters 'S K' embroidered in dusty pink thread on cream colored Siraj Signature Robe fabric. Soft natural window light, very shallow depth of field, thread texture visible. No people. Magazine quality. Dusty pink and warm cream palette." },

  { id: "SWP-S-04", size: "1024x1536", prompt: BRAND_BRIEF + "Five Siraj Signature Robes (four cream and one soft pink) hanging side by side from a horizontal wooden rod in a sunlit dressing room, soft afternoon light streaming through tall windows. Dusty pink walls, real interior. No people. Magazine fashion editorial, quiet luxury aesthetic. Warm cream and salmon palette." },

  { id: "SWP-S-05", size: "1024x1024", prompt: BRAND_BRIEF + "Overhead flat lay photograph of a neat stack of four folded Siraj robes in different colors (cream, dusty pink, warm yellow, black), each with a different cursive monogram embroidered in matching thread on the chest, arranged on a warm marble surface. Soft window light. No people. Magazine editorial. Dusty pink and warm cream palette." },

  // MAYA — slow return (5)
  { id: "SWP-M-01", size: "1024x1536", prompt: BRAND_BRIEF + "A Black woman in her mid-forties with natural silver-streaked hair, plus-size body, " + PRODUCT.petal + ", standing in her own quiet kitchen at morning, holding a ceramic mug of coffee with both hands, looking out a window with a small contemplative smile. Warm morning light through gauzy linen curtains, a small plant on the counter, an open book on the table. Real home, not studio. Dusty pink and cream palette." },

  { id: "SWP-M-02", size: "1024x1024", prompt: BRAND_BRIEF + "A Black woman in her early forties, sitting at a wooden writing desk in soft afternoon light, " + PRODUCT.robe_cream + ", writing in an open hardcover journal with a fountain pen. A small porcelain teacup with steam beside her, a folded soft pink Siraj robe draped over the back of her chair. Her expression is gentle and contemplative. Warm dusty pink and cream interior. The vibe is 'founder-as-friend, slow Sunday'." },

  { id: "SWP-M-03", size: "1024x1536", prompt: BRAND_BRIEF + "A Black woman in her late forties with natural curly hair, mid-size body, " + PRODUCT.robe_cream + ", reaching with one hand to open gauzy white linen curtains in her own bedroom. Warm morning sunlight streams in over her shoulder. Dusty pink walls, simple potted plant on a low table. No face in the foreground — she is looking out the window. Warm cream palette. The vibe is 'I made it to morning'." },

  { id: "SWP-M-04", size: "1024x1024", prompt: BRAND_BRIEF + "Close-up macro photograph: a South Asian woman's still hand in her late forties with simple gold rings resting gently on softly draped soft pink Siraj Petal TENCEL Modal fabric. Warm window light, shallow depth of field, fabric texture visible. No face, hand and fabric only. Dusty pink and salmon palette. The vibe is 'the fabric you stop fidgeting in'." },

  { id: "SWP-M-05", size: "1024x1536", prompt: BRAND_BRIEF + "A mixed-race woman in her early fifties with natural gray hair pulled back, plus-size body, " + PRODUCT.oat + ", standing alone in her own quiet empty kitchen at morning, leaning against a wooden counter with both hands wrapped around a ceramic mug of coffee. Soft natural window light, an unfinished book on the table, dusty pink and warm cream interior, real lived-in home. Her expression is unguarded and content. The vibe is 'what I wear when no one is watching'." },
];

async function generateOne(ad) {
  const t0 = Date.now();
  console.log(`→ ${ad.id} generating…`);
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-image-2",
      prompt: ad.prompt,
      n: 1,
      size: ad.size,
      quality: "medium",
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${ad.id}: HTTP ${res.status} — ${err.slice(0, 300)}`);
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

console.log(`Generating ${ADS.length} images via gpt-image-1 (medium) in parallel…\n`);
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
