// Parameters for the public demo. Simulated data only; values are clamped
// so the demo cannot be used to run heavy computations.
export type DemoRole = "research_advisor" | "principal_investigator";

export interface DemoParams {
  seed: number;
  participants: number;
  effect: number;
  role: DemoRole;
  status: "closed" | "open";
}

const clampInt = (v: string | null | undefined, lo: number, hi: number, dflt: number) => {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
};

export function parseDemoParams(get: (k: string) => string | null | undefined): DemoParams {
  return {
    seed: clampInt(get("seed"), 1, 999999, 20261007),
    participants: clampInt(get("participants"), 6, 40, 16),
    effect: clampInt(get("effect"), -20, 10, -8),
    role: get("role") === "principal_investigator" ? "principal_investigator" : "research_advisor",
    status: get("status") === "open" ? "open" : "closed",
  };
}

export function demoQuery(p: DemoParams): string {
  return new URLSearchParams({
    seed: String(p.seed), participants: String(p.participants), effect: String(p.effect), role: p.role, status: p.status,
  }).toString();
}
