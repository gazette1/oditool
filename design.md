# Alchemical Growth Engine — design.md

## Identity

The Alchemical Growth Engine is a research instrument for serious operators. It rejects the bright, friendly, you-got-this aesthetic of HubSpot and Gong — the SaaS vernacular where every illustration has rounded corners and every headline says "supercharge". It also rejects the corporate-strategy-deck aesthetic of McKinsey decks. The reference points are the Bloomberg Terminal in 1996, the production design of *Severance*, the typesetting of medieval alchemical manuscripts (think Splendor Solis), and the tactile gold-on-black panel of a Steinway action diagram. The product feels like an instrument, not a sticker. Mode 1 is Earth — the substantive layer (research). Mode 2 onward (Air, Fire, Water) extend into distribution, conversion, retention. The naming is deliberate brand poetry; the product is rigorous Outcome-Driven Innovation.

---

## Typography

### Font stacks

- **Display:** `"Space Grotesk", "Söhne", "Inter", -apple-system, sans-serif`
- **Body:** `"IBM Plex Mono", "JetBrains Mono", ui-monospace, monospace`
- **Mono (data):** `"IBM Plex Mono", ui-monospace, monospace` (same as body — the body IS mono)

### Type scale

| Token | Size | Line | Weight | Tracking |
|-------|------|------|--------|----------|
| display-xl | 96 | 0.92 | 700 | -0.04em |
| display-lg | 64 | 0.98 | 700 | -0.03em |
| display | 44 | 1.05 | 700 | -0.02em |
| h1 | 32 | 1.15 | 600 | -0.015em |
| h2 | 22 | 1.25 | 600 | -0.005em |
| h3 | 16 | 1.35 | 600 | 0 |
| body-lg | 15 | 1.65 | 400 | 0 |
| body | 13 | 1.7 | 400 | 0.005em |
| body-sm | 12 | 1.6 | 400 | 0.01em |
| caption | 10 | 1.4 | 600 | 0.18em |

Captions are wide-tracked uppercase. The 0.18em tracking on captions is the brand's most-recognizable typographic move — every section label, every nav item, every metric label uses it.

### Rendering

- `font-feature-settings: "ss01", "tnum"` on mono (slashed zero, tabular figures)
- `font-smoothing: antialiased` on dark surfaces (the default)
- Optical sizing on for Space Grotesk at sizes ≥ 32px

---

## Color

Dark-only. There is no light mode. Light mode would be a brand violation.

### Surfaces

- `bg-base` — `#06080c` (the void; further from black than pure black)
- `bg-surface-1` — `#0d1117`
- `bg-surface-2` — `#151c28`
- `bg-surface-3` — `#1c2536`

### Borders

- `border-default` — `#1e2a3a`
- `border-strong` — `#2a3a4f`

### Text

- `text-primary` — `#e0ddd5` (warm off-white, never pure white)
- `text-secondary` — `#a09989`
- `text-muted` — `#6a7585`
- `text-inverse` — `#06080c`

### Accent

- `accent-gold` — `#c8a45c` (the only accent; warm, oxidized brass, not "gold gradient")
- `accent-gold-bright` — `#d9b878` (hover state)
- `accent-gold-dim` — `#9c7e44` (pressed / muted use)

### Data colors (used only inside data viz, never decoratively)

- `data-red` — `#ef4444` (≥12 opportunity — critical underserved)
- `data-orange` — `#f97316` (≥10 — underserved)
- `data-amber` — `#eab308` (≥8 — promising)
- `data-lime` — `#84cc16` (≥6 — neutral)
- `data-green` — `#22c55e` (<6 — overserved / table stakes)

### Strategy colors (Market Entry recommendations only)

- `strat-differentiated` — `#3b82f6`
- `strat-dominant` — `#22c55e`
- `strat-disruptive` — `#f97316`
- `strat-discrete` — `#06b6d4`
- `strat-sustaining` — `#6a7585`
- `strat-purple-accent` — `#a78bfa` (the Market Entry tab indicator only)

### Color rules

- `accent-gold` appears at most **three times per screen**: the primary CTA, one section accent (rule, dot, hairline), and one data callout. Anywhere else, gold becomes wallpaper and loses its meaning.
- No gradients except (a) the WebGL aurora effect on hero, and (b) data-bar fills inside the search-volume table.
- White (`#FFFFFF`) appears nowhere. `#e0ddd5` is the brightest text color allowed.
- The `data-*` colors live inside data visualization only. Do not use red for "danger" or green for "success" outside the opportunity scoring system.

---

## Spacing

Base unit: `4px`.

Scale: `4, 8, 12, 16, 20, 24, 32, 40, 56, 80, 112, 160`.

Layout:
- Max content width (marketing): `1180px`
- Max content width (reading): `680px`
- Gutter: `24px`
- Vertical rhythm: `8px` baseline grid; section breaks at `112px` (large) or `80px` (medium)

Density skews tight. This brand has more in common with a Bloomberg terminal than a Notion-template marketing site — sections sit closer together than the SaaS default, padding inside cards is restrained, and whitespace is earned by a single oversized typographic moment, not by uniform breathing room everywhere.

---

## Motion

Easing curves:

- `enter` — `cubic-bezier(0.16, 1, 0.3, 1)` (smooth out, deliberate)
- `exit` — `cubic-bezier(0.7, 0, 0.84, 0)`
- `inOut` — `cubic-bezier(0.65, 0, 0.35, 1)`
- No spring. No bounce. The brand does not bounce.

Durations:

- `instant` — `120ms`
- `fast` — `200ms`
- `base` — `320ms`
- `slow` — `560ms`
- `cinematic` — `1200ms` (used only for the hero sigil reveal)

Reveal patterns:

- `fade-up` — opacity 0→1, translateY 12px→0, `base`, `enter`
- `stagger-children` — 80ms gap between children
- `scroll-reveal` — triggers at 25% in viewport, runs once
- `gold-pulse` — accent-gold opacity 0.4→1.0, 1800ms, infinite, `inOut` (used only on the brand dot)

---

## Effects (the moat)

Two signature effects. One identity, one support.

### 1. The animated sigil (identity effect)

A circular alchemical-style diagram representing the Universal Job Map's 8 steps (Define → Locate → Prepare → Confirm → Execute → Monitor → Modify → Conclude). On reveal, the outer ring traces itself counter-clockwise in `accent-gold`, then the 8 step glyphs fade in stagged, then connecting lines draw between them. The whole assembly takes 1200ms (`cinematic`). Once drawn, it slowly rotates at 0.05deg/frame and a small `gold-pulse` indicator orbits the perimeter to mark the "current step" in a passive demo loop.

- **Tech.** SVG with `stroke-dasharray` + `stroke-dashoffset` for the trace, CSS keyframes for the slow rotation, `requestAnimationFrame` for the orbit indicator.
- **Where it appears.** Hero only. Never in the footer, never as a bullet decoration.
- **Reduced-motion fallback.** Static rendered SVG of the final state. No rotation, no orbit. Identity preserved.

### 2. Dotted grid background (support effect)

A faint dot grid (1px dots, 32px spacing, opacity 0.05) layered behind the hero and pricing sections. Communicates "graph paper / instrument panel". Never on cards, never on CTAs.

- **Tech.** CSS `background-image: radial-gradient(circle, rgba(200,164,92,0.05) 1px, transparent 1px); background-size: 32px 32px`.
- **Where.** Hero background, pricing-tier-card dividers.

That is it. No laser strokes (would be too tech-bro for an alchemical brand). No glassmorphism (would be too SaaS). No purple gradients (would be a hate crime). No bento grids.

---

## Components

### Buttons

- **Primary:** bg `accent-gold`, text `text-inverse`, height `44px`, padding `0 24px`, radius `6px`, font display weight 600 size `body-sm` tracking `0.18em` UPPERCASE. Hover: bg `accent-gold-bright`, no transform. Active: bg `accent-gold-dim`.
- **Secondary:** transparent bg, 1px border `border-default`, text `text-primary`, same geometry. Hover: border `accent-gold`, text `accent-gold`.
- **Ghost:** no border, text `text-secondary` UPPERCASE tracked, hover `text-primary`.

### Inputs

- height `44px`, radius `6px`, padding `0 14px`, border `1px` `border-default`, bg `bg-surface-1`, text `text-primary`. Focus: border `accent-gold`, no glow. The brand rejects focus rings as too LED-bright.

### Cards

- bg `bg-surface-1`, radius `10px`, padding `24px`, border `1px` `border-default`. No shadow. The card sits flush against the page; depth comes from border, not from glow.

### Section labels (the most-used component)

- Caption tier (10px, 600 weight, 0.18em tracking, UPPERCASE), `accent-gold` color, prefixed with a small bullet `· ` or a section number `§ 03`. This shows up before every major section heading and is the primary way the brand signposts hierarchy.

### Iconography

- No icon library. Custom inline SVG only, in 1.25px stroke, in `text-secondary` (or `accent-gold` for emphasis at most once per section). Phosphor Light is acceptable as a fallback if a custom glyph is overkill — but never lucide.

### Hairlines

- 1px horizontal rules in `border-default` are used liberally as section dividers. They replace whitespace as a structural element. A hairline with a section-label sitting flush left and a step number sitting flush right is the brand's signature section break.

---

## Voice

- **Tone:** measured, technical, slightly esoteric. Talk like a quantitative analyst at a hedge fund, not a marketer.
- **Reading level:** educated adult. Do not dumb things down. The audience is founders, heads of growth, ops directors — they can read.
- **Forbidden words and constructions:** "supercharge", "unleash", "revolutionary", "game-changer", "AI-powered", "10x", "skyrocket", "next-gen", "cutting-edge". No exclamation points anywhere. No em-dashes in user-facing copy (use commas or full stops). No sparkles emoji. No "you got this" or "let's gooo".
- **Capitalization:** sentence case for headlines. UPPERCASE only for caption-tier section labels and CTAs. Never title-case.
- **Numbers:** spell out under 10 in body copy ("five passes"); numerals in data ("Pass 5/5"). Always use tabular figures for tables.
- **Product naming:** "the Alchemical Growth Engine" or "the Engine" on second reference. "Mode 1 · Earth" with a middle dot, never with a slash. "Outcome-Driven Innovation" or "ODI" — never "JTBD" except in technical references.
- **Headline construction:** name a specific behavior, not a vague benefit. "Find the five outcomes your competitors haven't priced yet" beats "Discover hidden opportunities".

---

## Anti-patterns

Explicit deny list. Override only with intent.

- Purple, violet, indigo, or pink anywhere except the single Market Entry strategy indicator
- Gradients beyond the explicit two listed in §Effects
- Glassmorphism on any surface
- Three-column feature row with circle-icon-headline-body
- Bento grid for unrelated content
- Centered hero with two side-by-side CTAs
- Animated gradient text on the headline
- Lucide icons, anywhere, ever
- Pastel-circle-icon decorations
- Stock illustrations of people pointing at laptops
- "AI shimmer" loading sweep on anything
- Logo soup as social proof ("trusted by" with 12 desaturated logos)
- Sparkles emoji as a brand element
- The shadcn/Tailwind UI default-zinc palette
- Light mode
- Rounded radius >12px on any element except the hero sigil halo
- "Get started" as CTA copy (use specific verbs: "Run the Engine", "Request Access", "Begin Mode 1")
- Testimonial sliders (use one named quote with face, attribution, and context)
- Newsletter signup section ("subscribe to our updates")
- Friendly chatbot bubble in the corner

---

## Cross-medium remix specs

### Mobile (≤ 640px)

- Type scale: shift down one step (`display-xl` → `display-lg`, `display-lg` → `display`)
- Spacing: 75% of web values
- The animated sigil: scaled to 80% of viewport width, rotation slowed to half speed, the orbit indicator removed (too small to read)
- Section dividers: hairlines remain, but the right-side step number drops
- Motion durations: × 0.7

### Slides

- Body type minimum: 28px
- One section per slide, no multi-column
- The sigil appears only on the title slide and on a methodology slide; static rendered, no animation
- Background: `bg-base` only
- Caption-tier section labels translate to slide footer ("§ 03 · METHODOLOGY")

### Promo video / motion graphic

- 16:9, 30fps, 30–60 seconds
- Open frame: black, then the sigil traces itself in gold, then wordmark fades in below — 3 seconds
- Mid section: real product UI captured at 30fps with caption-tier labels overlaid
- Close frame: wordmark + URL on black, hairline above, 2 seconds
- Sound: low ambient drone with a single brass tone on the wordmark reveal. No voiceover unless scripted.
- Transitions: cross-dissolves only. Never wipes, slides, or zooms.

### Social card (1080×1350)

- Headline at `display-lg` (64px scaled to 1080 width)
- Sigil rendered as a static frame, top-right quadrant
- Wordmark bottom-left at `caption`, URL bottom-right at `caption`
- One accent gold hairline at the 2/3 vertical mark
- Background `bg-base`, dot grid at 50% normal opacity

---

## Engine output template — Mode 1 Earth (v1.1)

The strategy document produced by a Mode 1 Earth run follows this TOC,
in order. The structure is non-negotiable; the brand-specific design
system overlays this skeleton but does not change it.

1. **POSITIONING** — the single sentence the brand should claim, plus
   2-3 alternative positioning sentences ranked by underserved-outcome
   score. The primary is the highest-scoring candidate. Each candidate
   cites: `citation_job_id`, `citation_outcome` (the full Ulwick-format
   outcome statement), and `citation_score` (the numeric opportunity
   score that backs it).

2. **EVIDENCE** — for each candidate positioning, the specific
   underserved outcomes (importance × satisfaction × opportunity) that
   justify it. Render as a structured table, not prose. Show the math.

3. **VALUE PROPOSITION COMPARISON** — the brand's resulting value prop
   next to 3-5 named competitors. Every competitor quote cited to a
   source URL. No invented competitor positioning. Render as a
   structured table.

4. **ENTRY WEDGE** — the first message, the first channel, the first
   SKU that proves the position. Reference any specific upcoming
   product drop or campaign moment.

5. **METHODOLOGY APPENDIX** — outcome inventory (full list of scored
   outcomes), scoring math, sources (which Google autocomplete /
   Reddit threads / PDP reviews fed Pass 1).

### Input source priority

Engine v1.1 reverses the previous default. Customer keywords are the
PRIMARY input to Pass 1 (job discovery). Ad creative is allowed only
in Pass 5 (Competitor Value-Prop Comparison). Running Pass 1 without
keyword input emits a `discovery_warning` in the JSON output and the
document surfaces this in the methodology appendix.

Keyword sources, in priority order:

1. SerpAPI `google_autocomplete` engine for seed queries
2. SerpAPI `google` engine `people_also_ask` block for related questions
3. Reddit threads via Anthropic web_search on r/loungewear,
   r/femalefashionadvice, r/SkincareAddiction (or the audience's
   equivalent communities)
4. Competitor PDP reviews — one-star and five-star — mined for the
   actual phrases customers use when describing what worked or failed

### Validation rule

Pass 6 (validatePositioning, see `src/lib/anthropic.js`) rejects any
positioning claim or entry recommendation that lacks a numeric
citation. No claim ships without a number underneath it. If Pass 6
returns errors, the doc generator surfaces them at the top of the
methodology appendix.

---

## Image generation

When generating image creative for a brand — concepts, mood frames, ad
mockups — use **`gpt-image-2`** (the OpenAI ChatGPT image model).
Never DALL-E 3.

Brief casting rules apply per the brand's own shot list, not generic
defaults. For Siraj specifically: women of color, varied body sizes,
real homes, warm soft natural lighting, real product silhouettes,
"exhale energy" / friend-vibe / not editorial.

See `generate-swipe-images-v3.mjs` for the working prompt template and
parallel generation script.

---

## Open questions

- [ ] Whether the sigil's 8 step-glyphs need bespoke iconography or whether a typographic abbreviation (DEF, LOC, PRE, CON, EXE, MON, MOD, CCL) suffices
- [ ] Final pricing tier names — whether to commit to elemental (Earth / Air / Fire / Water) immediately or stage them
- [ ] Whether the product video on the landing page is a real screen capture or a stylized motion-graphic build
- [ ] Phosphor-Light vs custom-glyph commitment — currently soft preference for custom
