# ReSIP Analysis

Locked, validated and independently auditable statistical analysis for the
ReSIP study **LKM-SNF-2026** (Compassion Cultivation as a High-Leverage
Intervention for the Mitigation of Occupational Distress Syndrome (Burnout),
Nebraska Methodist College Doctoral Scholarly Project).

This repository is the **public audit site** and the **source of the
analysis engine**. It is deployed on its own (v0.app or Vercel) and never
touches participant data.

| Part | What it is |
| --- | --- |
| **Engine** (`src/lib/analysis`) | The locked analysis. Exported verbatim to ReSIP with `npm run export:engine` |
| **Audit site and demo** (`app/`, Next.js 16) | Plan, validation, in-browser bundle verifier, audit instructions, and a demo on simulated data |
| **Audit tools** (`audit/`, `validation/`) | Independent Python and R reproductions; validation fixtures and cross-check |

The ReSIP side (Analysis page, API route, access rules, wiki text) is a
**separate package** maintained in the ReSIP codebase. It contains an exact
copy of the engine plus `ENGINE-MANIFEST.json`, whose SHA-256 fingerprints
prove that copy matches a tagged release of this repository.

## What the engine does

It applies the locked statistical analysis plan in `src/lib/analysis/plan.ts`:

- scores the Copenhagen Burnout Inventory from raw responses using the NFA
  rules (reverse-scored item 13, minimum items per subscale, no total score)
  and checks the scores ReSIP stored;
- matches T1, T2 and T3 by Study ID and runs the primary (T1 to T2) and
  secondary (T1 to T3) comparisons for each subscale: Shapiro-Wilk on the
  differences, then a paired t test or a Wilcoxon signed-rank test, with
  Holm adjustment across the three subscales, effect sizes and 95% CIs;
- reports descriptive statistics, five-point individual change, adherence,
  the contextual disruption items, and descriptive subgroup comparisons;
- suppresses any statistic for a group of fewer than five, and (for every
  role except the Research Advisor) shows counts of 1 to 4 as `<5`;
- produces an **audit bundle**: de-identified data, the plan, the results, a
  SHA-256 manifest and independent reproduction scripts.

The same input always produces the same output. The engine has no
dependencies other than `fflate` (zip files).

## Independent audit

| Tool | What it proves |
| --- | --- |
| `audit/reproduce.py` (SciPy) | Every result can be recomputed from the raw data with a separate implementation |
| `audit/reproduce.R` (base R) | The same, in a second language with different statistical libraries |
| `audit/reproduce.sps` | Manual cross-check for a statistician using SPSS (not executed during development) |
| Public verifier page | The bundle has not been altered and its results reproduce exactly |
| `analysis_runs` table in ReSIP | Who generated which result, when, with which plan and code version |

See `audit/README.md` (shipped inside every bundle) and `docs/AUDIT.md`.

## Validation

- `npm test`: unit tests against reference values from SciPy and R
  (`tests/fixtures`, produced by `validation/make_fixtures.*`), plus scoring,
  determinism, suppression, access-rule and bundle-tampering tests.
- `npm run crosscheck`: builds 40 simulated studies and reproduces each one
  in Python and R. Results are written to `validation/cross-check-results.json`
  and shown on the audit site.
- CI (`.github/workflows/ci.yml`) runs all of the above on every push.

## Commands

```
npm ci                 # install
npm run dev            # run the audit site and demo locally (http://localhost:3000)
npm run check          # typecheck + tests + production build
npm run crosscheck     # end-to-end Python and R reproduction (needs python3+scipy, R+jsonlite)
npm run bundle:sim     # write a simulated audit bundle to out/
npm run export:engine -- <dir> <repoUrl>   # verbatim engine copy + manifest for ReSIP
```

## Documents

- `docs/RELEASE.md`: how to lock the plan (tag v1.0.0) before data collection.
- `docs/DEPLOY-V0.md`: step-by-step deployment of the audit site and demo
  with v0.app (or Vercel directly), and how to edit it safely in v0.
- `AGENTS.md`: rules for AI coding tools working in this repository.
- `docs/AUDIT.md`: the audit bundle format.

## Changing the plan

Do not change `plan.ts` or the statistical code after data collection begins
except through a documented protocol amendment approved by the faculty
advisor (and the IRB if required). Any change must bump the plan version,
be recorded in `CHANGELOG.md`, and be released under a new tag.
