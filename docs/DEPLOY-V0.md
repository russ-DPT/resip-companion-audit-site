# Deploying the audit site and demo with v0.app

This repository is a Next.js 16 app. Deployed, it gives you two things at
one address:

- the **public audit site**: overview, locked analysis plan, validation
  results, in-browser bundle verifier and audit instructions;
- the **demo** (`/demo`): a working copy of the ReSIP Analysis page that runs
  the real analysis software on simulated participants, with every download
  (report, CSV, JSON, audit bundle), the role views and the locked state.

Neither part has access to ReSIP or to any participant data. The demo only
ever analyses data it simulates itself.

Time needed: about 20 minutes.

---

## Before you start

You need:

- a GitHub account (the repository will live there);
- a v0.app account signed in with the same Vercel team that hosts ReSIP;
- the `resip-analysis.zip` file, unzipped on your computer.

## Step 1. Put the code on GitHub

The unzipped folder is already a git repository with one commit.

**Option A, GitHub Desktop (no command line).**
1. Open GitHub Desktop, choose **File > Add Local Repository**, and select
   the unzipped `resip-analysis` folder.
2. Click **Publish repository**. Name it `resip-analysis`.
3. Leave **Keep this code private** unticked if you want auditors to read the
   code (recommended). Public is safe: the repository holds no participant
   data.

**Option B, command line.**
```
cd resip-analysis
git remote add origin https://github.com/<your-account>/resip-analysis.git
git push -u origin main
```
(Create the empty `resip-analysis` repository on github.com first, without a
README.)

After pushing, open the repository's **Actions** tab. The CI workflow runs the
unit tests, the Next.js build, and the independent Python and R
reproduction. Wait for a green check before deploying.

## Step 2. Import into v0

1. Go to v0.app and start a new project by **importing from GitHub**.
2. Choose the `resip-analysis` repository and the `main` branch.
3. v0 detects Next.js. No settings need changing: the build runs
   `npm run build`, which first copies the audit scripts into place
   (`prebuild`) and then builds the site.
4. Let the preview load. Click through Overview, Analysis plan, Validation,
   Verify, Audit instructions and Demo.

If v0's import screen looks different from this description, the same
result comes from Vercel directly: **Vercel dashboard > Add New > Project >
Import** the GitHub repository, framework preset **Next.js**, no other
settings. v0 can then open the same Vercel project for editing.

## Step 3. Set two environment variables

In the project's environment variable settings (in v0 or in the Vercel
dashboard under **Settings > Environment Variables**), add:

| Name | Value | Used for |
| --- | --- | --- |
| `NEXT_PUBLIC_ANALYSIS_REPO_URL` | `https://github.com/<your-account>/resip-analysis` | "source code" links on every page |

Vercel supplies `VERCEL_GIT_COMMIT_SHA` automatically. Every page footer and
every demo bundle record it, so a reader can match the live site to an exact
commit. Redeploy after adding the variable.

## Step 4. Publish

Deploy (publish) to production from v0 or Vercel. Optional: add a domain such
as `audit.resip.science` under the project's **Domains** settings.

## Step 5. Check the live site (5 minutes)

1. **Footer** shows plan v1.0.0, engine v1.0.0 and a commit id.
2. **Validation**: every row green, and the cross-check table shows 40 of 40
   for Python and R.
3. **Demo**: the report loads. Change "View as" to Principal Investigator:
   small counts become `<5` and the audit bundle link disappears. Change
   "Data collection" to Still open: the page shows **Locked**.
4. **Verify**: as Research Advisor on the Demo page, download the audit
   bundle, then choose it on the Verify page. The verdict reads "Verified".
5. **Security headers**: in a terminal,
   `curl -sI https://<your-site>/verify` should show
   `Content-Security-Policy` ending in `connect-src 'none'`, plus
   `Strict-Transport-Security`, `X-Content-Type-Options: nosniff` and
   `Referrer-Policy: no-referrer`.

## Step 6. Connect it to ReSIP

In the ReSIP project, set `NEXT_PUBLIC_ANALYSIS_AUDIT_URL` to the live site
address. The ReSIP Analysis page then links to it. Record the address on the
ReSIP wiki's Analysis and audit page, together with the release date and the
repository URL.

## Using the demo with reviewers

Send reviewers (faculty advisor, committee, statistician, IRB) the `/demo`
address. It shows exactly what the study team will see after data collection
closes, using simulated participants, and lets them try the full audit. The
yellow SIMULATED DATA banner appears on every demo page and inside every demo
file.

## Editing the site in v0 safely

v0 can change the site's wording and layout. It must not change the
analysis. The repository's `AGENTS.md` tells AI tools which files are off
limits, and the CI checks fail if the statistics change. In practice:

- Ask v0 for changes to pages under `app/` and styles in `app/globals.css`
  only.
- Never let v0 edit `src/lib/analysis/`, `audit/`, `tests/` or `validation/`.
- If v0 commits to GitHub, open the commit and confirm only `app/` or
  `lib/site/` files changed, and that the CI check is green.
- Protect the `main` branch on GitHub (require the CI check) and protect the
  `v*` tags, as described in `docs/RELEASE.md`.

## Updating after a change

Push to `main` (or merge a pull request). Vercel rebuilds automatically. The
footer's commit id changes; the plan version changes only through the
release procedure in `docs/RELEASE.md`.
