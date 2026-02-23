## What does this change do?

<!-- One-paragraph summary. -->

## User impact / migration notes

<!-- Does this change tool schemas, behavior, or defaults? If yes, describe. -->

## Security checklist

- [ ] Auth headers are not sent to non-Web2Labs domains
- [ ] File paths from external sources are sanitized (no path traversal)
- [ ] No secrets (API keys, tokens) appear in logs or tool output
- [ ] Paid/destructive actions go through spend policy or confirmation
- [ ] Network destinations are limited to Web2Labs API + local yt-dlp

## Tests run

- [ ] `npm test` (unit tests pass)
- [ ] `npm run test:integration` (if applicable)
- [ ] `npm run test:e2e` (if applicable)
- [ ] Manual smoke test (describe below if done)

## CHANGELOG

- [ ] Added entry under `## Unreleased` in CHANGELOG.md
