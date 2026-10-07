# Changelog

All notable changes are recorded here. The analysis plan version and the
engine version are reported in every results file and audit bundle.

## 1.0.0 (unreleased; tag before data collection begins)

- Locked statistical analysis plan LKM-SNF-2026-SAP v1.0.0.
- CBI scoring per NFA rules; Shapiro-Wilk, paired t, Wilcoxon signed-rank
  (exact or normal approximation), Hodges-Lehmann CI, Holm adjustment.
- Audit bundle with SHA-256 manifest; independent Python and R reproductions;
  SPSS syntax for manual cross-check.
- Public audit site (Next.js 16) with in-browser bundle verifier and a
  working demo of the ReSIP Analysis page on simulated data.
- `export:engine` script: verbatim engine copy with SHA-256 manifest for
  embedding in ReSIP (the ReSIP integration is maintained separately).
