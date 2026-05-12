# Alchemical Growth Engine — Changelog

All notable changes to the engine and its output template. The engine
is Mode 1 Earth (ODI-based outcome discovery). Versioning is SemVer;
the output template version is independent of the React app version.

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
