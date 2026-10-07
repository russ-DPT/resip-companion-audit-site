# Locking the analysis plan (release procedure)

The point of a release is to prove that the analysis was fixed **before any
outcome data existed**. Do this once, before the first participant enrolls.

## Before tagging

1. Faculty advisor (and, if wanted, the NMC statistician) reviews
   `src/lib/analysis/plan.ts`, the plan page of the audit site, and the
   simulated report on the audit site's Demo page.
2. Confirm the plan matches the Analysis section of the approved proposal.
3. Run `npm run check` and `npm run crosscheck`; both must pass.
4. Set `lockedOn` in `plan.ts` to the release date and update `CHANGELOG.md`.

## Tag and publish

```
git tag -a v1.0.0 -m "LKM-SNF-2026-SAP v1.0.0: analysis plan locked before data collection"
git push origin main --tags
```

Then create a GitHub release for `v1.0.0` and attach
`validation/cross-check-results.json` from the CI run.

## Record the lock

- Export the engine from the tag and give it to ReSIP:
  `git checkout v1.0.0 && npm run export:engine -- ../engine-v1.0.0 <repo URL>`.
  The manifest must show `sourceTag: "v1.0.0"`.
- Add the tag and full commit SHA to the ReSIP wiki's Analysis page and to
  the study's IRB paperwork page.
- Optionally email the tag URL and SHA to the faculty advisor, so a
  dated third-party record exists outside GitHub.

## Branch protection (recommended)

In GitHub settings for `main`: require pull requests, require the CI checks
to pass, and add a tag protection rule for `v*` so released tags cannot be
moved or deleted.

## After data collection begins

No change to `plan.ts` or `stats.ts`, `scoring.ts`, `engine.ts`. Bug fixes
that change any result require a protocol amendment, a new version
(`1.0.1` or `1.1.0`), a CHANGELOG entry explaining the reason, and a note in
the final report. Documentation-only changes do not change the version.
