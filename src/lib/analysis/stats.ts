// Statistical procedures named in the locked analysis plan.
import { pnorm, pnormUpper, qnorm, qt, tTwoSided } from "./math";

export function mean(x: number[]): number {
  return x.reduce((s, v) => s + v, 0) / x.length;
}

export function sd(x: number[]): number {
  if (x.length < 2) return NaN;
  const m = mean(x);
  return Math.sqrt(x.reduce((s, v) => s + (v - m) ** 2, 0) / (x.length - 1));
}

export function median(x: number[]): number {
  const s = [...x].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

export interface Descriptives {
  n: number;
  mean: number;
  sd: number;
  median: number;
  min: number;
  max: number;
}

export function describe(x: number[]): Descriptives {
  return {
    n: x.length,
    mean: x.length ? mean(x) : NaN,
    sd: sd(x),
    median: x.length ? median(x) : NaN,
    min: x.length ? Math.min(...x) : NaN,
    max: x.length ? Math.max(...x) : NaN,
  };
}

// ---------------------------------------------------------------- Shapiro-Wilk
// Royston (1995) algorithm AS R94, as used by R shapiro.test and SciPy.

function poly(cc: number[], x: number): number {
  let r = 0;
  for (let i = cc.length - 1; i >= 0; i--) r = r * x + cc[i];
  return r;
}

export interface ShapiroWilk { w: number; p: number }

export function shapiroWilk(data: number[]): ShapiroWilk {
  const n = data.length;
  if (n < 3) throw new Error("Shapiro-Wilk requires at least 3 observations");
  const x = [...data].sort((a, b) => a - b);
  const range = x[n - 1] - x[0];
  if (range < 1e-19) return { w: 1, p: 1 }; // all values identical
  const nn2 = Math.floor(n / 2);
  const a = new Array<number>(nn2 + 1).fill(0); // 1-indexed

  const c1 = [0.0, 0.221157, -0.147981, -2.07119, 4.434685, -2.706056];
  const c2 = [0.0, 0.042981, -0.293762, -1.752461, 5.682633, -3.582633];
  if (n === 3) {
    a[1] = Math.SQRT1_2;
  } else {
    const an25 = n + 0.25;
    const m = new Array<number>(nn2 + 1).fill(0);
    let summ2 = 0;
    for (let i = 1; i <= nn2; i++) {
      m[i] = qnorm((i - 0.375) / an25);
      summ2 += m[i] * m[i];
    }
    summ2 *= 2;
    const ssumm2 = Math.sqrt(summ2);
    const rsn = 1 / Math.sqrt(n);
    const a1 = poly(c1, rsn) - m[1] / ssumm2;
    let i1: number, fac: number;
    if (n > 5) {
      i1 = 3;
      const a2 = -m[2] / ssumm2 + poly(c2, rsn);
      fac = Math.sqrt((summ2 - 2 * m[1] ** 2 - 2 * m[2] ** 2) / (1 - 2 * a1 ** 2 - 2 * a2 ** 2));
      a[2] = a2;
    } else {
      i1 = 2;
      fac = Math.sqrt((summ2 - 2 * m[1] ** 2) / (1 - 2 * a1 ** 2));
    }
    a[1] = a1;
    for (let i = i1; i <= nn2; i++) a[i] = -m[i] / fac;
  }

  // W statistic
  const xm = mean(x);
  const ssq = x.reduce((s, v) => s + (v - xm) ** 2, 0);
  let num = 0;
  for (let i = 1; i <= nn2; i++) num += a[i] * (x[n - i] - x[i - 1]);
  let w = (num * num) / ssq;
  if (w > 1) w = 1;

  // p value
  if (n === 3) {
    const pi6 = 1.90985931710274, stqr = 1.0471975511966;
    return { w, p: Math.max(0, pi6 * (Math.asin(Math.sqrt(w)) - stqr)) };
  }
  const w1 = Math.log(1 - w);
  const xx = Math.log(n);
  let m: number, s: number, y = w1;
  if (n <= 11) {
    const gamma = poly([-2.273, 0.459], n);
    if (y >= gamma) return { w, p: 1e-99 };
    y = -Math.log(gamma - y);
    m = poly([0.544, -0.39978, 0.025054, -6.714e-4], n);
    s = Math.exp(poly([1.3822, -0.77857, 0.062767, -0.0020322], n));
  } else {
    m = poly([-1.5861, -0.31082, -0.083751, 0.0038915], xx);
    s = Math.exp(poly([-0.4803, -0.082676, 0.0030302], xx));
  }
  return { w, p: pnormUpper((y - m) / s) };
}

// ---------------------------------------------------------------- paired t

export interface PairedT {
  n: number;
  meanDiff: number;
  sdDiff: number;
  t: number;
  df: number;
  p: number;
  ciLow: number;
  ciHigh: number;
  dz: number;
  dzCiLow: number;
  dzCiHigh: number;
}

/** diffs = later minus earlier; negative means burnout decreased. */
export function pairedT(diffs: number[]): PairedT {
  const n = diffs.length;
  const md = mean(diffs);
  const s = sd(diffs);
  const se = s / Math.sqrt(n);
  const df = n - 1;
  const t = s === 0 ? (md === 0 ? 0 : Math.sign(md) * Infinity) : md / se;
  const p = s === 0 ? (md === 0 ? 1 : 0) : tTwoSided(t, df);
  const tc = qt(0.975, df);
  const dz = s === 0 ? NaN : md / s;
  const seDz = Math.sqrt(1 / n + (dz * dz) / (2 * n));
  const zc = qnorm(0.975);
  return {
    n, meanDiff: md, sdDiff: s, t, df, p,
    ciLow: md - tc * se, ciHigh: md + tc * se,
    dz, dzCiLow: dz - zc * seDz, dzCiHigh: dz + zc * seDz,
  };
}

// ---------------------------------------------------------------- Wilcoxon

/** Average ranks (1-based) of values, ties share the mean rank. */
export function rankAvg(values: number[]): { ranks: number[]; tieGroups: number[] } {
  const idx = values.map((v, i) => [v, i] as [number, number]).sort((a, b) => a[0] - b[0]);
  const ranks = new Array<number>(values.length);
  const tieGroups: number[] = [];
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const r = (i + j + 2) / 2;
    for (let k = i; k <= j; k++) ranks[idx[k][1]] = r;
    if (j > i) tieGroups.push(j - i + 1);
    i = j + 1;
  }
  return { ranks, tieGroups };
}

/** Exact null distribution of the signed-rank statistic for ranks 1..n (no ties). */
function signedRankCounts(n: number): number[] {
  const max = (n * (n + 1)) / 2;
  let c = new Array<number>(max + 1).fill(0);
  c[0] = 1;
  for (let k = 1; k <= n; k++) {
    const next = c.slice();
    for (let s = k; s <= max; s++) next[s] += c[s - k];
    c = next;
  }
  return c;
}

export interface Wilcoxon {
  n: number; // non-zero pairs used
  nZero: number;
  vPlus: number; // sum of positive ranks
  statistic: number; // min(V+, V-), as reported by SciPy
  z: number;
  p: number;
  method: "exact" | "normal approximation";
  r: number;
  hl: number; // Hodges-Lehmann estimate (median of Walsh averages)
  hlCiLow: number;
  hlCiHigh: number;
  hlCiLevel: number; // achieved confidence level
}

export function wilcoxonSignedRank(diffs: number[]): Wilcoxon {
  const nonzero = diffs.filter((d) => d !== 0);
  const nZero = diffs.length - nonzero.length;
  const n = nonzero.length;
  const { ranks, tieGroups } = rankAvg(nonzero.map(Math.abs));
  let vPlus = 0;
  nonzero.forEach((d, i) => { if (d > 0) vPlus += ranks[i]; });
  const total = (n * (n + 1)) / 2;
  const vMinus = total - vPlus;

  const mu = total / 2;
  let varV = (n * (n + 1) * (2 * n + 1)) / 24;
  varV -= tieGroups.reduce((s, t) => s + (t ** 3 - t), 0) / 48;
  const z = varV > 0 ? (vPlus - mu) / Math.sqrt(varV) : 0;

  let p: number;
  let method: Wilcoxon["method"];
  if (n > 0 && n <= 50 && tieGroups.length === 0 && nZero === 0) {
    method = "exact";
    const counts = signedRankCounts(n);
    const totalPerms = 2 ** n;
    const k = Math.min(vPlus, vMinus);
    let lower = 0;
    for (let s = 0; s <= k; s++) lower += counts[s];
    p = Math.min(1, (2 * lower) / totalPerms);
  } else {
    method = "normal approximation";
    p = n === 0 ? 1 : 2 * pnormUpper(Math.abs(z));
  }

  // Hodges-Lehmann estimate and exact CI from Walsh averages (all pairs, incl. zeros)
  const all = diffs;
  const N = all.length;
  const walsh: number[] = [];
  for (let i = 0; i < N; i++) for (let j = i; j < N; j++) walsh.push((all[i] + all[j]) / 2);
  walsh.sort((a, b) => a - b);
  const M = walsh.length;
  const hl = median(walsh);
  const counts = signedRankCounts(N);
  const perms = 2 ** N;
  // qu = smallest x with P(T <= x) >= 0.025 (R's qsignrank)
  let cum = 0, qu = 0;
  for (let x = 0; x < counts.length; x++) {
    cum += counts[x];
    if (cum / perms >= 0.025) { qu = x; break; }
  }
  if (qu === 0) qu = 1;
  let below = 0;
  for (let x = 0; x <= qu - 1; x++) below += counts[x];
  const achieved = 1 - (2 * below) / perms;
  const ql = M - qu;

  return {
    n, nZero, vPlus, statistic: Math.min(vPlus, vMinus), z, p, method,
    r: n > 0 ? Math.abs(z) / Math.sqrt(n) : NaN,
    hl, hlCiLow: walsh[qu - 1], hlCiHigh: walsh[ql], hlCiLevel: achieved,
  };
}

// ---------------------------------------------------------------- Holm

export function holm(p: number[]): number[] {
  const m = p.length;
  const order = p.map((v, i) => [v, i] as [number, number]).sort((a, b) => a[0] - b[0]);
  const adj = new Array<number>(m);
  let running = 0;
  order.forEach(([v, i], k) => {
    running = Math.max(running, Math.min(1, (m - k) * v));
    adj[i] = running;
  });
  return adj;
}

export { pnorm };
