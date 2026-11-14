import Link from "next/link";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { ArrowLeft, BarChart3, FlaskConical, ShieldAlert, Terminal } from "lucide-react";

import SiteNav from "@/components/SiteNav";
import ForecastEvaluationLab from "@/components/ForecastEvaluationLab";
import { parseEvaluationReport, type EvaluationReport } from "@/lib/forecastEvaluation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type LoadResult =
  | { status: "ready"; report: EvaluationReport }
  | { status: "missing" }
  | { status: "invalid" };

async function readResearchReport(): Promise<LoadResult> {
  // A separately generated Phase 3 report, NOT a production prediction endpoint.
  // Docker mounts ./reports read-only to /app/reports; local development
  // resolves apps/web/../../reports. Nothing fabricated is bundled with the UI.
  const sources = [
    process.env.TN_DISTRICT_BACKTEST_REPORT_PATH,
    path.resolve(process.cwd(), "reports/tn_district_backtest.json"),
    path.resolve(process.cwd(), "../../reports/tn_district_backtest.json"),
  ].filter((value): value is string => !!value);
  const attempted = new Set<string>();
  for (const source of sources) {
    if (attempted.has(source)) continue;
    attempted.add(source);
    try {
      const contents = await readFile(source, "utf8");
      try {
        return { status: "ready", report: parseEvaluationReport(JSON.parse(contents) as unknown) };
      } catch {
        // A present but invalid report MUST NOT fall back to another version.
        return { status: "invalid" };
      }
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") continue;
      return { status: "invalid" };
    }
  }
  return { status: "missing" };
}

export default async function ForecastEvaluationPage() {
  const result = await readResearchReport();
  return (
    <main className="min-h-screen">
      <SiteNav active="evaluation" />
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <Link href="/forecast/districts"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to district lab
        </Link>
        <div className="mt-8 flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-400/[0.06] px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-cyan-300">
              <FlaskConical className="h-3.5 w-3.5" /> Phase 4 · Research dashboard
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
              Forecast Evaluation
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-400">
              Understand how experimental accident-count baselines performed on held-out
              historical years. Compare methods, investigate reporting limitations,
              and see why none are approved as real-world forecasts.
            </p>
          </div>
          <BarChart3 className="h-8 w-8 text-cyan-300" />
        </div>

        {result.status === "ready" ? <ForecastEvaluationLab report={result.report} /> : (
          <section className="mt-8 rounded-3xl border border-amber-300/20 bg-amber-300/[0.035] p-6 sm:p-8">
            <div className="flex items-start gap-3">
              {result.status === "invalid" ?
                <ShieldAlert className="mt-1 h-6 w-6 text-amber-300"/> :
                <Terminal className="mt-1 h-6 w-6 text-amber-300"/>}
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {result.status === "missing" ? "Generate the historical evaluation report" :
                    "The research report could not be verified"}
                </h2>
                <p role="status" className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                  {result.status === "missing" ?
                    "No Phase 3 JSON report is available yet. The dashboard never invents historical results or substitutes production forecasts." :
                    "The JSON report lacks required experiment, provenance or quarantine safeguards (or cannot be read). No results were displayed. Regenerate it using the current Phase 3 pipeline."}
                </p>
                <p className="mt-5 text-sm text-slate-400">
                  From your UrbanPulse project root, first run the Phase 3 export:
                </p>
                <pre className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-slate-950/70 p-4 text-xs leading-6 text-cyan-100"><code>
                  {"New-Item -ItemType Directory -Force .\\reports | Out-Null\n" +
                    'docker compose --profile jobs run --rm -v "${PWD}/reports:/app/reports" ingestion python ingestion/backtest_tn_district_experiments.py --output /app/reports/tn_district_backtest.json'}
                </code></pre>
                <p className="mt-4 text-sm text-slate-400">
                  Then refresh this page. The web container must mount the reports directory
                  read-only; see the Phase 4 runbook.
                </p>
                <Link href="/forecast/districts" className="mt-5 inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-white">
                  Return to District Lab <ArrowLeft className="h-4 w-4 rotate-180" />
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
