// The locked statistical analysis plan for LKM-SNF-2026.
// Every value here is reported in the output and in the audit manifest.
// Change nothing in this file after data collection begins without a
// documented protocol amendment; bump ANALYSIS_PLAN.version if you do.

export const ANALYSIS_PLAN = {
  id: "LKM-SNF-2026-SAP",
  version: "1.0.0",
  lockedOn: "2026-10-07",
  engineVersion: "1.0.0",
  outcome: "Copenhagen Burnout Inventory subscale scores (0 to 100)",
  scoring: {
    itemScores: [100, 75, 50, 25, 0],
    reverseScoredItems: [13],
    subscaleItems: {
      personal: [1, 2, 3, 4, 5, 6],
      work: [7, 8, 9, 10, 11, 12, 13],
      patient: [14, 15, 16, 17, 18, 19],
    },
    minimumItemsAnswered: { personal: 3, work: 4, patient: 3 },
    platformScoreTolerance: 0.01,
  },
  comparisons: [
    { id: "T1-T2", from: "pre", to: "post", role: "primary" },
    { id: "T1-T3", from: "pre", to: "followup", role: "secondary" },
  ],
  testSelection:
    "Shapiro-Wilk on paired differences; paired-samples t test if p >= .05, otherwise Wilcoxon signed-rank test",
  normalityAlpha: 0.05,
  alpha: 0.05,
  multiplicity: "Holm-Bonferroni across the three subscales within each comparison",
  wilcoxon: {
    zeroDifferences: "discarded (Wilcoxon method)",
    pValue:
      "exact when no ties or zero differences and n <= 50; otherwise normal approximation with tie correction, no continuity correction",
  },
  effectSizes: {
    pairedT: "Cohen's dz = mean difference / SD of differences; approximate 95% CI using SE = sqrt(1/n + dz^2 / (2n))",
    wilcoxon: "r = |z| / sqrt(n non-zero pairs); Hodges-Lehmann median difference with exact 95% CI from Walsh averages",
  },
  meaningfulIndividualChange: 5,
  adherence: { minimumSessions: 12, weeklyTarget: 3, weeks: [[1, 7], [8, 14], [15, 21], [22, 30]] },
  missingData: "No imputation; subscale non-responders excluded; pairwise complete cases per comparison",
  minimumReportableGroup: 5,
  outcomeMetRule:
    "Mean subscale score lower at T2 than T1 and Holm-adjusted p < .05; sustained if T1 to T3 meets the same rule",
} as const;

export type AnalysisPlan = typeof ANALYSIS_PLAN;
