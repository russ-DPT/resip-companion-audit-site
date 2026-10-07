import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

/** Deterministic zip: fixed timestamps and sorted entries. */
export function zipFiles(files: Record<string, string>): Uint8Array {
  const entries: Record<string, [Uint8Array, { mtime: Date }]> = {};
  for (const name of Object.keys(files).sort()) entries[name] = [strToU8(files[name]), { mtime: new Date("2000-01-01T00:00:00Z") }];
  return zipSync(entries, { level: 6 });
}

export function unzipFiles(data: Uint8Array): Record<string, string> {
  const raw = unzipSync(data);
  const out: Record<string, string> = {};
  for (const [name, bytes] of Object.entries(raw)) {
    if (name.endsWith("/")) continue;
    // Accept bundles zipped with or without a top-level folder.
    const parts = name.split("/");
    const key = parts.length > 1 && !["data", "audit"].includes(parts[0]) ? parts.slice(1).join("/") : name;
    out[key] = strFromU8(bytes);
  }
  return out;
}
