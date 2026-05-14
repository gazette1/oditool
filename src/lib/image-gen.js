// src/lib/image-gen.js
//
// Engine v1.6.9 · gpt-image-2 swipe-imagery generator.
//
// For each of the 20 cards in the Pass 8 swipe_file, generate one image
// via OpenAI's gpt-image-2 model using the card's `visual_brief` as the
// prompt seed. Inlines results as base64 onto each card so the strategy
// doc composer can render them as `background-image: url(data:...)` on
// the .ad-mock div — replacing the gradient mock placeholders.
//
// Model selection (May 14, 2026):
//   - PRIMARY: gpt-image-2 (OpenAI · current production)
//   - ALTERNATIVE (future wire-in): Gemini 2.5 Flash Image, internal
//     codename "Nano Banana" (Google). Faster + cheaper, but requires
//     a separate Google AI Studio key. Not wired here yet.
//
// Opt-in only · gated behind a checkbox in App.jsx because:
//   - ~$0.04 per image × 20 = ~$0.80 in extra OpenAI spend
//   - Adds ~3 minutes wall time
//   - Doc HTML grows ~4 MB
//
// The user's OPENAI_API_KEY in config.openaiKey is the auth source.

const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";
const MODEL = "gpt-image-2";          // OpenAI's current image model as of May 2026
const DEFAULT_SIZE = "1024x1024";     // square works for Meta 4:5 with crop

/**
 * Generate one image. Returns base64 string or null on failure.
 *
 * Response handling is defensive: gpt-image-2's body may include either
 * `b64_json` (preferred · when response_format requested) or `url`
 * (returned image is fetched + base64-encoded client-side). Both paths
 * resolve to a base64 string the renderer can inline.
 */
export async function generateSingleImage({ openaiKey, prompt, size = DEFAULT_SIZE, quality = "medium" }) {
  if (!openaiKey) throw new Error("OPENAI_API_KEY required");
  const body = {
    model: MODEL,
    prompt,
    size,
    quality,
    n: 1,
    response_format: "b64_json",
  };
  const res = await fetch(OPENAI_IMAGES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    // If response_format isn't supported by this exact model version,
    // OpenAI returns a 400. Retry once without it (server then returns
    // a URL we'll fetch + encode client-side).
    if (res.status === 400) {
      const retryRes = await fetch(OPENAI_IMAGES_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: MODEL, prompt, size, quality, n: 1 }),
      });
      if (!retryRes.ok) {
        const err = await retryRes.json().catch(() => ({}));
        throw new Error(`OpenAI image ${retryRes.status}: ${err.error?.message || retryRes.statusText}`);
      }
      const retryData = await retryRes.json();
      return await _extractBase64(retryData);
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(`OpenAI image ${res.status}: ${err.error?.message || res.statusText}`);
  }
  const data = await res.json();
  return await _extractBase64(data);
}

// Pull base64 out of either {data:[{b64_json}]} or {data:[{url}]} shapes.
async function _extractBase64(data) {
  const first = data?.data?.[0];
  if (!first) return null;
  if (first.b64_json) return first.b64_json;
  if (first.url) {
    try {
      const imgRes = await fetch(first.url);
      if (!imgRes.ok) return null;
      const blob = await imgRes.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result || "").split(",")[1] || null);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Build the prompt from a swipe card + project context.
 * Voice-neutral + commercial-quality so output works for any brand.
 */
function buildPrompt(card, projectContext) {
  const parts = [];

  // Visual direction from Pass 8 (the most specific signal)
  if (card.visual_brief) parts.push(card.visual_brief);

  // Format hint → aspect / framing
  const format = (card.format || "").toLowerCase();
  if (format.includes("4:5") || format.includes("meta")) parts.push("Vertical 4:5 composition, mobile-first framing.");
  else if (format.includes("9:16") || format.includes("tiktok")) parts.push("Vertical 9:16 composition, tight portrait crop.");
  else if (format.includes("carousel")) parts.push("Square 1:1 composition, single-slide framing.");

  // Brand context (audience, sector)
  if (projectContext?.sector) parts.push(`Context: ${projectContext.sector}.`);
  if (projectContext?.audience) parts.push(`Audience: ${projectContext.audience}.`);

  // Hard quality / safety bumpers
  parts.push("Editorial photography aesthetic.");
  parts.push("Natural soft lighting.");
  parts.push("Realistic skin tones across all body types and ethnicities.");
  parts.push("Professional commercial-quality output.");
  parts.push("No on-image text, no logos, no watermarks.");

  return parts.join(" ");
}

/**
 * Generate images for an entire swipe_file array. Returns a new array
 * with `image_b64` field populated per card (or `image_error` on
 * failure for that single card · the run continues).
 *
 * @param {object} opts
 * @param {string} opts.openaiKey
 * @param {Array}  opts.swipeFile
 * @param {object} opts.projectContext
 * @param {(msg: string)=>void} [opts.onProgress]
 * @param {object} [opts.imageOpts] · { size, quality }
 */
export async function generateSwipeImagery({ openaiKey, swipeFile, projectContext, onProgress, imageOpts = {} }) {
  const cards = swipeFile || [];
  const out = [];
  let okCount = 0;
  let failCount = 0;
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    onProgress?.(`Image ${i + 1}/${cards.length} · ${card.id || ""} · ${card.title || ""}`);
    try {
      const prompt = buildPrompt(card, projectContext);
      const b64 = await generateSingleImage({
        openaiKey,
        prompt,
        size: imageOpts.size || DEFAULT_SIZE,
        quality: imageOpts.quality || "medium",
      });
      if (b64) {
        out.push({ ...card, image_b64: b64, image_prompt: prompt });
        okCount++;
      } else {
        out.push({ ...card, image_error: "no b64 in response" });
        failCount++;
      }
    } catch (e) {
      out.push({ ...card, image_error: e.message });
      failCount++;
    }
  }
  onProgress?.(`Imagery done · ${okCount} ok · ${failCount} failed`);
  return { swipeFile: out, summary: { total: cards.length, ok: okCount, failed: failCount } };
}
