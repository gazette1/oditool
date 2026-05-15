---
pass_id: 6
pass_name: validatePositioning
version: 1.1.0
deps: [PASS_04]
quality_metric: "No claim without citation · violations array surfaces unanchored positioning lines"
---

# Pass 6 · `validatePositioning`

Pure-JS validator · no LLM call · enforces the no-claim-without-citation rule.

## Renders as
No section — internal validator.

## Dependencies
- PASS_04

## Cost
~$0.05-0.10 in Anthropic spend · single call · ~10-30s wall time.

## Quality metric
`No claim without citation · violations array surfaces unanchored positioning lines`

---
*Pattern A · skill file metadata · machine-readable frontmatter feeds future runtime validators + DSPy-style optimizers.*
