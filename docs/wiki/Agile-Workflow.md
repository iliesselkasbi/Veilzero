# Agile workflow

This project uses a lightweight, issue-driven process. Prefer small changes
that can be reviewed and verified independently.

## Backlog and planning

- Use the bug report form for reproducible defects and the feature request form
  for focused user needs.
- Keep each issue scoped to one outcome; include reproduction steps or
  acceptance criteria.
- Use GitHub labels to group related work and milestones to collect work for a
  release or iteration.
- Prioritize privacy, correctness, accessibility, and user-visible reliability.
- Confirm scope on substantial changes before implementation.

## Delivery

1. Branch from `main`; use a short descriptive branch name.
2. Link the issue from the pull request and explain the change and tradeoffs.
3. Keep the pull request focused; split unrelated changes into separate work.
4. Run lint, typecheck, and production build locally.
5. Review the CI result and resolve feedback before merging to `main`.

## Definition of done

- The issue's acceptance criteria are met and relevant behavior is verified.
- Lint, typecheck, and production build pass.
- User-facing behavior, permissions, and errors are clear.
- Privacy implications are reviewed; no sensitive content or secrets are added.
- Related README or wiki guidance is updated.
- The pull request is reviewed and CI is green.
