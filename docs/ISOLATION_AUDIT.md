# Project Isolation Audit — v1.6.5

> **Date:** 2026-05-14
> **Engine version:** v1.6.5
> **Purpose:** Document the audit + fixes that made the engine brand-agnostic
> after testing exclusively against the Siraj Beauty project through v1.6.4.

The user's mandate: *"every output will not be of siraj and that singular
brand identity — the only thing i want to keep from siraj is have the same
quality of output consistently across the tool."*

This audit identifies every place the engine assumed Siraj as its default
brand, plus every place project-scoped state could leak across project
switches. Each finding is categorized and resolved.

---

## A · localStorage key inventory

| Key | Scope | Status | Notes |
| --- | --- | --- | --- |
| `odi-config` | User-scoped (API keys + base IDs) | ✅ OK | API keys are per-user, not per-project. Correct as-is. |

No other localStorage keys in use. **Future project-scoped data must use
the pattern `alchemy:${projectId}:<key>`** (see Project Isolation
Invariant #2 in `13 - Roadmap & Backlog.md`).

---

## B · Hardcoded Siraj references — code paths (FIXED)

All findings below are in **executable code paths** (the engine surface
itself). Each was fixed in v1.6.5.

| # | File:line | Before | After |
| --- | --- | --- | --- |
| 1 | `src/ProjectSetup.jsx:317` | placeholder `https://sirajbeauty.com` | placeholder `https://yourbrand.com` |
| 2 | `src/lib/compose-strategy.js:16-17` | comment about "Siraj salmon" v1.6.3 → v1.6.4 palette migration | replaced with brand-neutral note about per-project palette override (future v1.7 feature) |
| 3 | `engine/db/migrate-json-to-airtable.mjs:20-21` | literals `PROJECT_NAME = "Siraj Beauty"`, `PROJECT_ID = "siraj_001"` | required env vars `PROJECT_NAME` + `PROJECT_ID` with explicit error if missing |
| 4 | `engine/ad-intel/stage-a-competitors.mjs:96-100` | argv defaults `"Siraj Beauty"` + `"siraj_001"` | required args, usage message if missing |
| 5 | `engine/ad-intel/stage-b-ad-ingest.mjs:138-140` | argv default `"siraj_001"` | required arg, usage message |
| 6 | `engine/eval/ad_eval_llm.mjs:156-162` | argv default + ~150-char Siraj context string | required `project_id` arg, optional `PROJECT_CONTEXT` env var (no Siraj string) |
| 7 | `engine/ad-intel/stage-d-storyboards.mjs:30-39` | `PROJECT_DEFAULTS = { siraj_001: { tool, preset_mode, format, brand_voice (sis-coded...), palette (siraj-salmon...) } }` | `GENERIC_PROJECT_DEFAULTS` read from `PROJECT_TOOL` / `PROJECT_PRESET_MODE` / `PROJECT_FORMAT` / `PROJECT_DURATION` / `PROJECT_BRAND_VOICE` / `PROJECT_PALETTE` env vars |
| 8 | `engine/ad-intel/stage-d-storyboards.mjs:87` | prompt: `"Write a brief for Siraj that targets the Desired Outcome and uses the winning pattern's mechanic, in Siraj's voice."` | prompt: `"Write a brief for THIS brand (per the Project context above) ... in the brand's own voice."` |
| 9 | `engine/ad-intel/stage-d-storyboards.mjs:155` | `defaults = PROJECT_DEFAULTS[project_id] \|\| PROJECT_DEFAULTS.siraj_001` | `defaults = { ...GENERIC_PROJECT_DEFAULTS, ...(project_defaults \|\| {}) }` (function param) |
| 10 | `engine/ad-intel/stage-d-storyboards.mjs:194` | shell command hardcoded `--brand "Siraj Beauty"` | `--brand "${brand_name \|\| project_id}"` (from function arg) |
| 11 | `engine/ad-intel/stage-d-storyboards.mjs:222-226` | argv default + 200-char Siraj context literal | required `project_id`; optional `PROJECT_CONTEXT` + `PROJECT_BRAND_NAME` env vars |
| 12 | `engine/eval/tribe_brainlm.py:34` | comment: `"historical Siraj + competitor ads"` | comment: `"historical brand + competitor ads (training data is project-scoped per Invariant #5)"` |

---

## C · Hardcoded Siraj references — moved out of engine surface

| # | Path | Action |
| --- | --- | --- |
| 13 | `engine/ad-intel/push-flex-concepts.mjs` | **Moved** to `projects/siraj/scripts/push-flex-concepts.mjs`. This was always a Siraj-specific one-off (7 hand-authored Summer Flex concepts pushed to Airtable). Now lives in a project-scoped folder. Header comment updated to flag it as project-specific. |

---

## D · Cross-project state leakage in React (FIXED)

> **Bug:** When the user picked a different project from the dropdown,
> `loadProjectAsContext` set `activeProject` + `projectContext` + `sector`
> but **left the previous project's analysis data in component state.**
> Users would see Siraj's jobs + outcomes + entry-recs + ad-intel + debug
> log on the new project's dashboard until they clicked Run Analysis.

### State that should have been per-project (and now is)

| State | Used for |
| --- | --- |
| `data` | Pass 1+2 jobs+outcomes |
| `activeJob` | Currently focused job |
| `entryRecs` | Pass 4 recommendations |
| `positioningSpine` | Pass 4 positioning |
| `searchVolumeData` | Pass 3 + SerpAPI cache |
| `adIntelData` | Ad-Intel Stage A→D output |
| `adIntelPhase` | Ad-Intel progress label |
| `stratDocPhase` | Strategy doc progress label |
| `debugLog` | Per-run event log |
| `error` | Per-run error |
| `view` | Active tab (entry/adintel/landscape/etc.) |
| `phase` | Run-Analysis progress label |

### Fix

New `resetProjectScopedState()` callback in `App.jsx` clears all the
above. It runs **inside three trigger paths**:

1. `loadProjectAsContext(project)` — runs reset before applying the new
   project's context. Switching projects starts cold.
2. Project picker's `Clear` button — full reset.
3. Sidebar `+ New Research` button — full reset.

User-scoped state (`config`, `projects` list, `sessions` list) is
correctly left intact across project switches.

---

## E · NOT a leak — keep as-is

| Item | Why it's fine |
| --- | --- |
| `siraj-strategy/` folder at repo root | One project's deployed deliverable. In a private repo this is fine. Optionally move to `projects/siraj/` later. |
| `phase1-strategy-v[1-5].html` files at repo root | Siraj's iteration history. Same as above. |
| `tribe-raw.json` at repo root | Siraj's creator-research raw output. Same. |
| `session-index.html` at repo root | Single-page link map of Siraj session deliverables. Same. |
| `engine/research/TRIBE-BRAINLM-RND.md` mentions of Siraj | R&D doc, not on the execution path. Discusses Siraj as the test brand the eventual TRIBE system was prototyped against. |
| CHANGELOG.md entries reference Siraj | Release-note history, accurate by definition. Never edit history. |
| Obsidian vault references Siraj as test brand | Vault correctly documents Siraj as the first brand the engine was tested against. Brand-agnostic phrasing already. |

---

## F · Project Isolation Invariants (forward-looking rules)

These rules **MUST** be honored by all future passes + features. They are
also added to the vault's `13 - Roadmap & Backlog.md` under a new section.

1. **Airtable:** every record except `projects` must have a `project_id`
   foreign key.
2. **localStorage:** project-scoped keys use the prefix
   `alchemy:${projectId}:`. Global / user-scoped keys (API keys) are
   exempt.
3. **React state:** project switch via `loadProjectAsContext` (or any
   future `handleProjectChange` equivalent) MUST call
   `resetProjectScopedState` to clear all project-scoped state. The
   only state that may survive a project switch is user-scoped
   (`config`, `projects` list, `sessions` list).
4. **Future Pattern B (`brand_memory`):** Airtable field on the
   `projects` table — naturally per-project. No special handling needed.
5. **Future Pattern D (FTS5 recall):** every query MUST include
   `WHERE project_id = ?`. No pooled cross-project recall.
6. **Future Pass 15 retrospective / trajectory data:** localStorage key
   is `alchemy:${projectId}:trajectories`. Never `alchemy:trajectories`.
7. **Future Pattern G (DSPy compile):** training data must be filterable
   by `project_id`. Never compile a prompt against pooled cross-project
   data without explicit user opt-in (which itself must be project-scoped).
8. **Skill files (Pattern A):** GLOBAL — they describe pass methodology,
   not project data. Exempt from isolation.
9. **API keys in localStorage:** USER-SCOPED, never project-scoped.
   Exempt from isolation.
10. **Engine CLI defaults:** every script in `engine/` that takes a
    `project_id` MUST require it explicitly. No fallback to any specific
    brand's identifier. Where context strings or brand-specific data
    are needed, accept via env var (`PROJECT_CONTEXT`,
    `PROJECT_BRAND_NAME`, etc.) and emit a usage message if missing.

---

## G · Verification

After v1.6.5:

```
$ grep -rn 'siraj\|Siraj' src/ engine/ | grep -v node_modules | grep -v '\.md:'
(no results)
```

Every Siraj reference left in the repo is in:
- Historical artifacts (CHANGELOG, deliverable HTML files, R&D docs)
- The vault documentation (where Siraj is correctly named as the test brand)
- The `projects/siraj/` partition (where Siraj-specific scripts now live)

The engine itself ships brand-agnostic.

---

## See also

- `CHANGELOG.md` v1.6.5 entry
- Vault: `13 - Roadmap & Backlog.md` → `## 🔒 Project Isolation Invariants`
