# Issue tracker: Local Markdown

Issues and specs for this repo live as Markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Implementation issues are one file per ticket at
  `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`.
  Never combine tickets into one file.
- Triage state is recorded as a `Status:` line near the top of each issue.
  See `triage-labels.md` for the role strings.
- Comments and conversation history append under `## Comments`.

## When a skill says "publish to the issue tracker"

Create the appropriate spec or issue file under `.scratch/<feature-slug>/`,
creating directories as needed.

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user normally supplies the path
or issue number.

## Wayfinding operations

Used by `/wayfinder`. The map is a file with one child file per ticket.

- Map: `.scratch/<effort>/map.md`, containing Notes, Decisions-so-far, and Fog.
- Child ticket: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`.
  Put the question in the body. Record the type in a `Type:` line:
  `research`, `prototype`, `grilling`, or `task`.
  Record `claimed` or `resolved` in the `Status:` line.
- Blocking: add `Blocked by: NN, NN` near the top. A ticket is unblocked
  when every listed ticket is resolved.
- Frontier: scan for open, unblocked, unclaimed tickets; first by number wins.
- Claim: set `Status: claimed` and save before starting work.
- Resolve: append the answer under `## Answer`, set `Status: resolved`,
  and append a context pointer (summary and link) to Decisions-so-far
  in `map.md`.
