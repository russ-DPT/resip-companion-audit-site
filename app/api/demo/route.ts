// GET /api/demo?format=html|csv|json|bundle&seed=&participants=&effect=&role=
// Public demonstration endpoint. It only ever analyses SIMULATED data
// generated from the parameters; it has no access to any study database.
import { ANALYSIS_PLAN } from "@/src/lib/analysis/plan";
import { runAnalysis } from "@/src/lib/analysis/engine";
import { simulateStudy } from "@/src/lib/analysis/simulate";
import { buildAuditBundle } from "@/src/lib/analysis/audit";
import { renderReportHtml, reportToCsv } from "@/src/lib/analysis/render";
import { zipFiles } from "@/src/lib/analysis/zip";
import { parseDemoParams } from "@/lib/site/demo-params";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const p = parseDemoParams((k) => url.searchParams.get(k));
  const format = url.searchParams.get("format") ?? "html";
  const input = simulateStudy({ seed: p.seed, participants: p.participants, effectT2: p.effect, effectT3: Math.round(p.effect * 0.6) });
  const report = runAnalysis(input, { suppressSmallCounts: p.role !== "research_advisor" });
  const base = `SIMULATED-analysis-v${ANALYSIS_PLAN.version}-seed${p.seed}`;
  const h = (type: string, name?: string): HeadersInit => ({
    "content-type": type,
    "cache-control": "public, max-age=3600",
    "x-robots-tag": "noindex",
    ...(name ? { "content-disposition": `attachment; filename="${name}"` } : {}),
  });

  switch (format) {
    case "json":
      return new Response(JSON.stringify(report, null, 2), { headers: h("application/json; charset=utf-8", `${base}.json`) });
    case "csv":
      return new Response(reportToCsv(report), { headers: h("text/csv; charset=utf-8", `${base}.csv`) });
    case "bundle": {
      if (p.role !== "research_advisor") return new Response("Only the Research Advisor can download the audit bundle.", { status: 403 });
      const files = await buildAuditBundle(input, {
        generatedAt: "demo", generatedByRole: "demo (research_advisor)", sourceCommit: process.env.VERCEL_GIT_COMMIT_SHA,
      });
      return new Response(zipFiles(files) as unknown as BodyInit, { headers: h("application/zip", `${base}-audit-bundle.zip`) });
    }
    default:
      return new Response(renderReportHtml(report, { generatedAt: "demo" }), {
        headers: h("text/html; charset=utf-8", url.searchParams.get("download") ? `${base}.html` : undefined),
      });
  }
}
