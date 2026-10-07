"use client";
// Reads the chosen bundle in the browser. Nothing is sent anywhere: this
// component makes no network requests, and the page's Content Security
// Policy (next.config.ts) sets connect-src 'none'.
import { useState } from "react";
import { verifyBundle } from "@/src/lib/analysis/audit";
import { unzipFiles } from "@/src/lib/analysis/zip";

type Check = { check: string; ok: boolean; detail: string };
type Manifest = Record<string, unknown> | null;

export function VerifyClient() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [manifest, setManifest] = useState<Manifest>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true); setError(null); setChecks(null); setManifest(null);
    try {
      const files = unzipFiles(new Uint8Array(await file.arrayBuffer()));
      setManifest(files["manifest.json"] ? JSON.parse(files["manifest.json"]) : null);
      setChecks(await verifyBundle(files));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const allOk = checks?.every((c) => c.ok);
  return (
    <>
      <label className="drop">
        Choose audit bundle (.zip)
        <br />
        <input id="bundle" type="file" accept=".zip,application/zip" onChange={(e) => onFile(e.target.files?.[0])} />
      </label>
      <div id="result" aria-live="polite">
        {busy && <p>Checking…</p>}
        {error && <p className="verdict bad">Could not read this file: {error}</p>}
        {checks && (
          <>
            <p className={`verdict ${allOk ? "ok" : "bad"}`}>
              {allOk ? "Verified: every file is intact and the results reproduce exactly." : "Not verified: see the failed checks below."}
            </p>
            {manifest && (
              <dl className="meta">
                <dt>Study</dt><dd>{String(manifest.studyCode)}{manifest.simulated ? " (simulated data)" : ""}</dd>
                <dt>Analysis plan</dt><dd>{String(manifest.planId)} v{String(manifest.planVersion)}</dd>
                <dt>Engine</dt><dd>v{String(manifest.engineVersion)}</dd>
                <dt>Source commit</dt><dd><code>{String(manifest.sourceCommit ?? "not recorded")}</code></dd>
                <dt>Generated</dt><dd>{String(manifest.generatedAt)} by {String(manifest.generatedByRole)}</dd>
                <dt>Results fingerprint</dt><dd><code>{String(manifest.resultsDigest)}</code></dd>
              </dl>
            )}
            <div className="wrap">
              <table>
                <thead><tr><th>Check</th><th>Result</th><th>Detail</th></tr></thead>
                <tbody>
                  {checks.map((c) => (
                    <tr key={c.check}><td>{c.check}</td><td className={c.ok ? "ok" : "bad"}>{c.ok ? "Pass" : "Fail"}</td><td>{c.detail}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="hint">Next step for an independent check: unzip the bundle and run <code>python3 audit/reproduce.py</code> or <code>Rscript audit/reproduce.R</code>.</p>
          </>
        )}
      </div>
    </>
  );
}
