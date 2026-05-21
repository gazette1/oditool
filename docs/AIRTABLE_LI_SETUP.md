# LI-Intel Airtable Schema Setup (v1.7.5)

This document describes the 4 Airtable tables the LI-Intel CLI sub-pipeline reads/writes. They live in the **same base** as the engine's existing 17 tables (`AIRTABLE_BASE_ID` in `.env.local`), or optionally a separate base if you set a different `AIRTABLE_BASE_ID` in the `engine/li-intel/` env scope.

Field names are case-sensitive — they must match exactly. Field types must match for the scrapers to read/write correctly.

---

## Table 1: `LI Profiles`

Monitored LinkedIn profiles. The scrape pipeline pulls from here.

| Field | Type | Notes |
|---|---|---|
| Profile URL | Single line text | **Primary field.** Full LinkedIn URL (e.g. `https://www.linkedin.com/in/username`). Used as the join key. |
| Enabled | Checkbox | Only profiles with this checked get scraped. |
| Description | Long text | Free-form notes on why you're monitoring this profile. |
| Category | Single select | Optional grouping (e.g. "Competitor", "Customer", "Influencer"). |
| Webhooks | Long text | Optional JSON string of webhook URLs to ping after engagement scrape. |
| Created At | Created time | Auto. |

---

## Table 2: `LI Posts`

Posts scraped from monitored profiles.

| Field | Type | Notes |
|---|---|---|
| Post URL | Single line text | **Primary field.** Used as the dedupe key. |
| Post Text | Long text | |
| Profile | Link to `LI Profiles` | Single-select link. The monitored profile this post came from. |
| Posted At | Date (include time) | Original LinkedIn post timestamp. |
| Post ID | Single line text | Last segment of the LinkedIn URN. |
| Status | Single select | Options: `PENDING`, `PROCESSING`, `PROCESSED - 1`, `ERROR`. New rows default to `PENDING`. |
| Created At | Created time | Auto. Used by the engager scraper to decide which posts are eligible. |
| Updated At | Last modified time | Auto. |

---

## Table 3: `LI Engagers`

Enriched profiles of people who liked or commented on tracked posts.

| Field | Type | Notes |
|---|---|---|
| Profile URL | Single line text | **Primary field.** |
| Full Name | Single line text | |
| First Name | Single line text | |
| Last Name | Single line text | |
| Headline | Long text | |
| Company Name | Single line text | |
| Company LinkedIn URL | URL | |
| Location | Single line text | |
| Connections | Number (integer) | |
| Followers | Number (integer) | |
| About | Long text | |
| Public Identifier | Single line text | |
| URN | Single line text | LinkedIn URN. Used for enrichment dedupe. |
| Skills | Long text | JSON string. |
| Experience | Long text | JSON string. |
| Education | Long text | JSON string. |
| Parent Profile | Link to `LI Profiles` | The monitored profile whose post this engager engaged with. Allow multiple. |
| Engagement Type | Single select | `reaction`, `comment`, `comment_reply`. |
| Engagement Value | Long text | Reaction emoji or full comment text from the first engagement seen. |
| Last Enriched At | Date (include time) | |
| Lead Score | Formula | See below. |

### `Lead Score` formula (Hot / Warm / Cold)

Paste this into the formula field. Tune thresholds and title keywords for your ICP:

```
IF(
  AND(
    {Connections} >= 500,
    OR(
      SEARCH("CEO", {Headline}),
      SEARCH("Founder", {Headline}),
      SEARCH("Owner", {Headline}),
      SEARCH("Partner", {Headline}),
      SEARCH("Principal", {Headline}),
      SEARCH("Director", {Headline}),
      SEARCH("VP", {Headline}),
      SEARCH("Head of", {Headline})
    )
  ),
  "🔥 Hot",
  IF(
    OR({Connections} >= 500, {Followers} >= 1000),
    "🌡 Warm",
    "❄️ Cold"
  )
)
```

---

## Table 4: `LI Engagements`

Many-to-many link between engagers and posts. One row per (engager, post) pair.

| Field | Type | Notes |
|---|---|---|
| Engagement Key | Formula: `{Engager URL} & " — " & {Post URL Ref}` | **Primary field.** Makes the row identifiable in views. |
| Engager | Link to `LI Engagers` | |
| Post | Link to `LI Posts` | |
| Engager URL | Single line text | Denormalized for cheap dedup lookups via `filterByFormula`. Set by the script. |
| Post URL Ref | Single line text | Denormalized for cheap dedup lookups. Set by the script. |
| Post Text | Long text | Denormalized snapshot of the post body at engagement time. Used for keyword search across engagements. |
| Monitored Profile | Link to `LI Profiles` | Same as the post's Profile field. Convenient for rollups. |
| Engagement Type | Single select | `reaction`, `comment`, `comment_reply`, `like`. |
| Engagement Value | Long text | Reaction emoji or comment text. |
| Engaged At | Date (include time) | |
| Created At | Created time | Auto. |

---

## Useful Airtable views

- **Hot Leads · engagers grouped by company** → on `LI Engagers`, group by Lead Score · then Company Name. Get a list of which companies are engaging most. This is where B2B SaaS prospecting starts.
- **Recent engagements · last 7 days** → on `LI Engagements`, filter `IS_AFTER({Engaged At}, DATEADD(NOW(), -7, 'days'))`.
- **Keyword search across engagements** → on `LI Engagements`, create a view filtered by `FIND(LOWER("your keyword"), LOWER({Post Text}))`. Useful for finding people who engaged with topic X.
- **Engagers grouped by person** → on `LI Engagers`, use the auto-generated inverse linked field from `LI Engagements` (counted via a `COUNT()` rollup). Sort descending = your warmest top-of-funnel.

---

## Realtime · Airtable Automations

If you need push notifications when new engagers land, set up an Airtable Automation:
- Trigger: "When record created in `LI Engagers`"
- Action: "Send webhook" (or "Run script") → POST to your endpoint

The webhook fires whenever the LI-Intel pipeline writes a new engager. Useful for piping hot leads into Slack, a CRM, or a custom dashboard without standing up a separate API server.

---

## Source

Schema vendored from `C:\Users\harri\Documents\Marketing Bot\files\AIRTABLE_SETUP.md` on v1.7.5 (2026-05-21). Original CLI scripts: `engine/li-intel/scrape-posts.js`, `engine/li-intel/scrape-engagers.js`, `engine/li-intel/run-all.js`.
