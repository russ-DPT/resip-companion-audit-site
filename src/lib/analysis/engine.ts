// Runs the locked analysis plan on one study's data and returns a
// deterministic report object (same input always gives the same output).
import { ANALYSIS_PLAN } from "./plan";
import { scoreResponse, type ScoredResponse } from "./scoring";
import { describe, holm, mean, pairedT, shapiroWilk, wilcoxonSignedRank, type Descriptives, type PairedT, type ShapiroWilk, type Wilcoxon } from "./stats";
import { SUBSCALES, TIMEPOINTS, type AnalysisInput, type Subscale, type Timepoint } from "./types";

export type Count = number | "<5";

export interface Comparison {
  id: string;
  role: "primary" | "secondary";
  subscale: Subscale;
  n: number;
  reportable: boolean;
  meanFrom: number | null;
  meanTo: number | null;
  meanDiff: number | null;
  normality: ShapiroWilk | null;
  test: "paired t" | "Wilcoxon signed-rank" | null;
  pairedT: PairedT | null;
  wilcoxon: Wilcoxon | null;
  p: number | null;
  pHolm: number | null;
  ruleMet: boolean | null;
}

export interface Report {
  plan: { id: string; version: string; lockedOn: string; engineVersion: string };
  studyCode: string;
  simulated: boolean;
  smallCountsSuppressed: boolean;
  dataChecks: {
    responsesReceived: number;
    responsesScored: number;
    duplicatesIgnored: { studyId: string; timepoint: Timepoint }[];
    unknownParticipants: string[];
    platformScoreMismatches: { studyId: string; timepoint: Timepoint; subscales: Subscale[] }[];
    subscaleNonResponders: { timepoint: Timepoint; subscale: Subscale; count: Count }[];
  };
  flow: {
    enrolled: Count;
    completed: Record<Timepoint, Count>;
    status: Record<string, Count>;
  };
  descriptives: Record<Timepoint, Record<Subscale, Descriptives | null>>;
  individualChange: Record<string, Record<Subscale, { n: number; decreasedBy5: Count; percent: number | null } | null>>;
  comparisons: Comparison[];
  outcome: Record<Subscale, { met: boolean | null; sustained: boolean | null }>;
  adherence: {
    participants: number;
    sessions: Descriptives | null;
    adherent: Count;
    adherentPercent: number | null;
    weeksMeetingTarget: Count[];
    recordedAutomatically: Count;
  };
  adherenceComparison: Record<"adherent" | "notAdherent", Record<Subscale, { n: number; meanChange: number | null } | null>>;
  context: Record<Timepoint, { yes: Count; no: Count; skipped: Count }[]>;
  disruptionComparison: Record<"reportedDisruption" | "noDisruption", Record<Subscale, { n: number; meanChange: number | null } | null>>;
  notes: string[];
}

export interface RunOptions {
  /** Show counts of 1 to 4 as "<5" (all roles except the Research Advisor). */
  suppressSmallCounts: boolean;
}

const MIN = ANALYSIS_PLAN.minimumReportableGroup;

export function runAnalysis(input: AnalysisInput, opts: RunOptions): Report {
  const cnt = (n: number): Count => (opts.suppressSmallCounts && n > 0 && n < MIN ? "<5" : n);
  const notes: string[] = [];
  const known = new Set(input.participants.map((p) => p.studyId));

  // ---- score responses, one per participant per time point (earliest kept)
  const sorted = [...input.responses].sort((a, b) =>
    a.studyId === b.studyId ? (a.timepoint === b.timepoint ? a.submittedAt.localeCompare(b.submittedAt) : a.timepoint.localeCompare(b.timepoint)) : a.studyId.localeCompare(b.studyId),
  );
  const byKey = new Map<string, ScoredResponse>();
  const ctxByKey = new Map<string, AnalysisInput["responses"][number]["context"]>();
  const duplicates: { studyId: string; timepoint: Timepoint }[] = [];
  const unknown = new Set<string>();
  for (const r of sorted) {
    if (!known.has(r.studyId)) { unknown.add(r.studyId); continue; }
    const key = `${r.studyId}|${r.timepoint}`;
    if (byKey.has(key)) { duplicates.push({ studyId: r.studyId, timepoint: r.timepoint }); continue; }
    byKey.set(key, scoreResponse(r));
    ctxByKey.set(key, r.context);
  }
  const scored = [...byKey.values()];
  const score = (id: string, tp: Timepoint, s: Subscale): number | null => byKey.get(`${id}|${tp}`)?.scores[s] ?? null;
  const ids = [...known].sort();

  const nonResp: Report["dataChecks"]["subscaleNonResponders"] = [];
  for (const tp of TIMEPOINTS) for (const s of SUBSCALES) {
    const c = scored.filter((r) => r.timepoint === tp && r.scores[s] === null).length;
    if (c > 0) nonResp.push({ timepoint: tp, subscale: s, count: cnt(c) });
  }

  // ---- participant flow
  const statusCounts: Record<string, Count> = {};
  for (const st of ["active", "completed", "declined", "withdrawn", "removed"]) {
    statusCounts[st] = cnt(input.participants.filter((p) => p.status === st).length);
  }
  const completed = {} as Record<Timepoint, Count>;
  for (const tp of TIMEPOINTS) completed[tp] = cnt(scored.filter((r) => r.timepoint === tp).length);

  // ---- descriptives
  const descriptives = {} as Report["descriptives"];
  for (const tp of TIMEPOINTS) {
    descriptives[tp] = {} as Record<Subscale, Descriptives | null>;
    for (const s of SUBSCALES) {
      const v = ids.map((id) => score(id, tp, s)).filter((x): x is number => x !== null);
      descriptives[tp][s] = v.length >= MIN ? describe(v) : null;
    }
  }

  // ---- comparisons
  const comparisons: Comparison[] = [];
  const individualChange: Report["individualChange"] = {};
  for (const cmp of ANALYSIS_PLAN.comparisons) {
    individualChange[cmp.id] = {} as Record<Subscale, { n: number; decreasedBy5: Count; percent: number | null } | null>;
    const family: Comparison[] = [];
    for (const s of SUBSCALES) {
      const pairs = ids
        .map((id) => [score(id, cmp.from as Timepoint, s), score(id, cmp.to as Timepoint, s)] as const)
        .filter((p): p is readonly [number, number] => p[0] !== null && p[1] !== null);
      const diffs = pairs.map(([a, b]) => b - a);
      const n = diffs.length;
      const reportable = n >= MIN;
      const c: Comparison = {
        id: cmp.id, role: cmp.role as Comparison["role"], subscale: s, n, reportable,
        meanFrom: null, meanTo: null, meanDiff: null, normality: null, test: null,
        pairedT: null, wilcoxon: null, p: null, pHolm: null, ruleMet: null,
      };
      if (reportable) {
        c.meanFrom = mean(pairs.map((p) => p[0]));
        c.meanTo = mean(pairs.map((p) => p[1]));
        c.meanDiff = mean(diffs);
        c.normality = shapiroWilk(diffs);
        if (c.normality.p >= ANALYSIS_PLAN.normalityAlpha) {
          c.test = "paired t"; c.pairedT = pairedT(diffs); c.p = c.pairedT.p;
        } else {
          c.test = "Wilcoxon signed-rank"; c.wilcoxon = wilcoxonSignedRank(diffs); c.p = c.wilcoxon.p;
        }
        const dec = diffs.filter((d) => d <= -ANALYSIS_PLAN.meaningfulIndividualChange).length;
        individualChange[cmp.id][s] = { n, decreasedBy5: cnt(dec), percent: (100 * dec) / n };
      } else {
        individualChange[cmp.id][s] = null;
      }
      family.push(c);
    }
    const testable = family.filter((c) => c.p !== null);
    const adj = holm(testable.map((c) => c.p as number));
    testable.forEach((c, i) => {
      c.pHolm = adj[i];
      c.ruleMet = (c.meanDiff as number) < 0 && adj[i] < ANALYSIS_PLAN.alpha;
    });
    if (testable.length < family.length) notes.push(`${cmp.id}: Holm adjustment applied across ${testable.length} reportable subscale(s).`);
    comparisons.push(...family);
  }

  const outcome = {} as Report["outcome"];
  for (const s of SUBSCALES) {
    const prim = comparisons.find((c) => c.id === "T1-T2" && c.subscale === s);
    const sec = comparisons.find((c) => c.id === "T1-T3" && c.subscale === s);
    outcome[s] = {
      met: prim?.ruleMet ?? null,
      sustained: prim?.ruleMet === null || prim?.ruleMet === undefined ? null : Boolean(prim.ruleMet && sec?.ruleMet),
    };
  }

  // ---- adherence (participants who completed T1, i.e. who started the program)
  const started = ids.filter((id) => byKey.has(`${id}|pre`));
  const [w1, w2, w3, w4] = ANALYSIS_PLAN.adherence.weeks;
  const weekOf = (d: number) => [w1, w2, w3, w4].findIndex(([a, b]) => d >= a && d <= b);
  const perPerson = new Map<string, { total: number; weeks: number[] }>();
  for (const id of started) perPerson.set(id, { total: 0, weeks: [0, 0, 0, 0] });
  let auto = 0;
  for (const s of input.sessions) {
    const rec = perPerson.get(s.studyId);
    if (!rec || s.studyDay < 1 || s.studyDay > 30) continue;
    rec.total++; rec.weeks[weekOf(s.studyDay)]++;
    if (s.method === "auto") auto++;
  }
  const totals = started.map((id) => perPerson.get(id)!.total);
  const isAdherent = (id: string) => perPerson.get(id)!.total >= ANALYSIS_PLAN.adherence.minimumSessions;
  const nAdh = started.filter(isAdherent).length;
  const adherence: Report["adherence"] = {
    participants: started.length,
    sessions: totals.length >= MIN ? describe(totals) : null,
    adherent: cnt(nAdh),
    adherentPercent: started.length >= MIN ? (100 * nAdh) / started.length : null,
    weeksMeetingTarget: [0, 1, 2, 3].map((w) => cnt(started.filter((id) => perPerson.get(id)!.weeks[w] >= ANALYSIS_PLAN.adherence.weeklyTarget).length)),
    recordedAutomatically: cnt(auto),
  };

  // ---- descriptive subgroup comparisons of T1 to T2 change
  const changeFor = (group: string[]) => {
    const out = {} as Record<Subscale, { n: number; meanChange: number | null } | null>;
    for (const s of SUBSCALES) {
      const d = group
        .map((id) => [score(id, "pre", s), score(id, "post", s)] as const)
        .filter((p): p is readonly [number, number] => p[0] !== null && p[1] !== null)
        .map(([a, b]) => b - a);
      out[s] = d.length >= MIN ? { n: d.length, meanChange: mean(d) } : null;
    }
    return out;
  };
  const adherenceComparison = {
    adherent: changeFor(started.filter(isAdherent)),
    notAdherent: changeFor(started.filter((id) => !isAdherent(id))),
  };

  const context = {} as Report["context"];
  for (const tp of TIMEPOINTS) {
    const rows = [...ctxByKey.entries()].filter(([k]) => k.endsWith(`|${tp}`)).map(([, v]) => v);
    context[tp] = [0, 1, 2].map((i) => ({
      yes: cnt(rows.filter((r) => r[i] === true).length),
      no: cnt(rows.filter((r) => r[i] === false).length),
      skipped: cnt(rows.filter((r) => r[i] === null).length),
    }));
  }
  const disrupted = (id: string) =>
    (["pre", "post"] as Timepoint[]).some((tp) => (ctxByKey.get(`${id}|${tp}`) ?? []).some((v) => v === true));
  const disruptionComparison = {
    reportedDisruption: changeFor(started.filter(disrupted)),
    noDisruption: changeFor(started.filter((id) => !disrupted(id))),
  };

  if (input.simulated) notes.push("SIMULATED DATA. These results do not describe any real participant.");
  if (duplicates.length) notes.push(`${duplicates.length} duplicate response(s) ignored; the earliest submission per time point was used.`);
  if (unknown.size) notes.push(`${unknown.size} response(s) from Study IDs not in the participant list were excluded.`);

  return {
    plan: { id: ANALYSIS_PLAN.id, version: ANALYSIS_PLAN.version, lockedOn: ANALYSIS_PLAN.lockedOn, engineVersion: ANALYSIS_PLAN.engineVersion },
    studyCode: input.studyCode,
    simulated: input.simulated,
    smallCountsSuppressed: opts.suppressSmallCounts,
    dataChecks: {
      responsesReceived: input.responses.length,
      responsesScored: scored.length,
      duplicatesIgnored: duplicates,
      unknownParticipants: [...unknown].sort(),
      platformScoreMismatches: scored.filter((r) => r.platformMismatch.length).map((r) => ({ studyId: r.studyId, timepoint: r.timepoint, subscales: r.platformMismatch })),
      subscaleNonResponders: nonResp,
    },
    flow: { enrolled: cnt(input.participants.length), completed, status: statusCounts },
    descriptives, individualChange, comparisons, outcome, adherence, adherenceComparison,
    context, disruptionComparison, notes,
  };
}

/** Scored long-format rows for the audit dataset. */
export function scoredRows(input: AnalysisInput) {
  const known = new Set(input.participants.map((p) => p.studyId));
  const seen = new Set<string>();
  return [...input.responses]
    .filter((r) => known.has(r.studyId))
    .sort((a, b) => a.studyId.localeCompare(b.studyId) || a.timepoint.localeCompare(b.timepoint) || a.submittedAt.localeCompare(b.submittedAt))
    .filter((r) => { const k = `${r.studyId}|${r.timepoint}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .map((r) => ({ raw: r, scored: scoreResponse(r) }));
}
