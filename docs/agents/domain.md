# Domain Docs

How engineering skills consume this repo's domain documentation.

## Before exploring, read these

- `CONTEXT.md` at the repo root.
- Relevant architectural decision records in `docs/adr/`.

If these files do not exist, proceed silently. Do not flag their absence
or suggest creating them upfront. `/domain-modeling` creates them lazily
when terms or decisions are resolved.

## File structure

This repo uses a single-context layout:

- `/CONTEXT.md`: domain glossary and context.
- `/docs/adr/`: architectural decision records.
- `/src/`: application source.

## Use the glossary's vocabulary

When naming domain concepts in issue titles, refactor proposals,
hypotheses, or tests, use the terms defined in `CONTEXT.md`.
Avoid synonyms that the glossary explicitly excludes.

If a needed concept is missing, reconsider whether the project uses it.
Note real glossary gaps for `/domain-modeling`.

## Flag ADR conflicts

If a proposal contradicts an existing ADR, identify the conflict
explicitly and explain why the decision may deserve reopening.
