import { ANALYSIS_PLAN } from "@/src/lib/analysis/plan";

export const dynamic = "force-static";

export function GET() {
  return Response.json(ANALYSIS_PLAN);
}
