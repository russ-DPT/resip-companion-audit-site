// Copies the audit scripts into public/downloads so the site serves the
// exact files that ship inside every audit bundle. Runs before each build.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
mkdirSync(join(root, "public/downloads"), { recursive: true });
for (const f of ["reproduce.py", "reproduce.R", "reproduce.sps"]) copyFileSync(join(root, "audit", f), join(root, "public/downloads", f));
console.log("synced audit scripts to public/downloads");
