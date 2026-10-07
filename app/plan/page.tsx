import { ANALYSIS_PLAN as plan } from "@/src/lib/analysis/plan";

export const metadata = { title: "Analysis plan" };

const rows: [string, string][] = [
  ["Plan", `${plan.id}, version ${plan.version}, locked ${plan.lockedOn}`],
  ["Outcome", plan.outcome],
  ["Item scoring", `Response options scored ${plan.scoring.itemScores.join(", ")} in printed order; item ${plan.scoring.reverseScoredItems.join(", ")} reverse scored`],
  ["Subscales", `Personal: items ${plan.scoring.subscaleItems.personal.join(", ")}. Work-related: items ${plan.scoring.subscaleItems.work.join(", ")}. Patient-related: items ${plan.scoring.subscaleItems.patient.join(", ")}. Score = mean of answered items; no total score.`],
  ["Minimum items", `Personal ${plan.scoring.minimumItemsAnswered.personal} of 6, work-related ${plan.scoring.minimumItemsAnswered.work} of 7, patient-related ${plan.scoring.minimumItemsAnswered.patient} of 6; otherwise the subscale is missing`],
  ["Comparisons", plan.comparisons.map((c) => `${c.id} (${c.role})`).join("; ")],
  ["Test selection", plan.testSelection],
  ["Wilcoxon details", `${plan.wilcoxon.zeroDifferences}; ${plan.wilcoxon.pValue}`],
  ["Multiplicity", plan.multiplicity],
  ["Significance", `Two-tailed alpha ${plan.alpha}`],
  ["Effect sizes", `${plan.effectSizes.pairedT}. ${plan.effectSizes.wilcoxon}.`],
  ["Meaningful individual change", `A decrease of ${plan.meaningfulIndividualChange} or more points`],
  ["Adherence", `${plan.adherence.minimumSessions} or more recorded sessions over days 1 to 30; weekly target ${plan.adherence.weeklyTarget} sessions`],
  ["Missing data", plan.missingData],
  ["Small groups", `No statistic is reported for a group of fewer than ${plan.minimumReportableGroup}`],
  ["Outcome met", plan.outcomeMetRule],
];

export default function PlanPage() {
  return (
    <>
      <h1>Locked statistical analysis plan</h1>
      <p>
        This table is generated directly from the plan object the software uses, so it cannot drift from what the code does. The
        machine-readable copy is <a href="/downloads/plan.json">plan.json</a>.
      </p>
      <div className="wrap">
        <table>
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k}><th scope="row">{k}</th><td>{v}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>How the plan is protected</h2>
      <p>
        The plan is released as a tagged version of the source code before data collection begins. The tag date and commit identifier
        show that the plan existed before any outcome data did. Every results file and audit bundle records the plan version and the
        commit that produced it, and the study platform keeps a permanent log of each analysis run. Any change to the plan after data
        collection begins requires a documented protocol amendment and a new version number.
      </p>
    </>
  );
}
