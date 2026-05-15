---
pass_id: 4
pass_name: generateEntryRecommendations
version: 1.6.0
deps: [PASS_03]
quality_metric: "positioning_spine.primary anchored to highest-scoring outcome · top-3 entry recs · each cites job_id + score"
---

# Pass 4 · `generateEntryRecommendations`

Produces the positioning spine + top-3 ranked entry strategies. The strategic core of the run.

## Renders as
§01 Positioning · §08 Entry wedge.

## Dependencies
- PASS_03

## Cost
~$0.05-0.10 in Anthropic spend · single call · ~10-30s wall time.

## Quality metric
`positioning_spine.primary anchored to highest-scoring outcome · top-3 entry recs · each cites job_id + score`

---
*Pattern A · skill file metadata · machine-readable frontmatter feeds future runtime validators + DSPy-style optimizers.*
