// Recomputed at build time from the reference fixtures, so the numbers on
// this page always describe the code that is deployed.
import scipy from "@/tests/fixtures/scipy.json";
import rref from "@/tests/fixtures/r.json";
import cross from "@/validation/cross-check-results.json";
import { holm, pairedT, shapiroWilk, wilcoxonSignedRank } from "@/src/lib/analysis/stats";

export const metadata = { title: "Validation" };
export const dynamic = "force-static";

type Fx = { x: number[]; [k: string]: any };
const maxErr = (pairs: [number, number][]) => pairs.reduce((m, [a, b]) => Math.max(m, Math.abs(a - b)), 0);

export default function ValidationPage() {
  const cont = scipy.continuous as Fx[];
  const exact = cont.filter((c) => c.w_exact_p !== undefined);
  const tied = (scipy.tied as Fx[]).filter((c) => wilcoxonSignedRank(c.x).method === "normal approximation");
  const rows: [string, string, number, number][] = [
    ["Shapiro-Wilk W (n = 3 to 50)", "SciPy", cont.length, maxErr(cont.map((c) => [shapiroWilk(c.x).w, c.sw_w]))],
    ["Shapiro-Wilk p", "SciPy", cont.length, maxErr(cont.map((c) => [shapiroWilk(c.x).p, c.sw_p]))],
    ["Paired t statistic", "SciPy", cont.length, maxErr(cont.map((c) => [pairedT(c.x).t, c.t]))],
    ["Paired t p value", "SciPy", cont.length, maxErr(cont.map((c) => [pairedT(c.x).p, c.t_p]))],
    ["Paired t 95% CI (both limits)", "SciPy", cont.length, maxErr(cont.flatMap((c) => [[pairedT(c.x).ciLow, c.ci[0]], [pairedT(c.x).ciHigh, c.ci[1]]] as [number, number][]))],
    ["Wilcoxon exact p (no ties)", "SciPy", exact.length, maxErr(exact.map((c) => [wilcoxonSignedRank(c.x).p, c.w_exact_p]))],
    ["Wilcoxon approximate p (ties and zeros)", "SciPy", tied.length, maxErr(tied.map((c) => [wilcoxonSignedRank(c.x).p, c.p]))],
    ["Hodges-Lehmann estimate and exact CI", "R wilcox.test", rref.hl.length, maxErr((rref.hl as Fx[]).flatMap((c) => { const w = wilcoxonSignedRank(c.x); return [[w.hl, c.est], [w.hlCiLow, c.lo], [w.hlCiHigh, c.hi]] as [number, number][]; }))],
    ["Holm-adjusted p values", "R p.adjust", rref.holm.length, maxErr((rref.holm as { p: number[]; adj: number[] }[]).flatMap((c) => holm(c.p).map((v, i) => [v, c.adj[i]] as [number, number])))],
  ];

  return (
    <>
      <h1>Validation of the statistical software</h1>
      <p>Each statistical routine was compared with established software on reference data. The largest absolute difference across all cases is shown. These comparisons are recomputed every time this site is built.</p>
      <div className="wrap">
        <table>
          <thead><tr><th>Procedure</th><th>Reference</th><th>Cases</th><th>Largest difference</th></tr></thead>
          <tbody>
            {rows.map(([a, b, n, e]) => (
              <tr key={a}><td>{a}</td><td>{b}</td><td>{n}</td><td className={e < 1e-5 ? "ok" : "bad"}>{e === 0 ? "0" : e.toExponential(1)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      {cross && (
        <>
          <h2>End-to-end cross-check</h2>
          <p>
            {cross.studies} simulated studies of {cross.minN} to {cross.maxN} participants, with varied effects, ties, missing items,
            withdrawals and declines, were each analysed by the platform engine and then reproduced independently in Python (SciPy{" "}
            {cross.scipy}) and R ({cross.r}). Every value in every results file was compared.
          </p>
          <div className="wrap">
            <table>
              <thead><tr><th>Reproduction</th><th>Studies fully matching</th><th>Individual checks passed</th></tr></thead>
              <tbody>
                <tr><td>Python</td><td className="ok">{cross.python.studiesPassed} of {cross.studies}</td><td>{cross.python.checksPassed} of {cross.python.checks}</td></tr>
                <tr><td>R</td><td className="ok">{cross.r_.studiesPassed} of {cross.studies}</td><td>{cross.r_.checksPassed} of {cross.r_.checks}</td></tr>
              </tbody>
            </table>
          </div>
          <p className="small">Run on {cross.date}. Reproduce with <code>validation/cross-check.sh</code> in the source repository.</p>
        </>
      )}
      <h2>Known approximation</h2>
      <p>The 95% confidence interval for Cohen&apos;s d<sub>z</sub> uses the normal approximation SE = √(1/n + d<sub>z</sub>²/2n). It is labelled as approximate wherever it appears. All other intervals are exact for their method.</p>
    </>
  );
}
