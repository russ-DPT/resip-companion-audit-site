// Run: npm test
// Reference values come from SciPy (tests/fixtures/scipy.json) and R
// (tests/fixtures/r.json), produced by validation/make_fixtures.*.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { holm, pairedT, shapiroWilk, wilcoxonSignedRank } from "../src/lib/analysis/stats";
import { itemScore, scoreResponse } from "../src/lib/analysis/scoring";
import { buildAuditBundle, canonicalJson, runAnalysis, simulateStudy, unzipFiles, verifyBundle, zipFiles } from "../src/lib/analysis";
import type { SurveyResponse } from "../src/lib/analysis";
import { ANALYSIS_PLAN } from "../src/lib/analysis/plan";
import pkg from "../package.json" with { type: "json" };

const scipy = JSON.parse(readFileSync(new URL("./fixtures/scipy.json", import.meta.url), "utf8"));
const rref = JSON.parse(readFileSync(new URL("./fixtures/r.json", import.meta.url), "utf8"));
const close = (a: number, b: number, tol: number, msg: string) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

test("Shapiro-Wilk matches SciPy for n = 3 to 50", () => {
  for (const c of scipy.continuous) {
    const r = shapiroWilk(c.x);
    close(r.w, c.sw_w, 1e-6, `W n=${c.x.length}`);
    close(r.p, c.sw_p, 1e-5, `p n=${c.x.length}`);
  }
});

test("paired t (one-sample t on differences) matches SciPy", () => {
  for (const c of scipy.continuous) {
    const r = pairedT(c.x);
    close(r.t, c.t, 1e-8, "t");
    close(r.p, c.t_p, 1e-8, "p");
    close(r.ciLow, c.ci[0], 1e-6, "ci low");
    close(r.ciHigh, c.ci[1], 1e-6, "ci high");
  }
});

test("Wilcoxon exact p matches SciPy (no ties)", () => {
  for (const c of scipy.continuous.filter((c: any) => c.w_exact_p !== undefined)) {
    const r = wilcoxonSignedRank(c.x);
    assert.equal(r.method, "exact");
    close(r.statistic, c.w_exact_stat, 1e-9, "statistic");
    close(r.p, c.w_exact_p, 1e-10, "p");
  }
});

test("Wilcoxon normal approximation with ties and zeros matches SciPy", () => {
  for (const c of scipy.tied) {
    const r = wilcoxonSignedRank(c.x);
    if (r.method !== "normal approximation") continue;
    close(r.statistic, c.stat, 1e-9, "statistic");
    close(r.p, c.p, 1e-9, "p");
  }
});

test("Hodges-Lehmann estimate and exact CI match R wilcox.test", () => {
  for (const c of rref.hl) {
    const r = wilcoxonSignedRank(c.x);
    close(r.hl, c.est, 1e-9, "estimate");
    close(r.hlCiLow, c.lo, 1e-9, "ci low");
    close(r.hlCiHigh, c.hi, 1e-9, "ci high");
    close(r.p, c.p, 1e-10, "p");
  }
});

test("Holm adjustment matches R p.adjust", () => {
  for (const c of rref.holm) holm(c.p).forEach((v, i) => close(v, c.adj[i], 1e-12, "holm"));
});

test("CBI scoring follows the NFA rules", () => {
  assert.equal(itemScore(1, 1), 100);
  assert.equal(itemScore(1, 5), 0);
  assert.equal(itemScore(13, 1), 0); // reverse scored
  assert.equal(itemScore(13, 5), 100);
  assert.throws(() => itemScore(2, 6));
  const r: SurveyResponse = {
    studyId: "a", timepoint: "pre", submittedAt: "x", context: [null, null, null],
    items: [1, 1, null, null, null, null, /* work */ 2, 2, 2, null, null, null, 5, /* patient */ 3, 3, 3, 3, 3, 3],
  };
  const s = scoreResponse(r).scores;
  assert.equal(s.personal, null); // 2 of 6 answered, minimum 3
  assert.equal(s.work, (75 + 75 + 75 + 100) / 4); // item 13 reversed
  assert.equal(s.patient, 50);
});

test("analysis is deterministic", () => {
  const input = simulateStudy({ seed: 11 });
  const a = canonicalJson(runAnalysis(input, { suppressSmallCounts: false }));
  const b = canonicalJson(runAnalysis(simulateStudy({ seed: 11 }), { suppressSmallCounts: false }));
  assert.equal(a, b);
});

test("small counts are suppressed only when requested", () => {
  const input = simulateStudy({ seed: 5, participants: 16 });
  const sup = runAnalysis(input, { suppressSmallCounts: true });
  const raw = runAnalysis(input, { suppressSmallCounts: false });
  const declined = raw.flow.status.declined as number;
  assert.ok(declined > 0 && declined < 5);
  assert.equal(sup.flow.status.declined, "<5");
});

test("groups smaller than five are not analysed", () => {
  const input = simulateStudy({ seed: 9, participants: 6 });
  const r = runAnalysis(input, { suppressSmallCounts: false });
  for (const c of r.comparisons) if (c.n < 5) assert.equal(c.p, null);
});

test("audit bundle verifies, survives zipping, and detects tampering", async () => {
  const files = await buildAuditBundle(simulateStudy({ seed: 3 }), { generatedAt: "t", generatedByRole: "test" });
  const unzipped = unzipFiles(zipFiles(files));
  const ok = await verifyBundle(unzipped);
  assert.ok(ok.every((c) => c.ok), JSON.stringify(ok.filter((c) => !c.ok)));
  const tampered = { ...unzipped, "data/responses.csv": unzipped["data/responses.csv"].replace(/,1,/, ",2,") };
  const bad = await verifyBundle(tampered);
  assert.ok(bad.some((c) => !c.ok));
});

test("package version matches the engine version recorded in results", () => {
  assert.equal(pkg.version, ANALYSIS_PLAN.engineVersion);
});
