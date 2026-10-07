// Exports a verbatim copy of the analysis engine for embedding in another
// application (ReSIP), with a SHA-256 manifest that proves the copy is
// identical to this repository at the exported commit.
// Usage: node scripts/export-engine.mjs <outDir> [repoUrl]
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const [outDir, repoUrl = process.env.ANALYSIS_REPO_URL ?? ""] = process.argv.slice(2);
if (!outDir) { console.error("usage: node scripts/export-engine.mjs <outDir> [repoUrl]"); process.exit(2); }

execSync("node scripts/embed-audit.mjs", { cwd: root, stdio: "ignore" });
const src = join(root, "src/lib/analysis");
const git = (cmd) => { try { return execSync(`git ${cmd}`, { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { return null; } };
const dirty = git("status --porcelain -- src/lib/analysis");
mkdirSync(outDir, { recursive: true });

const files = {};
for (const name of readdirSync(src).filter((f) => f.endsWith(".ts")).sort()) {
  copyFileSync(join(src, name), join(outDir, name));
  files[name] = createHash("sha256").update(readFileSync(join(src, name))).digest("hex");
}
const plan = readFileSync(join(src, "plan.ts"), "utf8");
const pick = (re) => (plan.match(re) ?? [])[1] ?? null;
const manifest = {
  engineVersion: JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version,
  planId: pick(/id: "([^"]+)"/),
  planVersion: pick(/version: "([^"]+)"/),
  sourceRepository: repoUrl || null,
  sourceTag: git("describe --tags --exact-match"),
  sourceCommit: git("rev-parse HEAD"),
  sourceHadUncommittedChanges: Boolean(dirty),
  exportedAt: new Date().toISOString(),
  files,
};
writeFileSync(join(outDir, "ENGINE-MANIFEST.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`exported ${Object.keys(files).length} engine files to ${outDir}`);
if (!manifest.sourceTag) console.warn("WARNING: not on a release tag. Export from a tagged release (e.g. v1.0.0) for production.");
if (dirty) console.warn("WARNING: engine has uncommitted changes; the manifest will not match the repository.");
