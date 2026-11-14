import Link from "next/link";
import { ArrowLeft, ArrowUpRight, BarChart3, CloudRain, FlaskConical, MapPinned, ShieldAlert } from "lucide-react";

import SiteNav from "@/components/SiteNav";
import NeonPageHero from "@/components/NeonPageHero";
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
    <main className="urban-shell urban-subpage min-h-screen">
      <SiteNav active="districts" />
      <div className="relative z-[1] mx-auto max-w-[1470px] px-4 py-7 sm:px-6 lg:px-8">
        <Link href="/" className="urban-back-link inline-flex items-center gap-2 text-sm text-slate-300">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <div className="mt-5">
          <NeonPageHero
            eyebrow="District intelligence · Historical research"
            title="Explore district"
            accent="accident patterns."
            icon={FlaskConical}
            description="Compare reported accidents across Tamil Nadu districts, inspect source coverage, and explore clearly labelled hypothetical scenarios—not validated risk predictions."
            spotlightLabel="Related research"
            spotlightTitle="Historical forecast evaluation"
            spotlightText="Compare backtest results, baseline errors and data-readiness limitations for reporting areas."
            spotlightHref="/forecast/evaluation"
            spotlightIcon={BarChart3}
          />
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/forecast/evaluation" className="urban-action-link inline-flex items-center gap-2 px-4 py-2.5 text-sm">
            <BarChart3 className="h-4 w-4" /> Historical evaluation <ArrowUpRight className="h-4 w-4" />
          </Link>
          <Link href="/conditions" className="urban-action-link inline-flex items-center gap-2 px-4 py-2.5 text-sm">
            <CloudRain className="h-4 w-4" /> Live weather context <ArrowUpRight className="h-4 w-4" />
          </Link>
          <Link href="/map" className="urban-action-link inline-flex items-center gap-2 px-4 py-2.5 text-sm">
            <MapPinned className="h-4 w-4" /> Geographic comparison <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <div role="note" className="urban-research-notice mt-5 flex items-start gap-3 p-4">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          <p className="text-sm leading-6 text-slate-200">
            <strong className="text-amber-100">Research-only district comparisons.</strong>{" "}
            Historical reporting boundaries and the 2024 revision remain unresolved.
            District scenarios are arithmetic illustrations, not trained or approved forecasts.
          </p>
        </div>
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
