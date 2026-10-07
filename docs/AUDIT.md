# Audit bundle format (`resip-analysis-audit/1`)

A zip file with the following entries. All text is UTF-8. CSV files use a
header row, comma separators and blank cells for missing values.

| Entry | Contents |
| --- | --- |
| `manifest.json` | `format`, `studyCode`, `simulated`, `planId`, `planVersion`, `engineVersion`, `sourceCommit`, `generatedAt`, `generatedByRole`, `resultsDigest` (SHA-256 of canonical JSON of the results), `files` (SHA-256 of every other entry) |
| `plan.json` | The analysis plan object |
| `results.json` | The full report with no small-count suppression |
| `data/participants.csv` | `study_id`, `status` |
| `data/responses.csv` | `study_id`, `timepoint` (pre, post, followup), `submitted_at`, `item_01` to `item_19` (option position 1 to 5), `c1` to `c3` (1 yes, 0 no, blank skipped), `platform_personal`, `platform_work`, `platform_patient` |
| `data/sessions.csv` | `study_id`, `study_day` (1 to 30), `method` (auto, button) |
| `data/scores_wide.csv` | `study_id` and nine subscale score columns (`personal_pre` ... `patient_followup`) |
| `README.md` | Instructions for the auditor |
| `audit/reproduce.py`, `audit/reproduce.R`, `audit/reproduce.sps` | Reproduction scripts |

Excluded by design: names, contact details, signatures, IP addresses,
access tokens, dates of birth, and the optional free-text context
descriptions.

Canonical JSON: object keys sorted, no whitespace, `NaN` and infinities as
`null`. The zip itself uses fixed timestamps and sorted entries, so the same
bundle contents always produce the same zip.
