#!/usr/bin/env python3
"""
Independent reproduction of the LKM-SNF-2026 analysis (Python / SciPy).

Written separately from the ReSIP TypeScript engine. It reads only the CSV
files in an audit bundle, applies the locked analysis plan (plan.json), and
compares every result with results.json.

Usage (from inside an unzipped audit bundle):
    python3 audit/reproduce.py            # or: python3 audit/reproduce.py path/to/bundle
Requires: Python 3.9+, numpy, scipy  (pip install numpy scipy)
Exit code 0 = every check passed, 1 = at least one difference.
"""
import csv, json, math, os, sys
import numpy as np
from scipy import stats

ROOT = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
TOL = 1e-6  # absolute tolerance for numeric comparisons

def read_csv(name):
    with open(os.path.join(ROOT, "data", name), newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))

plan = json.load(open(os.path.join(ROOT, "plan.json")))
results = json.load(open(os.path.join(ROOT, "results.json")))
SC = plan["scoring"]
SUBS = ["personal", "work", "patient"]
TPS = ["pre", "post", "followup"]
MIN = plan["minimumReportableGroup"]

participants = {r["study_id"]: r["status"] for r in read_csv("participants.csv")}
ids = sorted(participants)

# ---- scoring (one response per participant per time point, earliest kept)
rows = sorted(read_csv("responses.csv"), key=lambda r: (r["study_id"], r["timepoint"], r["submitted_at"]))
scores, context = {}, {}
for r in rows:
    key = (r["study_id"], r["timepoint"])
    if r["study_id"] not in participants or key in scores:
        continue
    item = {}
    for k in range(1, 20):
        v = r[f"item_{k:02d}"]
        if v == "":
            item[k] = None
            continue
        s = SC["itemScores"][int(v) - 1]
        item[k] = 100 - s if k in SC["reverseScoredItems"] else s
    sc = {}
    for sub in SUBS:
        vals = [item[k] for k in SC["subscaleItems"][sub] if item[k] is not None]
        sc[sub] = float(np.mean(vals)) if len(vals) >= SC["minimumItemsAnswered"][sub] else None
    scores[key] = sc
    context[key] = [None if r[c] == "" else r[c] == "1" for c in ("c1", "c2", "c3")]

def score(i, tp, s):
    return scores.get((i, tp), {}).get(s)

# ---- comparisons
def holm(p):
    order = np.argsort(p, kind="stable")
    adj, running, m = [0.0] * len(p), 0.0, len(p)
    for k, i in enumerate(order):
        running = max(running, min(1.0, (m - k) * p[i]))
        adj[i] = running
    return adj

def signed_rank_counts(n):
    c = np.zeros(n * (n + 1) // 2 + 1, dtype=object); c[0] = 1
    for k in range(1, n + 1):
        nxt = c.copy(); nxt[k:] += c[:-k]
        c = nxt
    return c

def hodges_lehmann(d):
    n = len(d)
    walsh = sorted((d[i] + d[j]) / 2 for i in range(n) for j in range(i, n))
    counts = signed_rank_counts(n); perms = 2 ** n
    cum, qu = 0, 0
    for x, c in enumerate(counts):
        cum += c
        if cum / perms >= 0.025:
            qu = x; break
    qu = max(qu, 1)
    return float(np.median(walsh)), walsh[qu - 1], walsh[len(walsh) - qu]

indep = {"comparisons": []}
for cmp in plan["comparisons"]:
    fam = []
    for s in SUBS:
        pairs = [(score(i, cmp["from"], s), score(i, cmp["to"], s)) for i in ids]
        pairs = [(a, b) for a, b in pairs if a is not None and b is not None]
        d = np.array([b - a for a, b in pairs], dtype=float)
        c = {"id": cmp["id"], "subscale": s, "n": len(d)}
        if len(d) >= MIN:
            c["meanDiff"] = float(d.mean())
            sw = stats.shapiro(d)
            c["W"], c["swP"] = float(sw.statistic), float(sw.pvalue)
            if sw.pvalue >= plan["normalityAlpha"]:
                tt = stats.ttest_rel([b for a, b in pairs], [a for a, b in pairs])
                ci = tt.confidence_interval(0.95)
                c.update(test="paired t", t=float(tt.statistic), p=float(tt.pvalue),
                         ciLow=float(ci.low), ciHigh=float(ci.high), dz=float(d.mean() / d.std(ddof=1)))
            else:
                # Plan: exact p only when no ties or zero differences and n <= 50.
                nz = d[d != 0]
                exact = len(nz) == len(d) and len(nz) <= 50 and len(np.unique(np.abs(nz))) == len(nz)
                w = stats.wilcoxon(d, zero_method="wilcox", correction=False, method="exact" if exact else "approx")
                hl, lo, hi = hodges_lehmann(list(d))
                c.update(test="Wilcoxon signed-rank", statistic=float(w.statistic), p=float(w.pvalue), hl=hl, hlLow=lo, hlHigh=hi)
        fam.append(c)
    testable = [c for c in fam if "p" in c]
    for c, a in zip(testable, holm([c["p"] for c in testable])):
        c["pHolm"] = a
    indep["comparisons"] += fam

# ---- descriptives
indep["descriptives"] = {}
for tp in TPS:
    for s in SUBS:
        v = np.array([x for x in (score(i, tp, s) for i in ids) if x is not None])
        indep["descriptives"][(tp, s)] = None if len(v) < MIN else dict(n=len(v), mean=v.mean(), sd=v.std(ddof=1), median=float(np.median(v)))

# ---- adherence
started = [i for i in ids if (i, "pre") in scores]
total = {i: 0 for i in started}
for r in read_csv("sessions.csv"):
    if r["study_id"] in total and 1 <= int(r["study_day"]) <= 30:
        total[r["study_id"]] += 1
adherent = sum(1 for i in started if total[i] >= plan["adherence"]["minimumSessions"])

# ---- compare with results.json
checks = []
def check(label, ours, theirs, tol=TOL):
    if ours is None or theirs is None:
        ok = ours is None and theirs is None
    elif isinstance(ours, str) or isinstance(theirs, str):
        ok = ours == theirs
    else:
        ok = math.isclose(float(ours), float(theirs), rel_tol=0, abs_tol=tol)
    checks.append((ok, label, ours, theirs))

for c in indep["comparisons"]:
    r = next(x for x in results["comparisons"] if x["id"] == c["id"] and x["subscale"] == c["subscale"])
    tag = f"{c['id']} {c['subscale']}"
    check(f"{tag}: n", c["n"], r["n"])
    if "meanDiff" not in c:
        check(f"{tag}: suppressed (n < {MIN})", None, r["p"]); continue
    check(f"{tag}: mean difference", c["meanDiff"], r["meanDiff"])
    check(f"{tag}: Shapiro-Wilk W", c["W"], r["normality"]["w"], 1e-4)
    check(f"{tag}: Shapiro-Wilk p", c["swP"], r["normality"]["p"], 1e-4)
    check(f"{tag}: test selected", c["test"], r["test"])
    check(f"{tag}: p", c["p"], r["p"], 1e-5)
    check(f"{tag}: Holm-adjusted p", c["pHolm"], r["pHolm"], 1e-5)
    if c["test"] == "paired t":
        t = r["pairedT"]
        check(f"{tag}: t", c["t"], t["t"], 1e-6)
        check(f"{tag}: 95% CI low", c["ciLow"], t["ciLow"], 1e-5)
        check(f"{tag}: 95% CI high", c["ciHigh"], t["ciHigh"], 1e-5)
        check(f"{tag}: Cohen's dz", c["dz"], t["dz"])
    else:
        w = r["wilcoxon"]
        check(f"{tag}: Wilcoxon statistic", c["statistic"], w["statistic"])
        check(f"{tag}: Hodges-Lehmann", c["hl"], w["hl"])
        check(f"{tag}: HL CI low", c["hlLow"], w["hlCiLow"])
        check(f"{tag}: HL CI high", c["hlHigh"], w["hlCiHigh"])

for (tp, s), d in indep["descriptives"].items():
    r = results["descriptives"][tp][s]
    if d is None:
        check(f"{tp} {s}: suppressed (n < {MIN})", None, r); continue
    for k in ("n", "mean", "sd", "median"):
        check(f"{tp} {s}: {k}", d[k], r[k])

check("Adherence: participants who started", len(started), results["adherence"]["participants"])
check("Adherence: protocol adherent", adherent, results["adherence"]["adherent"])
for tp in TPS:
    check(f"Completed {tp}", sum(1 for k in scores if k[1] == tp), results["flow"]["completed"][tp])

failed = [c for c in checks if not c[0]]
for ok, label, ours, theirs in checks:
    print(f"{'PASS' if ok else 'FAIL'}  {label}" + ("" if ok else f"   independent={ours!r} platform={theirs!r}"))
print(f"\n{len(checks) - len(failed)} of {len(checks)} checks passed (Python {sys.version.split()[0]}, SciPy {__import__('scipy').__version__}).")
sys.exit(1 if failed else 0)
