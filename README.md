# ODI Research Tool — Alchemical Growth Engine Mode 1

Outcome-Driven Innovation research tool built on Tony Ulwick's methodology. Discovers all Jobs-to-be-Done in a sector, maps them through the Universal Job Map, generates Desired Outcome Statements, scores with the Opportunity Algorithm, and validates against real search demand.

## What It Does

1. **Discover Core Functional Jobs** — Claude identifies 6-10 core jobs in your sector using Ulwick's format (verb + object + context), plus related/emotional/social/consumption chain jobs
2. **Universal Job Map** — Each job is broken into 8 process steps (Define → Locate → Prepare → Confirm → Execute → Monitor → Modify → Conclude)
3. **Desired Outcome Statements** — "Minimize the time/likelihood that..." format, scored with Importance and Satisfaction
4. **Opportunity Algorithm** — `Score = Importance + max(Importance - Satisfaction, 0)`. Score ≥ 10 = underserved opportunity
5. **Search Validation** — Validated against real Google search data (via SerpAPI or Claude web search)
6. **Airtable Persistence** — All results saved to Airtable for team access and future reference

## Quick Start

```bash
# Clone and install
cd odi-research-tool
npm install

# Configure
cp .env.example .env
# Edit .env — at minimum set VITE_ANTHROPIC_API_KEY

# Run
npm run dev
```

Open http://localhost:3000. Click ⚙ Config to enter API keys (stored in localStorage).

## Airtable Setup

1. Create a new Airtable base
2. Create these tables with the exact field names:

### Table: Research Sessions
| Field | Type |
|-------|------|
| session_id | Single line text (primary) |
| sector | Single line text |
| created_at | Date |
| status | Single select: running, complete, error, archived |
| summary | Long text |

### Table: Core Jobs
| Field | Type |
|-------|------|
| job_id | Single line text (primary) |
| session_id | Link to Research Sessions |
| job_statement | Single line text |
| job_executor | Single line text |
| related_jobs | Long text (JSON) |
| emotional_jobs | Long text (JSON) |
| social_jobs | Long text (JSON) |
| consumption_chain_jobs | Long text (JSON) |
| search_volume_signal | Number |
| trend | Single select: rising, stable, declining |
| competition | Single select: low, medium, high |
| top_keyword | Single line text |
| evidence | Long text |

### Table: Desired Outcomes
| Field | Type |
|-------|------|
| outcome_id | Single line text (primary) |
| job_id | Link to Core Jobs |
| step | Single select: Define, Locate, Prepare, Confirm, Execute, Monitor, Modify, Conclude |
| statement | Long text |
| importance | Number (1 decimal) |
| satisfaction | Number (1 decimal) |
| opportunity_score | Number (1 decimal) |
| search_volume | Number |
| cpc | Currency |
| monthly_searches | Number |

### Table: Entry Recommendations
| Field | Type |
|-------|------|
| rec_id | Single line text (primary) |
| session_id | Link to Research Sessions |
| rank | Number |
| strategy | Single select: Differentiated, Dominant, Disruptive, Discrete, Sustaining |
| target_job_id | Link to Core Jobs |
| target_outcomes | Long text (JSON) |
| rationale | Long text |
| estimated_difficulty | Single select: low, medium, high |
| estimated_market_signal | Number |
| first_move | Long text |
| belief_change_required | Long text |
| risk | Long text |

### Table: Search Volume Data
| Field | Type |
|-------|------|
| keyword_id | Single line text (primary) |
| job_id | Link to Core Jobs |
| keyword | Single line text |
| monthly_volume | Number |
| cpc | Currency |
| competition_index | Number |
| trend_data | Long text (JSON) |
| fetched_at | Date |

## Search Volume Providers

| Provider | Cost | Data Quality | Setup |
|----------|------|-------------|-------|
| Claude (default) | Free (uses API calls) | Estimated from web search | Just needs Anthropic key |
| SerpAPI | $50/mo | Real Google data, CPC, competition | [serpapi.com](https://serpapi.com) |
| DataForSEO | Pay-per-use | Google Ads Keyword Planner data | [dataforseo.com](https://dataforseo.com) |

## Deploy to Vercel

```bash
npm run build
npx vercel --prod
```

Set environment variables in Vercel dashboard → Settings → Environment Variables.

## Deploy to Netlify

```bash
npm run build
npx netlify deploy --prod --dir dist
```

## Architecture

```
src/
├── App.jsx              # Main UI — session management, all views
├── lib/
│   ├── airtable.js      # Airtable CRUD — sessions, jobs, outcomes, search data
│   ├── anthropic.js     # 3-pass Claude analysis (discover, map, validate)
│   └── search-volume.js # Pluggable search provider (SerpAPI, DataForSEO, Claude)
└── main.jsx
```

## Methodology Reference

Based on Tony Ulwick's *Jobs to be Done: Theory to Practice* (2016):
- **Opportunity Algorithm**: `importance + max(importance - satisfaction, 0)`
- **Universal Job Map**: 8 steps every job follows
- **Desired Outcome Statement**: `Minimize the [time/likelihood] that [metric] [context]`
- **Six Need Types**: Core functional job, desired outcomes, related jobs, emotional jobs, social jobs, consumption chain jobs, financial outcomes
