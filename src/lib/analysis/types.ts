// Data contracts for the ReSIP analysis module.
// The adapter (adapter.ts) converts ReSIP database rows into these shapes.

export type Timepoint = "pre" | "post" | "followup";
export const TIMEPOINTS: Timepoint[] = ["pre", "post", "followup"];
export const TIMEPOINT_LABEL: Record<Timepoint, string> = {
  pre: "T1 (baseline)",
  post: "T2 (post-intervention)",
  followup: "T3 (follow-up)",
};

export type Subscale = "personal" | "work" | "patient";
export const SUBSCALES: Subscale[] = ["personal", "work", "patient"];
export const SUBSCALE_LABEL: Record<Subscale, string> = {
  personal: "Personal burnout",
  work: "Work-related burnout",
  patient: "Patient-related burnout",
};

/**
 * One completed CBI survey.
 * items: 19 entries in form order (items 1 to 19). Each entry is the
 * position of the chosen response option, 1 to 5, in printed order
 * (1 = "Always" or "To a very high degree", 5 = "Never / almost never" or
 * "To a very low degree"), or null if skipped.
 */
export interface SurveyResponse {
  studyId: string;
  timepoint: Timepoint;
  items: (number | null)[];
  /** Scale scores as stored by the platform, used only for verification. */
  platformScores?: Partial<Record<Subscale, number | null>>;
  /** Contextual disruption check C1 to C3: true = yes, false = no, null = skipped. */
  context: [boolean | null, boolean | null, boolean | null];
  submittedAt: string;
}

export type ParticipantStatus =
  | "active" // still in the protocol
  | "completed" // completed the follow-up survey
  | "declined" // no survey response four weeks after delivery
  | "withdrawn" // left the study by choice
  | "removed"; // removed by staff

export interface Participant {
  studyId: string;
  status: ParticipantStatus;
  site?: string;
}

/** One recorded practice session (already de-duplicated by the platform). */
export interface PracticeSession {
  studyId: string;
  studyDay: number; // 1 to 30 within the intervention period
  method?: "auto" | "button";
}

export interface AnalysisInput {
  studyCode: string;
  participants: Participant[];
  responses: SurveyResponse[];
  sessions: PracticeSession[];
  /** True when the data are simulated (validation or demonstration). */
  simulated: boolean;
}
