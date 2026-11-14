import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  BrainCircuit,
  CloudRain,
  Database,
  FlaskConical,
  MapPinned,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Workflow,
} from "lucide-react";

import SiteNav from "@/components/SiteNav";
import DistrictAccidentComparison from "@/components/DistrictAccidentComparison";
import StatewideHistoryChart from "@/components/StatewideHistoryChart";
import StatewideForecastPanel, { type StatewideForecast } from "@/components/StatewideForecastPanel";

type AccidentSummary = {
  year: number;
  fatal_accidents: number;
  fatal_killed: number;
  grievous_injury_accidents: number;
  minor_injury_accidents: number;
  non_injury_accidents: number;
  total_accidents: number;
  fatalities_per_100_accidents: number | null;
  yoy_accident_change_pct: number | null;
};

type AccidentForecast = {
  forecast_year: number;
  predicted_accidents: number;
  model_name: string;
  validation_mae: number;
  validation_rmse: number;
  validation_mape_pct: number;
};

type TamilNaduAnnual = {
  records: {
    year: number;
    provisional: boolean;
    total_accidents: number;
    persons_killed: number;
    source_url: string;
  }[];
};

const apiUrl =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000";

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(apiUrl + path, { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function SummaryCard({ label, value, detail, accent = false }: {
  label: string;
  value: string;
  detail: string;
  accent?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className={"mt-3 break-words text-3xl font-semibold tracking-tight tabular-nums " +
        (accent ? "text-amber-200" : "text-white")}>{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-400">{detail}</p>
    </article>
  );
}

export default async function Home() {
  const [accidents, forecast, tamilNaduAnnual, statewideForecast] = await Promise.all([
    fetchJson<AccidentSummary>("/api/v1/accidents/summary"),
    fetchJson<AccidentForecast>("/api/v1/accidents/forecast"),
    fetchJson<TamilNaduAnnual>("/api/v1/accidents/tamil-nadu/annual"),
    fetchJson<StatewideForecast>("/api/v1/predictions/tamil-nadu/annual"),
  ]);

  const statewideRecords = (tamilNaduAnnual?.records ?? [])
    .filter((record) =>
      Number.isInteger(record.year) &&
      Number.isFinite(record.total_accidents) &&
      Number.isFinite(record.persons_killed)
    )
    .sort((a, b) => a.year - b.year);
  const latest = statewideRecords[statewideRecords.length - 1];
  const reportedYear = latest?.year;
  const format = (count: number | undefined) =>
    count === undefined ? "—" : count.toLocaleString("en-IN");

  return (
    <main className="min-h-screen">
      <SiteNav active="dashboard" />
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.06] px-3 py-1.5 text-xs font-medium uppercase tracking-[0.13em] text-cyan-300">
              <Activity className="h-3.5 w-3.5" /> Tamil Nadu · Research dashboard
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              Road Safety Overview
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
              Explore observed accidents, understand reporting trends and compare experimental forecasts.
              Every figure is identified as historical, provisional or research-only.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/forecast/evaluation"
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] px-4 py-2.5 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/10">
              <BarChart3 className="h-4 w-4" /> Forecast evaluation <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link href="/map"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-2.5 text-sm text-slate-200 transition hover:bg-white/[0.07]">
              <MapPinned className="h-4 w-4" /> Open map
            </Link>
          </div>
        </header>

        <section role="note" className="mt-7 rounded-2xl border border-amber-300/25 bg-amber-300/[0.04] p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div>
              <h2 className="text-sm font-semibold text-amber-100">Research only · District risk predictions not approved</h2>
              <p className="mt-1.5 text-sm leading-6 text-slate-300">
                District reporting boundaries and the 2024 revision still need independent reconciliation.
                Weather is available as environmental context, but no validated road-level or hourly accident danger probability exists.
                The statewide forecast below is an experimental baseline, not an operational safety prediction.
              </p>
            </div>
          </div>
        </section>

        <section aria-label="Latest statewide reporting snapshot" className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Latest reported year" value={reportedYear?.toString() ?? "—"}
            detail={latest ? "Tamil Nadu statewide source series" : "Historical API unavailable"} />
          <SummaryCard label="Reported accidents" value={format(latest?.total_accidents)}
            detail={latest ? "Statewide count · " + latest.year : "Historical API unavailable"} />
          <SummaryCard label="Persons killed" value={format(latest?.persons_killed)}
            detail={latest ? "Reported fatalities · " + latest.year : "Historical API unavailable"} />
          <SummaryCard label="Latest year status"
            value={latest ? (latest.provisional ? "Provisional" : "Reported") : "Unavailable"}
            detail={latest?.provisional ? "Subject to official data revision" : "Publication status, not ML approval"}
            accent={Boolean(latest?.provisional)} />
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1.65fr_0.8fr]">
          <StatewideHistoryChart records={statewideRecords} />

          <aside className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-7">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-cyan-300">
              <Database className="h-4 w-4" /> Data context
            </p>
            <h2 className="mt-2 text-xl font-semibold text-white">What these numbers mean</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              This dashboard shows published statewide accident totals. Historical accident counts
              are different from the likelihood of an individual accident.
            </p>
            <dl className="mt-5 space-y-4 text-sm">
              <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] pb-3">
                <dt className="text-slate-400">Years available</dt>
                <dd className="font-medium text-white">{statewideRecords.length || "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] pb-3">
                <dt className="text-slate-400">Historical data</dt>
                <dd className="inline-flex items-center gap-1.5 text-cyan-200">
                  <ShieldCheck className="h-4 w-4" /> Descriptive
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] pb-3">
                <dt className="text-slate-400">2024 source revision</dt>
                <dd className="text-amber-200">Unresolved</dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] pb-3">
                <dt className="text-slate-400">Area risk model</dt>
                <dd className="text-amber-200">Not approved</dd>
              </div>
            </dl>
            <p className="mt-5 text-xs leading-6 text-slate-500">
              The 2021–2023 district accident/death transcriptions matched a published source,
              but historical reporting-area boundaries remain unverified.
            </p>
            <Link href="/forecast/evaluation"
              className="mt-6 inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-white">
              Explore backtest accuracy <ArrowUpRight className="h-4 w-4" />
            </Link>
          </aside>
        </section>

        <section aria-labelledby="workspace-title" className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">Explore UrbanPulse</p>
              <h2 id="workspace-title" className="mt-2 text-xl font-semibold text-white">Research workspace</h2>
            </div>
            <p className="text-xs text-slate-500">Select a module to explore the available evidence.</p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              { href: "/forecast/districts", label: "District Lab", tag: "Historical data", desc: "Browse district totals and transparent what-if scenarios.", icon: FlaskConical },
              { href: "/forecast/evaluation", label: "Model Evaluation", tag: "Backtests", desc: "Compare historical predictions with actual accident counts.", icon: BrainCircuit },
              { href: "/conditions", label: "Live Conditions", tag: "Weather context", desc: "Check current weather estimates across six Tamil Nadu cities.", icon: CloudRain },
              { href: "/map", label: "Geospatial Explorer", tag: "Centroid map", desc: "Compare published totals by reporting-area location.", icon: MapPinned },
            ].map(({ href, label, tag, desc, icon: Icon }) => (
              <Link key={href} href={href}
                className="group flex flex-col rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition hover:border-cyan-400/30 hover:bg-cyan-400/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
                <div className="flex items-center justify-between">
                  <span className="grid h-9 w-9 place-items-center rounded-lg border border-cyan-400/20 bg-cyan-400/[0.06]">
                    <Icon className="h-4 w-4 text-cyan-300" />
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-slate-500 transition group-hover:text-white" />
                </div>
                <p className="mt-5 text-xs uppercase tracking-wider text-slate-500">{tag}</p>
                <h3 className="mt-2 font-semibold text-white">{label}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-400">{desc}</p>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="model-status-heading" className="mt-8 grid gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-cyan-300">
              <TrendingUp className="h-4 w-4" /> Existing baseline
            </p>
            <h2 id="model-status-heading" className="mt-3 text-lg font-semibold text-white">
              {forecast ? forecast.model_name.replaceAll("_", " ") : "Baseline unavailable"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              {forecast
                ? "Experimental " + forecast.forecast_year + " annual baseline · " +
                  format(forecast.predicted_accidents) + " accidents"
                : "The legacy annual baseline endpoint has not returned a prediction."}
            </p>
            {forecast && (
              <p className="mt-4 text-xs text-slate-500">
                Backtest MAE {format(Math.round(forecast.validation_mae))} ·
                RMSE {format(Math.round(forecast.validation_rmse))}
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-cyan-300">
              <Database className="h-4 w-4" /> Historical detail
            </p>
            <h2 className="mt-3 text-lg font-semibold text-white">
              {accidents ? accidents.year + " severity profile" : "Severity data unavailable"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              {accidents
                ? format(accidents.fatal_accidents) + " fatal crashes · " +
                  format(accidents.grievous_injury_accidents) + " grievous injury crashes"
                : "The accident summary API is currently unavailable."}
            </p>
            <p className="mt-4 text-xs text-slate-500">
              Historical reporting; this may be a different series or period from the statewide data above.
            </p>
          </div>
          <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.035] p-5">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-amber-200">
              <ShieldAlert className="h-4 w-4" /> Validation guardrail
            </p>
            <h2 className="mt-3 text-lg font-semibold text-white">No calibrated road-risk percentage</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              We still need authorized time-and-location crash records, exposure data,
              and independent validation before rating individual roads or areas.
            </p>
          </div>
        </section>

        <div id="statewide-forecast" className="scroll-mt-24">
          <StatewideForecastPanel forecast={statewideForecast} history={statewideRecords} />
        </div>

        <div id="district-comparison" className="scroll-mt-24">
          <DistrictAccidentComparison />
        </div>

        <section className="mt-9 grid gap-3 md:grid-cols-3">
          {[
            { icon: Workflow, title: "Data Engineering", desc: "Docker ingestion, PostgreSQL storage, dbt transformations and data-quality controls." },
            { icon: BarChart3, title: "Analytics", desc: "Observed accident history, severity breakdowns and reporting-area comparisons." },
            { icon: BrainCircuit, title: "Data Science", desc: "Chronological backtests, transparent baseline models and clear research limitations." },
          ].map(({ icon: Icon, title, desc }) => (
            <article key={title} className="rounded-2xl border border-white/[0.08] p-5">
              <Icon className="h-5 w-5 text-cyan-300" />
              <h3 className="mt-4 font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{desc}</p>
            </article>
          ))}
        </section>

        <footer className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 py-6 text-xs text-slate-500">
          <span>UrbanPulse · Road safety research and environmental context</span>
          <Link className="text-cyan-300 hover:text-white" href="/forecast/evaluation">
            View research limitations <ArrowUpRight className="inline h-3.5 w-3.5" />
          </Link>
        </footer>
      </div>
    </main>
  );
}
