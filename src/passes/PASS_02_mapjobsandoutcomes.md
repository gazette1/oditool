---
pass_id: 2
pass_name: mapJobsAndOutcomes
version: 1.6.0
deps: [PASS_01]
quality_metric: "4-6 outcomes per job · Ulwick 'Minimize the time it takes to...' format · importance + satisfaction 1-10 · opportunity_score ≥10 = underserved"
---

# Pass 2 · `mapJobsAndOutcomes`

Per-job execution to avoid max_tokens truncation · maps each job to its desired-outcomes set.

## Renders as
§02 Evidence (jobs + outcomes merged with Pass 1).

## Dependencies
- PASS_01

## Cost
~$0.05-0.10 in Anthropic spend · single call · ~10-30s wall time.

## Quality metric
`4-6 outcomes per job · Ulwick 'Minimize the time it takes to...' format · importance + satisfaction 1-10 · opportunity_score ≥10 = underserved`

---
*Pattern A · skill file metadata · machine-readable frontmatter feeds future runtime validators + DSPy-style optimizers.*
