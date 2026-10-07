// Writes a simulated audit bundle (folder + .zip) for testing the audit tools.
// Usage: npx tsx scripts/make-sim-bundle.ts [outDir] [seed] [participants] [effectT2]
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { buildAuditBundle, simulateStudy, zipFiles } from "../src/lib/analysis";

const [outDir = "out/sim-bundle", seed = "20261007", n = "16", eff = "-8"] = process.argv.slice(2);
const input = simulateStudy({ seed: Number(seed), participants: Number(n), effectT2: Number(eff) });
const files = await buildAuditBundle(input, { generatedAt: "2026-10-07T00:00:00Z", generatedByRole: "simulation" });
for (const [name, text] of Object.entries(files)) {
  mkdirSync(dirname(join(outDir, name)), { recursive: true });
  writeFileSync(join(outDir, name), text);
}
writeFileSync(`${outDir}.zip`, zipFiles(files));
console.log(`wrote ${Object.keys(files).length} files to ${outDir} and ${outDir}.zip`);
