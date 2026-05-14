# Alchemical Growth Engine — Changelog

All notable changes to the engine and its output template. The engine
is Mode 1 Earth (ODI-based outcome discovery). Versioning is SemVer;
the output template version is independent of the React app version.

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
