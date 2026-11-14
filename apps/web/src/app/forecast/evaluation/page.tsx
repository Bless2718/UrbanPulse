import Link from "next/link";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { ArrowLeft, BarChart3, FlaskConical, ShieldAlert, Terminal, Database } from "lucide-react";

import SiteNav from "@/components/SiteNav";
import NeonPageHero from "@/components/NeonPageHero";
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
    <main className="urban-shell urban-subpage min-h-screen">
      <SiteNav active="evaluation" />
      <div className="relative z-[1] mx-auto max-w-[1470px] px-4 py-7 sm:px-6 lg:px-8">
        <Link href="/forecast/districts" className="urban-back-link inline-flex items-center gap-2 text-sm text-slate-300">
          <ArrowLeft className="h-4 w-4" /> District Lab
        </Link>
        <div className="mt-5">
          <NeonPageHero
            eyebrow="Historical forecast intelligence"
            title="Forecast"
            accent="evaluation lab."
            icon={BarChart3}
            description="Explore real historical backtest results, compare experimental baseline errors, and inspect the evidence required before district forecasts can be approved."
            spotlightLabel="Data provenance"
            spotlightTitle="Historical results, not live risk"
            spotlightText="Every chart uses held-out accident counts from research-only experiments, with 2024 revision and district geography warnings retained."
            spotlightIcon={Database}
          />
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link href="/forecast/districts" className="urban-action-link inline-flex items-center gap-2 px-4 py-2.5 text-sm">
            <FlaskConical className="h-4 w-4" /> District scenario explorer
          </Link>
          <Link href="/conditions" className="urban-action-link inline-flex items-center gap-2 px-4 py-2.5 text-sm">
            Live weather context
          </Link>
          <span className="urban-evidence-pill inline-flex items-center px-3 py-2 text-xs text-cyan-100">
            No forecast published from this report
          </span>
        </div>

        {result.status === "ready" ? <ForecastEvaluationLab report={result.report} /> : (
          <section className="urban-panel urban-research-notice mt-8 p-6 sm:p-8">
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
