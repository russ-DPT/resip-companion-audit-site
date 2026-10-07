// Renders a Report as self-contained HTML (screen and print) and as CSV.
// All values are escaped; the HTML contains no scripts.
import type { Count, Report } from "./engine";
import { SUBSCALES, SUBSCALE_LABEL, TIMEPOINTS, TIMEPOINT_LABEL } from "./types";

const esc = (s: unknown) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

const f = (x: number | null | undefined, d = 2) => (x === null || x === undefined || !Number.isFinite(x) ? "n/a" : x.toFixed(d));
const c = (x: Count) => String(x);
/** APA style p value: no leading zero, three decimals, "< .001". */
export function apaP(p: number | null | undefined): string {
  if (p === null || p === undefined || !Number.isFinite(p)) return "n/a";
  if (p < 0.001) return "< .001";
  return p.toFixed(3).replace(/^0/, "");
}
const yn = (b: boolean | null) => (b === null ? "Not reportable" : b ? "Yes" : "No");
const SUPP = "Fewer than 5; not reported";

function table(caption: string, head: string[], rows: string[][], note?: string) {
  return `<figure class="t"><figcaption>${esc(caption)}</figcaption><table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((v, i) => (i === 0 ? `<th scope="row">${esc(v)}</th>` : `<td>${esc(v)}</td>`)).join("")}</tr>`)
    .join("")}</tbody></table>${note ? `<p class="note"><em>Note.</em> ${esc(note)}</p>` : ""}</figure>`;
}

export function renderReportHtml(r: Report, opts: { generatedAt?: string } = {}): string {
  const parts: string[] = [];
  if (r.simulated) parts.push(`<p class="banner">SIMULATED DATA. These results do not describe any real participant.</p>`);
  parts.push(`<h1>Analysis report: ${esc(r.studyCode)}</h1>`);
  parts.push(
    `<p class="meta">Analysis plan ${esc(r.plan.id)} version ${esc(r.plan.version)}, locked ${esc(r.plan.lockedOn)}. Engine ${esc(r.plan.engineVersion)}.${
      opts.generatedAt ? ` Generated ${esc(opts.generatedAt)}.` : ""
    }${r.smallCountsSuppressed ? " Counts from 1 to 4 are shown as &lt;5." : ""}</p>`,
  );

  // Outcome summary
  parts.push(`<h2>Outcome summary</h2>`);
  parts.push(
    table(
      "Primary outcome by burnout domain",
      ["Domain", "Outcome met (T1 to T2)", "Sustained (T1 to T3)"],
      SUBSCALES.map((s) => [SUBSCALE_LABEL[s], yn(r.outcome[s].met), yn(r.outcome[s].sustained)]),
      "Met = mean score lower at T2 than T1 with Holm-adjusted p < .05. Sustained = the same rule also met from T1 to T3. In a pilot, effect sizes and confidence intervals are the principal result.",
    ),
  );

  // Flow
  parts.push(`<h2>Participant flow and data checks</h2>`);
  parts.push(
    table("Participant flow", ["Measure", "Count"], [
      ["Enrolled", c(r.flow.enrolled)],
      ...TIMEPOINTS.map((tp) => [`Completed ${TIMEPOINT_LABEL[tp]}`, c(r.flow.completed[tp])]),
      ["Final status: completed", c(r.flow.status.completed)],
      ["Final status: declined to continue", c(r.flow.status.declined)],
      ["Final status: withdrawn", c(r.flow.status.withdrawn)],
      ["Final status: removed", c(r.flow.status.removed)],
      ["Final status: still active", c(r.flow.status.active)],
    ]),
  );
  const dc = r.dataChecks;
  parts.push(
    table("Data checks", ["Check", "Result"], [
      ["Survey responses received", String(dc.responsesReceived)],
      ["Responses scored (one per participant per time point)", String(dc.responsesScored)],
      ["Duplicate responses ignored", String(dc.duplicatesIgnored.length)],
      ["Responses from unknown Study IDs excluded", String(dc.unknownParticipants.length)],
      ["Platform scores that differ from recalculated scores", String(dc.platformScoreMismatches.length)],
      ["Subscale non-responders (below minimum items)", dc.subscaleNonResponders.length ? dc.subscaleNonResponders.map((n) => `${n.timepoint} ${n.subscale}: ${n.count}`).join("; ") : "None"],
    ]),
  );

  // Descriptives
  parts.push(`<h2>Descriptive statistics</h2>`);
  const drows: string[][] = [];
  for (const s of SUBSCALES) for (const tp of TIMEPOINTS) {
    const d = r.descriptives[tp][s];
    drows.push(d ? [`${SUBSCALE_LABEL[s]}, ${TIMEPOINT_LABEL[tp]}`, String(d.n), f(d.mean), f(d.sd), f(d.median), `${f(d.min)} to ${f(d.max)}`] : [`${SUBSCALE_LABEL[s]}, ${TIMEPOINT_LABEL[tp]}`, SUPP, "", "", "", ""]);
  }
  parts.push(table("Copenhagen Burnout Inventory subscale scores by time point", ["Subscale and time point", "n", "M", "SD", "Mdn", "Range"], drows, "Scores range from 0 to 100; higher scores indicate greater burnout."));

  // Comparisons
  parts.push(`<h2>Matched comparisons</h2>`);
  for (const id of ["T1-T2", "T1-T3"]) {
    const rows = r.comparisons.filter((x) => x.id === id).map((x) => {
      if (!x.reportable) return [SUBSCALE_LABEL[x.subscale], String(x.n), SUPP, "", "", "", "", "", ""];
      const isT = x.test === "paired t";
      const stat = isT ? `t(${x.pairedT!.df}) = ${f(x.pairedT!.t)}` : `V = ${f(x.wilcoxon!.statistic, 1)}, z = ${f(x.wilcoxon!.z)}${x.wilcoxon!.method === "exact" ? " (exact p)" : ""}`;
      const es = isT ? `dz = ${f(x.pairedT!.dz)} [${f(x.pairedT!.dzCiLow)}, ${f(x.pairedT!.dzCiHigh)}]` : `r = ${f(x.wilcoxon!.r)}`;
      const ci = isT ? `M diff ${f(x.meanDiff)} [${f(x.pairedT!.ciLow)}, ${f(x.pairedT!.ciHigh)}]` : `HL ${f(x.wilcoxon!.hl)} [${f(x.wilcoxon!.hlCiLow)}, ${f(x.wilcoxon!.hlCiHigh)}]${x.wilcoxon!.hlCiLevel < 0.9499 ? ` (${(x.wilcoxon!.hlCiLevel * 100).toFixed(1)}% CI)` : ""}`;
      return [SUBSCALE_LABEL[x.subscale], String(x.n), `${f(x.meanFrom)} to ${f(x.meanTo)}`, `W = ${f(x.normality!.w, 3)}, p = ${apaP(x.normality!.p)}`, x.test as string, stat, ci, es, `${apaP(x.p)} / ${apaP(x.pHolm)}`];
    });
    parts.push(
      table(
        `${id === "T1-T2" ? "Primary" : "Secondary"} comparison, ${id.replace("-", " to ")}`,
        ["Subscale", "n pairs", "Mean", "Shapiro-Wilk", "Test", "Statistic", "Difference [95% CI]", "Effect size", "p / Holm p"],
        rows,
        "Differences are later minus earlier; negative values indicate lower burnout. HL = Hodges-Lehmann median difference. The dz confidence interval is approximate.",
      ),
    );
    const ic = SUBSCALES.map((s) => {
      const v = r.individualChange[id][s];
      return v ? [SUBSCALE_LABEL[s], String(v.n), c(v.decreasedBy5), f(v.percent, 1)] : [SUBSCALE_LABEL[s], SUPP, "", ""];
    });
    parts.push(table(`Participants whose score fell by 5 or more points, ${id.replace("-", " to ")}`, ["Subscale", "n pairs", "Count", "%"], ic));
  }

  // Adherence
  parts.push(`<h2>Adherence</h2>`);
  const a = r.adherence;
  parts.push(
    table("Practice adherence among participants who started the program", ["Measure", "Value"], [
      ["Participants who started", String(a.participants)],
      ["Sessions per participant, M (SD)", a.sessions ? `${f(a.sessions.mean)} (${f(a.sessions.sd)})` : SUPP],
      ["Sessions per participant, Mdn (range)", a.sessions ? `${f(a.sessions.median, 1)} (${f(a.sessions.min, 0)} to ${f(a.sessions.max, 0)})` : SUPP],
      ["Protocol adherent (12 or more sessions)", `${c(a.adherent)}${a.adherentPercent !== null ? ` (${f(a.adherentPercent, 1)}%)` : ""}`],
      ...a.weeksMeetingTarget.map((w, i) => [`Met 3-session target in week ${i + 1}`, c(w)]),
      ["Sessions recorded automatically", c(a.recordedAutomatically)],
    ]),
  );
  const sub = (title: string, groups: Record<string, Record<string, { n: number; meanChange: number | null } | null>>, labels: Record<string, string>) =>
    table(title, ["Group", ...SUBSCALES.map((s) => SUBSCALE_LABEL[s])], Object.keys(groups).map((g) => [labels[g], ...SUBSCALES.map((s) => {
      const v = groups[g][s];
      return v ? `${f(v.meanChange)} (n = ${v.n})` : SUPP;
    })]), "Mean change from T1 to T2; descriptive only.");
  parts.push(sub("T1 to T2 change by adherence", r.adherenceComparison, { adherent: "Protocol adherent", notAdherent: "Not adherent" }));

  // Context
  parts.push(`<h2>Contextual disruption check</h2>`);
  const ctxLabels = ["C1 Workload changed substantially", "C2 Major personal life event", "C3 Significant organizational change"];
  parts.push(
    table("Responses to the contextual disruption items", ["Item and time point", "Yes", "No", "Skipped"],
      TIMEPOINTS.flatMap((tp) => r.context[tp].map((v, i) => [`${ctxLabels[i]}, ${TIMEPOINT_LABEL[tp]}`, c(v.yes), c(v.no), c(v.skipped)]))),
  );
  parts.push(sub("T1 to T2 change by reported disruption (T1 or T2)", r.disruptionComparison, { reportedDisruption: "Reported a disruption", noDisruption: "No disruption reported" }));

  if (r.notes.length) parts.push(`<h2>Notes</h2><ul>${r.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>`);

  const css = `body{font-family:"Times New Roman",Times,serif;color:#111;background:#fff;max-width:1100px;margin:24px auto;padding:0 16px;line-height:1.45}
h1{font-size:1.5rem}h2{font-size:1.15rem;margin-top:2rem;border-bottom:1px solid #999}.meta{color:#444}
.banner{background:#fff3cd;border:1px solid #c9a227;padding:8px 12px;font-weight:bold}
figure.t{margin:1rem 0;overflow-x:auto}figcaption{font-style:italic;margin-bottom:4px}
table{border-collapse:collapse;width:100%;font-size:.92rem}thead th{border-top:2px solid #000;border-bottom:1px solid #000;text-align:left;padding:4px 8px}
tbody th,tbody td{padding:4px 8px;text-align:left;vertical-align:top;font-weight:normal}tbody tr:last-child>*{border-bottom:2px solid #000}
.note{font-size:.85rem;color:#333}@media print{body{margin:0}}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Analysis report ${esc(r.studyCode)}</title><style>${css}</style></head><body>${parts.join("\n")}</body></html>`;
}

/** One row per comparison, for spreadsheets. */
export function reportToCsv(r: Report): string {
  const head = ["comparison", "subscale", "n", "reportable", "mean_from", "mean_to", "mean_diff", "sw_w", "sw_p", "test", "statistic", "df", "p", "p_holm", "ci_low", "ci_high", "effect_size", "es_ci_low", "es_ci_high", "rule_met"];
  const rows = r.comparisons.map((x) => {
    const t = x.pairedT, w = x.wilcoxon;
    return [x.id, x.subscale, x.n, x.reportable, x.meanFrom, x.meanTo, x.meanDiff, x.normality?.w, x.normality?.p, x.test,
      t ? t.t : w ? w.statistic : null, t ? t.df : null, x.p, x.pHolm,
      t ? t.ciLow : w ? w.hlCiLow : null, t ? t.ciHigh : w ? w.hlCiHigh : null,
      t ? t.dz : w ? w.r : null, t ? t.dzCiLow : null, t ? t.dzCiHigh : null, x.ruleMet];
  });
  return [head, ...rows].map((r) => r.map((v) => (v === null || v === undefined ? "" : String(v))).join(",")).join("\n") + "\n";
}
