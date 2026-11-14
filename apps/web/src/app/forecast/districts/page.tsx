import Link from "next/link";
import { ArrowLeft, ArrowUpRight, BarChart3, BrainCircuit, CloudRain, FlaskConical } from "lucide-react";

import SiteNav from "@/components/SiteNav";
import DistrictForecastLab, { type DistrictAccidentRecord } from "@/components/DistrictForecastLab";

type DistrictResponse = {
  records: DistrictAccidentRecord[];
  is_ml_prediction: boolean;
};

type StatewideForecast = {
  forecast_year: number;
  predicted_accidents: number;
  model_name: string;
  status: string;
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

export default async function DistrictForecastPage() {
  const [data2021, data2022, data2023, statewideForecast] = await Promise.all([
    fetchJson<DistrictResponse>("/api/v1/accidents/tamil-nadu/districts?year=2021"),
    fetchJson<DistrictResponse>("/api/v1/accidents/tamil-nadu/districts?year=2022"),
    fetchJson<DistrictResponse>("/api/v1/accidents/tamil-nadu/districts?year=2023"),
    fetchJson<StatewideForecast>("/api/v1/predictions/tamil-nadu/annual"),
  ]);

  const districtData = [data2021, data2022, data2023];
  const records = districtData.flatMap((response) =>
    response?.is_ml_prediction === false && Array.isArray(response.records)
      ? response.records
      : []
  );
  const districtDataUnavailable = districtData.every((response) => response === null);

  return (
    <main className="min-h-screen">
      <SiteNav active="districts" />
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to statewide forecast
        </Link>
        <div className="mt-8 flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-400/[0.06] px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-cyan-300">
              <FlaskConical className="h-3.5 w-3.5" /> Forecast research lab
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
              District Accident Intelligence
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-400">
              Explore district accident history and test transparent 2026 what-if scenarios while
              preparing the data needed for validated district-level accident forecasting.
            </p>
          </div>
          <BrainCircuit className="h-8 w-8 text-cyan-300" />
        </div>
        <Link href="/forecast/evaluation"
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] px-4 py-3 text-sm text-cyan-200 transition hover:border-cyan-400/40 hover:bg-cyan-400/10">
          <BarChart3 className="h-4 w-4" />
          Explore historical model evaluation
          <ArrowUpRight className="h-4 w-4" />
        </Link>
        <Link href="/conditions"
          className="ml-0 mt-3 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-sm text-cyan-200 transition hover:border-cyan-400/30 hover:bg-cyan-400/[0.06] sm:ml-3">
          <CloudRain className="h-4 w-4" />
          View live Tamil Nadu weather context
          <ArrowUpRight className="h-4 w-4" />
        </Link>
        {districtDataUnavailable && (
          <p role="alert" className="mt-6 rounded-xl border border-amber-300/20 bg-amber-300/[0.035] p-4 text-sm text-amber-200">
            The district historical API is unavailable. Confirm the database is running and the
            Tamil Nadu district dataset has been imported.
          </p>
        )}
        <DistrictForecastLab records={records} statewideForecast={statewideForecast} />
      </div>
    </main>
  );
}
