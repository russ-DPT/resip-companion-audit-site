import type { Metadata } from "next";
import { ANALYSIS_PLAN } from "@/src/lib/analysis/plan";
import { Nav } from "@/lib/site/nav";
import "./globals.css";

const commit = process.env.VERCEL_GIT_COMMIT_SHA ?? "";
const repoUrl = process.env.NEXT_PUBLIC_ANALYSIS_REPO_URL ?? "";

export const metadata: Metadata = {
  title: { default: "ReSIP Analysis Audit", template: "%s | ReSIP Analysis Audit" },
  description: "Locked statistical analysis plan, validation and independent audit tools for the LKM-SNF-2026 study.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header>
          <div className="k">ReSIP Analysis Audit · {ANALYSIS_PLAN.id}</div>
          <Nav />
        </header>
        <main>{children}</main>
        <footer>
          Analysis plan v{ANALYSIS_PLAN.version} (locked {ANALYSIS_PLAN.lockedOn}) · engine v{ANALYSIS_PLAN.engineVersion}
          {commit && <> · commit <code>{commit.slice(0, 12)}</code></>}
          {repoUrl && <> · <a href={repoUrl}>source code</a></>}. This site holds no participant data.
        </footer>
      </body>
    </html>
  );
}
