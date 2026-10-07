# Instructions for AI coding tools (v0, Claude, Copilot and others)

This repository contains a **locked statistical analysis** for a research
study. Changing it after data collection begins would invalidate the study.

## Never modify

- `src/lib/analysis/` (the analysis engine and the locked plan)
- `audit/` (independent reproduction scripts shipped to auditors)
- `tests/` and `validation/` (reference values and cross-checks)

If a request seems to need a change in these folders, stop and explain why
instead of making it. The owner must make such changes through
`docs/RELEASE.md`.

## Safe to modify

- Page wording, layout and styles: `app/**/page.tsx`, `app/globals.css`,
  `lib/site/`
- Documentation in `docs/` (except the plan's numbers, which come from code)

## Rules for any change

- Never add analytics, trackers, external scripts, fonts or images from other
  domains. The Content Security Policy in `next.config.ts` must stay strict,
  and `/verify` must keep `connect-src 'none'`.
- Never add code that sends a file chosen on `/verify` anywhere.
- The `/demo` route and `/api/demo` must only use `simulateStudy`; never
  connect them to a database or to ReSIP.
- Do not use em dashes or en dashes in any text.
- Run `npm run check` before committing; it must pass.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
