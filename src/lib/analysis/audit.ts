// Audit bundle: everything an independent auditor needs to reproduce the
// results without access to ReSIP. Format documented in docs/AUDIT.md.
import { ANALYSIS_PLAN } from "./plan";
import { runAnalysis, scoredRows, type Report } from "./engine";
import { AUDIT_SCRIPTS } from "./audit-scripts.generated";
import type { AnalysisInput, Participant, PracticeSession, SurveyResponse, Timepoint } from "./types";

export const BUNDLE_FORMAT = "resip-analysis-audit/1";

// ---------------------------------------------------------------- CSV helpers

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function csv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
}
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.length > 1 || r[0] !== "");
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}

const ITEM_COLS = Array.from({ length: 19 }, (_, i) => `item_${String(i + 1).padStart(2, "0")}`);
const b2s = (b: boolean | null) => (b === null ? "" : b ? 1 : 0);

export function toCsvFiles(input: AnalysisInput): Record<string, string> {
  const participants = csv(
    ["study_id", "status"],
    [...input.participants].sort((a, b) => a.studyId.localeCompare(b.studyId)).map((p) => [p.studyId, p.status]),
  );
  const responses = csv(
    ["study_id", "timepoint", "submitted_at", ...ITEM_COLS, "c1", "c2", "c3", "platform_personal", "platform_work", "platform_patient"],
    [...input.responses]
      .sort((a, b) => a.studyId.localeCompare(b.studyId) || a.timepoint.localeCompare(b.timepoint) || a.submittedAt.localeCompare(b.submittedAt))
      .map((r) => [
        r.studyId, r.timepoint, r.submittedAt, ...r.items, ...r.context.map(b2s),
        r.platformScores?.personal ?? "", r.platformScores?.work ?? "", r.platformScores?.patient ?? "",
      ]),
  );
  const sessions = csv(
    ["study_id", "study_day", "method"],
    [...input.sessions]
      .sort((a, b) => a.studyId.localeCompare(b.studyId) || a.studyDay - b.studyDay)
      .map((s) => [s.studyId, s.studyDay, s.method ?? ""]),
  );
  return { "data/participants.csv": participants, "data/responses.csv": responses, "data/sessions.csv": sessions };
}

export function fromCsvFiles(files: Record<string, string>, studyCode: string, simulated: boolean): AnalysisInput {
  const num = (s: string) => (s === "" ? null : Number(s));
  const bool = (s: string) => (s === "" ? null : s === "1");
  const participants: Participant[] = parseCsv(files["data/participants.csv"]).map((r) => ({ studyId: r.study_id, status: r.status as Participant["status"] }));
  const responses: SurveyResponse[] = parseCsv(files["data/responses.csv"]).map((r) => ({
    studyId: r.study_id,
    timepoint: r.timepoint as Timepoint,
    submittedAt: r.submitted_at,
    items: ITEM_COLS.map((c) => num(r[c])),
    context: [bool(r.c1), bool(r.c2), bool(r.c3)],
    platformScores: { personal: num(r.platform_personal), work: num(r.platform_work), patient: num(r.platform_patient) },
  }));
  const sessions: PracticeSession[] = parseCsv(files["data/sessions.csv"]).map((r) => ({
    studyId: r.study_id, studyDay: Number(r.study_day), method: (r.method || undefined) as PracticeSession["method"],
  }));
  return { studyCode, participants, responses, sessions, simulated };
}

/** Subscale scores per participant and time point (for SPSS or JASP). */
export function scoresWide(input: AnalysisInput): string {
  const subs = ["personal", "work", "patient"] as const;
  const tps = ["pre", "post", "followup"] as const;
  const rows = scoredRows(input);
  const get = (id: string, tp: string, s: (typeof subs)[number]) =>
    rows.find((r) => r.raw.studyId === id && r.raw.timepoint === tp)?.scored.scores[s] ?? null;
  const ids = [...new Set(input.participants.map((p) => p.studyId))].sort();
  return csv(
    ["study_id", ...subs.flatMap((s) => tps.map((t) => `${s}_${t}`))],
    ids.map((id) => [id, ...subs.flatMap((s) => tps.map((t) => get(id, t, s)))]),
  );
}

// ---------------------------------------------------------------- hashing

/** Canonical JSON: sorted keys, so the same object always hashes the same. */
export function canonicalJson(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v === undefined ? null : Number.isNaN(v) ? null : v);
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(",")}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`).join(",")}}`;
}

export async function sha256(text: string): Promise<string> {
  const buf = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------- bundle

export interface BundleMeta {
  generatedAt: string;
  generatedByRole: string;
  sourceCommit?: string;
}

export async function buildAuditBundle(input: AnalysisInput, meta: BundleMeta): Promise<Record<string, string>> {
  const report: Report = runAnalysis(input, { suppressSmallCounts: false });
  const files: Record<string, string> = {
    ...toCsvFiles(input),
    "data/scores_wide.csv": scoresWide(input),
    "results.json": JSON.stringify(report, null, 2) + "\n",
    "plan.json": JSON.stringify(ANALYSIS_PLAN, null, 2) + "\n",
    ...AUDIT_SCRIPTS,
  };
  const hashes: Record<string, string> = {};
  for (const name of Object.keys(files).sort()) hashes[name] = await sha256(files[name]);
  const manifest = {
    format: BUNDLE_FORMAT,
    studyCode: input.studyCode,
    simulated: input.simulated,
    planId: ANALYSIS_PLAN.id,
    planVersion: ANALYSIS_PLAN.version,
    engineVersion: ANALYSIS_PLAN.engineVersion,
    sourceCommit: meta.sourceCommit ?? null,
    generatedAt: meta.generatedAt,
    generatedByRole: meta.generatedByRole,
    resultsDigest: await sha256(canonicalJson(report)),
    files: hashes,
  };
  files["manifest.json"] = JSON.stringify(manifest, null, 2) + "\n";
  return files;
}

export interface VerificationItem { check: string; ok: boolean; detail: string }

/** Integrity and reproduction check of a bundle (used by the public verifier page). */
export async function verifyBundle(files: Record<string, string>): Promise<VerificationItem[]> {
  const out: VerificationItem[] = [];
  const m = JSON.parse(files["manifest.json"] ?? "null");
  if (!m || m.format !== BUNDLE_FORMAT) {
    return [{ check: "Bundle format", ok: false, detail: "manifest.json missing or not a ReSIP analysis audit bundle" }];
  }
  out.push({ check: "Bundle format", ok: true, detail: m.format });
  for (const [name, expected] of Object.entries<string>(m.files)) {
    if (!(name in files)) { out.push({ check: `File present: ${name}`, ok: false, detail: "missing" }); continue; }
    const got = await sha256(files[name]);
    out.push({ check: `SHA-256 ${name}`, ok: got === expected, detail: got === expected ? "matches manifest" : `expected ${expected.slice(0, 12)}…, got ${got.slice(0, 12)}…` });
  }
  out.push({ check: "Plan version", ok: m.planVersion === ANALYSIS_PLAN.version, detail: `bundle ${m.planVersion}, verifier ${ANALYSIS_PLAN.version}` });
  const input = fromCsvFiles(files, m.studyCode, m.simulated);
  const rerun = runAnalysis(input, { suppressSmallCounts: false });
  const digest = await sha256(canonicalJson(rerun));
  out.push({ check: "Results reproduced from data", ok: digest === m.resultsDigest, detail: digest === m.resultsDigest ? "re-run gives identical results" : "re-run differs from results.json" });
  return out;
}
