# Audit bundle: how to check these results

This bundle was produced by the ReSIP analysis module for one study. It
contains the de-identified data, the locked analysis plan, the results, and
three ways to check them that do not depend on ReSIP.

## Contents

| File | What it is |
| --- | --- |
| `manifest.json` | Bundle format, study code, plan and engine versions, source commit, when and by which role it was generated, and a SHA-256 fingerprint of every file |
| `plan.json` | The locked statistical analysis plan the results were produced under |
| `results.json` | The full results, with no small-number suppression |
| `data/participants.csv` | Study ID and final status (completed, declined, withdrawn, removed, active) |
| `data/responses.csv` | One row per survey: the 19 CBI responses as option positions 1 to 5 (1 = "Always" or "To a very high degree"), the three yes/no context items (1/0, blank = skipped), and the scores the platform stored |
| `data/sessions.csv` | One row per recorded practice session: Study ID, study day, recording method |
| `data/scores_wide.csv` | Subscale scores per participant and time point, for SPSS or JASP |
| `audit/reproduce.py` | Independent reproduction in Python with SciPy |
| `audit/reproduce.R` | Independent reproduction in R |
| `audit/reproduce.sps` | SPSS syntax for a manual cross-check (not executed during development) |

The data contain no names, contact details, dates of birth or free-text
answers. Participants are identified only by Study ID.

## Three levels of checking

1. **Integrity.** Open the public verifier page, choose this bundle (.zip),
   and it confirms every file matches its fingerprint in `manifest.json` and
   that re-running the analysis on the data gives exactly `results.json`.
   The file is read in your browser and is not uploaded anywhere.
2. **Independent reproduction.** Run either script from inside the unzipped
   bundle. Each re-scores the CBI from the raw responses, re-applies the plan,
   recomputes every statistic with standard statistical libraries, and prints
   PASS or FAIL for each value in `results.json`.

   ```
   python3 audit/reproduce.py        # needs numpy and scipy
   Rscript audit/reproduce.R         # needs the jsonlite package
   ```
3. **Manual cross-check.** Open `data/scores_wide.csv` in SPSS (with
   `audit/reproduce.sps`) or JASP, and compare the paired t, Wilcoxon and
   Shapiro-Wilk results with `results.json`. Holm adjustment must be applied
   by hand, as described at the end of the SPSS syntax.

## What a difference means

Small numeric differences (beyond the sixth decimal place) can come from
software rounding. A difference in a count, in which test was selected, or
in a p value beyond the stated tolerance should be reported to the faculty
advisor and the principal investigator before any result is used.
