import Link from "next/link";
import {
  ArrowUpRight,
  BrainCircuit,
  CloudRain,
  Database,
  MapPinned,
  ShieldAlert,
  TrendingUp,
  Workflow,
} from "lucide-react";

import SiteNav from "@/components/SiteNav";

type Weather = {
  station_name: string | null;
  temperature_c: number | null;
  humidity_pct: number | null;
  rainfall_mm: number | null;
};

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

type AccidentTrend = {
  year: number;
  total_accidents: number;
};

type AccidentForecast = {
  forecast_year: number;
  predicted_accidents: number;
  model_name: string;
  validation_mae: number;
  validation_rmse: number;
  validation_mape_pct: number;
};

const apiUrl =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000";

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${apiUrl}${path}`, { cache: "no-store" });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export default async function Home() {
  const [weather, accidents, trend, forecast] = await Promise.all([
    fetchJson<Weather>("/api/v1/weather/current"),
    fetchJson<AccidentSummary>("/api/v1/accidents/summary"),
    fetchJson<AccidentTrend[]>("/api/v1/accidents/trend"),
    fetchJson<AccidentForecast>("/api/v1/accidents/forecast"),
  ]);

  const recentTrend = (trend ?? []).slice(-6);
  const maxAccidents = Math.max(...recentTrend.map((row) => row.total_accidents), 1);

  return (
    <main className="min-h-screen">
      <SiteNav active="dashboard" />

      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <section className="grid gap-8 lg:grid-cols-[1.45fr_0.55fr] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-400/[0.06] px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-cyan-300">
              <ShieldAlert className="h-3.5 w-3.5" />
              Urban accident intelligence
            </div>
            <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-white md:text-6xl">
              From raw accident data to
              <span className="block bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
                decision-ready risk signals.
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400">
              UrbanPulse combines ingestion, PostgreSQL, dbt analytics, forecasting and geospatial exploration in one end-to-end platform.
            </p>
          </div>

          <Link
            href="/map"
            className="group rounded-3xl border border-cyan-400/15 bg-gradient-to-br from-cyan-400/[0.08] to-blue-500/[0.03] p-6 transition hover:border-cyan-300/30 hover:bg-cyan-400/[0.1]"
          >
            <div className="flex items-center justify-between">
              <MapPinned className="h-6 w-6 text-cyan-300" />
              <ArrowUpRight className="h-5 w-5 text-slate-500 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
            </div>
            <p className="mt-8 text-xs uppercase tracking-[0.18em] text-slate-500">Explore geospatial view</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Tamil Nadu accident map</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              View validated district/city centroids and compare accident concentration across locations.
            </p>
          </Link>
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Observed year", accidents?.year?.toString() ?? "—", "Latest available record"],
            ["Total accidents", accidents?.total_accidents?.toLocaleString("en-IN") ?? "—", accidents?.yoy_accident_change_pct != null ? `${accidents.yoy_accident_change_pct > 0 ? "+" : ""}${accidents.yoy_accident_change_pct}% YoY` : "Year-over-year"],
            ["Fatalities", accidents?.fatal_killed?.toLocaleString("en-IN") ?? "—", accidents?.fatalities_per_100_accidents != null ? `${accidents.fatalities_per_100_accidents} per 100 accidents` : "Severity indicator"],
            [forecast ? `${forecast.forecast_year} baseline` : "Baseline forecast", forecast?.predicted_accidents?.toLocaleString("en-IN") ?? "—", forecast ? `${forecast.model_name} · MAE ${Math.round(forecast.validation_mae)}` : "Awaiting model run"],
          ].map(([label, value, hint]) => (
            <article key={label} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{label}</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
              <p className="mt-3 text-xs text-cyan-300">{hint}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.45fr_0.55fr]">
          <article className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 md:p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Observed history</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Recent accident trend</h2>
              </div>
              <TrendingUp className="h-5 w-5 text-cyan-300" />
            </div>

            <div className="mt-8 space-y-5">
              {recentTrend.map((row) => (
                <div key={row.year} className="grid grid-cols-[3rem_1fr_5rem] items-center gap-4">
                  <span className="text-sm text-slate-500">{row.year}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-400"
                      style={{ width: `${Math.max((row.total_accidents / maxAccidents) * 100, 2)}%` }}
                    />
                  </div>
                  <span className="text-right text-sm font-medium text-slate-200">
                    {row.total_accidents.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 md:p-7">
            <Database className="h-5 w-5 text-cyan-300" />
            <p className="mt-7 text-xs uppercase tracking-[0.16em] text-slate-500">Latest severity profile</p>
            <h2 className="mt-2 text-xl font-semibold text-white">{accidents ? `${accidents.year} breakdown` : "No data"}</h2>
            <div className="mt-7 space-y-4">
              {[
                ["Fatal", accidents?.fatal_accidents],
                ["Grievous injury", accidents?.grievous_injury_accidents],
                ["Minor injury", accidents?.minor_injury_accidents],
                ["Non-injury", accidents?.non_injury_accidents],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex items-center justify-between border-b border-white/[0.06] pb-3 text-sm last:border-0">
                  <span className="text-slate-400">{label}</span>
                  <span className="font-medium text-white">{typeof value === "number" ? value.toLocaleString("en-IN") : "—"}</span>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="mt-6 grid gap-6 md:grid-cols-3">
          <article className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
            <CloudRain className="h-5 w-5 text-cyan-300" />
            <p className="mt-6 text-xs uppercase tracking-[0.16em] text-slate-500">Live weather</p>
            <h3 className="mt-2 text-lg font-semibold text-white">{weather?.station_name ?? "Unavailable"}</h3>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-white/[0.035] p-3">
                <div className="text-lg font-semibold text-white">{weather?.temperature_c ?? "—"}°</div>
                <div className="mt-1 text-[11px] text-slate-500">Temp</div>
              </div>
              <div className="rounded-xl bg-white/[0.035] p-3">
                <div className="text-lg font-semibold text-white">{weather?.humidity_pct ?? "—"}%</div>
                <div className="mt-1 text-[11px] text-slate-500">Humidity</div>
              </div>
              <div className="rounded-xl bg-white/[0.035] p-3">
                <div className="text-lg font-semibold text-white">{weather?.rainfall_mm ?? "—"}</div>
                <div className="mt-1 text-[11px] text-slate-500">Rain mm</div>
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
            <BrainCircuit className="h-5 w-5 text-cyan-300" />
            <p className="mt-6 text-xs uppercase tracking-[0.16em] text-slate-500">Forecast validation</p>
            <h3 className="mt-2 text-lg font-semibold text-white">{forecast?.model_name ?? "Not trained"}</h3>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">MAE</span><span className="text-white">{forecast ? Math.round(forecast.validation_mae).toLocaleString("en-IN") : "—"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">RMSE</span><span className="text-white">{forecast ? Math.round(forecast.validation_rmse).toLocaleString("en-IN") : "—"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">MAPE</span><span className="text-white">{forecast ? `${forecast.validation_mape_pct}%` : "—"}</span></div>
            </div>
          </article>

          <article className="rounded-3xl border border-amber-300/15 bg-amber-300/[0.035] p-6">
            <ShieldAlert className="h-5 w-5 text-amber-300" />
            <p className="mt-6 text-xs uppercase tracking-[0.16em] text-amber-300/80">Model caveat</p>
            <h3 className="mt-2 text-lg font-semibold text-white">2023 structural break</h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              The sharp 2023 level shift is explicitly flagged, so the current forecast is presented as a transparent baseline—not a production prediction.
            </p>
          </article>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            [Workflow, "Data Engineering", "Dockerized ingestion, PostgreSQL raw storage, dbt transformation and data-quality controls."],
            [TrendingUp, "Analytics", "Trend analysis, severity profiles, structural-break diagnostics and geospatial comparisons."],
            [BrainCircuit, "Data Science", "Time-aware backtesting and interpretable baselines before introducing more complex models."],
          ].map(([Icon, title, description]) => {
            const I = Icon as typeof Workflow;
            return (
              <article key={String(title)} className="rounded-2xl border border-white/[0.08] bg-transparent p-5">
                <I className="h-5 w-5 text-cyan-300" />
                <h3 className="mt-5 font-semibold text-white">{title as string}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{description as string}</p>
              </article>
            );
          })}
        </section>

        <footer className="mt-14 border-t border-white/10 py-6 text-xs text-slate-600">
          UrbanPulse · Data Engineering × Analytics × Data Science
        </footer>
      </div>
    </main>
  );
}
