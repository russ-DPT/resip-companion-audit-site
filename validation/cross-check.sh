#!/usr/bin/env bash
# End-to-end cross-check: builds simulated audit bundles with the TypeScript
# engine and reproduces each one independently in Python and in R.
# Writes validation/cross-check-results.json. Usage: validation/cross-check.sh [studies]
set -euo pipefail
cd "$(dirname "$0")/.."
STUDIES="${1:-40}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
py_ok=0; r_ok=0; py_checks=0; py_pass=0; r_checks=0; r_pass=0; minN=999; maxN=0
for s in $(seq 1 "$STUDIES"); do
  n=$((8 + s % 15)); e=$(( -(s % 12) ))
  (( n < minN )) && minN=$n; (( n > maxN )) && maxN=$n
  npx tsx scripts/make-sim-bundle.ts "$WORK/s$s" "$s" "$n" "$e" > /dev/null
  pushd "$WORK/s$s" > /dev/null
  if python3 audit/reproduce.py > py.txt; then py_ok=$((py_ok + 1)); fi
  if Rscript audit/reproduce.R > r.txt; then r_ok=$((r_ok + 1)); fi
  read -r a b < <(grep -oE '^[0-9]+ of [0-9]+' py.txt | awk '{print $1, $3}')
  py_pass=$((py_pass + a)); py_checks=$((py_checks + b))
  read -r a b < <(grep -oE '^[0-9]+ of [0-9]+' r.txt | awk '{print $1, $3}')
  r_pass=$((r_pass + a)); r_checks=$((r_checks + b))
  popd > /dev/null
done
SCIPY=$(python3 -c "import scipy; print(scipy.__version__)")
RVER=$(Rscript -e 'cat(R.version.string)')
cat > validation/cross-check-results.json <<JSON
{
  "date": "$(date -u +%Y-%m-%d)",
  "studies": $STUDIES, "minN": $minN, "maxN": $maxN,
  "scipy": "$SCIPY", "r": "$RVER",
  "python": { "studiesPassed": $py_ok, "checks": $py_checks, "checksPassed": $py_pass },
  "r_": { "studiesPassed": $r_ok, "checks": $r_checks, "checksPassed": $r_pass }
}
JSON
cat validation/cross-check-results.json
[[ $py_ok -eq $STUDIES && $r_ok -eq $STUDIES ]]
