import Link from "next/link";
import {
  ArrowUpRight,
  BrainCircuit,
  CalendarDays,
  CarFront,
  CloudRain,
  Database,
  FlaskConical,
  MapPinned,
  ShieldAlert,
  Target,
  TriangleAlert,
  Workflow,
} from "lucide-react";

import SiteNav from "@/components/SiteNav";
import UrbanHero from "@/components/UrbanHero";
import DashboardKpiCard from "@/components/DashboardKpiCard";
import AccidentTrendPanel, { type AccidentTrendPoint, type LegacyForecastPoint } from "@/components/AccidentTrendPanel";
import SeverityDonutPanel, { type SeveritySummary } from "@/components/SeverityDonutPanel";
import DistrictAccidentComparison from "@/components/DistrictAccidentComparison";
import StatewideHistoryChart from "@/components/StatewideHistoryChart";
import StatewideForecastPanel, { type StatewideForecast } from "@/components/StatewideForecastPanel";

type AccidentSummary = SeveritySummary & {
  fatalities_per_100_accidents: number | null;
  yoy_accident_change_pct: number | null;
};
type AccidentTrend = AccidentTrendPoint & { fatal_killed: number };
type LegacyForecast = LegacyForecastPoint & {
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

const apiUrl = process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function fetchJson<T>(endpoint: string): Promise<T | null> {
  try {
    const response = await fetch(apiUrl + endpoint, { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
function displayCount(value: number | undefined | null): string {
  return value !== null && value !== undefined && Number.isFinite(value) && value >= 0
    ? value.toLocaleString("en-IN", { maximumFractionDigits: 0 })
    : "—";
}

export default async function Home() {
  const [accidents, rawTrend, rawForecast, tamilNaduAnnual, statewideForecast] = await Promise.all([
    fetchJson<AccidentSummary>("/api/v1/accidents/summary"),
    fetchJson<AccidentTrend[]>("/api/v1/accidents/trend"),
    fetchJson<LegacyForecast>("/api/v1/accidents/forecast"),
    fetchJson<TamilNaduAnnual>("/api/v1/accidents/tamil-nadu/annual"),
    fetchJson<StatewideForecast>("/api/v1/predictions/tamil-nadu/annual"),
  ]);

  // Imported accident summary, historical trend and baseline share the
  // legacy analytics dataset. Do not treat this as Tamil Nadu statewide data.
  const summary = accidents &&
    Number.isInteger(accidents.year) &&
    Number.isFinite(accidents.total_accidents) &&
    accidents.total_accidents >= 0 ? accidents : null;
  const trend = Array.isArray(rawTrend) ? rawTrend.filter((row) =>
    Number.isInteger(row.year) &&
    Number.isFinite(row.total_accidents) && row.total_accidents >= 0 &&
    (!summary || row.year <= summary.year)
  ) : [];
  const sortedTrend = [...trend].sort((a, b) => a.year - b.year);
  const lastTrend = sortedTrend[sortedTrend.length - 1];
  const aligned = Boolean(summary && lastTrend &&
    lastTrend.year === summary.year &&
    lastTrend.total_accidents === summary.total_accidents);
  const safeTrend = aligned ? sortedTrend : [];

  // Forecast is only compared to the imported series when its origin aligns.
  const forecast = summary && rawForecast &&
    Number.isFinite(rawForecast.predicted_accidents) &&
    rawForecast.predicted_accidents >= 0 &&
    rawForecast.forecast_year === summary.year + 1 &&
    rawForecast.training_end_year === summary.year
    ? rawForecast : null;

  const accidentSpark = safeTrend.slice(-6).map((item) => item.total_accidents);
  const fatalitiesSpark = safeTrend.slice(-6)
    .map((item) => item.fatal_killed)
    .filter((value) => Number.isFinite(value) && value >= 0);
  const yoy = summary?.yoy_accident_change_pct;
  const recentYoY = typeof yoy === "number" && Number.isFinite(yoy)
    ? (yoy >= 0 ? "+" : "") + yoy.toFixed(1) + "% year on year"
    : "Latest imported accident series";
  const validationNote = forecast && Number.isFinite(forecast.validation_mae)
    ? forecast.model_name.replaceAll("_", " ") + " · backtest MAE " +
      displayCount(Math.round(forecast.validation_mae))
    : "Baseline not available for this series";

  // Statewide data is kept separate from the legacy accident KPI series.
  const statewideRecords = (tamilNaduAnnual?.records ?? [])
    .filter((row) => Number.isInteger(row.year) &&
      Number.isFinite(row.total_accidents) && row.total_accidents >= 0 &&
      Number.isFinite(row.persons_killed) && row.persons_killed >= 0)
    .sort((a, b) => a.year - b.year);
  const latestStatewide = statewideRecords[statewideRecords.length - 1];

  const modules = [
    { href: "/forecast/districts", icon: FlaskConical, title: "District Lab",
      caption: "Historical district trends, reporting quality and scenario exploration." },
    { href: "/forecast/evaluation", icon: BrainCircuit, title: "Model Evaluation",
      caption: "Compare past baseline predictions with observed accident counts." },
    { href: "/conditions", icon: CloudRain, title: "Live Conditions",
      caption: "View current weather context for six Tamil Nadu city centres." },
    { href: "/map", icon: MapPinned, title: "Geospatial Explorer",
      caption: "Explore reporting-area centroids, not precise crash hotspots." },
  ];

  return (
    <main className="urban-shell min-h-screen">
      <SiteNav active="dashboard" />
      <div className="relative z-[1] mx-auto max-w-[1470px] px-4 pb-12 pt-7 sm:px-6 lg:px-8">
        <UrbanHero />

        <section aria-label="Latest imported accident data and experimental baseline"
          className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardKpiCard icon={CalendarDays} featured
            label="Observed year"
            value={summary ? String(summary.year) : "—"}
            note={summary ? "Latest imported accident record" : "Accident summary unavailable"} />
          <DashboardKpiCard icon={CarFront} label="Total accidents"
            value={displayCount(summary?.total_accidents)}
            note={summary ? "Imported accident series · " + summary.year : "Accident summary unavailable"}
            tag={summary ? recentYoY : null}
            sparkline={accidentSpark.length >= 2 ? accidentSpark : undefined} />
          <DashboardKpiCard icon={TriangleAlert} tone="blue" label="Fatalities"
            value={displayCount(summary?.fatal_killed)}
            note={summary && typeof summary.fatalities_per_100_accidents === "number"
              ? summary.fatalities_per_100_accidents.toFixed(2) + " killed per 100 accidents"
              : "Persons killed in imported series"}
            sparkline={fatalitiesSpark.length >= 2 ? fatalitiesSpark : undefined} />
          <DashboardKpiCard icon={Target} tone="blue"
            label={forecast ? String(forecast.forecast_year) + " baseline" : "Baseline forecast"}
            value={displayCount(forecast?.predicted_accidents)}
            note={validationNote} />
        </section>

        <section className="mt-5 grid items-stretch gap-5 lg:grid-cols-[minmax(0,1.9fr)_minmax(330px,0.95fr)]">
          <AccidentTrendPanel trend={safeTrend} forecast={forecast} />
          <SeverityDonutPanel summary={summary} />
        </section>

        <section role="note" className="urban-research-notice mt-5 flex items-start gap-3 px-4 py-3">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <p className="text-xs leading-5 text-amber-100/90">
            <strong>Research-only analytics.</strong> The imported accident series above is distinct from
            the Tamil Nadu statewide series below. Historical district boundaries and the 2024 revision
            remain unresolved. No validated hourly, district or road-level danger probability is available;
            experimental forecasts are not approved for operational safety decisions.
          </p>
        </section>

        <section aria-labelledby="workspace-heading" className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                Explore UrbanPulse
              </p>
              <h2 id="workspace-heading" className="mt-2 text-2xl font-semibold text-white">
                Research workspace
              </h2>
            </div>
            <span className="text-xs text-slate-400">Historical analysis · live weather · experimental models</span>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {modules.map(({ href, icon: Icon, title, caption }) => (
              <Link href={href} key={href}
                className="urban-panel urban-module-card group flex min-h-[195px] flex-col p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
                <div className="flex items-start justify-between">
                  <span className="urban-kpi-icon grid h-11 w-11 place-items-center rounded-xl">
                    <Icon className="h-6 w-6 text-cyan-200" strokeWidth={1.7} />
                  </span>
                  <ArrowUpRight className="h-5 w-5 text-cyan-200 transition group-hover:-translate-y-1 group-hover:translate-x-1" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{caption}</p>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="statewide-heading" className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.17em] text-cyan-300">
                Separately reported · Tamil Nadu statewide
              </p>
              <h2 id="statewide-heading" className="mt-2 text-2xl font-semibold text-white">
                Statewide history &amp; forecast
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                The statewide series has different geographic coverage from the imported
                accident metrics in the cards above. These totals are not combined.
              </p>
            </div>
            <div className="text-right text-xs text-slate-400">
              Latest statewide record: <strong className="text-white">
                {latestStatewide ? latestStatewide.year +
                  (latestStatewide.provisional ? " (provisional)" : "") : "unavailable"}
              </strong>
            </div>
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(290px,0.75fr)]">
            <StatewideHistoryChart records={statewideRecords} />
            <aside className="urban-panel p-6">
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-cyan-300">
                <Database className="h-4 w-4" /> Statewide data context
              </p>
              <h3 className="mt-3 text-xl font-semibold text-white">Source and coverage</h3>
              <dl className="mt-5 space-y-4 text-sm">
                <div className="flex justify-between gap-3 border-b border-white/10 pb-3">
                  <dt className="text-slate-400">Reported years</dt>
                  <dd className="text-white">{statewideRecords.length || "—"}</dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-white/10 pb-3">
                  <dt className="text-slate-400">Latest accidents</dt>
                  <dd className="text-white">{displayCount(latestStatewide?.total_accidents)}</dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-white/10 pb-3">
                  <dt className="text-slate-400">Latest deaths</dt>
                  <dd className="text-white">{displayCount(latestStatewide?.persons_killed)}</dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-white/10 pb-3">
                  <dt className="text-slate-400">2024 district revision</dt>
                  <dd className="text-amber-200">Unresolved</dd>
                </div>
              </dl>
              <p className="mt-5 text-xs leading-6 text-slate-400">
                Provisional source years may change. No district-level or road-level probability
                model is approved from this history.
              </p>
            </aside>
          </div>
          <StatewideForecastPanel forecast={statewideForecast} history={statewideRecords} />
        </section>

        <div id="district-comparison" className="scroll-mt-24">
          <DistrictAccidentComparison />
        </div>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { icon: Workflow, title: "Data engineering", detail: "Ingestion, PostgreSQL, dbt transformations and data-quality controls." },
            { icon: Database, title: "Research analytics", detail: "Observed trends, severity profiles and geographic comparisons." },
            { icon: BrainCircuit, title: "Experimental models", detail: "Chronological backtesting, transparent baselines and readiness safeguards." },
          ].map(({ icon: Icon, title, detail }) => (
            <article key={title} className="urban-panel p-5">
              <Icon className="h-5 w-5 text-cyan-300" />
              <h3 className="mt-4 font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
            </article>
          ))}
        </section>
        <footer className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-cyan-300/15 py-6 text-xs text-slate-400">
          <span>UrbanPulse · Urban accident intelligence · Research prototype</span>
          <Link href="/forecast/evaluation" className="text-cyan-200 transition hover:text-white">
            Model evaluation &amp; limitations <ArrowUpRight className="inline h-3.5 w-3.5" />
          </Link>
        </footer>
      </div>
    </main>
  );
}
