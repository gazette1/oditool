---
pass_id: 0
pass_name: summarizeProjectContext
version: 1.6.11
deps: []
quality_metric: "6-12 key facts · all defensible against source quotes · no invention"
---

# Pass 0 · `summarizeProjectContext`

Reads raw text from uploaded files + scraped URLs · produces structured Project Context object every downstream pass anchors to.

## Renders as
No section — feeds projectContext to all downstream passes.

## Dependencies
(none · runs against raw input)

## Cost
~$0.05-0.10 in Anthropic spend · single call · ~10-30s wall time.

## Quality metric
`6-12 key facts · all defensible against source quotes · no invention`

---
*Pattern A · skill file metadata · machine-readable frontmatter feeds future runtime validators + DSPy-style optimizers.*
