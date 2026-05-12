# Alchemical Growth Engine — Changelog

All notable changes to the engine and its output template. The engine
is Mode 1 Earth (ODI-based outcome discovery). Versioning is SemVer;
the output template version is independent of the React app version.

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
