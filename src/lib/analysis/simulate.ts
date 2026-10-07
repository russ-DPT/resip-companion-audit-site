// Seeded simulated data in the same shape as a ReSIP export.
// Used for validation, demonstration to reviewers, and the audit self-test.
// Simulated data never describe a real participant.
import { ANALYSIS_PLAN } from "./plan";
import { scoreResponse } from "./scoring";
import type { AnalysisInput, Participant, PracticeSession, Subscale, SurveyResponse, Timepoint } from "./types";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SimulationOptions {
  seed?: number;
  participants?: number;
  /** Mean change in subscale score from T1 to T2 (negative = improvement). */
  effectT2?: number;
  effectT3?: number;
}

export function simulateStudy(opts: SimulationOptions = {}): AnalysisInput {
  const seed = opts.seed ?? 20261007;
  const N = opts.participants ?? 16;
  const effT2 = opts.effectT2 ?? -8;
  const effT3 = opts.effectT3 ?? -5;
  const rnd = mulberry32(seed);
  const norm = () => {
    const u = Math.max(rnd(), 1e-12), v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const clamp = (x: number) => Math.max(0, Math.min(100, x));
  const hex = () => Array.from({ length: 16 }, () => Math.floor(rnd() * 16).toString(16)).join("");

  const participants: Participant[] = [];
  const responses: SurveyResponse[] = [];
  const sessions: PracticeSession[] = [];
  const subs = Object.keys(ANALYSIS_PLAN.scoring.subscaleItems) as Subscale[];

  const makeResponse = (studyId: string, tp: Timepoint, latent: Record<Subscale, number>, day: number, dropPersonal = false): SurveyResponse => {
    const items: (number | null)[] = new Array(19).fill(null);
    for (const s of subs) {
      for (const k of ANALYSIS_PLAN.scoring.subscaleItems[s]) {
        const target = clamp(latent[s] + norm() * 14);
        const itemScoreWanted = Math.round(target / 25) * 25;
        const reversed = (ANALYSIS_PLAN.scoring.reverseScoredItems as readonly number[]).includes(k);
        const raw = reversed ? 100 - itemScoreWanted : itemScoreWanted;
        items[k - 1] = 5 - raw / 25; // option position 1..5 (1 = 100)
        if (rnd() < 0.03) items[k - 1] = null;
      }
    }
    if (dropPersonal) for (const k of [1, 2, 3, 4]) items[k - 1] = null; // force a subscale non-responder
    const ctx = [0, 1, 2].map(() => (rnd() < 0.05 ? null : rnd() < 0.15)) as [boolean | null, boolean | null, boolean | null];
    const r: SurveyResponse = { studyId, timepoint: tp, items, context: ctx, submittedAt: new Date(Date.UTC(2027, 0, 1 + day)).toISOString() };
    const sc = scoreResponse(r).scores;
    r.platformScores = { personal: sc.personal, work: sc.work, patient: sc.patient };
    return r;
  };

  for (let i = 0; i < N; i++) {
    const studyId = hex();
    // participant pathway
    let status: Participant["status"] = "completed";
    let reach = 3; // number of surveys completed
    if (i === N - 1) { status = "declined"; reach = 0; }
    else if (i === N - 2) { status = "declined"; reach = 1; }
    else if (i === N - 3) { status = "withdrawn"; reach = 2; }
    participants.push({ studyId, status, site: "SIM" });

    const base = {} as Record<Subscale, number>;
    const person = norm() * 6;
    for (const s of subs) base[s] = clamp(42 + person + norm() * 13);
    const respond = 0.4 + rnd() * 0.6; // individual responsiveness
    const t2 = {} as Record<Subscale, number>, t3 = {} as Record<Subscale, number>;
    for (const s of subs) {
      t2[s] = clamp(base[s] + effT2 * respond + norm() * 6);
      t3[s] = clamp(base[s] + effT3 * respond + norm() * 7);
    }
    if (reach >= 1) responses.push(makeResponse(studyId, "pre", base, 0, i === 2));
    if (reach >= 2) responses.push(makeResponse(studyId, "post", t2, 30));
    if (reach >= 3) responses.push(makeResponse(studyId, "followup", t3, 58));

    if (reach >= 1) {
      const propensity = 0.25 + rnd() * 0.6;
      for (let d = 1; d <= 30; d++) {
        if (reach === 1 && d > 10) break;
        if (rnd() < propensity) sessions.push({ studyId, studyDay: d, method: rnd() < 0.9 ? "auto" : "button" });
      }
    }
  }
  return { studyCode: "SIMULATED", participants, responses, sessions, simulated: true };
}
