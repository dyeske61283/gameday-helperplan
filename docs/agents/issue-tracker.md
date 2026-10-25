# Issue Tracker: GitHub

GitHub Issues are the canonical issue tracker for this repository. Use the `gh` CLI for issue operations.

Dex tasks remain useful as a local planning and execution layer. Publish selected Dex tasks to GitHub Issues when shared labels, collaboration, or durable issue history are needed; do not assume continuous bidirectional synchronization.

## Conventions

- Create: `gh issue create --title "..." --body "..."`
- Read: `gh issue view <number> --comments`
- List: `gh issue list --state open --json number,title,body,labels,comments`
- Comment: `gh issue comment <number> --body "..."`
- Labels: `gh issue edit <number> --add-label "..."` or `--remove-label "..."`
- Close: `gh issue close <number> --comment "..."`

Infer the repository from `git remote -v`.

## Pull Requests As A Triage Surface

PRs as a request surface: no.

## Prototype Work

Prototype PRs and their `prototype/*` branches are evidence, not merge candidates. Keep prototype code out of `main`; retain the branch as a reference and link it from the follow-up implementation issue. Merge architectural decisions as ADRs. Record reversible product or UI choices in the implementation brief instead. Close the prototype PR and issue once the decision and follow-up are recorded.
