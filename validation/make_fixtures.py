"""Reference values from SciPy for the engine's unit tests (tests/fixtures/scipy.json)."""
import json, numpy as np
from scipy import stats
rng = np.random.default_rng(7)
cases = []
for n in list(range(3, 31)) + [35, 40, 50]:
    for kind in ("normal", "skewed"):
        x = rng.normal(0, 10, n) if kind == "normal" else rng.exponential(8, n) - 4
        x = np.round(x, 6)
        sw = stats.shapiro(x)
        tt = stats.ttest_1samp(x, 0); ci = tt.confidence_interval(0.95)
        c = {"x": x.tolist(), "sw_w": float(sw.statistic), "sw_p": float(sw.pvalue),
             "t": float(tt.statistic), "t_p": float(tt.pvalue), "ci": [float(ci.low), float(ci.high)]}
        if n >= 5:
            w = stats.wilcoxon(x, method="exact", correction=False)
            c["w_exact_stat"], c["w_exact_p"] = float(w.statistic), float(w.pvalue)
        cases.append(c)
tied = []
for i in range(25):
    n = int(rng.integers(6, 30))
    x = np.round(rng.normal(-3, 8, n) / 25 * 6) * 25 / 6  # CBI-like steps with ties and zeros
    w = stats.wilcoxon(x, zero_method="wilcox", correction=False, method="approx")
    tied.append({"x": x.tolist(), "stat": float(w.statistic), "p": float(w.pvalue)})
json.dump({"continuous": cases, "tied": tied}, open("tests/fixtures/scipy.json", "w"))
print(len(cases), len(tied))
