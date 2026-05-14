# Alchemical Growth Engine — Changelog

All notable changes to the engine and its output template. The engine
is Mode 1 Earth (ODI-based outcome discovery). Versioning is SemVer;
the output template version is independent of the React app version.

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
