import Link from "next/link";
import { Activity, AlertTriangle, ArrowUpRight, CloudRain, Compass, Droplets, Eye, MoonStar, Sun, Wind } from "lucide-react";

import SiteNav from "@/components/SiteNav";
import NeonPageHero from "@/components/NeonPageHero";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const API = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const CITIES = ["Chennai", "Coimbatore", "Madurai", "Salem", "Tiruchirappalli", "Tirunelveli"] as const;
type City = typeof CITIES[number];

type Weather = {
  city: string;
  geographic_scope: string;
  location: {
    latitude: number;
    longitude: number;
    provider_grid_latitude: number | null;
    provider_grid_longitude: number | null;
  };
  source: { name: string; url: string; type: string };
  timezone: string;
  weather_valid_at_local: string;
  retrieved_at_utc: string;
  weather_age_minutes: number;
  current: {
    temperature_c: number | null;
    relative_humidity_pct: number | null;
    precipitation_mm: number | null;
    rain_mm: number | null;
    wind_speed_kmh: number | null;
    visibility_m: number | null;
    weather_code: number | null;
    is_day: boolean | null;
  };
  hourly_forecast: {
    valid_time_local: string;
    precipitation_probability_pct: number | null;
    precipitation_mm: number | null;
    visibility_m: number | null;
    wind_speed_kmh: number | null;
    weather_code: number | null;
  }[];
  other_context: {
    day_or_night: string;
    imd_warnings: { status: string; url: string };
    live_accident_incidents: { status: string; count: null };
    live_traffic_flow: { status: string; congestion: null; provider_docs_url: string };
  };
  model: {
    weather_is_context_only: true;
    accident_risk_probability: null;
    area_danger_rank: null;
    calibrated_hourly_prediction_available: false;
    status: string;
  };
};

function display(value: number | null | undefined, unit = "", digits = 1) {
  return value === null || value === undefined || !Number.isFinite(value)
    ? "Unavailable"
    : value.toLocaleString("en-IN", { maximumFractionDigits: digits }) + unit;
}

function hour(time: string) {
  const segment = time.split("T")[1] ?? time;
  return segment.slice(0, 5) + " IST";
}

async function fetchLive(city: City): Promise<{ weather: Weather | null; error: string | null }> {
  try {
    const response = await fetch(API + "/api/v1/conditions/live?city=" + encodeURIComponent(city), {
      cache: "no-store",
    });
    if (!response.ok) {
      return {
        weather: null,
        error: response.status === 503
          ? "The current weather feed is unavailable or stale. No fallback values have been invented."
          : "The weather service could not return data for this city.",
      };
    }
    const weather = await response.json() as Weather;
    if (!weather || weather.model?.accident_risk_probability !== null ||
      weather.model?.area_danger_rank !== null ||
      weather.model?.calibrated_hourly_prediction_available !== false ||
      weather.city !== city) {
      return { weather: null, error: "Unverified live-conditions response was rejected." };
    }
    return { weather, error: null };
  } catch {
    return { weather: null, error: "The live conditions API could not be reached. Start the API container." };
  }
}

type PageProps = { searchParams: Promise<{ city?: string | string[] }> };

export default async function LiveConditionsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const raw = typeof params.city === "string" ? params.city : "Chennai";
  const city: City = CITIES.find((candidate) => candidate.toLowerCase() === raw.toLowerCase()) ?? "Chennai";
  const { weather, error } = await fetchLive(city);
  const current = weather?.current;
  const metrics = [
    { icon: Droplets, label: "Precipitation", value: display(current?.precipitation_mm, " mm"), note: "Current model period" },
    { icon: Eye, label: "Visibility", value: display(current?.visibility_m, " m", 0), note: "Weather-grid estimate" },
    { icon: Wind, label: "Wind speed", value: display(current?.wind_speed_kmh, " km/h"), note: "10 m above ground" },
    { icon: Sun, label: "Temperature", value: display(current?.temperature_c, " °C"), note: "At 2 m above ground" },
    { icon: CloudRain, label: "Relative humidity", value: display(current?.relative_humidity_pct, "%", 0), note: "At 2 m above ground" },
    { icon: MoonStar, label: "Day or night", value: current?.is_day === true ? "Day" : current?.is_day === false ? "Night" : "Unavailable", note: "Weather-model day/night flag" },
  ];
  return (
    <main className="urban-shell urban-subpage min-h-screen">
      <SiteNav active="conditions" />
      <div className="relative z-[1] mx-auto max-w-[1470px] px-4 py-7 sm:px-6 lg:px-8">
        <Link href="/" className="urban-back-link inline-flex items-center gap-2 text-sm text-slate-300">
          ← Dashboard
        </Link>
        <div className="mt-5">
          <NeonPageHero
            eyebrow="Live environmental intelligence"
            title="Tamil Nadu"
            accent="live conditions."
            icon={CloudRain}
            description="Inspect live weather-grid estimates and short-term outlooks for six Tamil Nadu city centres. Conditions are useful context, but they cannot establish an accident danger percentage."
            spotlightLabel="Selected city centre"
            spotlightTitle={city}
            spotlightText={weather
              ? "Open-Meteo estimate valid at " + hour(weather.weather_valid_at_local) +
                ". Updated when you load or select a city."
              : "Weather feed unavailable or stale. No placeholder measurements are shown."}
            spotlightIcon={Compass}
          />
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/map" className="urban-action-link inline-flex items-center gap-2 px-4 py-2.5 text-sm">
            <Compass className="h-4 w-4" /> Geospatial explorer <ArrowUpRight className="h-4 w-4" />
          </Link>
          <Link href="/forecast/evaluation" className="urban-action-link inline-flex items-center gap-2 px-4 py-2.5 text-sm">
            Historical model evaluation <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <section role="note" className="urban-research-notice mt-5 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div>
              <h2 className="text-sm font-semibold text-amber-100">No calibrated area-danger score available</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Tamil Nadu’s verified public data here consists of annual district accident totals,
                not geocoded crashes matched with hourly weather and traffic exposure.
                A wet city centre cannot be labelled “more dangerous” using weather alone.
                No live police incident feed or licensed traffic provider is connected.
              </p>
            </div>
          </div>
        </section>

        <form method="get" action="/conditions" className="urban-panel mt-6 flex flex-wrap items-end gap-4 p-5">
          <div className="w-full max-w-sm">
            <label htmlFor="conditions-city" className="mb-2 block text-xs uppercase tracking-wider text-slate-400">
              Choose weather-grid city centre
            </label>
            <select id="conditions-city" name="city" defaultValue={city}
              className="urban-select w-full rounded-xl px-4 py-3 text-sm text-white">
              {CITIES.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
          <button type="submit"
            className="urban-primary-button rounded-xl px-5 py-3 text-sm font-semibold text-white transition">
            View live conditions
          </button>
          <p className="text-xs text-slate-500">Weather updates when you reload or select a city.</p>
        </form>

        {error && <section role="status" className="urban-research-notice mt-6 p-5 text-sm text-amber-200">
          {error} Past observations and forecast values have not been substituted.
        </section>}

        {weather && <div className="mt-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
            <p className="inline-flex items-center gap-2">
              <Compass className="h-4 w-4 text-cyan-300" />
              <strong className="text-white">{weather.city}</strong> · approximate city centre
            </p>
            <p>
              Model time: <strong className="text-slate-200">{hour(weather.weather_valid_at_local)}</strong>
              {" · "}{display(weather.weather_age_minutes, " min age")}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {metrics.map(({ icon: Icon, label, value, note }) =>
              <article key={label} className="urban-panel urban-metric-card relative overflow-hidden p-5">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500">
                  <Icon className="h-4 w-4 text-cyan-300" /> {label}
                </div>
                <p className="mt-4 text-2xl font-semibold text-white">{value}</p>
                <p className="mt-2 text-xs text-slate-500">{note}</p>
              </article>
            )}
          </div>

          <section className="urban-panel urban-chart-panel p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-cyan-300">Weather forecast · contextual only</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Upcoming hourly conditions</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Weather-grid projections for the selected centre, not measured road-level conditions.
                </p>
              </div>
              <a href={weather.source.url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-cyan-300 hover:text-white">
                Open-Meteo documentation <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-[580px] w-full text-left text-sm">
                <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                  <tr><th scope="col" className="pb-3 pr-4">Local time</th>
                    <th scope="col" className="pb-3 text-right">Rain chance</th>
                    <th scope="col" className="pb-3 text-right">Precip.</th>
                    <th scope="col" className="pb-3 text-right">Visibility</th>
                    <th scope="col" className="pb-3 text-right">Wind</th>
                  </tr>
                </thead>
                <tbody>
                  {weather.hourly_forecast.map(row =>
                    <tr key={row.valid_time_local} className="border-b border-white/[0.06] text-slate-200">
                      <td className="py-3 pr-4">{hour(row.valid_time_local)}</td>
                      <td className="py-3 text-right">{display(row.precipitation_probability_pct, "%", 0)}</td>
                      <td className="py-3 text-right">{display(row.precipitation_mm, " mm")}</td>
                      <td className="py-3 text-right">{display(row.visibility_m, " m", 0)}</td>
                      <td className="py-3 text-right">{display(row.wind_speed_kmh, " km/h")}</td>
                    </tr>)}
                  {weather.hourly_forecast.length === 0 &&
                    <tr><td colSpan={5} className="py-5 text-slate-400">Hourly forecasts unavailable from this provider response.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <div className="urban-panel p-5">
              <p className="text-sm font-semibold text-white">Live accident incidents</p>
              <p className="mt-2 text-sm text-amber-200">Unavailable</p>
              <p className="mt-2 text-xs leading-6 text-slate-400">No verified Tamil Nadu public live incident API is connected. “Unavailable” does not mean zero crashes.</p>
            </div>
            <div className="rounded-2xl border border-white/10 p-5">
              <p className="text-sm font-semibold text-white">Traffic flow and congestion</p>
              <p className="mt-2 text-sm text-amber-200">Provider not connected</p>
              <p className="mt-2 text-xs leading-6 text-slate-400">
                A licensed traffic service could provide this later. No traffic volume or congestion values are invented.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 p-5">
              <p className="text-sm font-semibold text-white">Official weather warnings</p>
              <a href={weather.other_context.imd_warnings.url} target="_blank" rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-sm text-cyan-300 hover:text-white">
                View IMD district warnings <ArrowUpRight className="h-4 w-4" />
              </a>
              <p className="mt-2 text-xs leading-6 text-slate-400">
                Official external warnings. Not yet automatically parsed into the app or a forecast model.
              </p>
            </div>
          </section>

          <p className="text-xs leading-6 text-slate-500">
            Data: Open-Meteo weather model grid, retrieved {weather.retrieved_at_utc} (UTC).
            Query centre {weather.location.latitude.toFixed(5)}, {weather.location.longitude.toFixed(5)}.
            Grid values may differ from weather at individual roads. This page does not estimate an
            accident probability, rank dangerous areas, or change the existing ML model.
          </p>
        </div>}
        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/forecast/evaluation" className="text-sm text-cyan-300 hover:text-white">Historical forecasting evaluation →</Link>
          <Link href="/forecast/districts" className="text-sm text-cyan-300 hover:text-white">District accident history →</Link>
        </div>
      </div>
    </main>
  );
}
