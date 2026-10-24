import AccidentMap from "@/components/AccidentMap";

import {
  Activity,
  BrainCircuit,
  Database,
  Droplets,
  MapPinned,
  Thermometer,
  TrendingUp,
  Workflow,
} from "lucide-react";

type Weather = {
  station_name: string | null;
  temperature_c: number | null;
  humidity_pct: number | null;
  rainfall_mm: number | null;
  weather_description: string | null;
};

type AccidentSummary = {
  year: number;
  fatal_accidents: number;
  fatal_killed: number;
  grievous_injury_accidents: number;
  minor_injury_accidents: number;
  non_injury_accidents: number;
  total_accidents: number;
  total_persons_involved: number;
  fatalities_per_100_accidents: number | null;
  yoy_accident_change_pct: number | null;
};

type AccidentTrend = {
  year: number;
  total_accidents: number;
};

type AccidentLocation = {
  district: string;
  total_2020: number;
  total_2021: number;
  total_accidents: number;
  latitude: number;
  longitude: number;
};

type AccidentForecast = {
  forecast_year: number;
  predicted_accidents: number;
  model_name: string;
  validation_mae: number;
  validation_rmse: number;
  validation_mape_pct: number;
  training_end_year: number;
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

const pillars = [
  {
    title: "Data Engineering",
    description: "CSV and weather ingestion, PostgreSQL raw storage, dbt transformations and pipeline observability.",
    icon: Workflow,
  },
  {
    title: "Data Analytics",
    description: "Yearly accident trends, severity mix, rolling features and structural-break diagnostics.",
    icon: Activity,
  },
  {
    title: "Data Science",
    description: "Time-aware baseline backtesting compares persistence, rolling-average and linear-regression forecasts.",
    icon: BrainCircuit,
  },
];

export default async function Home() {
  const [weather, accidents, trend, forecast, locations] = await Promise.all([
    fetchJson<Weather>("/api/v1/weather/current"),
    fetchJson<AccidentSummary>("/api/v1/accidents/summary"),
    fetchJson<AccidentTrend[]>("/api/v1/accidents/trend"),
    fetchJson<AccidentForecast>("/api/v1/accidents/forecast"),
    fetchJson<AccidentLocation[]>("/api/v1/accidents/locations"),
  ]);

  const recentTrend = (trend ?? []).slice(-6);
  const topLocations = (locations ?? []).slice(0, 5);
  const maxAccidents = Math.max(...recentTrend.map((row) => row.total_accidents), 1);

  const metrics = [
    {
      label: "Latest Year",
      value: accidents?.year?.toString() ?? "—",
      hint: "Observed accident data",
    },
    {
      label: "Total Accidents",
      value: accidents?.total_accidents?.toLocaleString("en-IN") ?? "—",
      hint:
        accidents?.yoy_accident_change_pct != null
          ? `${accidents.yoy_accident_change_pct > 0 ? "+" : ""}${accidents.yoy_accident_change_pct}% YoY`
          : "Year-over-year trend",
    },
    {
      label: "Fatalities",
      value: accidents?.fatal_killed?.toLocaleString("en-IN") ?? "—",
      hint:
        accidents?.fatalities_per_100_accidents != null
          ? `${accidents.fatalities_per_100_accidents} per 100 accidents`
          : "Fatality indicator",
    },
    {
      label: forecast ? `${forecast.forecast_year} Forecast` : "Baseline Forecast",
      value: forecast?.predicted_accidents?.toLocaleString("en-IN") ?? "—",
      hint: forecast ? `${forecast.model_name} · MAE ${Math.round(forecast.validation_mae)}` : "Run the ML job",
    },
  ];

  return (
    <main className="min-h-screen">
      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <header className="mb-12 flex flex-col gap-6 border-b border-slate-800 pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-cyan-400">
              <MapPinned className="h-4 w-4" />
              Urban Risk Intelligence
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white md:text-6xl">
              Urban<span className="text-cyan-400">Pulse</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">
              An end-to-end data platform combining accident analytics, weather ingestion, feature engineering and forecasting.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-4 py-2 text-sm text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Real accident + weather data
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <article key={metric.label} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 backdrop-blur">
              <p className="text-sm text-slate-500">{metric.label}</p>
              <div className="mt-2 text-3xl font-semibold text-white">{metric.value}</div>
              <p className="mt-3 text-xs text-cyan-400">{metric.hint}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Accident analytics</p>
                <h2 className="mt-1 text-xl font-semibold text-white">Recent annual trend</h2>
              </div>
              <TrendingUp className="h-5 w-5 text-cyan-400" />
            </div>

            <div className="space-y-4">
              {recentTrend.length ? (
                recentTrend.map((row) => (
                  <div key={row.year} className="grid grid-cols-[3.5rem_1fr_5rem] items-center gap-3 text-sm">
                    <span className="text-slate-400">{row.year}</span>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-cyan-400"
                        style={{ width: `${Math.max((row.total_accidents / maxAccidents) * 100, 2)}%` }}
                      />
                    </div>
                    <span className="text-right font-medium text-slate-200">
                      {row.total_accidents.toLocaleString("en-IN")}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">Run accident ingestion and dbt build to populate the trend.</p>
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <Database className="h-6 w-6 text-cyan-400" />
            <p className="mt-5 text-sm text-slate-500">Latest severity profile</p>
            <h2 className="mt-1 text-xl font-semibold text-white">
              {accidents ? `${accidents.year} breakdown` : "No accident data yet"}
            </h2>
            <div className="mt-6 space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Fatal accidents</span>
                <span className="font-medium text-slate-200">{accidents?.fatal_accidents?.toLocaleString("en-IN") ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Grievous injury accidents</span>
                <span className="font-medium text-slate-200">{accidents?.grievous_injury_accidents?.toLocaleString("en-IN") ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Minor injury accidents</span>
                <span className="font-medium text-slate-200">{accidents?.minor_injury_accidents?.toLocaleString("en-IN") ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Non-injury accidents</span>
                <span className="font-medium text-slate-200">{accidents?.non_injury_accidents?.toLocaleString("en-IN") ?? "—"}</span>
              </div>
            </div>
          </article>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <p className="text-sm text-slate-500">Current weather</p>
            <h2 className="mt-1 text-xl font-semibold text-white">{weather?.station_name ?? "No weather data"}</h2>
            <div className="mt-6 space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-400"><Thermometer className="h-4 w-4" />Temperature</span>
                <span className="font-medium text-slate-200">{weather?.temperature_c ?? "—"} °C</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-400"><Droplets className="h-4 w-4" />Humidity</span>
                <span className="font-medium text-slate-200">{weather?.humidity_pct ?? "—"}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Rainfall</span>
                <span className="font-medium text-slate-200">{weather?.rainfall_mm ?? "—"} mm</span>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <p className="text-sm text-slate-500">Forecast validation</p>
            <h2 className="mt-1 text-xl font-semibold text-white">{forecast?.model_name ?? "Not trained yet"}</h2>
            <div className="mt-6 space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">MAE</span>
                <span className="font-medium text-slate-200">{forecast ? Math.round(forecast.validation_mae).toLocaleString("en-IN") : "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">RMSE</span>
                <span className="font-medium text-slate-200">{forecast ? Math.round(forecast.validation_rmse).toLocaleString("en-IN") : "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">MAPE</span>
                <span className="font-medium text-slate-200">{forecast ? `${forecast.validation_mape_pct}%` : "—"}</span>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-6">
            <p className="text-sm text-amber-300">Model caveat</p>
            <h2 className="mt-1 text-xl font-semibold text-white">2023 structural break</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Accident totals fall sharply in 2023. UrbanPulse flags this as a structural-break candidate and treats the
              forecast as a baseline experiment, not a production prediction.
            </p>
          </article>
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60">
          <div className="border-b border-slate-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Geospatial expansion</p>
                <h2 className="mt-1 text-xl font-semibold text-white">Tamil Nadu accident map</h2>
              </div>
              <MapPinned className="h-5 w-5 text-cyan-400" />
            </div>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400">
              Interactive district/city centroid map using validated 2020-2021 accident coordinates.
              Marker size represents combined accident totals. These markers are area centroids, not individual crash points.
            </p>
          </div>

          <AccidentMap locations={locations ?? []} />

          <div className="grid gap-3 border-t border-slate-800 p-6 md:grid-cols-5">
            {topLocations.map((location) => (
              <div key={location.district} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-sm font-medium text-white">{location.district}</p>
                <p className="mt-2 text-2xl font-semibold text-cyan-400">
                  {location.total_accidents.toLocaleString("en-IN")}
                </p>
                <p className="mt-1 text-xs text-slate-500">2020 + 2021 accidents</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {pillars.map(({ title, description, icon: Icon }) => (
            <article key={title} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
              <Icon className="h-6 w-6 text-cyan-400" />
              <h3 className="mt-5 text-lg font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
            </article>
          ))}
        </section>

        <footer className="mt-12 border-t border-slate-800 pt-6 text-sm text-slate-600">
          UrbanPulse · Data Engineering × Analytics × Data Science
        </footer>
      </section>
    </main>
  );
}
