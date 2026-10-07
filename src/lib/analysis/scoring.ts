// CBI scoring exactly as defined by the developers (NFA) and the locked plan.
import { ANALYSIS_PLAN } from "./plan";
import type { Subscale, SurveyResponse } from "./types";

const P = ANALYSIS_PLAN.scoring;

/** Score one item (1-based item number) from its response option position (1 to 5). */
export function itemScore(itemNumber: number, option: number | null): number | null {
  if (option === null || option === undefined) return null;
  if (!Number.isInteger(option) || option < 1 || option > 5) {
    throw new Error(`Item ${itemNumber}: response option must be 1 to 5, got ${option}`);
  }
  const s = P.itemScores[option - 1];
  return (P.reverseScoredItems as readonly number[]).includes(itemNumber) ? 100 - s : s;
}

export interface ScoredResponse {
  studyId: string;
  timepoint: SurveyResponse["timepoint"];
  itemScores: (number | null)[];
  scores: Record<Subscale, number | null>;
  answered: Record<Subscale, number>;
  platformMismatch: Subscale[];
}

export function scoreResponse(r: SurveyResponse): ScoredResponse {
  if (r.items.length !== 19) throw new Error(`Study ID ${r.studyId} ${r.timepoint}: expected 19 items, got ${r.items.length}`);
  const itemScores = r.items.map((o, i) => itemScore(i + 1, o));
  const scores = {} as Record<Subscale, number | null>;
  const answered = {} as Record<Subscale, number>;
  const platformMismatch: Subscale[] = [];
  (Object.keys(P.subscaleItems) as Subscale[]).forEach((sub) => {
    const vals = P.subscaleItems[sub].map((k) => itemScores[k - 1]).filter((v): v is number => v !== null);
    answered[sub] = vals.length;
    scores[sub] = vals.length >= P.minimumItemsAnswered[sub] ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    const plat = r.platformScores?.[sub];
    if (plat !== undefined) {
      const bothNull = plat === null && scores[sub] === null;
      const close = plat !== null && scores[sub] !== null && Math.abs(plat - (scores[sub] as number)) <= P.platformScoreTolerance;
      if (!bothNull && !close) platformMismatch.push(sub);
    }
  });
  return { studyId: r.studyId, timepoint: r.timepoint, itemScores, scores, answered, platformMismatch };
}
