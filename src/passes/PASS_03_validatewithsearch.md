---
pass_id: 3
pass_name: validateWithSearch
version: 1.6.0
deps: [PASS_02]
quality_metric: "Every job validated against live search · search_volume_signal 0-100 · trend rising/stable/declining"
---

# Pass 3 · `validateWithSearch`

Uses Claude web_search tool to confirm real-world demand for each discovered job.

## Renders as
Used by Pass 4 as the validation seed.

## Dependencies
- PASS_02

## Cost
~$0.05-0.10 in Anthropic spend · single call · ~10-30s wall time.

## Quality metric
`Every job validated against live search · search_volume_signal 0-100 · trend rising/stable/declining`

---
*Pattern A · skill file metadata · machine-readable frontmatter feeds future runtime validators + DSPy-style optimizers.*
