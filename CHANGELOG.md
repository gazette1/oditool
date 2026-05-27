# Alchemical Growth Engine — Changelog

All notable changes to the engine and its output template. The engine
is Mode 1 Earth (ODI-based outcome discovery). Versioning is SemVer;
the output template version is independent of the React app version.

---

## [1.8.0] — 2026-05-27 · v2.0-alpha · HORMOZI CORE PHASE A SHIPPED

**Three new universal core passes** that produce three new top-of-doc sections (§01 The Offer · §02 The Money Model · §03 The Lead Model) on every strategy doc, regardless of business archetype. This is Phase A of the v2.0 pivot from architectural spec [[19 - Hormozi Core Architecture]].

### Added · `src/lib/hormozi-core.js` (NEW · 538 lines)

Three new pass functions grounded in verbatim Hormozi framework text (mirror of the `PM101_DEFINITIONS` pattern):

| Pass | Function | Output | Schema |
|---|---|---|---|
| **Pass O** | `generateGrandSlamOffer` | §01 The Offer | Value Equation breakdown (Dream × Likelihood / Time × Effort) + verdict (infinite/strong/moderate/weak) + weakest_lever identification + 5 enhancement layers (Scarcity / Urgency / Bonuses / Guarantees / Naming MAGIC formula) + Starving Crowd 4-indicator check (Massive Pain / Purchasing Power / Easy to Target / Growing) |
| **Pass M** | `generateMoneyModel` | §02 The Money Model | Money model archetype (Attraction/Upsell/Downsell/Continuity/Hybrid-led) + 2-4 offer stack from the 16 Hormozi offer types + CFA economics (CAC target · first-offer revenue · cumulative LTV · LTV:CAC ratio · cfa_status verdict + next lever to pull) |
| **Pass G** | `generateLeadModel` | §03 The Lead Model | Lead model archetype (Warm-Outreach / Content / Cold-Outreach / Paid / Hybrid-led) + 1-2 Core Four primary channels with first-30-days moves + 0-2 Lead Getters with stage-gate activation + 1-3 Lead Magnets (3 types × 4 formats = 12 variants per Hormozi) |

**`HORMOZI_DEFINITIONS` constant** (~3500 tokens) embedded in each pass's system prompt · contains the canonical framework text from all 3 books · same pattern as `PM101_DEFINITIONS`:

- Book 1 ($100M Offers) · Value Equation (ch 6) + Starving Crowd 4 indicators (ch 4) + 5 enhancement layers (ch 11-16)
- Book 2 ($100M Leads) · Core Four 2×2 (Section III) + 4 Lead Getters (Section IV) + 3 Lead Magnet types × 4 formats
- Book 3 ($100M Money Models) · 16 offer types across 4 categories + CFA principle + Money Model stacking rules

**Anchoring rule** (carried from Pass L · Pass 8.6 · Pass 8.7 · Pass D): every output MUST anchor to a real Pass 7 persona name AND a real Pass 2 Ulwick outcome. One retry on anchor failure. Outcomes-list pre-sorted by opportunity_score so high-opp outcomes are surfaced first.

**Pass O feeds Pass M and Pass G:** Pass M stacks AROUND the Grand Slam Offer (offer is usually stack[0]). Pass G's Lead Model DELIVERS prospects to the Grand Slam Offer. So Pass O runs first, then M and G consume Pass O's output as additional context.

### Added · Pass D 3 new classification axes (in `anthropic.js`)

Pass D now classifies projects across **8 axes** (was 4 + awareness):

- (existing) business_model · market_maturity · market_sophistication · emotional_journey · awareness_distribution · recommended_archetype
- **NEW: `money_model_archetype`** (Attraction-led / Upsell-led / Downsell-led / Continuity-led / Hybrid + rationale + signal)
- **NEW: `lead_model_archetype`** (Warm-Outreach-led / Content-led / Cold-Outreach-led / Paid-led / Hybrid + rationale + signal)
- **NEW: `starving_crowd_strength`** (starving / hungry / fed / sated + 4-indicator breakdown + rationale per $100M Offers ch 4)

### Added · 3 stub renderers in `compose-strategy.js`

- `renderHormoziOffer` · §01 · 4-tile Value Equation grid (Dream + Likelihood ↑ · Time + Effort ↓) + verdict callout + weakest-lever-with-unlock + Scarcity/Urgency/Guarantee/Naming row + Bonuses anchored-value list + Starving Crowd 4-indicator strip + anchor footer
- `renderHormoziMoneyModel` · §02 · stacked offer cards with big serif position numbers + category chip + economics tile (price · take rate · margin) + first-test + CFA panel (CAC target · LTV · ratio · status · lever to pull)
- `renderHormoziLeadModel` · §03 · 3-block layout: Core Four section + Lead Getters section + Lead Magnets grid · each magnet card has type+format chips + title + promise + delivery + narrow-problem-solved + first-test

Phase A stubs are FUNCTIONAL not POLISHED. Phase B (next ship · ~3-4 days) replaces these with branded design — Value Equation visualization, money-flow diagram, Core Four 2×2 matrix. The data structure is locked in this release.

### Updated · `business-models.js` doc_sections

- `DTC_DOC_SECTIONS` gains `offer`, `money_model`, `lead_model` between `strategic_context` and `positioning` (21 → 24 sections)
- `LOCAL_SERVICES_DOC_SECTIONS` gains the same 3 (24 → 27 sections)
- All existing sections shift down by 3 in their § number display

### Updated · `App.jsx` generateStrategyDoc wire-in

Pass O / M / G fire immediately after Pass 7 (personas) and before Pass 5 (value-prop). Each output piped through `persist()` so v1.7.8's localStorage cache + Resume button still works for crashes. Three new log lines:

```
Pass O · Hormozi $100M Offers · constructing Grand Slam Offer for §01
  → Pass O · offer "Soft Touch Founder POV" · Value Equation verdict: strong · weakest lever: time_delay
Pass M · Hormozi $100M Money Models · stacking customer journey for §02
  → Pass M · Attraction-led · 3 offers in stack · CFA: client-funded
Pass G · Hormozi $100M Leads · designing acquisition machine for §03
  → Pass G · Content-led · 2 Core-Four channels · 2 lead magnets
```

### Cost + time impact

- Pass O: ~$0.10 · ~30s
- Pass M: ~$0.15 · ~45s
- Pass G: ~$0.15 · ~45s
- **Combined: ~$0.40 per project · ~2 minutes added to wall time**

Total project cost moves from ~$1.50 to ~$1.90.

### ENGINE_VERSION bumped v1.7.8 → v1.8.0

This is the v2.0-alpha milestone (we ship v2.0 GA only after Phase B/C/D land).

Bundle 544.31 KB / 155.51 KB gzip (+46 KB from HORMOZI_DEFINITIONS + 3 system prompts + 3 stub renderers). Vite warns chunk > 500 KB — acceptable single-bundle trade-off for the new core.

### What's next · Phase B (~3-4 days)

Replace the 3 stub renderers with polished branded design:

- §01 Value Equation visualization (animated SVG?) with the 4 levers as scales
- §02 Money flow diagram showing customer journey through offer stack with $ flow
- §03 Core Four 2×2 matrix as the primary visual + Lead Magnet cards rotating

### What's deferred · Phase C (~1-2 weeks · v2.0-rc)

Universal 24-section roster migration · all 11 archetypes collapse to one doc roster · per-archetype variants captured as renderer config flags. local_services Phase 2 dedicated passes (P10_sms etc.) become VARIANTS within universal renderers.

### What's deferred · Phase D (~1 week · v2.0 GA)

Cialdini Phase 1 integration INTO Pass O + Pass M · b2b_saas re-enabled · all 11 archetypes ship simultaneously.

### Acceptance criteria

1. ✅ `generateGrandSlamOffer` produces Value Equation + 5 enhancements + Starving Crowd check · anchored
2. ✅ `generateMoneyModel` produces 2-4 stack from the 16 offer types + CFA economics · anchored
3. ✅ `generateLeadModel` produces 1-2 Core Four selection + 0-2 Lead Getters + 1-3 Lead Magnets · anchored
4. ✅ Pass D gains money_model_archetype + lead_model_archetype + starving_crowd_strength axes
5. ✅ §01 / §02 / §03 render between §00 and §04 in every strategy doc
6. ✅ Pass O output feeds Pass M and Pass G (so all three are coherent)
7. ✅ Outputs persist via v1.7.8 cache system · Resume button recovers them on crash
8. ✅ DTC backward-compat: existing DTC projects render with the 3 new sections at top · no regression in §04-§23
9. ✅ local_services projects (v1.7.6 partial-support) get the 3 new sections + still 5 pending sections drop silently
10. ✅ Build clean · bundle within reason (544 KB / 155 KB gzip)

---

## [Unreleased · v2.0 planning] — 2026-05-27 · MAJOR ARCHITECTURAL PIVOT

**The Hormozi trilogy becomes the engine's universal core.** Doc-only · no code changed tonight · full architectural spec captured for v2.0 implementation.

User dropped 3 Hormozi books (`$100M Offers`, `$100M Leads`, `$100M Money Models`) with direction: "every business should fit into these 16 business models within the 100M leads book but also should use the ideas in the other books to formulate better offers and money model for better long term stuff. this should be like the core stuff while everything before is supplimental and should exist to strengthen these models."

### What the 16 are (and which book they're actually in)

User said "16 business models within the 100M leads book" — close. The 16 are **offer types** in **`$100M Money Models`** (trilogy mix-up · understandable):

| Category | Count | Offer Types |
|---|---:|---|
| **Attraction Offers** | 6 | Win Your Money Back · Giveaways · Decoy · Buy X Get Y Free · Pay Less Now or Pay More Later · Free Goodwill |
| **Upsell Offers** | 4 | Classic · Menu · Anchor · Rollover |
| **Downsell Offers** | 3 | Payment Plan · Trial With Penalty · Feature Downsells |
| **Continuity Offers** | 3 | Continuity Bonus · Continuity Discount · Waived Fee |
| **TOTAL** | **16** | |

### v2.0 architecture · 3 new universal core passes

Every project (regardless of archetype) runs:

- **Pass O · `generateGrandSlamOffer`** · Value Equation (Dream × Likelihood) / (Time × Effort) + 5 enhancement layers (Scarcity/Urgency/Bonuses/Guarantees/Naming) → §01 The Offer
- **Pass M · `generateMoneyModel`** · stacks 2-4 of the 16 offer types into a customer journey + CFA economics → §02 The Money Model
- **Pass G · `generateLeadModel`** · Core Four (Warm Outreach / Posting Content / Cold Outreach / Paid Ads) + 0-2 Lead Getters + 1-3 of 12 Lead Magnet variants → §03 The Lead Model

These three sections slot at the TOP of every strategy doc (after §00 Strategic Context · before §04 Positioning).

### The architectural simplification

The 11-archetype system **stops driving the pass plan and doc roster**. Both become UNIVERSAL — 24 sections for every archetype. The archetype becomes a "style overlay" that influences renderer variants in ~5 sections (personas · sequences · channels · partner_or_tribe · discoverability_audit) but not the structure.

| What was | What becomes |
|---|---|
| 11 archetype-specific pass plans (~50 dedicated passes spec'd across roadmap) | 3 new universal core passes + 5 archetype variants in existing renderers |
| v1.7.6 local_services Phase 2 (6 dedicated passes spec'd) | 6 RENDERER VARIANTS within universal sections · same content, cleaner wrapper |
| v1.9+ b2b_saas (9 dedicated passes spec'd) | Universal roster + B2B variants. Drops from "9 weeks of work" to "config flip" |
| Cialdini Phase 1 (5th Pass D axis) | Cialdini's 6 principles slot INSIDE Pass O's Value Equation (Authority + Social Proof boost Perceived Likelihood) + Pass M (Reciprocation powers Free Goodwill attraction · Commitment powers upsell sequencing) |

### Pass D gains 3 new classification axes

- `money_model_archetype` · Attraction-led / Upsell-led / Downsell-led / Continuity-led / Hybrid
- `lead_model_archetype` · Warm-Outreach-led / Content-led / Cold-Outreach-led / Paid-led / Hybrid
- `starving_crowd_strength` · starving / hungry / fed / sated (per $100M Offers ch 4)

Total Pass D axes: 4 → 8.

### 4-phase ship plan · ~6-8 weeks

- **Phase A** · v2.0-alpha · 3 core passes scaffolded · `src/lib/hormozi-core.js` · App.jsx wires them in before Pass 5 · Pass D gains 3 new axes · ~1 week
- **Phase B** · v2.0-beta · 3 new renderers (`renderOffer`, `renderMoneyModel`, `renderLeadModel`) · §01/§02/§03 ship · ~3-4 days
- **Phase C** · v2.0-rc · universal roster migration · all 11 archetypes collapse to one 24-section list · per-archetype variant config replaces per-archetype pass plans · ~1-2 weeks
- **Phase D** · v2.0 GA · Cialdini integrated into Pass O + Pass M · all 11 archetypes (including b2b_saas) ship simultaneously · ~1 week

### What's deferred / cancelled

- v1.8 was scoped for local_services Phase 2 (6 dedicated passes). Now folded into v2.0 Phase C as renderer variants. v1.8 instead becomes the Phase A "Hormozi core scaffolds" release.
- Phase 3 / Phase 4 / Phase 5 / Phase 6+ archetype-by-archetype roadmap is **superseded** — all 11 ship in v2.0 GA. Major roadmap simplification.

### Why this is right

The user's intuition is correct: there is a universal commercial architecture (Offer + Money Model + Lead Model) that every business needs. The 11 archetypes encode CONTEXT (B2B vs DTC vs local), not STRUCTURE. Building 11 different "shapes" of strategy doc was scope-creep. The Hormozi trilogy gives us the structural spine the engine was missing.

### Vault docs

- **NEW** [[19 - Hormozi Core Architecture (Money Model + Offer + Lead Model)]] · full architectural spec · 3-pass schemas · 24-section universal doc roster · 4-phase ship plan · acceptance criteria · risk register
- Updated [[13 - Roadmap & Backlog]] · v2.0 section added · Phase 3+ table marked obsolete
- Updated [[17 - Cialdini Persuasion Principles Integration Plan]] · principles reframe through Pass O + Pass M
- Updated [[18 - Local Services Phase Spec]] · 6 dedicated passes → renderer variants under v2.0
- Updated [[16 - Business Model Archetypes]] · role shrinks from "drives pass plan" to "drives renderer variant"

### No code change tonight

This is a planning artifact. Implementation begins in v1.8 Phase A. Source PDFs/EPUB kept locally in `~/Downloads/` · not committed to repo (copyright).

---

## [1.7.8] — 2026-05-27 · INCREMENTAL PERSISTENCE (prevents $1.40 loss)

**The fix for "I paid $1.50 and got nothing."** User asked: "what about all the info that has already been generated to this point?" — pointing at the v1.7.7 crash where every pass succeeded, every API call charged, but the composer threw on the last 50ms and the user got zero document. This release prevents that pattern forever.

### Problem statement

When `generateStrategyDoc` runs, every Pass 5-18 output was stored in **function-local `const`s** inside the function scope. If anything downstream threw — composer bug, image gen failure, OOM, browser crash, network blip during download — those locals were destroyed by garbage collection and ~$1.40 of API spend vanished with them.

The user already experienced this on 2026-05-27 at 07:37 with the `lives_online_at .split` crash. Pass 1-4 + Stage A + diagnostic survived (those use React state setters during runAnalysis, not during strategy-doc gen). Everything else gone.

### Fix · incremental localStorage persistence

After EVERY pass output is generated, immediately write to localStorage. Single key per project: `alchemy:${projectId}:strategy_cache_v1`. JSON object accumulated across the run. Cleared only after successful HTML download.

```js
const cacheKey = `alchemy:${projectId}:strategy_cache_v1`;
const cache = { _started_at: Date.now(), _project_name: …, _project_id: … };
const persist = (passName, output) => {
  cache[passName] = output;
  try { localStorage.setItem(cacheKey, JSON.stringify(cache)); }
  catch (e) { console.warn(`persist failed at ${passName}: ${e.message}`); }
};

// after every pass call:
const personas = await generatePersonas(...);
persist("personas", personas);
// ... and so on for swipe_file, scripts, emailFlows, channelPlan, landing,
// rollout, creators, competitive, brandAudit, demandLandscape, tribe,
// valueProp, adRecreations, adDeepDive, appliedPlaybooks
```

The **swipe_file persist after Pass 8.5** is the biggest win — that's the $0.80 worth of gpt-image-2 base64 imagery that took 25+ minutes of wall time on the failed run. Now if anything downstream breaks, the images are safe in localStorage.

### Fix · final payload persist before compose

Right before calling `composeStrategyDoc(payload)`, the full assembled payload is written one more time as `cache._full_payload`. So even if the composer itself throws (which is what happened on 05-27), the entire input to the composer is sitting in localStorage ready for a do-over.

### Fix · "↻ Resume cached run" button + cache-hit detection

New state `hasCachedRun` set on project load if `alchemy:${projectId}:strategy_cache_v1` exists. New yellow-bordered "↻ Resume cached run" button in the header next to "↓ Strategy Doc". Click it → reads cache → calls `composeStrategyDoc(cache._full_payload)` + `downloadStrategyDoc()` → **zero API spend on the resume**. Clears cache on success.

If the cache exists but doesn't have `_full_payload` (i.e. the crash happened BEFORE compose, mid-pass), the resume button still appears but reports that the run is incomplete and the user needs to re-run. Future v1.7.9 work: resume from arbitrary cached state by replaying only the missing passes.

### Cache-hit log on project load

When user switches to a project that has a cached run, the debug log emits:

```
📦 Cached strategy run found · 14 passes cached · READY to resume (zero API spend) · click ↻ Resume in header
```

Or if incomplete:

```
📦 Cached strategy run found · 8 passes cached · incomplete · re-run to complete
```

### localStorage size considerations

The 20-image swipe file is ~1MB of base64. Plus the rest of the passes ~200KB. Total cache ~1.2-1.5MB per project. localStorage cap is 5MB per origin. Comfortable headroom. If a future run exceeds the cap, `persist()` logs a warning to console with the payload size — does NOT throw — pass continues normally just without the cache entry.

### Architecture note: this is a "save-then-resume" pattern, not a "checkpoint-resume" pattern

v1.7.8 only re-renders from the END payload. It doesn't yet support partial resume (e.g., "Pass 16 failed at minute 35 · resume from Pass 17"). That's v1.7.9+ scope · would need each individual pass cache entry to be independently usable as a starting point.

For the most common failure mode (composer throws on the very last step), this design is sufficient.

### ENGINE_VERSION bumped v1.7.7 → v1.7.8

### Acceptance criteria

1. ✅ Every Pass 5-18 output persisted to localStorage immediately after generation
2. ✅ Pass 8.5 imagery persisted (the $0.80 case · most expensive to lose)
3. ✅ Full payload persisted right before composeStrategyDoc
4. ✅ Cache cleared on successful download
5. ✅ "↻ Resume cached run" button appears when cache exists
6. ✅ Resume button calls composeStrategyDoc + downloadStrategyDoc with zero API calls
7. ✅ Cache-hit log emitted on project load when cache exists
8. ✅ localStorage cap (5MB) handled gracefully — warning log, pass continues
9. ✅ Build clean · 498.31 KB / 142.68 KB gzip (+3 KB from persist scaffold + Resume callback + button)
10. ✅ DTC regression-free

### What this means for the user's lost 05-27 run

This release doesn't recover the data already lost. The cache wasn't there when the v1.7.7 run happened. But going forward: **every API spend is safe.** The next time the user runs the engine and anything fails at any point past Pass 7, they'll see a "↻ Resume cached run" button and can re-render the doc for free.

---

## [1.7.7] — 2026-05-27 · CRITICAL HOTFIX

**Composer-crash hotfix.** User ran the engine against a live junk-removal client at ~07:37 and got `Strategy doc generation failed: (per.lives_online_at || "").split is not a function` AFTER every pass had already run successfully (Pass 1-18 all completed · ~3-4 minutes wall + ~$1.50 in Anthropic spend). Zero document returned. Critical bug.

### Root cause

`renderPersonas` in v1.7.1 was changed to split `per.lives_online_at` by comma to render handle-chips. The code assumed `lives_online_at` is always a **string**. Claude actually returns it as an **array of strings** roughly half the time depending on prompt phrasing. Arrays have no `.split()` method → composer throws → user gets no HTML.

The crash was particularly painful because every preceding pass succeeded, so the user paid for the full run and got nothing.

### Fix 1 · `toChipArray(value)` helper · normalizes both shapes

New helper at the top of `compose-strategy.js`:

```js
const toChipArray = (value) => {
  if (Array.isArray(value)) return value.map(v => String(v ?? "").trim()).filter(Boolean);
  if (typeof value === "string") return value.split(/[,;|\n]/).map(s => s.trim()).filter(Boolean);
  return [];
};
```

Handles array, string, null, undefined. Splits string on comma · semicolon · pipe · newline (broader than the old `.split(",")` because Claude varies the separator).

`renderPersonas` `lives_online_at` line now calls `toChipArray(per.lives_online_at)`. Empty result renders an em-dash placeholder instead of breaking layout.

### Fix 2 · per-section try/catch in the dispatcher · fail-safe for the whole doc

Even if a future renderer throws, **the rest of the doc still ships**. Was: one error aborted `composeStrategyDoc` entirely. Now: failed section emits a visible red callout with the error message + section_id, console gets the full stack, and the user gets a downloadable doc with N-1 sections rendered correctly.

The callout uses brick-red dashed border + monospace text — clearly visible as "this section broke" without looking like normal content.

### Fix 3 · `ENGINE_VERSION` bumped v1.7.4 → v1.7.7

This had been stuck at v1.7.4 since the polish round. v1.7.5 and v1.7.6 were tagged on the repo but the version stamp in the strategy doc cover, methodology, and footer still said v1.7.4. Now corrected. v1.7.8+ should bump this constant whenever the tag bumps.

### Other things observed in the user's failed run (NOT fixed in this hotfix · logged for v1.8)

- **Cover headline still uses full sector field as project_name** — user had `Victory Point Express is a junk removal service targeting Long Island residential and commercial customers in the mid-to-premium price tier` displayed as the entire H1. The fix is a Project Setup UI change: separate `brand_name` field defaulting to project name. Not a renderer bug.
- **Pass 8.6 + Pass 8.7 silently skipped** — Ad-Intel Stage A found 10 competitors but Stage B (web_search fallback) returned 0 ads. Pass 8.6 correctly detected no ads and skipped, which then cascaded to Pass 8.7 also skipping. This is expected v1.7.5 behavior · the real fix is **Adyntel wire-in** (v1.8 work · Adyntel API key already in `.env.local`, just needs the user's account email).
- **Pass L skipped: no concept vault loaded** — user didn't pick a vault folder in Project Setup. Pass L correctly skipped. Could be more discoverable in the UI (a banner reminding the user to pick a vault if they want §18 Applied Playbooks).

### Acceptance criteria

1. ✅ `toChipArray()` exported from compose-strategy.js · handles array, string, null, undefined
2. ✅ `renderPersonas` `lives_online_at` no longer crashes on array input
3. ✅ Dispatcher loop in `composeStrategyDoc` wraps every section in try/catch
4. ✅ Failed renderer emits a brick-red error callout · doc still downloads
5. ✅ `ENGINE_VERSION = "v1.7.7"` in compose-strategy.js (was stuck at v1.7.4)
6. ✅ Build clean · 495.36 KB / 141.82 KB gzip (+1 KB from helper + error-callout HTML)
7. ✅ No DTC regression · same renderers, same payload shape · just defensive on field types

### Smoke-test for the user

After pulling this hotfix, the junk-removal run will:
- Complete without crashing
- Render the `lives_online_at` field correctly regardless of which shape Claude returns
- If ANY other renderer still throws (we haven't audited every field shape assumption), the doc will still download with that one section showing a red error callout instead of the whole gen failing

---

## [1.7.6] — 2026-05-27

**Phase 2 pivoted: `local_services` promoted to Phase 2 · `b2b_saas` demoted to Phase 6+ pool.** User has active junk-removal client tonight; explicit direction: "i do so tonight lets run everything we need to be prepared for that instead of the saas stuff. i trust you to make the decisions and log them will review and correct at a later time."

### Rationale

| Driver | Local Services | B2B SaaS |
|---|---|---|
| Market reach per city | 50+ businesses (plumbers, dentists, HVAC, junk removal, restaurants, lawn care, locksmiths, movers) | 1-2 startups |
| Active client need today | ✅ junk removal | ❌ none |
| Pass-plan delta from DTC | small (replace 5 + add 1) | large (ICP, buying committee, ABM are net-new structures) |
| Library priors already tuned | mostly yes (Reviews + SEO + Brand Identity) | partially |

### Code changes · `src/lib/business-models.js`

**`local_services` flipped to supported:**

- `is_supported: false → true`
- `phase_target: 6 → null`
- `pass_plan: null → LOCAL_SERVICES_PASS_PLAN` (24 entries · 5 swap from DTC + 1 net-new `P16b_gbp`)
- `doc_sections: null → LOCAL_SERVICES_DOC_SECTIONS` (24 entries · 18 universal + 6 placeholder for v1.8 renderers)
- `persona_variant: "P7_local"`
- `partial_support: true` (NEW flag · documents the v1.7.6 → v1.8 gap)
- `partial_support_pending_sections: ["sms_sequences", "partner_referrals", "trust_stack_audit", "gbp_audit", "customer_quote_wall"]`
- `library_priors` expanded from 3 → 12 priority themes (Reviews · SEO · Brand · CRO · Above-the-Fold · Customer Research · Referral · Persuasion · Paid · Email · Landing · Copywriting) and 1 → 4 deprioritize themes (Cold Email · Influencer · AI Search · Ad Creative Testing)

**`b2b_saas` demoted to Phase 6+ pool:**

- `phase_target: 2 → 6`
- `not_yet_supported_message` rewritten · references the cold-email scope decision and the Phase 6+ pool

### Architectural notes

- `pass_plan` is documentation-only at present · App.jsx hardcodes its pass calls regardless of archetype. Side effect: Pass 10 / 14 / 18 still fire for local_services projects but their output is silently discarded by the renderer (output sections don't exist in `doc_sections`). Wasted ~$0.06/run · acceptable in v1.7.6. v1.8 wires App.jsx to respect `pass_plan` and skip dropped passes.
- `doc_sections` IS consumed by the dispatcher. Unknown section IDs trigger `console.warn` and emit `""`. So the 5 placeholder sections drop silently in v1.7.6 · ~18 of 24 sections render correctly.
- DTC projects unaffected · only the 2 changed archetype entries were touched.

### What renders TONIGHT for a junk-removal project

✅ Renders: §00 Strategic Context · §01 Positioning · §02 Evidence · §03 Value-Prop · §04 Personas (DTC shape · v1.8 swaps to local shape) · §05 Swipe File · §05b Ad Recreations · §05c Ad Deep Dive · §06 Scripts · §08 Entry Wedge · §09 Channels (already weights GBP + Yelp + paid Google correctly) · §10 Targeting Matrix · §11 Landing Variants · §12 Rollout · §14 Competitive Teardown · §16 Demand Landscape · §18 Applied Playbooks · §19 Methodology · §20 Colophon.

⏳ Pending v1.8 (drops silently with `console.warn`): §07 SMS Sequences · §13 Partner Referrals · §15 Trust Stack Audit · §15b GBP Audit · §17 Customer Quote Wall.

### v1.8 scope captured

6 new pass functions + 6 new renderers + ~5 Airtable schema extensions. Full schemas, acceptance criteria, and ASCII layout wireframes at `<vault>/18 - Local Services Phase Spec.md`. Estimated effort: ~3-4 weeks.

### Vault docs updated

- **NEW** `<vault>/18 - Local Services Phase Spec.md` (full spec · 24-section doc roster · per-pass schema with example output · acceptance criteria · risk register · adjacent-decisions log)
- `<vault>/13 - Roadmap & Backlog.md` · v1.8 section completely rewritten · Phase 3+ table swapped (local_services Phase 2 · b2b_saas demoted to Phase 6+)
- `<vault>/16 - Business Model Archetypes.md` · mermaid diagram updated · registry table reordered (local_services moves up · b2b_saas moves down) · Phase 2 dedicated section rewritten for local_services · priors-difference table updated with local_services' expanded 12-theme priors
- `<vault>/17 - Cialdini Persuasion Principles Integration Plan.md` · cross-ref updated · local_services already gets "Persuasion Principles" in its v1.7.6 priors (so Phase 0 of Cialdini partially landed for local_services tonight)

### Bundle

`494.09 KB / 141.42 KB gzip` (+1 KB from registry text). DTC behavior unchanged.

### Acceptance criteria

1. ✅ `local_services.is_supported = true`
2. ✅ `local_services.pass_plan` + `doc_sections` populated
3. ✅ `b2b_saas.phase_target = 6`
4. ✅ DEV-only `console.assert` registry-integrity block still passes
5. ✅ Build clean
6. ✅ Pass D will classify junk-removal projects as `local_services` and `ArchetypeGateModal` will bypass (instead of blocking with the "Phase 6+" message)
7. ✅ Strategy doc renders ~18 of 24 sections · 5 pending sections drop silently
8. ✅ All vault cross-refs updated (4 docs)
9. ✅ Spec written for v1.8 implementation (24 sections, 6 pass schemas, acceptance criteria)

---

## [Unreleased · planning] — 2026-05-27

**Cialdini Persuasion Principles integration plan captured.** Doc-only · no code changed.

User dropped `Cialdini · Influence: The Psychology of Persuasion` (250pp PDF) asking for the 6 principles (Reciprocation, Commitment & Consistency, Social Proof, Liking, Authority, Scarcity) to be added to the roadmap "somewhere." Spec written as cross-cutting horizontal layer (not a dedicated archetype phase) because Cialdini applies equally to every business model.

**3-phase plan** (full detail at `<vault>/17 - Cialdini Persuasion Principles Integration Plan.md`):

- **Phase 0 · this week** · ~2h user content + 1-line code change · 6 playbook .md files into `Demand Curve Map/concepts/` (one per principle) + add "Persuasion Principles" theme to all archetypes' `library_priors.priority_themes` in `business-models.js`. Pass L starts surfacing principle-anchored playbooks in §18 immediately. Zero new code paths.
- **Phase 1 · v1.9** · ~4h · Pass D gains 5th classification axis `cialdini_activation`. §00 Strategic Context renders 6-row activation tile. `CIALDINI_DEFINITIONS` const lives alongside `PM101_DEFINITIONS` in `anthropic.js`.
- **Phase 2 · v1.10** · ~6-8h · Selective cross-pass annotation. Pass 8 Swipe File + Pass 8.6 Recreations + Pass 16 Brand Audit each gain a `cialdini_principle` (or `cialdini_lever_missing`) schema field with renderer chip support.
- **Phase 3 · v2.0** · conditional · ~1 day · Dedicated §16b Persuasion Audit (6×8 matrix · principles × audit surfaces).

Roadmap updated at `<vault>/13 - Roadmap & Backlog.md` with the cross-cutting block above the Phase 3+ archetype commitments table.

**What this is NOT:** not a "scarcity email generator." Cialdini sits as a horizontal ANNOTATION layer (which principle is each output activating?), not a new output type. Pass 10 still writes the email; Cialdini just labels which principle it leans on. Source PDF kept locally in `~/Downloads/`.

---

## [Unreleased · v1.7.6 scope cut] — 2026-05-21

**Cold-email drafting removed from v1.8 b2b_saas Phase 2 scope.** Doc-only change · no code changed.

The original v1.8 plan included a `P_cold_email` pass that would draft 5-7 step outbound sequences and a `Pass 19 · Cold Email Sequences` LI-Intel wire-in that would personalize each step using the engager's `Engagement Value` quote. **Both are dropped.**

### Rationale

The engine's job is **strategic positioning + creative direction**. Cold-email sequence drafting belongs in dedicated outbound tools (Lemlist, Smartlead, Instantly, Apollo) that already handle:
- Per-step delivery scheduling + send windows
- Reply detection + auto-pause
- Inbox warmup + deliverability
- A/B test mechanics on subject lines
- Unsubscribe + suppression list management

What the engine still provides for outbound:
1. **Pass L surfaces vault playbooks** about cold-email strategy when `b2b_saas.library_priors.priority_themes` includes `Cold Email Outreach` — these are reference reading, not draft sequences
2. **Pass 18b LI Tribe Readout** (v1.8) delivers the engager data + verbatim `Engagement Value` quotes ready to lift into outreach written **outside** the engine

### Files updated (doc-only · no code)

- `<vault>/13 - Roadmap & Backlog.md` · `P_cold_email` row struck through in the v1.8 b2b_saas table · LI-Intel wire-in row no longer references Pass 19
- `<vault>/08b - LI-Intel Module.md` · Pass 19 row removed from v1.8 integration table · new explicit "out of scope" callout
- `<vault>/16 - Business Model Archetypes.md` · b2b_saas doc roster strips "cold-email sequences" · Phase 2 pass-list strikes through `P_cold_email` with rationale link

### Files explicitly NOT changed

- `src/lib/business-models.js` · `b2b_saas.library_priors.priority_themes` still includes `Cold Email Outreach` — this surfaces vault PLAYBOOKS about cold-email *strategy* (reference reading) via Pass L, which is value-add. Different from drafting sequences.
- Historical CHANGELOG entries (v1.7.5, v1.7.0) · they accurately describe what was planned at release time · don't rewrite history.

### Net impact on v1.8

| Before | After |
|---|---|
| 9 planned passes (P7_icp_b2b, P_buying_committee, P_cold_email, P_abm, P_demand_gen, P_sales_enablement, P_pricing_position, P_partnerships, P_nurture) | 8 planned passes (P_cold_email dropped) |
| LI-Intel wire-in: Pass 7b + 18b + 19 | LI-Intel wire-in: Pass 7b + 18b |
| Scope estimate: medium-large | Scope estimate: medium |

---

## [1.7.5] — 2026-05-21

**LI-Intel CLI sub-pipeline** · LinkedIn engagement scraping vendored from the user's `Marketing Bot/files/` folder into `engine/li-intel/`. This is the B2B-shaped mirror of the existing DTC-shaped `engine/ad-intel/` pipeline: where Ad-Intel scrapes Meta competitor ads, LI-Intel scrapes engagement signal from monitored LinkedIn profiles (who reacts, who comments, what their job title is, how senior they are).

### Added · `engine/li-intel/` (NEW directory · 5 files + scoped package.json)

```
engine/li-intel/
├── package.json                ← scoped {"type":"commonjs"} override
├── run-all.js                  ← orchestrator (Part 1 → Part 2+3)
├── scrape-posts.js             ← Part 1 · profiles → posts (Apify supreme_coder~linkedin-post)
├── scrape-engagers.js          ← Part 2+3 · posts → engagers → enriched profiles
│                                 (Apify harvestapi~reactions + ~comments + apimaestro~profile-detail)
└── lib/
    ├── airtable.js             ← Airtable client wrapper · withRetry / dedupe / per-run id caches
    └── apify.js                ← Apify run-sync-get-dataset-items thin wrapper
```

Files vendored from `C:\Users\harri\Documents\Marketing Bot\files\` (the user's source folder). Two adjustments made during vendoring:

1. **dotenv path** — original assumed `.env` at sibling-project root; adjusted to point at engine's repo-root `.env.local` (3 levels up from `lib/`)
2. **Table-name env vars** — added `LI_` prefix (`AIRTABLE_TABLE_LI_PROFILES` instead of just `_PROFILES`) to avoid namespace collision with engine's existing 17-table schema

### Added · 4 new Airtable tables (table count 17 → 21)

| # | Table | Purpose |
|---|---|---|
| 18 | `LI Profiles` | Monitored LinkedIn profiles · `Enabled` checkbox gates which get scraped |
| 19 | `LI Posts` | Posts pulled from each profile · `Status` enum drives downstream flow (`PENDING` → `PROCESSING` → `PROCESSED - 1`) |
| 20 | `LI Engagers` | Enriched person-level records · 19 fields incl. `Lead Score` formula (🔥 Hot / 🌡 Warm / ❄️ Cold) |
| 21 | `LI Engagements` | M:M join · one row per (engager, post) pair · denormalized URL fields for cheap dedup |

Full schema (field-by-field types + the Hot/Warm/Cold Lead Score formula) at `docs/AIRTABLE_LI_SETUP.md` in repo. Mirror documented in vault at `08 - Airtable Data Layer.md` (table 18-21 row entries).

### Added · `dotenv@^16.4.7` dep + 3 npm scripts

```json
{
  "li-intel": "node engine/li-intel/run-all.js",
  "li-intel:posts": "node engine/li-intel/scrape-posts.js",
  "li-intel:engagers": "node engine/li-intel/scrape-engagers.js"
}
```

### Added · `.env.local` placeholders

New section in `.env.local` for `APIFY_TOKEN` + Airtable creds + table-name overrides. APIFY_TOKEN is empty until user pastes their Apify token from apify.com/account.

> [!warning] Pipeline will exit 1 on first run until APIFY_TOKEN is provided. This is intentional — fail-fast on missing creds is safer than silent partial-runs.

### Documentation

- New vault page: `08b - LI-Intel Module.md` · full module reference · pipeline shape mermaid diagram · how to run · cron pattern · v1.8 integration roadmap
- Updated vault page: `07 - Airtable Data Layer.md` · table count 17 → 21 · cross-links to 08b and the new repo docs
- Updated vault page: `12 - Codebase Map.md` · new `engine/li-intel/` subtree in the repo tree
- Updated vault page: `13 - Roadmap & Backlog.md` · v1.8 LI-Intel wire-in item added to the b2b_saas Phase 2 table · v1.7 backlog item "Print stylesheet" struck through (shipped v1.7.4)
- New repo doc: `docs/AIRTABLE_LI_SETUP.md` · field-by-field schema reference for the 4 LI tables

### Why this matters strategically

The engine has been DTC-shaped to date. LinkedIn engagement scraping is the B2B-shaped mirror — and it unlocks:

- **Pass D · archetype classification** gets a hard B2B signal: "this brand has a monitored LI profile feeding engagers" → strongly suggests `b2b_saas` or `b2b_services`
- **Pass 7 · ICP profiles** can ground itself in real headlines / companies / titles instead of inferring from sector strings
- **Pass 18 · Tribe Readout** becomes a B2B-flavored "who specifically engaged this month" instead of hypothetical creator archetypes
- **Phase 2 (b2b_saas)** gains real prospecting data instead of synthetic personas

### v1.7.5 status: CLI shipped · React wire-in is v1.8 work

v1.7.5 ships the CLI **only**. Strategy docs generated today don't read LI tables. Wire-in is scoped for v1.8 alongside b2b_saas Phase 2 — that's when Pass 7b/18b consume engagers as ICP signal and Pass 19 cold-email sequences use engager `Engagement Value` quotes as personalization hooks.

### Bundle

React bundle unchanged (492.80 KB / 141.06 KB gzip) · LI-Intel is server-side only · doesn't touch the browser.

### Smoke tests verified

- `node --check` syntax-clean on all 5 scripts
- `node -e "require('./engine/li-intel/lib/airtable.js')"` exports `base, TABLES, findByField, findEnabledProfiles, findPostsByStatus, createRecord, updateRecord, resolveRecordId, getRecordById, withRetry, escapeFormula`
- `node -e "require('./engine/li-intel/lib/apify.js')"` exports `runActor`
- `npm install` adds `dotenv@16.6.1` cleanly
- `npm run build` produces identical output (LI-Intel scripts aren't bundled into the browser)

---

## [1.7.4] — 2026-05-17

**Pass 8.7 · Ad Deep Dive (Phase A MVP) + whole-doc print stylesheet.** Closes the user's "analyze frame-by-frame → reverse-engineer why it blew up → build storyboard → design scene mockups, animation timing, voiceover, audio cues → production-ready PDF" ask at ~70% capability without video ingestion (which is Phase B / v1.7.5).

### Added · `generateAdDeepDive()` in `anthropic.js`

Auto-runs on Pass 8.6's TOP recreation. Single LLM call (maxTokens 8000) that explodes one recreation into a full production deliverable:

- **Hook anatomy** — pattern (HOOK_TYPES vocab) · Schwartz level · fires_at timestamp · mechanic · why_it_blew_up paragraph · retention_devices list (with timestamps) · Schwartz progression across the runtime
- **Copy breakdown** — on_screen_text_arc · vo_arc with emotion tags · music_arc (intro/build/peak/outro + license_direction)
- **Storyboard** — 8-12 shots, each with `n` · `t` (time range) · `duration_sec` · `camera` · `framing` · `action` · `on_screen_text` · `vo` · `sfx` · `music` · `gpt_image_2_prompt` (≤ 220 chars, brand-safe) · `anchor_outcome` · `why_this_shot`
- **Production brief** — talent (count + description + wardrobe) · location (type + spec + backup) · props list · music_direction · sfx_list · estimated_cost_usd (ugc_route + studio_route + notes) · timeline (prep/shoot/edit days + total calendar) · delivery_specs (master + derivatives across platforms)
- **Strategic thesis** — 1-paragraph closer tying the storyboard back to persona + outcome + positioning

**Anchoring rule** (same as Pass L + Pass 8.6): `persona_anchor` must match a real Pass 7 persona name; `outcome_anchor` must match a real Pass 2 Ulwick outcome; every `shot.anchor_outcome` must be one of the top 5 scored outcomes. One retry on anchor failure; ships partial if still failing rather than dropping the whole section.

**Brand safety:** every shot's `gpt_image_2_prompt` is regex-scrubbed for the source competitor's brand name before render. Source brand preserved separately in `dd.source_brand` for credit/traceability.

**Cost:** ~$0.40 per deep-dive (single large output-token call) · ~60s wall time.

### Added · `renderAdDeepDive()` in `compose-strategy.js`

New §05c "Ad deep dive" section between §05b (Recreations) and §06 (Scripts). Layout:

1. **Header** — title + runtime/format pill + "Inspired by / For / On" anchor strip
2. **Hook anatomy panel** — moss-deep bordered gradient · 3-tile grid (pattern + Schwartz + fires_at) + mechanic italic + "why it blew up" callout + retention-devices time table + Schwartz progression strip
3. **Copy arcs** — 3-column grid: on-screen text · VO (with emotion italic) · music arc (intro/build/peak/outro + license direction sub)
4. **Storyboard** — vertical stack of shot cards · each card has 2-col layout (big serif shot number + body) · body contains time pill, camera + framing, action sentence, cues grid (on-screen / VO / SFX / music with mono labels), copy-able image-prompt block (dashed moss border + monospaced text + select-all), anchor outcome line, why-this-shot italic
5. **Production brief** — 2-col grid of dd-prod-block tiles (talent + location + props + music + SFX + cost + timeline + delivery)
6. **Strategic thesis** — moss-deep left-border italic callout · 1 paragraph

### Added · Whole-doc print stylesheet (`@media print` block in TOKENS)

Closes the long-standing v1.7 backlog item ("doc currently produces 30+ awkward pages on print; need explicit @media print rules").

User flow: open the downloaded `.html` in Chrome / Edge / Brave → Cmd-P (or Ctrl-P) → Save as PDF destination → portrait, A4 or Letter, "Background graphics" ON → save.

Print-specific rules:

- A4 portrait at 14mm/12mm margins (works for Letter too)
- `nav.top` (sticky nav) hidden — paper doesn't scroll
- Cover page break-after so each major section can start cleanly
- All card-style components (swipe-card, script, audit-card, dd-shot, ar-card, playbook-card, comp-card, tribe-card, funnel-card, creator-card, phase-card) get `page-break-inside: avoid`
- Long tables (evidence, value-prop, matrix, storyboard) allow row-level breaks via `page-break-inside: auto` on the container + `avoid` on each row
- Gradients flattened to solid colors (printer-ink-blast hostile)
- Wordmark gradient → solid ink (gradient text doesn't print)
- All `*::after { -webkit-print-color-adjust: exact }` so background tokens print correctly
- Storyboard shot grid recompose narrower for portrait page width
- `text-decoration: none` on links (no visible underlines on paper)
- Storyboard shot-number serif scales to 28pt for print readability

### Wired in `App.jsx`

`generateAdDeepDive` added to the anthropic.js import list. Pass 8.7 runs immediately after Pass 8.6 when `adRecreations.recreations[0]` is present. `adDeepDive` threaded into `composeStrategyDoc` payload.

DTC `doc_sections` updated: 22 → 23 sections. `ad_deep_dive` slots at index 7 between `ad_recreations` and `scripts`. DTC `pass_plan` gains `P8_7`.

### Spec doc

Full Phase A MVP spec at `<vault>/05b - Pass 8.7 Ad Deep Dive Spec.md`. Documents acceptance criteria (10 items), phasing (A → B → C across v1.7.4 → v1.7.5 → v1.7.6), input/output schema in full detail, and the ASCII layout wireframe.

### ENGINE_VERSION → v1.7.4

Bundle 492.80 KB / 141.06 KB gzip (+31 KB · new Pass + new renderer + new ~5 KB print stylesheet + new spec wiring).

### Phase B + Phase C deferred

- **Phase B (v1.7.5)** — Video frame ingestion via `engine/video/extract-frames.mjs` CLI (yt-dlp + ffmpeg). Pass 8.7 upgraded to consume frame logs for grounded hook_anatomy instead of inference.
- **Phase C (v1.7.6)** — `html2pdf.js` one-click `↓ PDF` button + UI to pick which Pass 8.6 recreation to deep-dive on (instead of auto-top).

---

## [1.7.3] — 2026-05-17

**Pass 8.6 · Ad Recreations** — the user's "I want to see already-successfully-performing ads and the prompts to recreate them" ask, now shipped as §05b in the strategy doc.

### Added · `generateAdRecreations()` in `anthropic.js`

Takes ad data (from in-memory Ad-Intel `adIntelData.ads` OR persisted `Swipe Ads` table) and produces 4-8 brand-voice recreations. Each card includes:

- A `gpt-image-2`-ready **image recreation prompt** (≤ 220 chars, sanitized to remove competitor brand names — the recreation is brand-safe)
- An **adapted headline + body + CTA** in the brand's voice
- **Anchored to a real persona** (Pass 7 output, exact name match) AND **a real Ulwick outcome** (Pass 2 output, verbatim or close paraphrase) — same anchoring rule as Pass L. Drops the row if either anchor can't be made.
- A **"why it works"** single sentence on the strategic insight to copy
- **Reference block** (source brand · URL · platform · active_since · hook_type) for traceability

Three internal phases:

1. **Filter by recency** — keep ads running ≥ 30 days when `active_since` is available (proxy for "this ad is working — they keep paying for it"). When < 50% of input ads have dates, skip the filter and note in caveats.
2. **Diversify by hook_type** — round-robin across `HOOK_TYPES`, max 2 per hook, prefer cross-brand picks. Cap total at 8.
3. **Per-ad apply** — sequential LLM calls (1200 maxTokens each) with the anchoring + brand-safety contract. ~50-80s wall time, ~$0.10-0.18 per run.

### Added · `renderAdRecreations()` in `compose-strategy.js`

New §05b "Ad recreations" section (after §05 Swipe file, before §06 Scripts). Renders with:

- Dashed moss-green panel for each `image_prompt` (select-all-to-copy)
- Brand-voice headline + body + CTA pill
- Anchor block with persona + outcome (moss-bordered cream panel)
- "Why it works" callout (light moss background)
- Source attribution line at the foot
- Caveats panel below the grid when applicable (sample size, missing recency data, anchor-rule drops)

DTC `doc_sections` updated: 21 → **22 sections**. `ad_recreations` slots in at index 6 between `swipe_file` and `scripts`. All subsequent sections shift by one (dispatcher handles automatically).

### Added · `AirtableClient.loadSwipeAds()` + `saveAdRecreations()`

- `loadSwipeAds(projectId)` filters `Swipe Ads` by `project_id` (up to 100 records) and normalizes the row shape to the format Pass 8.6 expects
- `saveAdRecreations(projectId, recreations)` chunked at 10 records per request with the v1.6.8 200ms throttle
- New Airtable table required: `Ad Recreations` (schema documented in airtable.js block comments + the v2 spec)

### Wired in `App.jsx`

Pass 8.6 runs after Pass 8.5 (imagery), only when ad data is available. Source resolution order:

1. `adIntelData.ads` (in-memory · Ad-Intel was run earlier in this session)
2. `airtable.loadSwipeAds(projectId)` (persisted from a prior Ad-Intel run)
3. Skipped (logged as warn · §05b silently omits from doc)

`adRecreations` threaded into `composeStrategyDoc` payload. `generateAdRecreations` added to the `./lib/anthropic` import list.

### Spec doc

Full v2 spec at `<vault>/05a - Pass 8.6 Ad Recreations Spec.md` · phasing, acceptance criteria, cost breakdown, multimodal-upgrade plan (v1.7.4), Adyntel hand-off plan (v1.8).

### ENGINE_VERSION → v1.7.3

Bundle 461.95 KB / 133.81 KB gzip (+17 KB · new pass, new renderer, new CSS, new Airtable methods, new spec wiring).

---

## [Unreleased · v1.8 scaffold] — 2026-05-16

### Added · `src/lib/adyntel.js` (NEW · v1.8 scaffold)

Self-contained Adyntel API client per the v2 spec at
`<vault>/08a - Ad-Intel Stage B Spec (v2 · Adyntel Canonical).md`.
Importable but **not yet wired into stageB** — the wire-in is a separate
v1.8 PR once the user confirms credentials work via a live test.

- `AdyntelClient` class · 10 platform-split endpoints
- `CreditCounter` class · local decrement counter (Adyntel doesn't expose
  remaining credits in any response)
- `validateKey()` workaround for the missing 0-cost validation endpoint
- Async-job polling for `JobStartedResponse{jobId}` shape (Facebook,
  Google, LinkedIn, Google Shopping)
- 5xx retry with exponential backoff (200ms, 1s) · 4xx surfaces immediately
- 30s per-request timeout via AbortController · 60s job-poll timeout
- `ADYNTEL_COSTS` pinned per-endpoint credit costs from docs.adyntel.com
- `PLATFORM_PRIORITY = ['facebook', 'tiktok', 'google']` per spec §6
- `createAdyntelClient(cfg)` returns null when credentials absent ·
  caller falls back to existing web_search Stage B path cleanly
- `checkCachedAds()` helper for the 24h TTL cache (degrades gracefully
  until `AirtableClient.queryRecentSwipeAds` lands in a follow-up PR)

`.env.local` (gitignored) gains:

```
VITE_ADYNTEL_API_KEY=hd-d726930582fc4d8045-8  (saved 2026-05-16)
# VITE_ADYNTEL_EMAIL=                         ← REQUIRED before first call
```

Adyntel auth requires `email` + `api_key` together (NOT a header, NOT
Bearer). User must supply their account email before any call succeeds.

Bundle unchanged · scaffold only · no imports added to App.jsx or
ad-intel.js yet.

---

## [1.7.1] — 2026-05-16

**Hot-fix sweep + first-run polish.** Two rounds:
* Round 1 (2026-05-15) — bugs surfaced by code-audit before first run
* Round 2 (2026-05-16) — bugs surfaced by user's first real strategy-doc generation walkthrough

No new features. Entirely cleanup of bugs, mismatches, and drift.

### Round 2 (2026-05-16) · first-run polish

After the user generated their first v1.7.0 strategy doc and walked through the output, 5 cosmetic bugs surfaced:

1. **Methodology renderer hardcoded "Engine v1.6.7 · 18 Anthropic passes"** despite the actual run being v1.7.0 with 19 passes. Replaced with the new `ENGINE_VERSION` constant + a derived `passCount` that adds 1 for each of Pass D and Pass L when they actually fired this run. Methodology paragraph also gains "1 strategic diagnostic" + "N library playbooks applied" suffixes when those payloads are present.

2. **New `ENGINE_VERSION` constant** exported alongside `TOTAL_SECTIONS`. Used by the cover doc-num tag, the methodology paragraph, and the footer wordmark. One bump per release; no more stale strings hiding in renderers.

3. **Persona one-liner and first_message rendered Claude's wrapping `*…*` markdown emphasis literally** — the renderer used `esc()` which passes asterisks through, and the container CSS already italicizes. Added `stripWrappingEmphasis(s)` helper + `escEm(s)` convenience. Now displays italic text without the literal asterisks.

4. **Personas "Lives online at" field rendered as one run-together comma list** (`@a,@b,@c,@d`). Now split + trimmed + each handle wrapped in a `.handle-chip` (small monospaced pill with bg-warm background and moss border). Reads cleanly as chips.

5. **Cover meta tiles (Jobs/Personas/Swipe ads/Scripts) were informational only.** Wrapped each in an anchor to the relevant section (`#evidence`, `#personas`, `#swipe`, `#scripts`). Added hover state (translateY −2px, opacity .82).

6. **Top sticky nav crammed 20 links onto one row at 10px font**, wrapping ugly on narrow viewports. New `.nav-links` class adds `overflow-x:auto` + `white-space:nowrap` + thin scrollbar styling. Wordmark stays anchored left; links scroll horizontally on overflow.

Bundle 439.04 KB / 127.15 KB gzip (+1.6 KB from helpers + nav CSS).

### Round 1 (2026-05-15) · pre-test code audit

### Fixed — vault interop (CRITICAL · would have made Pass L priors a no-op)

The v1.7.0 `library-reader.js` was written against an aspirational
`Brain Map/<Theme>/<Concept>.md` folder structure with vanilla
frontmatter (`name:`, `theme: "Theme Name"`). The user's actual
`Demand Curve Map` vault uses Obsidian conventions:

- `title:` (not `name:`) is the convention key
- `theme: "[[Wiki Link]]"` (with Obsidian double-bracket wiki-link syntax)
- Theme aggregator files marked `type: theme` (should be skipped — they're
  index/TOC pages, not playbooks themselves)
- Optional `tags: ["theme/<slug>"]` form when explicit theme field absent

Running v1.7.0 against this vault would have produced concepts where:
- `name = fileName` (because `meta.name` was empty)
- `theme = "[[Above-the-Fold Optimization]]"` (literal brackets retained)
- After lowercase normalization: priors-match key was
  `"[[above-the-fold optimization]]"` which matches **zero** DTC priors

Result: Pass L would have run, picked 8-12 concepts, but the
rank-by-priors step would have been entirely defeated · all concepts
weighted 0, ranking effectively alphabetical, top-80 → random first
80 alphabetical concepts → wrong shape.

**Fix:** `library-reader.js` now:

- Treats `title` as an alias for `name`
- Strips `[[...]]` wiki-link brackets in `cleanThemeName`
- Strips dashes (vault uses kebab-case slugs) and Title-Cases the result
  so `ad-creative-testing` → `Ad Creative Testing` (matches DTC prior)
- Skips files with `type: theme` or `type: index` (they're aggregators)
- Falls back to `tags: ["theme/<slug>"]` form when `theme:` field absent
- `rankByPriors` now normalizes both sides via shared `_normTheme` helper
  that lowercases + converts dashes/`&`/etc. to spaces · so
  "Above-the-Fold Optimization" (registry) matches
  "Above The Fold Optimization" (vault-derived) AND
  "Review & Social Proof" matches "Review and Social Proof"

Verified against the user's actual 375-concept vault:
- 0 type:theme files skipped (the aggregator files live in a separate
  `themes/` subfolder · only `concepts/` content is ingested)
- 39 distinct themes derived
- 126/375 concepts (33%) matched at least one DTC priority theme
- All 11 DTC priors hit at least one concept · interop confirmed

### Fixed — section numbering across all renderers (the big one)

v1.7.0 shipped with `TOTAL_SECTIONS = 21` exported but **never threaded
through the 19 inherited renderers**. Every renderer still hard-coded its
own `§ NN · NAME` label AND a `/ 19` denominator from v1.6.7. The user
would have downloaded a strategy doc where:

- §00 Strategic Context correctly displayed `00 / 21`
- §01 Positioning through §17 Tribe Readout displayed `01 / 19`–`17 / 19`
  (wrong denominator)
- §18 Applied Playbooks correctly displayed `18 / 21`
- §19 Methodology was labeled "§ 18 · Methodology" (shifted by one
  because §00 was inserted ahead of it)
- §20 Colophon was labeled "§ 19 · Colophon"

**Fix:** added `sectionTag(name, n, total)` helper to compose-strategy.js;
all 21 renderers now take `(p, n, total)` and emit a section-tag-row via
the helper. `buildSectionMap` was rewritten as a flat object literal that
passes `(n)` to every section function (was previously only passing `n`
to `applied_playbooks`). The dispatcher loop in `composeStrategyDoc` was
switched from a 1-based counter to a 0-based `idx`, with a `+1` offset
applied in legacy / no-diagnostic mode so v1.6.x-shape docs still
display `01 / 19`–`19 / 19` as before.

### Fixed — backward-compat for v1.6.x projects opened in v1.7.0

A project saved in v1.6.x has no `diagnostic_v1` field on Airtable. When
opened in v1.7.0, `loadDiagnostic` returns null and `composeStrategyDoc`
falls back to a hardcoded default order. That fallback now correctly
renders 19 sections numbered `01 / 19`–`19 / 19` (matches the v1.6.x
output the user previously got · §00 and §18 simply absent).

### Fixed — registry drift across releases

`airtable.loadDiagnostic` now re-resolves the persisted archetype against
the **current** `business-models.js` registry, so a project saved in
v1.7.0 (when `b2b_saas.is_supported = false`) will automatically pick up
that archetype's flag flipping to `true` in v1.8 once Phase 2 ships.
The user's `_override_acknowledged` flag is preserved across the
re-resolve. Without this, an old SaaS project would stay permanently
gated even after its dedicated pass variants land.

### Fixed — vault slim-cache state was invisible to user

`persistIndex` returns `"slim"` when the cached vault exceeds 4.5MB and
`full_content` had to be stripped from the persisted version. Pass L
silently degrades to using the 280-char `summary` field in that case.
v1.7.0 swallowed the return value · v1.7.1 surfaces it: ProjectSetup
records `_slim_persisted: true` on the in-memory vaultIndex, displays a
yellow `⚠ slim cache · click ↻ Reload to restore full content next
session` note next to the concept counter, and the Pass 0 phase line
now appends `· ⚠ cache slim (>4.5MB · full_content kept in memory for
this session)` when persistence had to slim.

### Fixed — misleading log lines

App.jsx logged `Pass 18/19` and `Pass L/19` during strategy-doc gen. The
`19` was the leftover total from v1.6.x; we don't have a Pass 19, and
Pass L is letter-named (not numeric). Now reads `Pass 18/18` and
`Pass L (post-18)`. No functional change · purely log readability.

### Fixed — vault docs claimed "5 Schwartz levels"

`16 - Business Model Archetypes.md` and `09 - Strategy Doc Composer.md`
showed a 5-bar awareness-distribution wireframe (unaware / problem_aware
/ solution_aware / product_aware / most_aware) but the **actual** Pass D
schema asks Claude for 7 levels (unaware / problem_aware / outcome_aware
/ use_case_aware / product_category_aware / product_aware / most_aware
· per Schwartz / Demand Curve PM101). Vault wireframes corrected to
match the code.

### Build size

Bundle 436.92 KB / 126.42 KB gzip (was 438.15 KB / 126.28 KB on v1.7.0).
Slight improvement from removing 19 hardcoded HTML strings in favor of
a shared helper.

### Files touched (v1.7.1)

- `src/lib/compose-strategy.js` — sectionTag helper, 21 renderer
  refactors, dispatcher cleanup, 0-based numbering with legacy offset
- `src/lib/library-reader.js` — Obsidian interop (title alias, wiki-link
  brackets, type:theme skip, theme-tag fallback, dash-normalized priors)
- `src/lib/airtable.js` — `loadDiagnostic` registry re-resolve;
  business-models static import
- `src/ProjectSetup.jsx` — slim-cache surfacing in vaultIndex + UI
- `src/App.jsx` — log line cosmetic fix
- Vault: `09 - Strategy Doc Composer.md` + `06 - Project Setup &
  Ingestion.md` — awareness wireframes corrected to 7 levels
- Vault: `15 - Concept Library Architecture.md` — documents both
  Layout A (folder-per-theme) and Layout B (concepts/themes split ·
  the user's actual Demand Curve Map structure); frontmatter resolution
  rules updated for v1.7.1 field-aliasing behavior

### Released

User ran their first v1.7.0 strategy doc, walked through it, surfaced the 5 cosmetic bugs above (now fixed in Round 2). Tagged + pushed as `v1.7.1` on 2026-05-16.

---

## [1.7.0] — 2026-05-15

**Phase-1 Demand Curve Map · Diagnostic + Business-Model Routing +
Archetype Gating + Concept Vault Library.** Major architectural shift.
Spec v3 implemented end-to-end. **No fallback to DTC ever** — archetypes
whose pass variants aren't built are GATED, not silently downgraded.

### Architectural pillars

1. **Pass D** classifies every project across 4 axes (Business Model
   Archetype, Market Maturity, Market Sophistication, Emotional Journey)
   BEFORE any downstream pass runs
2. **Diagnostic drives pass routing** — section order now comes from
   `diagnostic.business_model.doc_sections`, not a hardcoded chain
3. **Vault is the source of truth** — concept library reads directly
   from the user's Obsidian folder · no JSON index in repo, no Airtable copy
4. **Every supported archetype must hit the Siraj-quality bar** — DTC
   is the first fully-thorough supported archetype · 10 others gated
   until their dedicated phase ships
5. **No fallback** — unsupported archetypes are blocked at the strategy-
   doc step unless user has consciously acknowledged the fit gap

### Added — `src/lib/business-models.js` (NEW)

11 archetypes registry. Only `dtc_ecommerce` is `is_supported: true` in
phase 1. Each unsupported archetype carries `library_priors`,
`phase_target`, and `not_yet_supported_message`.

- DTC fully built · `pass_plan` of 18 passes + Pass L · 21-section
  `doc_sections` (v5 reference parity)
- B2B SaaS · phase 2 (ICPs, buying committee, cold-email, ABM)
- B2B Services · phase 3
- Two-sided Marketplace · phase 4
- Creator Personal Brand · phase 5
- Aggregator, Subscription, Local Services, Hardware B2B, Healthcare,
  Fintech · phase 6+
- DEV-only `console.assert` block validates registry integrity at module load

### Added — `src/lib/library-reader.js` (NEW)

Vault-folder ingest via `<input type="file" webkitdirectory>`.

- `ingestConceptVault(fileList, onProgress)` — parses `.md` files with
  YAML frontmatter + fallback derivation from path. Per-file try/catch
  so single parse error doesn't break the run.
- `rankByPriors(index, libraryPriors)` — soft signal · `+10` for
  priority themes, `-3` for deprioritized · ties broken alphabetically
- `loadCachedIndex` / `persistIndex` — localStorage with 4.5MB cap and
  graceful drop of `full_content` if over budget
- 8K-char-per-concept content cap · file content stored in-memory for
  Pass L's per-concept apply step
- Files prefixed with `_` (typically index files) are skipped
- ~30-line regex frontmatter parser · no `gray-matter` dependency

### Added — Pass D `diagnoseStrategicContext` (`src/lib/anthropic.js`)

`async diagnoseStrategicContext(apiKey, projectContext) → diagnostic`

- System prompt embeds PM101 definitions VERBATIM (no paraphrase) per
  spec · 3 maturity stages + 5 sophistication stages + 17 MoC levels
  in 4 paradigms + 12 Jung archetypes + 7 awareness levels
- Token budget 3000
- `is_supported` + `phase_target` populated deterministically from
  `BUSINESS_MODELS` registry · Claude classifies, registry gates
- `awareness_distribution` validated to sum to 1.0 ± 0.02 · normalized
  if not
- Coerces invalid `business_model.primary` to `DEFAULT_BUSINESS_MODEL`

### Added — Pass L `applyPlaybookLibrary` (`src/lib/anthropic.js`)

Three-step playbook application:

1. **Rank** by archetype priors against full concept index
2. **Retrieval call** · top-80 candidates → LLM picks 8-12 with one-
   sentence rationale (token budget 4000)
3. **Per-concept apply** · pull full markdown, run anchored apply call
   per concept (token budget 1500 each, sequential)

**Anchoring rule:** every applied playbook MUST anchor to a real
persona name AND a real Ulwick outcome from the input · same discipline
as v1.3 verify-creators · drop if can't anchor. No fabrication.

### Added — `src/lib/airtable.js`

- `appliedPlaybooks: "Applied Playbooks"` in `AIRTABLE_TABLES`
- `saveDiagnostic(airtableId, diagnostic)` · stores Pass D JSON on
  `diagnostic_v1` long-text column of `projects` table
- `loadDiagnostic(airtableId)` · parses + returns or null
- `saveAppliedPlaybooks(projectId, playbooks)` · chunked write to new
  `Applied Playbooks` table · honors v1.6.8 throttle

> ⚠ User must add `diagnostic_v1` long-text column to existing
> `projects` table AND create new `Applied Playbooks` table with the
> documented columns (see airtable.js header).

### Changed — `src/lib/compose-strategy.js`

- New `TOTAL_SECTIONS = 21` constant — finally closes Known Issue #3
- `composeStrategyDoc` now reads section order from
  `diagnostic.business_model.doc_sections` via dispatch loop · unknown
  section IDs skipped with `console.warn`. Default order fallback for
  callers that don't yet pass `diagnostic`.
- **§00 · Strategic Context** renderer · 3-col grid for market stages,
  archetype as smile-yellow pill, From→To journey strip, business-
  model citation, yellow override warning when applicable
- **Applied Playbooks** renderer · 2-col card grid · theme chip,
  italic why-it-applies, persona/outcome anchor rows (moss-bordered),
  dashed first-move callout, 3-col footer (owner/KPI/success), vault-
  source citation
- Nav extended with `#strategic` + `#playbooks` links
- Footer + cover stamps → `v1.7.0`
- ~250 lines new CSS for §00 + Applied Playbooks

### Changed — `src/ProjectSetup.jsx`

- After Pass 0 succeeds, **auto-fires Pass D** via `useEffect` · busy
  state + phase label visible
- New **Step 3b · Strategic Diagnostic** section with editable
  business-model dropdown
  - Supported archetypes render normally
  - Unsupported archetypes appear in dropdown ONLY when "Override
    anyway (accept fit gap)" toggle is checked · selecting one shows
    the archetype's `not_yet_supported_message` in a yellow warning strip
- New **Step 3c · Concept Library Vault** picker
  - `webkitdirectory` folder picker · uses same dynamic-import
    pattern as `parse-files.js`
  - Persists vault path + index to localStorage
  - "↻ Reload library" button refreshes after Obsidian edits
  - Shows concept count + theme count + parse-error count
- `handleSaveProject` persists diagnostic to Airtable via
  `saveDiagnostic` · marks `_override_acknowledged: true` if user
  acknowledged fit gap
- `handleProjectReady` passes `diagnostic` + `vaultIndex` through to App.jsx

### Changed — `src/App.jsx`

- New **Strategic Context header tile** · 4 cells (archetype, maturity,
  sophistication, brand archetype) · yellow border + warning text when
  archetype is unsupported with active override
- Loads diagnostic on project switch via `airtable.loadDiagnostic`
- Loads cached vault index from localStorage on project switch
- New **`ArchetypeGateModal`** · surfaces when user clicks ↓ Strategy
  Doc with an unsupported archetype not consciously overridden · two
  paths: Return to Setup OR wait for the phase
- `generateStrategyDoc` runs the gate check at the top · if gate is
  closed, shows modal and returns without generating
- After Pass 18, runs **Pass L** if vault is loaded · 8-12 playbooks
  applied + anchored · persisted to Airtable via
  `saveAppliedPlaybooks`
- `composeStrategyDoc` payload now includes `diagnostic` +
  `appliedPlaybooks` to drive §00 + Applied Playbooks rendering
- Project-state reset extended to include `diagnostic`, `vaultIndex`,
  `appliedPlaybooks`, `showGateModal`

### Note on baseline drift from spec

Spec v3 referenced engine v1.6.2 (15-section doc · 14 passes). We
shipped v1.6.3–v1.6.12 ahead of this PR (19-section doc · 18 passes +
Hermes retrospective). Adapted:

- `TOTAL_SECTIONS = 21` not 17 · DTC `doc_sections` includes all
  v1.6.x sections (competitive/audit/demand/tribe) plus the new
  strategic_context (front) and applied_playbooks (before methodology)
- Pass L runs as the LAST pass in the chain (after Pass 18) · the
  Hermes retrospective still fires after composeStrategyDoc
- Bundle exceeds spec's 330 KB budget (438 KB) because the baseline
  bundle was already 384 KB before this PR · +54 KB for Pass D + Pass L
  + 2 renderers + 2 new lib files + diagnostic UI
- Cost per full run estimated ~$1.45 with vault loaded (over spec's
  $1.25 budget — same baseline drift reason)

### Acceptance criteria · self-check

| # | Criterion | Status |
|---|---|---|
| 1 | DTC happy path equivalence to v1.6.12 minus the new §00/Applied | ✅ pass · default section order + dispatcher preserves prior chain |
| 2 | §00 renders for any supported archetype | ✅ renderStrategicContext + tile in App.jsx |
| 3 | §Applied Playbooks renders 8-12 anchored cards | ✅ Pass L + renderer · anchoring rule enforced |
| 4 | Archetype gating · b2b_saas override-OFF blocks doc gen | ✅ gate check at top of generateStrategyDoc · modal surfaces |
| 5 | Override path · b2b_saas override-ON produces doc with DTC pass plan + B2B SaaS library priors | ✅ override toggle + `_override_acknowledged` flag persisted |
| 6 | Soft prior ranking distribution shift visible | ✅ rankByPriors gives +10/-3 weights · top-80 cutoff |
| 7 | Vault ingest ≥300 concepts across ≥30 themes | ⏳ depends on user's vault size |
| 8 | Library cache survives reload | ✅ localStorage with key by vault path |
| 9 | Diagnostic persists across reload | ✅ Airtable `diagnostic_v1` field · loadDiagnostic on project switch |
| 10 | No breaking changes to existing Airtable saves | ✅ all existing methods untouched |
| 11 | Bundle ≤ 330 KB | ❌ 438 KB (baseline drift from spec · accepted) |
| 12 | Cost ≤ $1.25 | ❌ ~$1.45 with vault (baseline drift · accepted) |

### Bundle

| Build | Main | Gzip |
| --- | --- | --- |
| v1.6.12 | 384.04 KB | 110.95 KB |
| **v1.7.0** | **438.15 KB** | **126.28 KB** |

+54 KB for Pass D + Pass L + 2 lib modules + diagnostic UI + section
dispatcher.

### Next phases (committed)

- **Phase 2** · `b2b_saas` full pass roster · ICPs, buying committee,
  cold-email sequences, ABM tiering, demand-gen plays, sales enablement,
  pricing-page positioning, partner-channel, nurture flows
- **Phase 3** · `b2b_services` · case-study production, lead-gen mix,
  sales process, pricing model, capacity plan
- **Phase 4** · `two_sided_marketplace` · supply/demand splits,
  liquidity strategy, geographic launch sequencing
- **Phase 5** · `creator_personal_brand` · audience segments, content
  engine, platform strategy, monetization stack
- **Phase 6+** · aggregator, subscription_consumer, local_services,
  hardware_b2b, healthcare_regulated, fintech_regulated

---

## [1.6.12] — 2026-05-14

**Hermes Foundation drop · 5 items in one ship.** Pattern A + Pattern E +
Pattern F + Pattern B + the meta-pass retrospective. Built in the spec's
prescribed order so each layer plugs the next in cleanly.

### Pattern A · Skill files (`src/passes/PASS_XX.md` × 19)
One markdown file per pass with YAML frontmatter declaring `pass_id`,
`pass_name`, `version`, `deps[]`, `quality_metric`. Body explains what
the pass does, what section it renders as, dependencies, cost. Plus a
`src/passes/README.md` documenting the pattern.

- Not loaded at runtime (yet) — pure metadata foundation
- Future use: runtime validators (does output satisfy schema?) and DSPy-
  style optimizers (compile prompts against the skill spec)
- GLOBAL · exempt from project-isolation rules

### Pattern E · Hook system on `callClaude`
Added `pre_llm_call` + `post_llm_call` hook arrays. Anyone can register
a hook to fire before/after every Claude call.

```js
registerHook("pre_llm_call",  (ctx)    => ctx_or_undefined)
registerHook("post_llm_call", (result) => result_or_undefined)
```

- Pre-hook receives `{ apiKey, system, userMessage, opts }` · can mutate
- Post-hook receives `{ ...ctx, data, error, ms, attempt, provider }`
- Returning a new result handles an error (e.g. retry succeeded)
- Pattern F registers itself as the post-hook for retry/fallback
- `_internalCallAnthropic` exported for providers.js to reuse

### Pattern F · Retry + fallback provider chain (`src/lib/providers.js`)
Single post-hook handles BOTH retry-on-same-provider AND rotate-to-next.

**Retry:** on 429/500/502/503/504/529 or network errors, up to 2 retries
with exponential backoff (0.8s → 1.6s → 3.2s).

**Chain:** Anthropic → OpenRouter Claude → OpenAI. Activates only when
the corresponding env var is set:
- `VITE_OPENROUTER_API_KEY` + optional `VITE_OPENROUTER_MODEL`
- `VITE_OPENAI_API_KEY` + optional `VITE_OPENAI_FALLBACK_MODEL`

Each provider has a `normalize()` step that maps its response shape
back to Anthropic's `{content, stop_reason}` so `extractJSON()` and the
TRUNCATED check work uniformly. Solves Known Issue #10.

`installFallbackChain()` called once in `src/main.jsx` at boot.

### Pattern B · `brand_memory` + `brand_learned` Airtable fields
Two new fields on the `projects` table (user must add columns in
Airtable):
- `brand_memory` (long text) · facts learned about the brand across
  sessions · loaded into Pass 0 as prior context
- `brand_learned` (long text) · accepted prompt-improvement candidates
  from retrospectives

Both section-sign delimited (`── BRAND MEMORY · YYYY-MM-DD ──`) so
sessions append without clobbering. Loaded at project switch, FROZEN
during a run (preserves Anthropic prompt cache), written only post-run.

New AirtableClient methods:
- `loadBrandMemory(airtableId)` → `{ brand_memory, brand_learned }`
- `appendBrandMemory(airtableId, entry)` · idempotent on dup stanzas
- `appendBrandLearned(airtableId, entry)` · same pattern

Pass 0 chain: `summarizeProjectContext` gains optional
`{ priorBrandMemory }` named option · when present, prepended to the
corpus inside a `── PRIOR BRAND MEMORY ──` block · counted against the
v1.6.10 MAX_CORPUS_CHARS cap.

App.jsx loads brand_memory on project switch · ProjectSetup passes it
through to Pass 0 · brand_memory + brand_learned both reset on the
project-state reset (v1.6.5 isolation rules).

### Hermes Retrospective · `generateRunRetrospective` (meta-pass)
Reads outputs from passes 1-18 + projectContext · returns
`{ overall_verdict, candidates[0-5], wins[] }`. Each candidate:
- `pass_id` · `pass_name` · `severity` (high/medium/low)
- `observation` · what looked weak in THIS run, citing the digest
- `improvement` · concrete prompt-level fix (1-2 sentences)
- `brand_learned_entry` · what writes to Airtable if accepted

Schema rejects generic marketing advice · every candidate must
reference a specific pass output from the digest. Cap at 5 issues to
prevent runaway.

UI: new `RetrospectiveModal` auto-opens after Strategy Doc completes.
Each candidate has an "Accept → brand_learned" button. Accepted ones
append to the project's brand_learned Airtable field and the local
cache updates immediately.

### Note on naming
Spec called this "Pass 15 generateRunRetrospective" but Pass 15 is now
generateCompetitiveTeardown (shipped v1.6.3). Renamed to "Hermes
retrospective pass" · not numbered in the strategy doc anyway since
it's a meta-pass that runs AFTER the doc and produces no section.

### Files touched
- `src/passes/` · NEW directory · 19 PASS_XX_*.md + README.md
- `src/lib/anthropic.js` · Pattern E hook system + Pattern B priorBrandMemory + Hermes retrospective pass (~250 lines added)
- `src/lib/providers.js` · NEW · 175 lines · Pattern F provider chain
- `src/lib/airtable.js` · Pattern B loadBrandMemory/appendBrandMemory/appendBrandLearned (~75 lines)
- `src/ProjectSetup.jsx` · accepts priorBrandMemory prop, threads into Pass 0
- `src/App.jsx` · RetrospectiveModal component, brand_memory state + load on project switch, retro auto-trigger after Strategy Doc, acceptRetroCandidate handler
- `src/main.jsx` · installFallbackChain() at boot

### Bundle
| Build | Main | Gzip |
| --- | --- | --- |
| v1.6.11 | 370.46 KB | 106.76 KB |
| **v1.6.12** | **384.04 KB** | **110.95 KB** |

+14 KB.

### How the foundation chains forward
1. **Pattern A** establishes the metadata vocabulary every future
   validator/optimizer reads from.
2. **Pattern E** is the seam — anyone (us, you, future plugins) can
   register a hook without forking `callClaude`.
3. **Pattern F** is the FIRST consumer of Pattern E · proves the seam.
   Adds resilience without changing any pass's call site.
4. **Pattern B** gives projects memory across sessions · Pass 0 reads
   it · retrospective writes it.
5. **Retrospective** closes the learning loop · user-approval-gated so
   no automated prompt drift.

### Backlog status (v1.7 Hermes-Inspired Enhancements)
| # | Item | Status |
| --- | --- | --- |
| 14 | Pattern E hook system | ✅ v1.6.12 |
| 15 | Pattern F fallback chain | ✅ v1.6.12 |
| 16 | Pattern A skill files | ✅ v1.6.12 |
| 17 | Pattern B brand_memory | ✅ v1.6.12 |
| 18 | Hermes retrospective pass | ✅ v1.6.12 |
| 19 | ~~Pass 0 input edit + refocus~~ | ✅ v1.6.11 |
| 20 | ~~Project isolation audit~~ | ✅ v1.6.5 |

**All 7 Hermes rows shipped.** v1.7 Parity-21 remaining: Pass 19 seasonal
campaign + Meta Ad Library API token.

---

## [1.6.11] — 2026-05-14

**Pass 0 editable review panel + refocus (long-deferred Task 2 from the
v1.7 spec).** When the user clicks `Ingest Context`, the Pass 0 output
is now a fully editable form instead of read-only chips. The user can
correct sector / audience / brand voice, add/delete/reorder key_facts
and red_flags, then click Save — **only the edited state goes to
Airtable**, never the raw LLM output.

A `🔄 Refocus` button next to Save re-invokes Pass 0 with
natural-language guidance prepended to the system prompt
(`REFOCUS GUIDANCE: <user text>`). Capped at 5 refocuses per session.

### Cherry-picked from `v1.7/hermes-backlog-and-pass0-edit` branch

Originally built and committed (`ea26c4f`) as Task 2 of the May 14
Hermes-backlog spec, then sat on the v1.7 branch unmerged for 10 ships
while master moved on. Cherry-picked now with conflicts resolved
manually in `anthropic.js` to keep BOTH the v1.6.10 corpus cap and the
new `refocusGuidance` parameter.

### Changed — `src/lib/anthropic.js`

- `summarizeProjectContext(apiKey, inputs, { refocusGuidance = "" } = {})`
  signature gains optional 3rd arg via named-options object
- Backward-compatible — 2-arg callers unchanged
- When `refocusGuidance` is non-empty: prepended to the system prompt
  as `REFOCUS GUIDANCE: <text>` + one extra honoring rule appended to
  the rule list
- v1.6.10 corpus cap stays intact and runs first

### Changed — `src/ProjectSetup.jsx`

- New state: `editedSummary`, `refocusOpen`, `refocusText`, `refocusCount`
- `useEffect` reseeds `editedSummary` from `contextSummary` on each new
  Pass 0 run (initial or refocus)
- Section 03 panel **replaced** with editable form:
  - `EditField` (sector · audience · brand_voice)
  - `ListEditor` (key_facts · red_flags) with per-row ↑/↓ reorder,
    ✕ delete, `+ Add` button, row index labels
  - `ReadOnlyChips` (sources · ingestion source list, not editable)
  - Collapsible `<details>` showing raw `product_context` (passes
    through to downstream untouched)
- Section 04 gains:
  - `💾 Save Project` button (gold) — persists **editedSummary**
  - `🔄 Refocus (N/5)` button (purple)
  - When refocus opens: textarea with examples + Cancel/Re-run buttons
  - Cap-reached state disables button with tooltip
- Refocus logs to browser console: `[Pass 0] refocus attempt N/5 · guidance: "..."`

### Behavior

- Backward-compat: if user clicks Save without editing, `editedSummary`
  matches `contextSummary` field-for-field — same outcome as v1.4
- `handleSaveProject` now strips empty-string list entries (users can
  delete-and-leave-blank without polluting Airtable)
- Refocus replaces edits with new Pass 0 output (warning shown above
  the Re-run button)

### Bundle
| Build | Main | Gzip |
| --- | --- | --- |
| v1.6.10 | 361.57 KB | 104.75 KB |
| **v1.6.11** | **370.46 KB** | **106.76 KB** |

+9 KB for the edit panel + list editor + refocus UI.

### What this finally fixes
Before v1.6.11 the user had no way to:
- Fix a wrong Pass 0 read before it propagated to all 18 downstream passes
- Add a key fact the LLM missed
- Remove a hallucinated red flag
- Re-aim Pass 0 ("focus more on pricing") without rewriting the source files

All four now work. Edit-then-Save is the new happy path.

---

## [1.6.10] — 2026-05-14

**Hotfix: Pass 0 corpus cap.** Fixes `"prompt is too long"` error when
the user drops many files or large URL scrapes into Project Setup.

### Root cause
`summarizeProjectContext` (Pass 0) used to `.join("\n\n")` every file
text + URL content with no total ceiling. `parse-files.js` caps each
file at 30 K chars, but with 30+ files that's 900 K+ chars → ~225 K
tokens → blows past Sonnet 4's 200 K context window. API returns
`prompt is too long` and the run dies before Pass 0 ever fires.

### Fix
- New `MAX_CORPUS_CHARS = 120_000` constant in `src/lib/anthropic.js`
  (≈30 K tokens of English prose · leaves ample room for system
  prompt + JSON output)
- When `totalLen > MAX_CORPUS_CHARS`, each block is **proportionally
  clipped from the front** (brand docs front-load thesis statements,
  so head > tail). Same fraction lost from every source · no single
  file gets dropped entirely.
- Per-block minimum keep of 500 chars (never zero-out a source)
- Each clipped block gets a `[…truncated · N chars elided…]` marker
  so the LLM knows the source isn't complete
- `[ENGINE NOTE — corpus was clipped: …]` appended to the user prompt
  so the model accounts for missing context
- `⚑ <truncation summary>` prepended to `red_flags[]` in the result so
  the user sees on the Project Setup screen that context was elided
- `console.warn("[Pass 0]", …)` for the debug log

### Example output of the new red_flag
```
⚑ Corpus was 487,213 chars · clipped proportionally to fit 120,000 cap.
  18 sources each kept ~25% of their original length.
```

### What if a specific source is critical
If a particular file MUST be fully read (e.g., the master brand-voice
guide), re-run Project Setup with just that file plus 1-2 others.
v1.7 will add per-file weight controls so the user can pin sources.

### Touched
- `src/lib/anthropic.js` only · ~30 lines added to `summarizeProjectContext`
- No prompt template changes · same downstream pass schema

### Bundle
361 → 361.57 KB · 104 → 104.75 KB gzip. ~600 bytes for the cap logic.

---

## [1.6.9] — 2026-05-14

**Hotfix: gpt-image-2 model name + defensive response parsing.**

v1.6.8 shipped with `MODEL = "gpt-image-1"` and a comment claiming
gpt-image-2 was deprecated — that was wrong. As of May 14, 2026,
**gpt-image-2 is OpenAI's current production image model.** Reverted.

### Changed — `src/lib/image-gen.js`

- `MODEL` constant: `"gpt-image-1"` → `"gpt-image-2"`
- Removed the incorrect "gpt-image-2 was deprecated" comment
- Added defensive response parsing: tries `{ data:[{b64_json}] }` first,
  falls back to `{ data:[{url}] }` and fetches+encodes client-side
- If `response_format: "b64_json"` is rejected with 400, retries once
  without the parameter
- Added Nano Banana (Gemini 2.5 Flash Image) as documented future
  alternative · not wired here yet · would need separate Google AI
  Studio key

### Changed — log labels in `src/App.jsx`
- Pass 8.5 phase + log labels say "gpt-image-2" (not "gpt-image-1")
- ConfigPanel OPENAI_API_KEY hint says "gpt-image-2 swipe imagery"
- 🖼 imagery checkbox tooltip says "gpt-image-2"

### Why this matters
v1.6.8's `gpt-image-1` call would have returned the previous-gen model
output — older lighting, more uncanny-valley faces on diverse skin
tones, weaker text comprehension. gpt-image-2 fixes all three. Same
~$0.04/image cost.

### Bundle
Same 360 KB / 104 KB gzip. Comment + string + one constant change.

---

## [1.6.8] — 2026-05-14

**Five-item reliability + features batch.** Quick fixes + two opt-in
features. No new passes · no section count change · doc stays at 19.

### #3 Budget validator · `validateAndNormalizeChannelPlan`
Pure-JS post-processor for Pass 11 output. Normalizes
`channels[].budget_pct` so it sums to exactly 100 even when the LLM
drifts (rounding errors). Wired into App.jsx — runs immediately after
Pass 11. Logs `Pass 11 budget rebalanced · original sum X% → 100%`
when rebalancing fires. Idempotent.

### #4 Airtable throttle · 200ms between chunks
Airtable rate-limit is 5 req/sec per base. Heavy runs (many outcomes
+ many keywords + ad-intel records) routinely 429. Added `_sleep`
helper at module level + a `CHUNK_THROTTLE_MS = 200` guard between
every 10-record chunk in all 8 chunked save methods. Adds ~6s on a
30-chunk save · invisible vs the API time itself.

### #5 Multimodal Stage C eval · gracefully upgrades when image bytes available
`evaluateAd()` in `ad-intel.js` now tries to fetch the `creative_url`
when it looks like a direct image (`.jpg/.png/.webp/.gif` suffix
check). On success: base64-encodes + sends to Claude as a multimodal
`{ type: "image" }` content block. On CORS failure (which Meta URLs
will hit): falls back to text-only eval with `data_caveat: "text_only"`.
The path activates automatically when Stage B starts returning real
image URLs (e.g. when Meta Ad Library API lands) — no further code
change needed.

### #2 Vercel deploy hook · `src/lib/vercel-deploy.js`
New module · POSTs the finished strategy-doc HTML to Vercel's
`/v13/deployments` endpoint as a single-file static deploy. Returns
the `*.vercel.app` URL. Configured via `.env.local`:

| Env var | Required | Notes |
| --- | --- | --- |
| `VITE_VERCEL_TOKEN` | yes | Your Vercel API token |
| `VITE_VERCEL_TEAM_ID` | optional | Set if deploying under a team account |

When token is missing: hook is silently skipped, local-download
path remains the default. When token is present: every `↓ Strategy
Doc` click also pushes to Vercel and logs the URL.

> ⚠️ Hobby-tier deploys are public URL · only the random slug
> protects access. Upgrade Vercel to Pro for password protection.

### #1 Swipe imagery · `src/lib/image-gen.js` + opt-in checkbox
New module · generates one image per Pass 8 swipe-file card via
OpenAI `gpt-image-1` model (note: `gpt-image-2` was deprecated by
OpenAI · `gpt-image-1` is current production). Wired into App.jsx
as **Pass 8.5** — runs only when the user checks the new `🖼 imagery`
header checkbox AND has an `OPENAI_API_KEY` set.

- Per-card prompt = `visual_brief` + format hint + project context +
  hard-coded quality / safety bumpers (editorial photography aesthetic,
  natural soft lighting, realistic skin tones across body types and
  ethnicities, no on-image text/logos/watermarks)
- Generates 1024x1024 PNG, base64-inlines as `background-image` on
  the `.ad-mock` div in `renderSwipe`
- Cost: ~$0.04/image × 20 cards = **~$0.80 extra per run**
- Time: ~8s/image × 20 = **+2-3 minutes wall time**
- Failures (per-image): logged as `image_error` on that card, the
  card falls back to gradient mock, run continues
- Doc HTML grows from ~215 KB to ~4 MB when imagery is on

OPENAI_API_KEY also accessible via Config panel and `VITE_OPENAI_API_KEY`
env var.

### Touched files
- `src/lib/anthropic.js` · `validateAndNormalizeChannelPlan` export
- `src/lib/airtable.js` · `_sleep` + throttle in 8 chunked save methods
- `src/lib/ad-intel.js` · `tryFetchImageAsBase64` + multimodal `evaluateAd`
- `src/lib/vercel-deploy.js` · **new** · 86 lines
- `src/lib/image-gen.js` · **new** · 117 lines
- `src/lib/compose-strategy.js` · `renderSwipe` uses `image_b64` when present
- `src/App.jsx` · ENV_DEFAULTS adds openaiKey · ConfigPanel adds OPENAI_API_KEY row · `generateImagery` state + checkbox · Pass 8.5 step · Vercel deploy hook
- `.env.local` · adds optional VITE_VERCEL_TOKEN + VITE_VERCEL_TEAM_ID

### Bundle
| Build | Main | Gzip |
| --- | --- | --- |
| v1.6.7 | 353.26 KB | 101.72 KB |
| **v1.6.8** | **360.30 KB** | **104.24 KB** |

+7 KB. Imagery itself goes into the user's doc HTML at runtime, not
the bundle.

### v1.7 backlog status
| # | Item | Status |
| --- | --- | --- |
| 1–6 | Ad-Intel + Pass 14-18 | ✅ all shipped |
| 7 | Pass 19 seasonal campaign | 🔴 last to v5 parity |
| 8 | **gpt-image-2 hook** | ✅ **v1.6.8** · model name fixed in v1.6.9 |
| 9 | **Vercel deploy hook** | ✅ **v1.6.8** |
| 10 | **Budget % validator** | ✅ **v1.6.8** |
| 11 | **Airtable throttle** | ✅ **v1.6.8** |
| 12 | **Multimodal Stage C** | ✅ **v1.6.8** (auto-upgrades when bytes available) |
| 13 | Meta Ad Library API | 🟡 awaiting user's Meta verification token |

**Only Pass 19 + Meta API remaining in v1.7.**

---

## [1.6.7] — 2026-05-14

**Pass 18 · Tribe readout + `.env.local` API-key fallback.** Doc grows
18 → 19 sections. One section to v5 reference parity (21).

### Added — Pass 18 `generateTribeReadout` (§17)

Honest-by-construction creator list. Uses Claude's `web_search_20250305`
tool to find AND verify creators in one pass. The v1.3 verify-creators
rule is enforced by schema:

- Every `handle` in `creators[]` must have `verified: true` + an
  `evidence` field with a verbatim web_search snippet or URL
- Anything the model couldn't verify is demoted to `search_paths` (a
  sourcing-query list a human matcher runs to find real handles)
- Optional `honest_caveats[]` array surfaces low-confidence reads

Output shape:
```json
{
  "tribe_summary": "...",
  "creators": [{ handle, platform, verified, follower_band,
                 primary_content, audience_fit, target_persona,
                 outreach_priority, tier, evidence }, ...6-12],
  "search_paths": [{ platform, query, why }, ...3-5],
  "honest_caveats": ["..."]
}
```

Pass 18 vs Pass 14 distinction (both creator-related, both kept):
- **Pass 14** = archetypes + sourcing criteria + DM template · no handles
- **Pass 18** = verified handles + tier + audience-fit evidence

### Added — `src/lib/compose-strategy.js`

- **§17 · Tribe readout** renderer · 2-col `.tribe-card` grid with
  large serif handle, tier chip (T1 hero/T2 UGC/T3 spark/Aspirational),
  meta chips (platform · follower band · target persona · priority),
  italic audience-fit quote, ✓-prefixed evidence callout (moss border)
- **Unverified candidates** render with dashed brick border + ⚠ prefix
  in case the LLM returned some despite the rules — caller can manually
  check before outreach
- **`.search-paths` block** · platform / query / why grid for sourcing
  queries the human matcher should run
- Section count: **18 → 19** · Methodology → §18 · Colophon → §19
- Nav adds "Tribe" link

### Added — `.env.local` API-key fallback

Engine now reads `VITE_*` env vars as defaults that fill in any API-key
field localStorage doesn't have:

| Env var | Maps to |
| --- | --- |
| `VITE_ANTHROPIC_API_KEY` | `config.anthropicKey` |
| `VITE_AIRTABLE_API_KEY` | `config.airtableKey` |
| `VITE_AIRTABLE_BASE_ID` | `config.airtableBaseId` |
| `VITE_SERPAPI_KEY` | `config.serpApiKey` |
| `VITE_GOOGLE_DRIVE_API_KEY` | `config.googleDriveApiKey` |

**localStorage wins** — anything the user pastes into the Config panel
overrides the env value. The env path exists so a baseline key set can
persist across browser-state wipes (clear cache, fresh browser, etc.)
without retyping. `.env.local` is gitignored.

### Changed — `src/App.jsx`

- `generateStrategyDoc` runs Pass 18 after Pass 17, try/catch isolated.
  Passes `creators` (Pass 14 archetype list) into Pass 18 as the seed.
- All pass log labels updated to `/18`.
- Config init merges `ENV_DEFAULTS` with localStorage (localStorage wins).

### Bundle

| Build | Main | Gzip |
| --- | --- | --- |
| v1.6.6 | 341.83 KB | 99.18 KB |
| **v1.6.7** | **353.26 KB** | **101.72 KB** |

+12 KB for Pass 18 + renderer + CSS + env loader.

### Cost & time

Pass 18 is the most expensive single pass: web_search tool · 12 search
uses max · ~6-8 K output tokens. Adds ~45 seconds to the strategy doc
gen. Full run now **~5m 20s · 20 Anthropic calls · ~110 K tokens · ~$1.10**.

### v1.7 backlog status

| # | Item | Status |
| --- | --- | --- |
| 1 | Ad-Intel wire-in | ✅ v1.6.1 |
| 2 | Pass 14 creator briefs | ✅ v1.6.2 |
| 3 | Pass 15 competitive teardown | ✅ v1.6.3 |
| 4 | Pass 16 brand audit | ✅ v1.6.6 |
| 5 | Pass 17 demand landscape | ✅ v1.6.6 |
| 6 | **Pass 18 tribe readout** | ✅ **v1.6.7** |
| 7 | Pass 19 seasonal campaign | 🔴 last one to 21 |

**2 sections to v5 reference parity.**

---

## [1.6.6] — 2026-05-14

**Pass 16 + Pass 17 · Brand audit + Demand landscape.** Two more v1.7
backlog items shipped in one drop. Doc grows 16 → 18 sections.

### Pass 16 · `generateBrandAudit` — §15
- 8-10 brand surfaces audited (Homepage hero, PDP, About, Email opt-in,
  Social #1, Social #2, Reviews, Cart, FAQ, Press)
- Each surface: current_state · what_works · what_breaks · anchor job
  ID · fix_priority (high/medium/low) · recommended_fix (ships in 2 wks)
- Plus voice_consistency (1-10 score + strongest/weakest surfaces +
  drift notes) and discoverability (branded/unbranded · good/spotty/weak)
- Audit anchors to top 5 underserved Ulwick outcomes from Pass 1+2
- Optional `scrapedContent` arg lets Pass 16 read from the actual brand
  site if URLs were scraped during ingestion (not wired yet · v1.7
  enhancement — currently reasons from `projectContext` alone)

### Pass 17 · `generateDemandLandscape` — §16
- 3-stage funnel mapping (TOFU Awareness · MOFU Consideration · BOFU
  Purchase) with audience_intent, 5-7 top keywords (vol/comp/wedge per
  kw), 4-6 question patterns per stage
- 3-5 white-space keywords (low competition + high intent) with
  why-now + 2-week first test
- 2-4 seasonal pulse periods with estimated lift % + lean-in play
- Category temperature read (Heating/Stable/Cooling) with evidence
- Seeds from Pass 1+2 search_queries; folds in `searchVolumeData`
  cache if Pass 3 SerpAPI ran

### Added — `src/lib/compose-strategy.js`
- `renderBrandAudit` (§15) · 2-col audit cards (priority chips, win/lose
  splits, dashed fix box w/ anchor job tag) + voice/discoverability
  bottom strip with big serif score
- `renderDemandLandscape` (§16) · top temperature panel with colored
  Heating/Stable/Cooling label · 3-col funnel grid with per-keyword
  vol/comp/wedge meta · white-space block with gradient cards · seasonal
  pulse table
- ~120 lines of new CSS (`.audit-card`, `.audit-voice`, `.audit-discover`,
  `.dl-temp`, `.funnel-card`, `.fn-kw`, `.ws-card`, `.seasonal-row`)
- All renderers renumbered to `/ 18`
- Methodology (§17) + Colophon (§18) shifted down 2 slots
- Nav adds Audit + Demand links

### Changed — `src/App.jsx`
- `generateStrategyDoc` runs Pass 16 + Pass 17 after Pass 15, try/catch
  isolated. Passes `searchVolumeData` into Pass 17 for richer demand reads.
- All pass log labels updated to `/17`

### Bundle
| Build | Main | Gzip |
| --- | --- | --- |
| v1.6.5 | 320 KB | 94 KB |
| **v1.6.6** | **341.83 KB** | **99.18 KB** |

+22 KB for both passes + renderers + CSS.

### Pending v1.7 backlog
| # | Item | Status |
| --- | --- | --- |
| 1 | Ad-Intel wire-in | ✅ v1.6.1 |
| 2 | Pass 14 creator briefs | ✅ v1.6.2 |
| 3 | Pass 15 competitive teardown | ✅ v1.6.3 |
| 4 | **Pass 16 brand audit** | ✅ **v1.6.6** |
| 5 | **Pass 17 demand landscape** | ✅ **v1.6.6** |
| 6 | Pass 18 tribe readout | 🔴 next |
| 7 | Pass 19 seasonal campaign | 🔴 |
| 20 | Project isolation audit | ✅ v1.6.5 |

3 sections to v5 reference parity (21 sections).

---

## [1.6.5] — 2026-05-14

**Project isolation audit — engine made brand-agnostic.** Siraj was the
test brand through v1.6.4; v1.6.5 strips every Siraj-specific default
from the engine surface and fixes a state-leakage bug where switching
projects in the dashboard kept the previous project's analysis visible.

Mandate: *"every output will not be of Siraj and that singular brand
identity — the only thing i want to keep from Siraj is have the same
quality of output consistently across the tool."*

Full audit at `docs/ISOLATION_AUDIT.md`.

### Fixed — state leakage on project switch (React)

`loadProjectAsContext` previously only set `activeProject` + `projectContext`
+ `sector`. Twelve other pieces of project-scoped state survived the
switch, so the new project's dashboard showed the previous brand's data
until the user clicked Run Analysis.

New `resetProjectScopedState()` callback in `App.jsx` clears all of:
`data`, `activeJob`, `entryRecs`, `positioningSpine`, `searchVolumeData`,
`adIntelData`, `adIntelPhase`, `stratDocPhase`, `debugLog`, `error`,
`view`, `phase`. Called from three entry points:
- `loadProjectAsContext(project)` — pre-applies before new context loads
- Project picker `Clear` button — full reset
- Sidebar `+ New Research` button — full reset

User-scoped state (`config` API keys, `projects` list, `sessions` list)
intentionally survives.

### Fixed — code defaults

| Where | Before | After |
| --- | --- | --- |
| `src/ProjectSetup.jsx` URL placeholder | `https://sirajbeauty.com` | `https://yourbrand.com` |
| `src/lib/compose-strategy.js` header comment | references "Siraj salmon" v1.6.3→v1.6.4 migration | brand-neutral note about per-project palette override |
| `engine/db/migrate-json-to-airtable.mjs` | literals `PROJECT_NAME = "Siraj Beauty"` + `PROJECT_ID = "siraj_001"` | required env vars w/ error if missing |
| `engine/ad-intel/stage-a-competitors.mjs` | argv defaults `"Siraj Beauty"` + `"siraj_001"` | required args + usage message |
| `engine/ad-intel/stage-b-ad-ingest.mjs` | argv default `"siraj_001"` | required arg + usage message |
| `engine/eval/ad_eval_llm.mjs` | argv default + hardcoded Siraj context string | required `project_id`; optional `PROJECT_CONTEXT` env var |
| `engine/ad-intel/stage-d-storyboards.mjs` | 6 separate Siraj-specific places (PROJECT_DEFAULTS, prompt template, shell command, argv defaults) | all parameterized — `GENERIC_PROJECT_DEFAULTS` read from `PROJECT_TOOL` / `PROJECT_PRESET_MODE` / `PROJECT_FORMAT` / `PROJECT_DURATION` / `PROJECT_BRAND_VOICE` / `PROJECT_PALETTE` env vars · prompt now says "this brand" not "Siraj" · shell command uses `${brand_name \|\| project_id}` |
| `engine/eval/tribe_brainlm.py` comment | "historical Siraj + competitor ads" | "historical brand + competitor ads (project-scoped)" |

### Moved — project-specific one-off out of engine surface

- `engine/ad-intel/push-flex-concepts.mjs` → `projects/siraj/scripts/push-flex-concepts.mjs`
- Header comment updated to flag it as Siraj-only · directs new
  projects to use Pass 14 / Stage D flows instead

### Added — `docs/ISOLATION_AUDIT.md`

Comprehensive audit report covering localStorage inventory, every
Siraj-reference found + fix applied, the state-leakage bug + fix, and
the 10 Project Isolation Invariants for forward-looking development.

### Added — vault `13 - Roadmap & Backlog.md` → `## 🔒 Project Isolation Invariants`

Codified the 10 invariants alongside the v1.7 backlog. Future passes +
features MUST honor.

### Verification

```bash
$ grep -rn 'siraj\|Siraj' src/ engine/ | grep -v node_modules | grep -v '\.md:'
(no results)
```

Zero Siraj references remain in executable code paths. Historical
artifacts (CHANGELOG, deliverable HTMLs, R&D docs) untouched.

### Bundle

Same 320 KB / 94 KB gzip. Pure logic + comment changes, no template
or asset modifications.

---

## [1.6.4] — 2026-05-14

**Moss-and-brick palette swap.** Visual reskin of the Strategy Doc output.
The salmon/pink/yellow "Siraj" palette is replaced with a forest-green +
cream + brick palette per
[coolors.co/palette/386641-6a994e-a7c957-f2e8cf-bc4749](https://coolors.co/palette/386641-6a994e-a7c957-f2e8cf-bc4749).

Cosmetic only — no schema changes, no pass changes, no rendering logic
changes. Same bundle size (320 KB).

### Color tokens · before → after

| Role | v1.6.3 | v1.6.4 |
| --- | --- | --- |
| Primary accent (borders, tags, win states) | `--siraj-salmon` `#F7B5A4` | `--moss-deep` `#386641` |
| Secondary text (section labels, citations) | `--rosy-brown` `#D7B7AA` | `--moss-mid` `#6a994e` |
| Soft accent (gradients, light fills) | `--pillow-pink` `#F9D6D2` | `--moss-light` `#a7c957` |
| Bright highlight | `--smile-yellow` `#F6D38D` | `--moss-lime` `#a7c957` |
| Warm background | `--bg-warm` `#FBF7F4` | `--bg-warm` `#f2e8cf` |
| Card background | `--bg-card` `#FCEEEB` | `--bg-card` `#f7ecda` |
| Underserved / error | `#B85C5C` / `#ef4444` | `--brick` `#bc4749` |
| Success green | `#22c55e` | `#386641` (moss-deep) |
| Ad-intel purple (in axis summary) | `#a78bfa` | `#6a994e` (moss-mid) |
| `--ink-secondary` | `#7A6964` (warm gray) | `#5a6b5d` (green-tinted gray) |
| `--ink-muted` | `#B5A8A2` (warm gray) | `#9aa68f` (green-tinted gray) |

### Changed — `src/lib/compose-strategy.js` only

- `:root` declaration: 4 var renames + 2 bg value swaps + 1 new `--brick` var
- All `var(--*)` references updated to new names
- All hard-coded rgba() and hex literals updated
- Cover doc-num + footer + methodology line stamped `v1.6.4`
- Header comment block documents new palette + maps every role

### Untouched

- `src/lib/anthropic.js` ✓
- `src/App.jsx` ✓
- All 15 pass functions ✓
- All 16 renderer functions ✓
- All section numbering ✓

### Bundle

| Build | Main | Gzip |
| --- | --- | --- |
| v1.6.3 | 320.17 KB | 94.39 KB |
| **v1.6.4** | **320.02 KB** | **94.35 KB** |

Negligible — color literals are roughly the same byte count.

---

## [1.6.3] — 2026-05-14

**Pass 15 · Competitive teardown.** Third v1.7 backlog item shipped. Doc
grows 15 → 16 sections. Pass 15 produces a 6-row competitive matrix
(category position + price anchor + primary promise + creative pattern
+ where we win + where we lose + wedge to attack + first punch) plus
an axis summary naming the open quadrant.

Different from Pass 5 `comparePositioning`:
- **Pass 5:** brand vs N incumbents on stated value prop only. Quick,
  surface-level.
- **Pass 15:** same N incumbents (or pulled from Ad-Intel Stage A if
  available) with the full strategic frame · attack plan per
  competitor + the 2D position map.

### Added — `src/lib/anthropic.js`

- **Pass 15** `generateCompetitiveTeardown(apiKey, projectContext,
  positioning, valueProp?, adIntelCompetitors?)`
- Prefers Ad-Intel Stage A competitor data when available (richer ·
  classification + spend tier + evidence). Falls back to Pass 5
  comparison rows. If neither, asks Claude to derive 6 plausible
  competitors from project context key facts.
- Returns `{ competitive_matrix: [...6], axis_summary: {...} }`.
- 9 fields per matrix row · 5 fields in axis summary.

### Added — `src/lib/compose-strategy.js`

- **§14 · Competitive teardown** renderer (`renderCompetitive`).
- New CSS · `.comp-card` 2-col grid · category-position + price chips ·
  italic primary-promise quote · creative-pattern label · green/red
  win/lose split · salmon-bordered wedge-to-attack callout · dashed
  first-punch box.
- New `.axis-summary` block · gradient salmon-bordered panel with X/Y
  axis labels · brand position · open-quadrant highlighted in ad-intel
  purple · large serif strategic-thesis sentence.
- Section count: **15 → 16.** All renderers renumbered to `/ 16`.
- Methodology (§15) + Colophon (§16) shifted down one slot.
- Nav extended with "Competitive" link.

### Changed

- App.jsx `generateStrategyDoc` runs Pass 15 after Pass 14, try/catch
  isolated. Passes `adIntelData?.competitors` if Ad-Intel has run.
- All pass log labels updated to `/15`.
- Cover doc-num + footer stamp → `v1.6.3`.

### Bundle

| Build | Main | Gzip |
| --- | --- | --- |
| v1.6.2 | 309 KB | 91.9 KB |
| **v1.6.3** | **320 KB** | **94.4 KB** |

+11 KB for Pass 15 + renderer + CSS.

### Pending v1.7 backlog

| # | Item | Status |
| --- | --- | --- |
| 1 | Ad-Intel wire-in | ✅ v1.6.1 |
| 2 | Pass 14 creator briefs | ✅ v1.6.2 |
| 3 | **Pass 15 competitive teardown** | ✅ **v1.6.3** |
| 4 | Pass 16 brand audit | 🔴 next |
| 5 | Pass 17 demand landscape | 🔴 |
| 6 | Pass 18 tribe readout | 🔴 |
| 7 | Pass 19 seasonal campaign | 🔴 |

---

## [1.6.2] — 2026-05-14

**Pass 14 · Creator outreach briefs.** Second v1.7 backlog item. Strategy
doc grows from 14 → 15 sections. Adds 5 paid-creator outreach packets,
one per persona, with archetype + sourcing criteria + content concept +
deliverables + DM template + comp range + usage rights + dos/donts +
success metric.

### Added — `src/lib/anthropic.js`

- **Pass 14** `generateCreatorBriefs(apiKey, projectContext, positioning,
  personas, recommendations)` · returns `{creator_briefs: [...5]}`. Each
  packet: `packet_id`, `target_persona_name`, `creator_archetype`,
  `platform`, `audience_fit`, `sourcing_criteria` (4-6 filter rules),
  `content_concept`, `deliverables`, `talking_points`, `cta`, `dos`,
  `donts`, `usage_rights`, `comp_range`, `outreach_dm` (3-5 sentence
  template), `success_metric`.
- **Deliberate constraint:** Pass 14 does NOT output real creator
  handles. v1.3 `verify-creators.mjs` established the rule that
  handles must be human-verified to avoid hallucinated accounts. Pass
  14 outputs archetype + sourcing criteria; a human sourcer matches.

### Added — `src/lib/compose-strategy.js`

- **§13 · Creator outreach** renderer · creator card with smile-yellow
  packet ID tag, persona pill, archetype + platform header, italic
  audience-fit line, gradient content-concept block, deliverable chips,
  2-col sourcing-criteria + talking-points grid, green/red dos+donts
  blocks, salmon-bordered DM template card, 3-col footer (CTA / comp /
  rights), italic success-metric closer.
- CSS additions: `.creator-card` + all subcomponents (~40 lines).
- Section count: **14 → 15.** All renderers renumbered to `/ 15`.
- Methodology (§14) + Colophon (§15) shifted down one slot.
- Nav extended with "Creators" link.

### Changed

- App.jsx `generateStrategyDoc` handler runs Pass 14 after Pass 13.
  Try/catch isolated so a Pass 14 failure doesn't block the download.
- All pass log labels updated from `/13` → `/14`.
- Cover doc-num + footer stamp updated to `v1.6.2`.
- Methodology line reports v1.6.2 + creator packet count.

### Bundle

| Build | Main bundle | Gzip |
| --- | --- | --- |
| v1.6.1 | 299 KB | 90 KB |
| **v1.6.2** | **309 KB** | **91.9 KB** |

+10 KB for Pass 14 + the §13 renderer + ~40 lines of creator-card CSS.

### Cost per full strategy doc run

| Engine | Calls | Wall time | API cost |
| --- | --- | --- | --- |
| v1.6 | 14 | ~3m 15s | ~$0.80 |
| **v1.6.2** | **15** | **~3m 30s** | **~$0.85** |

### Pending v1.7 backlog

| # | Item | Status |
| --- | --- | --- |
| 1 | Ad-Intel wire-in | ✅ v1.6.1 |
| 2 | **Pass 14 creator briefs** | ✅ **v1.6.2** |
| 3 | Pass 15 competitive teardown | 🔴 next |
| 4 | Pass 16 brand audit | 🔴 |
| 5 | Pass 17 demand landscape | 🔴 |
| 6 | Pass 18 tribe readout | 🔴 |
| 7 | Pass 19 seasonal campaign | 🔴 |

---

## [1.6.1] — 2026-05-14

**Ad-Intel React wire-in.** First v1.7-backlog item shipped: the four
ad-intel CLI stages (Stage A → B → C → D) are now triggerable directly
from the React UI, persist to Airtable, and surface results in a new
"🎯 Ad-Intel" tab.

### Added — `src/lib/ad-intel.js` (browser port)

Browser-side ports of the four CLI stages from `engine/ad-intel/*.mjs`,
re-using `callClaude` + `extractJSON` from `anthropic.js`:

- **Stage A** `stageA` · web_search to find 10 competitors with
  classification (direct / adjacent / aspirational) + spend_tier + evidence
- **Stage B** `stageB` · per-competitor web_search ad ingest with
  best-effort fallback (Meta Ad Library API still pending)
- **Stage C** `stageC` · per-ad LLM eval on 5 behavioral signals +
  Schwartz awareness + hook type + addressed beliefs (text-only mode)
- **Stage D** `stageD` · hook-affinity picker (v1.3 OUTCOME_HOOK_AFFINITY
  map preserved) + storyboard brief generator
- **`runAdIntel`** · orchestrator that runs A → B → C → D with progress
  callbacks and optional Airtable persistence. Derives underserved
  outcomes (opp_score ≥ 10) automatically from Pass 1+2 data.

### Added — Airtable methods (`src/lib/airtable.js`)

Four new methods + TABLES entries for the ad-intel schema:

- `saveSwipePages(projectId, competitors)` · with `_normSpendTier()`
  helper that remaps CLI strings (`small`/`mid`/`large`) to Airtable
  select values (`<$100K/mo` / `$100K-1M/mo` / `>$1M/mo`)
- `saveSwipeAds(projectId, ads)` · initial pending rows from Stage B
- `updateSwipeAds(projectId, taggedAds)` · Stage C eval results
- `saveCreativeBriefs(projectId, briefs)` · Stage D output

All chunked at Airtable's 10-record batch limit. Each chunk wrapped in
try/catch so a failed batch doesn't abort the run.

### Added — `src/lib/anthropic.js` exports

- `callClaude` and `extractJSON` are now `export`ed so other modules
  (ad-intel, future TRIBE wiring) can reuse the same Anthropic wrapper
  with consistent truncation detection.

### Added — UI in `App.jsx`

- New **"🎯 Run Ad-Intel"** purple-outlined header button — disabled
  until Pass 1-4 has populated `data`.
- New **"🎯 Ad-Intel"** tab in the view-switcher row.
- New `runAdIntelHandler` callback that triggers the full A→B→C→D
  pipeline with progress logged into the debug log.
- New ad-intel result view with three stacked panels:
  1. Stage A · competitor list (color-coded by classification)
  2. Stage C · top-8 scored ads sorted by `score_total`, with all 5
     behavioral scores + awareness + hook type
  3. Stage D · creative briefs with hook + body + belief shift + shot
     list (collapsible) + Higgsfield-ready format/duration chips

### Bundle

| Build | Main bundle | Gzip |
| --- | --- | --- |
| v1.6 | 273 KB | 82.5 KB |
| **v1.6.1** | **299 KB** | **90 KB** |

+26 KB for the entire ad-intel module + UI.

### Cost per run

Roughly 22 Anthropic calls (1 Stage A + 10 Stage B + 10 Stage C + ~5
Stage D) · ~70 K tokens · **~$0.90 in API spend.** Adds ~3 minutes to
the wall time.

### Pending for v1.7

- Pass 14 `generateCreatorBriefs` · paid-creator outreach packets
- Pass 15 `generateCompetitiveTeardown` · §15-style competitive matrix
- gpt-image-2 wire-in for swipe-file images
- Meta Ad Library API integration when the user's verification token
  lands (replace the `web_search_fallback` ingestion mode in Stage B)
- Multimodal Stage C eval once Stage B returns actual creative bytes

---

## [1.6.0] — 2026-05-13

Strategy Doc parity (Phase B). Three more Anthropic passes plus four new
renderers extend the doc from 10 sections to 14, closing the gap toward
the v5 reference at `siraj-strategy.vercel.app`. The output now covers
channel allocation, persona × channel targeting, conversion-ready
landing pages, and a gated 90-day rollout — the operational layer that
sits under the positioning + creative.

### Added — 3 new passes in `src/lib/anthropic.js`

- **Pass 11 `generateChannelPlan`** — 8–10 paid + organic channels with
  budget %, role, KPI, first test, format, audience hook; plus a
  9–12-row targeting matrix (persona × channel) with interest layers,
  lookalike seeds, exclusions, creative angle, spend share.
- **Pass 12 `generateLandingVariants`** — 3 persona-specific landing
  pages. Hero headline + sub + CTA, proof strip, 5–6 sections (Problem
  / Solution / How it works / Proof / Compare / FAQ / Founder note /
  Final CTA), visual direction, primary KPI.
- **Pass 13 `generateRollout`** — 90-day rollout in 3 gated phases
  (Weeks 1-4 / 5-8 / 9-12). Each phase: theme, objective, deliverables,
  channels live, budget %, KPI targets, gate-to-next. Plus weekly
  cadence rituals + kill criteria.

### Added — 4 new renderers in `src/lib/compose-strategy.js`

- `renderChannels` (§09) · 2-column channel grid with budget pills, KPI,
  first test, format, audience hook per channel.
- `renderMatrix` (§10) · persona × channel table with interest / seed /
  exclusion tags plus creative angle and spend share.
- `renderLanding` (§11) · 3 landing variants rendered as mock hero
  blocks with proof strip, sectioned copy, visual-direction footer.
- `renderRollout` (§12) · 3 phase cards with deliverable / channel
  grids, KPI tiles, gate quote-blocks; plus cadence + kill-criteria
  columns.
- `renderColophon` (§14) · brand-voice closing on methodology framing.

### Changed

- Doc now totals 14 sections (was 10). Existing renderers (§01–§08)
  renumbered to / 14. Nav extended with Channels / Matrix / Landing /
  Rollout links.
- Methodology renderer now reports v1.6 plus counts for the 3 new
  artifact families.
- App.jsx `generateStrategyDoc` handler runs Pass 11 → 12 → 13 after
  Pass 10. Each is wrapped in try/catch so a single failure can't
  block the download. Progress phase labels updated.
- Cover doc-num tag updated to "Phase 1 Strategy · Engine v1.6".

### Bundle

Main bundle: 273 KB (gzip 82.5 KB) — up from 254 KB / 79 KB for v1.5.
~19 KB cost for 3 passes + 4 renderers + section CSS.

### Pending for v1.7

- Wire ad-intel CLI stages (Stage A/B/C/D) into the React run so the
  doc picks up real competitive evidence rather than relying on Pass 5
  alone.
- Add Pass 14 `generateCreatorBriefs` for paid-creator outreach + Pass
  15 `generateCompetitiveTeardown` to feed a §15-style competitive
  matrix. Together these close the v5 21-section gap.
- Optional: gpt-image-2 hook so the swipe-file renderer pulls real
  imagery rather than gradient mocks.
- Optional: Vercel deploy hook from the composer so "↓ Strategy Doc"
  also returns a shareable URL.

---

## [1.5.0] — 2026-05-13

Strategy Doc parity (Phase A). Four new Anthropic passes plus an HTML
composer plus a one-click download button. After running analysis +
clicking "↓ Strategy Doc," the engine produces a self-contained
v5-shaped HTML file covering 10 sections.

### Added — 4 new passes in `src/lib/anthropic.js`

- **Pass 7 `generatePersonas`** — 4 Ulwick-format personas (archetype-
  tagged: Sensory Romantic, Cautious Indulger, Soft-Life Loyalist,
  Reflective Rewarder). Each anchored to a scored Job + a real
  competitor + cultural-online-presence list.
- **Pass 8 `generateSwipeFile`** — 20 ad concepts (5 per persona).
  Format / stage / title / headline / body / cta / framework /
  visual_brief. Headlines in brand voice (no exclamation points,
  no em-dashes).
- **Pass 9 `generateScripts`** — 8 shot-by-shot TikTok/Reel scripts.
  Time-coded shots with cue + detail + ost + vo. Plus sound note,
  creator brief, KPI per script.
- **Pass 10 `generateEmailFlows`** — 4 Klaviyo-ready flows (welcome,
  abandoned cart, post-purchase, win-back). Each with subject /
  preview / body / cta_label per email.

All four pull from Pass 0 projectContext + Pass 1 jobs + Pass 4
positioning_spine, so the outputs are coherent across passes.

### Added — `src/lib/compose-strategy.js`

The HTML composer. Single function:

\`\`\`js
import { composeStrategyDoc, downloadStrategyDoc } from "./lib/compose-strategy";
const html = composeStrategyDoc({ project_name, project_context,
  positioning, personas, mergedJobs, valueProp, swipeFile, scripts,
  emailFlows, recommendations });
downloadStrategyDoc(html, "strategy.html");
\`\`\`

Renders 10 sections matching the v5 template (Positioning · Evidence
· Value-prop comparison · Personas · Swipe file · Scripts · Emails ·
Entry wedge · Methodology). Inlined CSS, no external assets beyond
Google Fonts. Self-contained — opens standalone.

### Added — App.jsx integration

- New "↓ Strategy Doc" button in the header (gold-outlined, next to
  "+ New Project")
- Disabled until analysis has run
- On click: runs Pass 5 (if competitors in context) + Pass 7 + Pass 8
  + Pass 9 + Pass 10 sequentially, composes the HTML, triggers
  download
- Phase indicator reuses the existing loading bar
- Positioning spine + recommendations now persisted in proper React
  state instead of window globals

### Bundle impact

Main bundle: 254 KB (gzip 79 KB) — +37 KB for the new passes +
composer. Heavy parsers still code-split. Build clean in 5.4s.

### What's still missing (v1.6+ backlog)

- Pass 11 · Channel Plan + Targeting Matrix
- Pass 12 · Landing Variants
- Pass 13 · 90-day Rollout
- Wire ad-intel stages (engine/ad-intel/stage-*.mjs) into React
- Wire creator outreach + tribe research into React
- gpt-image-2 hook for the 20 swipe images (v1.7)
- Vercel deploy hook from the composer (v1.7)

---

## [1.4.1] — 2026-05-13

Google Drive folder ingest for the Project Setup flow.

### Added — `src/lib/google-drive.js`

Public-folder ingest via the Drive API v3:

- `extractFolderId(url)` — handles `/folders/ID`, `?id=ID`, and bare-ID inputs
- `ingestFolder(url, apiKey, onProgress)` — recursive walk (depth 3 max),
  paginated listing (100 per page), per-file download with auto-export for
  Google-native types (Docs → DOCX, Sheets → XLSX, Slides → PDF,
  Drawings → PNG)
- Files > 25 MB are skipped to keep browser-side parse budgets sane
- Progress callbacks for: listing · descending · found · downloading · done

Auth model: **API key only** (no OAuth this round). User shares folder
as "Anyone with the link can view" and pastes the URL. Private-folder
OAuth is v1.5 work.

### Added — ConfigPanel field

`GOOGLE_DRIVE_API_KEY` field in the ⚙ Config modal. Stored in localStorage
under `googleDriveApiKey`. `.env.example` updated.

### Added — ProjectSetup Drive section

New "Step 01b · …or pull from a Google Drive folder" block. Pastes URL,
clicks Pull, files flow through the existing `parseFiles` pipeline.
Expandable Drive-setup help panel (visible when no API key is set) walks
the user through Cloud Console → enable Drive API → create key → share
folder publicly → paste URL.

Skipped-file list rendered if any files couldn't download (forbidden,
oversized, unsupported native type) so the user knows what wasn't
ingested.

### Bundle impact

Main bundle: 217 KB (gzip 69 KB) — +6 KB vs v1.4 for the new lib. Build
clean in 5.3s.

---

## [1.4.0] — 2026-05-13

Project Setup ingestion flow. Replaces the per-pass "type a sector
string" UX with "drop a folder of files + paste a URL, ingest once,
all phases pull from the same context."

### Added — Pass 0 (`summarizeProjectContext`)

New `engine/src/lib/anthropic.js` function. Takes raw text extracted
from uploaded files + scraped URL content, returns a structured
Project Context JSON:

```
{
  sector, audience, product_context, brand_voice,
  key_facts: [...], sources: [...],
  positioning_hints: [...], red_flags: [...]
}
```

The summarizer is opinionated: every key_fact must be defensible
against a quoted input. Contradictions surface in red_flags rather
than getting picked silently.

### Added — browser file parsers (`src/lib/parse-files.js`)

Lazy-loaded heavy libs (pdfjs-dist, mammoth.browser, xlsx) so the
main bundle stays at 210 KB. Supports PDF · DOCX · XLSX/CSV/TSV ·
TXT/MD/JSON. Images stored as references with metadata only — OCR
deferred to v1.5. Per-file text capped at 30K chars; URL content
capped at 60K chars to keep the summarizer prompt in budget.

### Added — URL scraper (`src/lib/scrape-url.js`)

Uses Jina AI Reader (`https://r.jina.ai/<url>`) which returns clean
markdown and is CORS-friendly from browser. Free up to 1M tokens/mo.
Anthropic's web_fetch tool is the long-term swap.

### Added — Project Setup view (`src/ProjectSetup.jsx`)

New full-screen view in the React app, gated by `viewMode === "setup"`
state. Four steps:

1. Drop files (drag-drop, multi-file picker, folder picker via
   webkitdirectory) — parses each in browser
2. Paste URL — scrapes via Jina Reader, shows byte count + truncation
3. Click "Ingest Context" — runs Pass 0, surfaces all 8 context fields
4. Name the project, click "Save & Continue" — writes to Airtable
   Projects table, hands control back to the analyze view with
   context loaded

Status bar pinned to bottom shows current phase / progress / errors.

### Added — Airtable Project CRUD (`src/lib/airtable.js`)

New `AirtableClient` methods:
- `listProjects()` — picker source for the main UI
- `loadProject(airtableId)` — full fetch when picked
- `createProject({ name, sector, audience, productContext,
   contextSummary, sourceUrls })` — writes the Pass 0 JSON into the
   `product_context` field under a `── PASS 0 CONTEXT SUMMARY ──`
   marker so it's both human-readable in Airtable and parseable in code
- `updateProject(airtableId, patch)` — patch by id

The Projects table schema (already in place) carries the field shape;
this layer just maps to it.

### Changed — Pass 1 (`discoverJobs`)

Signature extended to `discoverJobs(apiKey, sector, keywords, projectContext)`.
When `projectContext` is provided, the system prompt receives a
PROJECT CONTEXT block with audience, product context, brand voice,
key facts, and positioning hints. Pass 1 anchors job statements to
these specifics and is required to cite at least 2 key_facts per job
in evidence_quotes.

Backward-compatible: callers passing only `(apiKey, sector)` still work.

### Changed — `App.jsx`

- New state: `viewMode`, `projects`, `activeProject`, `projectContext`
- View-switch early-return when `viewMode === "setup"` renders
  `<ProjectSetup>` full-screen
- Project picker UI in the analyze view: dropdown over all Airtable
  Projects, auto-loads Pass 0 summary out of the `product_context`
  marker, shows red-flag count if any
- "+ New Project" button next to Config opens the Setup view
- `runAnalysis` now passes `projectContext` to Pass 1

### Bundle impact

Heavy parsers code-split into separate chunks (only load when files
drop):
- `pdf-DeWlx49F.js` 458 KB (gzip 136 KB)
- `mammoth.browser-CT_ZbjvI.js` 499 KB (gzip 126 KB)
- `xlsx-D_0l8YDs.js` 429 KB (gzip 143 KB)
- `pdf.worker-B1D2UnXD.mjs` 2.1 MB (loads only during PDF parse)

Main bundle: 210 KB (gzip 67 KB). Build clean in 5.8s.

### Test plan

1. `npm run dev` opens at localhost:3000
2. Click "+ New Project" — Project Setup view loads
3. Drop the `Siraj Beauty/` folder + paste `https://sirajbeauty.com`
4. Click "Scrape" — verify Jina returns markdown
5. Click "Ingest Context" — verify Pass 0 returns structured JSON
6. Name + Save — verify a new row in Airtable Projects table
7. Return to analyze view — project should be pre-selected
8. Run analysis — debug log should show "Pass 1/4: discovering core
   functional jobs for ... (with Pass 0 project context)"

### Migration notes

- v1.3 callers of `discoverJobs(apiKey, sector)` still work; new
  fourth arg is optional.
- Existing Project records (the Siraj `siraj_001` record created in
  v1.2.1) don't have an embedded Pass 0 summary, so the picker falls
  back to using the project's `sector`/`audience`/`product_context`
  fields directly. Re-ingest via the setup flow to get the full
  context.

---

## [1.3.0] — 2026-05-13

Stage D hook-matching fix + Summer Flex Campaign integration.

### Fixed — Stage D hook diversification

The v1.2 generator picked the single highest-scoring tagged ad as the
"winning pattern" and applied its mechanic to every outcome. With Skims
dominating raw score (32/50), all 5 generated briefs leaned on Skims's
seasonal-deal-anchor hook even where the outcome didn't fit.

v1.3 adds `OUTCOME_HOOK_AFFINITY` — a map from job_id to preferred
hook types. Stage D now does a two-pass match:

1. Pick the highest-scoring tagged ad whose `hook_type` is in the
   outcome's affinity list.
2. If no match (pool too thin), fall back to top-score and log the
   mismatch as `flag for v1.4 hook diversification`.

Result on Siraj re-run:
- Job 03 (recovery) → Lunya/problem_statement (27/50) — affinity match
- Job 01 (reclaim body) → Skims/before_after (28/50) — affinity match
- Job 04 (transition) → Skims/before_after — affinity match
- Job 05 (cultural permission) → Skims/deal_anchor — FALLBACK
  (pool lacks founder_pov + category_pivot ads; need Meta API token)
- Job 02 (public/private) → Skims/before_after — affinity match

4 of 5 briefs now affinity-matched. The one fallback is honest data
limitation, not algorithm failure.

### Added — Summer Flex Campaign integration

The May 25 drop is the Summer Flex Collection (EveryWear Flex Set +
Flex Robe in Matcha; companion Black Is Love Signature Robe).
Production wrapped May 2 in Washington DC.

7 named concepts authored by Jael Harris pushed to Airtable Creative
Briefs via `engine/ad-intel/push-flex-concepts.mjs`:

- The Village (Mom's Night In) · Sabia + Kiaan → Job 03 / opp 14.4
- My Time, His Time, Our Time · Sabia + Kiaan → Job 03 + Job 02
- Still. Here. · Sabrina → Job 01 / opp 13.6
- Be Anxious for Nothing · Sabrina → Job 01 / opp 13.6
- The Art of Dilly Dallying · Yana → Job 05 / opp 12.2
- Grounding the Village · Yana → Job 04 / opp 12.6
- Fly Girl at Home · Adaeze + Bria → Job 02 / opp 11.8

The brand independently arrived at narrative coverage of all 5
underserved outcomes. Production wrap (May 2) predates engine v1.1's
§02 Evidence table (May 12). The alignment is the validation.

Airtable Creative Briefs table now has 12 records: 5 from initial
Stage D + 7 Summer Flex concepts.

### Added — v5 strategy doc

- Part IV divider · "The May 25 Drop"
- §21 · Summer Flex Campaign with:
  - Concept → outcome map (7 concepts × 5 outcomes)
  - Production stack (shoot details, crew, budget breakdown $2,121)
  - Influencer pipeline (3 tiers: T1 founder · T2 gifting · T3 anchor)
  - Real creator names from outreach docs (Alana Abigail · Tobi Smith ·
    Sudaine · Coriyanna · Brit Bruni · MyQueen Dickens)
  - MyQueen contract terms: $3,000 flat fee · 50/50 split · QUEEN15 code ·
    extended paid-ad usage rights · Reel due June 11
- §04 Entry Wedge updated: "May 25 drop — Summer Flex Collection"
  with explicit product names (replaces previous TBD placeholder)
- Doc grows to 21 sections, /21 indicators throughout
- 270KB, 5 Part dividers, 9 Flex references

### Migration notes for callers

- v1.2 callers of Stage D get the same return shape; the picker is
  the only thing that changed. No code update required.
- The `OUTCOME_HOOK_AFFINITY` map is configurable in
  `engine/ad-intel/stage-d-storyboards.mjs`. Per-project overrides
  go in a future `project-defaults` payload (v1.4 work).

---

## [1.2.0] — 2026-05-12

Ad-intel module add. Four new pipeline stages plus a TRIBE+BrainLM
research scaffold. Storage layer abstracted to a backend-agnostic
adapter (JSON files now, Airtable when access lands).

### Added — engine/db/storage.mjs

Storage adapter with two backends:
- `json` (default) writes to `db/<table>.json` files
- `airtable` writes to live tables when `STORAGE_BACKEND=airtable` env is set
Tables: `swipe_pages`, `swipe_ads`, `creative_briefs`,
`brief_iterations`, `audit`. Same API across both backends.

### Added — engine/ad-intel/stage-a-competitors.mjs

Stage A. Given `{ brand, category, project_id }` returns 10 named
competitors with classification (direct / adjacent / aspirational),
verticals, spend tier, and meta_page_url. Sourced via Anthropic
`web_search` against SimilarWeb / Crunchbase / category roundups.

### Added — engine/ad-intel/stage-b-ad-ingest.mjs

Stage B. For each Swipe Page with `scrape_status: pending`, pulls
currently-running Meta ads. **Current implementation uses
web_search as fallback** — no Meta Ad Library API access yet.
When the API token lands, swap the `ingestForPage` function for
a real `/ads_archive` call. Record shape stays identical.

TikTok Creative Center ingestion deferred to v2.1 per spec.

### Added — engine/eval/ad_eval_llm.mjs

Stage C. AD_EVAL contract — primary implementation, Claude Sonnet 4.
Provider-agnostic (Gemini / OpenAI swappable). For each tagged ad
returns: five behavioral scores (1-10 each), awareness level (1-5
Schwartz), hook type (controlled vocab), addressed beliefs, plus
cited evidence per score. Sets `tag_status: tagged` on completion.

### Added — engine/ad-intel/stage-d-storyboards.mjs

Stage D. For each underserved Desired Outcome (opp ≥ 10) with no
competitor ad coverage, generates a Creative Brief + initial Brief
Iteration. Brief includes hook + body + CTA + shot list + belief
to shift + predicted scores. Iteration carries a Higgsfield CLI
shell command. References to Belief Sessions / Belief Cells are
stubbed (`null`) until the Airtable schema lands.

### Added — engine/eval/tribe_brainlm.py

Phase-2 evaluator scaffold. NOT IMPLEMENTED. Defines the AD_EVAL
contract that the LLM evaluator already satisfies. Phase 2 swaps
when the R&D doc is approved + Meta API access lands.

### Added — engine/research/TRIBE-BRAINLM-RND.md

Architecture doc: ad creative → TRIBE v2 → fsaverage5 → Glasser 360
ROI pool → BrainLM encoder → 3-layer MLP head → 5 behavioral
scores. Includes data plan, phased rollout (2A-2D), risk register,
open questions.

### Siraj first run

- Stage A: 10 competitors identified (Sleep Ova, DAYO, Re Ona,
  Fancy Homebody, K.NGSLEY, Lunya, Skims, Printfresh, Set Active,
  Eberjey)
- Stage B: 8 ads ingested from Lunya + Skims; other 8 brands
  returned 0 ads via web_search (need Meta API token)
- Stage C: 8/8 ads scored. Winning pattern: Skims Vacation Shop
  deal-anchor (32/50).
- Stage D: 5 storyboard briefs + 5 iterations generated against the
  5 underserved outcomes.
- Stage E: findings surfaced in `phase1-strategy-v4.html` as Part III
  + §20. Deployed to `siraj-strategy.vercel.app`.

### Known issue (v1.3 fix)

Stage D picks a single winning ad pattern and applies it to every
outcome, which made all 5 briefs lean on Skims's seasonal-deal hook
even where it doesn't fit the brand voice. Fix: match patterns to
outcomes by hook_type + addressed_beliefs similarity, not by raw
score.

### Migration notes

- `STORAGE_BACKEND=json` (default) keeps everything in `db/`. No
  Airtable dependency for the v1.2 pipeline.
- When Airtable access lands: set `STORAGE_BACKEND=airtable` and the
  same code writes to Airtable. Tables must exist with names matching
  `AIRTABLE_NAMES` map in `engine/db/storage.mjs`.

---

## Siraj v3 strategy doc — 2026-05-12

Unified Phase 1 deliverable. Combines v2's positioning brief (Part I) with
v1's creative production layer (Part II). Replaces v2 at the same Vercel
alias.

- File: `phase1-strategy-v3.html` at repo root
- Deployed: `https://siraj-strategy.vercel.app` (replaces v2 at same alias)
- v1 archived at `https://siraj-strategy.surge.sh`
- v2 archived in git history at commit `de8d5be`

### Structure

Part I — The Brief (5 sections, v2 content):
- §01 Positioning · §02 Evidence · §03 Value-prop comparison ·
  §04 Entry wedge · §05 Methodology

Part II — The Production Layer (14 sections, v1 content):
- §06 Brand audit · §07 Personas · §08 ODI sector framing (detailed) ·
  §09 Paid channel plan · §10 Targeting matrix · §11 Swipe file ·
  §12 TikTok scripts · §13 Email flows · §14 Landing page variants ·
  §15 Search demand validation · §16 Viral tribe content ·
  §17 Creator outreach list · §18 Competitive landscape ·
  §19 90-day rollout

### What's new vs v2

- v1's creative production layer is back in the document, after the brief.
  v2's mistake was assuming the brief replaces the production — it doesn't,
  it informs it.
- **NEW: TT-09 fake podcast ad** in §12 TikTok scripts. 42-second scripted
  podcast clip ("MORNING REGIMEN · EP 47") where the "host" asks the guest
  what she's wearing and the guest reveals it's the Siraj Petal three-piece
  set. Sells the brand inside a natural-feeling conversation. Cites Job 02
  (public/private continuum, opp 11.8) + Job 05 (cultural identity, opp 12.2).
- Two-part divider visual breaks make the structural intent legible
  (Part I = brief, Part II = production).
- All section numbers renumbered to /19. Phase 2 intro section dropped
  as redundant with the Part II divider.

---

## Siraj v2 strategy doc — 2026-05-12

Output artifact (not engine code). First doc produced through engine v1.1.

- File: `phase1-strategy-v2.html` at repo root
- Deployed: `https://siraj-strategy.vercel.app` (replaces v1 at same alias)
- v1 archived at `https://siraj-strategy.surge.sh` for diff reading

### What changed vs v1

- TOC collapsed from 15 sections to 5: Positioning → Evidence → Value Prop Comparison → Entry Wedge → Methodology
- Personas moved out of the Phase 1 brief (they belong in Phase 2 / creative production)
- Creative library (20 swipe ads, 8 TikTok scripts, 4 email flows, 3 landing variants) moved out — same reason
- 90-day rollout moved out — execution playbook is Phase 3
- Value-prop comparison rendered as a 5-row structured table with verbatim competitor quotes cited to source URLs
- Every positioning claim now traces to a numeric outcome score
- Pass 6 validation gate ran clean before deploy

### Generated alongside the doc

- `siraj-keywords.json` — primary discovery input (130 autocomplete + 24 PAA + 26 Reddit phrases + 4 competitor value props)
- `run-keyword-discovery-siraj.mjs` — reproducible script for the discovery run
- `phase1-strategy-v2.html` — the v2 output document

---

## [1.1.0] — 2026-05-12

Structural realignment. The first version put strategy findings before
positioning, used competitor ads as the primary discovery input, and
treated value-prop comparison as optional prose. This release fixes
those three failures and adds a validation gate.

### Changed — output template

- **Positioning is now the spine.** The Mode 1 Earth output template
  leads with a single sentence the brand should claim, plus 2-3
  alternatives ranked by underserved-outcome score. Every candidate
  cites the specific job + outcome + numeric score that backs it.
- **New required TOC** for all Mode 1 outputs:
  1. Positioning · 2. Evidence · 3. Value Prop Comparison ·
  4. Entry Wedge · 5. Methodology Appendix
- **Value Prop Comparison is required, not optional.** A structured
  table (not prose) showing brand vs 3-5 named competitors, with every
  competitor claim quoted from source URL.

### Changed — input priority

- **Customer keywords are now the primary input to Pass 1.** Ad creative
  is opt-in secondary, allowed only in Pass 5 (Competitor Value-Prop
  Comparison). Running Pass 1 without keyword input emits a
  `discovery_warning` in the JSON output.
- Keyword sources, in priority order: SerpAPI `google_autocomplete`,
  SerpAPI `google` `people_also_ask`, Reddit thread mining, competitor
  PDP one-star + five-star review mining.

### Added — Pass 5: comparePositioning

New API function `comparePositioning(apiKey, brand, positioning,
competitors, scoredOutcomes)` in `src/lib/anthropic.js`. For each named
competitor, returns: their stated value prop (quoted from source URL),
the outcome they implicitly price for, the outcome they leave unserved,
and where the brand wins.

### Added — Pass 6: validatePositioning

New pure-JS function `validatePositioning(passFourOutput, mergedJobs)`
in `src/lib/anthropic.js`. Rejects any positioning claim or entry
recommendation that doesn't cite `job_id`, `outcome`, AND a numeric
`score`. Runs at the end of the pipeline; errors surface in the
methodology appendix of the output document.

### Changed — Pass 1 signature

`discoverJobs(apiKey, sector)` is now
`discoverJobs(apiKey, sector, keywords = null)`. The optional third
argument carries the customer-language input. Each returned job now
includes an `evidence_quotes` array tying the job to verbatim phrases
from the keyword input.

### Changed — Pass 4 output shape

`generateEntryRecommendations` now returns a `positioning_spine`
object first (with `primary` and `alternatives`), then the
`recommendations` array. Each recommendation requires
`citation_score`.

### Changed — design.md

Added an "Engine output template — Mode 1 Earth (v1.1)" section that
codifies the TOC, input source priority, and validation rule. Added
an "Image generation" section that names `gpt-image-2` as the
canonical model.

### Migration notes for callers

- Existing UI calls to `discoverJobs(key, sector)` still work but now
  emit `discovery_warning`. Pass a `keywords` object to silence it.
- Existing code that reads `passFourOutput.recommendations` keeps
  working. Read `passFourOutput.positioning_spine` for the new claim.

---

## [1.0.0] — 2026-04 (retroactive baseline)

Initial Mode 1 Earth engine. ODI-based pipeline: discover jobs (Pass 1),
map to Universal Job Map and score outcomes (Pass 2), validate against
real search demand (Pass 3), generate entry strategies (Pass 4).
Optional SerpAPI integration for real Google data. Optional Airtable
persistence.

Tagged retroactively for SemVer continuity.
