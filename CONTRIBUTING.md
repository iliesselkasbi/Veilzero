# Contributing

Thanks for helping improve VEILZERO. Keep changes focused, preserve the
client-side privacy model, and describe user-visible effects clearly.

## Workflow

1. Open or find an issue describing the problem or proposed change.
2. For substantial work, agree on scope before implementation.
3. Create a branch from `main` and make a focused change.
4. Run `npm ci`, `npm run lint`, `npm run typecheck`, and `npm run build`.
5. Open a pull request against `main`, link the issue, and complete the PR
   checklist.
6. Address review feedback and wait for CI to pass before merge.

Use the issue forms for reproducible bugs and focused feature requests. Group
related work into GitHub milestones when planning a release or iteration. See
the [Agile workflow guide](docs/wiki/Agile-Workflow.md).

## Privacy and safety

- Keep camera, microphone, and file processing in the browser unless a change
  explicitly documents and justifies a different design.
- Never add telemetry or upload user content without clear user consent.
- Do not include real personal media, credentials, or secrets in issues,
  commits, or tests.
- Describe the limits of privacy protections honestly; do not claim guaranteed
  anonymity.
