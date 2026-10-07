import { VerifyClient } from "./VerifyClient";

export const metadata = { title: "Verify a bundle" };

export default function VerifyPage() {
  return (
    <>
      <h1>Verify an audit bundle</h1>
      <p>
        Choose an audit bundle (.zip) downloaded from the study platform by the faculty advisor. This page checks that every file matches
        the fingerprint recorded when the bundle was made, and re-runs the locked analysis on the bundle&apos;s data to confirm it gives
        exactly the same results.
      </p>
      <p className="small">The file is read inside your browser. This page is not allowed to make any network connection, so nothing is uploaded.</p>
      <VerifyClient />
      <p className="small">No bundle yet? Try the <a href="/api/demo?format=bundle">simulated bundle</a> from the demo.</p>
    </>
  );
}
