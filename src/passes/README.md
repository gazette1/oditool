# Skill Files (Pattern A · Engine v1.6.12)

One `PASS_XX_<name>.md` per pass in the engine, with YAML frontmatter declaring:

- `pass_id` · number
- `pass_name` · the exported function name in `src/lib/anthropic.js`
- `version` · engine version when the pass last changed
- `deps` · upstream passes this one consumes output from
- `quality_metric` · one-line acceptance bar the LLM output must hit

Body is human-readable: what the pass does, what section it renders as, dependencies, cost.

## Why
- **Machine-readable metadata** for future runtime validators (does output satisfy the schema?)
- **Future DSPy-style optimizers** (v1.8+) can use these as the skill spec and compile prompts against them
- **Documentation that doesn't drift** because engine surface and spec live next to each other

## NOT
- Not loaded by the engine at runtime (yet)
- Not used to generate prompts (yet) — prompts live in `src/lib/anthropic.js`
- Skill files are GLOBAL · they describe pass methodology not project data · exempt from project-isolation rules

## Count: 19 skill files

See also: `13 - Roadmap & Backlog.md` Hermes-Inspired Enhancements row #16.
