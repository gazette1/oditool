# Siraj — design.md

Derived from the Core Branding kit (BrandBoard 2, May 2026). Use this whenever
producing any Siraj-branded artifact: strategy decks, ad creative, social, web,
print.

## Identity

Siraj is a luxury sleepwear and loungewear brand for women who treat rest as a
practice, not a remainder. It rejects the cute-pastel sleep-product aesthetic of
DTC sleep startups (Casper's blue blob illustrations, Calm's gradient washes)
and the corporate-clinical aesthetic of athleisure-as-sleep (Lululemon, Vuori).
Reference points are Eberjey at its most editorial, the warm-pink interior
palette of a Le Labo Santal candle, the typography of *Cereal* magazine, and
the unhurried color grading of a Sofia Coppola morning scene. The product
feels like a ritual, not a category SKU.

## Typography

### Font stacks

- **Display:** `"Moora Light", "DM Serif Display", "Cormorant Garamond", Georgia, serif` (the wordmark face — high-contrast modern serif with the signature IR crossbar overlap)
- **Body:** `"IBM Plex Mono", "JetBrains Mono", ui-monospace, monospace` (provided in the kit; functional, anchors the serif)
- **Accent:** `"Cormorant Italic", Georgia italic, serif` (long-form editorial blocks only)

### Type scale

| Token | Size | Line | Weight | Tracking |
|-------|------|------|--------|----------|
| display-xl | 88 | 1.0 | 300 | -0.02em |
| display-lg | 56 | 1.05 | 300 | -0.015em |
| display | 40 | 1.1 | 300 | -0.01em |
| h1 | 28 | 1.2 | 400 | -0.005em |
| h2 | 20 | 1.3 | 500 | 0 |
| body-lg | 16 | 1.7 | 400 | 0 |
| body | 13 | 1.75 | 400 | 0.005em |
| caption | 10 | 1.4 | 500 | 0.22em |

Captions are wide-tracked uppercase mono. The 0.22em tracking on captions is
the Siraj signature — every section label, every product spec line, every
nav item uses it. Display serif is *always* light weight; never bold a Moora.

## Color

Warm-only. There is no neutral gray in the Siraj system; warmth tints
everything.

### Brand colors (from BrandBoard)

- `rosy-brown` — `#D7B7AA`
- `siraj-salmon` — `#F7B5A4` (primary warm)
- `siraj-salmon-2` — `#F4BCB8`
- `pillow-pink` — `#F9D6D2` (primary soft)
- `smile-yellow` — `#F6D38D`

### Surfaces (extended)

- `bg-base` — `#FFFFFF` (pure paper white; Siraj is light-mode native)
- `bg-warm` — `#FBF7F4` (the page-tint warm white used for sections)
- `bg-card` — `#F9D6D2` at 30% over `bg-warm` for soft surfaces
- `ink-primary` — `#2C2422` (warm near-black, never pure black)
- `ink-secondary` — `#7A6964`
- `ink-muted` — `#B5A8A2`

### Color rules

- The five brand colors appear in this order of weight: pillow-pink → salmon → rosy-brown → smile-yellow → salmon-2. Backgrounds skew pink. Accents skew yellow.
- The pink-to-yellow sunrise gradient is the hero treatment; reserve it for the wordmark, the top of editorial spreads, and one moment per ad.
- Black is forbidden as a primary color. The wordmark exists in a black variant for technical use (line art on cream paper) only.
- No grays. If a neutral is needed, mix it from rosy-brown + ink-secondary.

## Spacing

Base unit: `4px`.

Scale: `4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192`.

Siraj uses generous spacing — more breathing room than the Engine, less than
a luxury fashion site. Section breaks at `128px`. The page never feels packed.

## Motion

Slow, soft, never bouncy.

- `enter` — `cubic-bezier(0.16, 1, 0.3, 1)`
- `inOut` — `cubic-bezier(0.65, 0, 0.35, 1)`

Durations skew long: `260ms` for hover, `560ms` for reveal, `1200ms` for hero
transitions. The brand should feel unhurried.

## Effects

One signature, two support.

1. **Sunrise gradient on the wordmark** (identity). Pink-to-yellow radial gradient as the fill of the SIRAJ display lockup, with a slow 30-second hue rotation in the background ambient. Used on hero only.
2. **Soft drop shadow on product photography**: `0 40px 80px rgba(247, 181, 164, 0.25)` — pink-tinted shadow, never gray.
3. **Hand-set ligatures**: the wordmark's IR overlap is the only graphic device; do not invent new ligatures elsewhere.

No glassmorphism. No bento grids. No animated gradient text outside the wordmark. No purple anywhere.

## Voice

- **Tone:** intimate, slow, considered. Talk like a journal entry, not like a marketing email.
- **Reading level:** conversational educated adult. Specific, sensory language. Smell, texture, time of day, feeling on skin.
- **Forbidden:** "luxe", "luxurious" (overused in the category), "treat yourself", "girl boss", "self care Sunday", "soft girl era", "main character energy", exclamation points, em-dashes in user-facing copy, the words "innovative" or "revolutionary".
- **Always:** sentence case. Specific fabric names (TENCEL Modal, mulberry silk, French terry — not just "silky"). Reference time of day or ritual. Talk to the customer like she is already a regular.
- **Naming:** "Siraj" alone — never "Siraj Beauty" in customer-facing copy outside the URL. Lowercase the word "sleepwear" in body copy.

## Anti-patterns

- Casper-style cartoon clouds, sheep, or sleep illustrations
- The Cozy Earth / Skims aesthetic of beige-neutral-everything
- Pastel-circle product photography on flat color backgrounds
- "Self care" used as a noun in a headline
- "Sleep tight" or "sweet dreams" as taglines
- Sparkle emoji
- Crescent moon emoji used as brand element
- Founder photographed laughing at a laptop
- Stock model photography (always real)
- The matte-pink-on-matte-pink-on-matte-pink wall trend
- Pinterest-grid layouts of pajamas folded into 9 squares
- Heavy filter aesthetic (clarendon, valencia)
- Newsletter popup that says "we'd love to dress your dreams"

## Cross-medium remix specs

### Web

- Light backgrounds, generous whitespace, hero serif at 56-88px
- Product photography fills 60% of any product page
- One section per scroll, never multi-column hero

### Email

- Headline at display (40px), body at body-lg (16px), single CTA
- One product per email, never product grids
- Always a sentence-case subject line, never UPPERCASE

### Meta / TikTok ad

- 4:5 or 9:16 frame. Real model, real fabric, real morning light.
- One headline per frame, never two competing CTAs.
- The sunrise gradient appears on the closing card with the wordmark only.
- Sound: ambient/breath/fabric foley. Never trending TikTok pop unless the creator partnership specifies it.

### Print / postcard insert

- Cream stock (warm white), letterpress feel
- Headline only, no body copy
- Wordmark bottom-right, URL bottom-left, both at caption tier

## Image generation

When generating image creative for Siraj — concepts, mood frames, ad mockups —
use **`gpt-image-1`** (the OpenAI ChatGPT image model). Never DALL-E 3. The
brief casting rules from the Shot List override generic prompts:

- Women of color (Black, Brown, South Asian, Mixed) — primary cast Black
- Varied body sizes (plus-size, mid-size, slim) — represented across the set
- Real homes, never studio backdrops
- Warm soft natural lighting, golden hour or morning
- Real product silhouettes (TENCEL Modal three-piece set: tank + capped sleeve + pants; velour-outside / terrycloth-inside Signature Robe)
- "Exhale energy" — calm body language, friend-vibe, not editorial perfection

See `generate-swipe-images-v2.mjs` for the working prompt template and parallel
generation script. Medium quality is the right default — $0.04/image, ~20s per
call, body realism plenty good for ad concepts.

---

## Open questions

- [ ] Whether the "plane submark" is a customer-facing icon (travel positioning) or technical-only
- [ ] The relationship between the Siraj Salmon and Siraj Salmon (alt) — which is primary, are they interchangeable
- [ ] Whether Moora Light is licensed for all intended uses including outdoor/print
- [ ] Whether Smile Yellow ever appears solo or only inside the gradient
