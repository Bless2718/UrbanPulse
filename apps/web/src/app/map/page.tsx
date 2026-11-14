import Link from "next/link";
import { ArrowLeft, MapPinned, ShieldCheck, Sparkles } from "lucide-react";

import HistoricalMapExplorer from "@/components/HistoricalMapExplorer";
import SiteNav from "@/components/SiteNav";
import NeonPageHero from "@/components/NeonPageHero";

type AccidentLocation = {
  district: string;
  total_2020: number;
  total_2021: number;
  total_accidents: number;
  latitude: number;
  longitude: number;
};

type LocationQuality = {
  total_locations: number;
  valid_coordinates: number;
  invalid_coordinates: number;
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

export default async function MapPage() {
  const [locations, quality] = await Promise.all([
    fetchJson<AccidentLocation[]>("/api/v1/accidents/locations"),
    fetchJson<LocationQuality>("/api/v1/accidents/location-quality"),
  ]);

  const rows = locations ?? [];
  const topLocations = rows.slice(0, 6);

  return (
    <main className="urban-shell urban-subpage min-h-screen">
      <SiteNav active="map" />

      <div className="relative z-[1] mx-auto max-w-[1470px] px-4 py-7 sm:px-6 lg:px-8">
        <Link href="/" className="urban-back-link inline-flex items-center gap-2 text-sm text-slate-300">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <div className="mt-5">
          <NeonPageHero
            eyebrow="Geospatial accident intelligence"
            title="Tamil Nadu"
            accent="accident map."
            icon={MapPinned}
            description="Explore accident counts at validated reporting-area centroids. Compare historical layers and inspect coverage without mistaking location markers for exact crash hotspots."
            spotlightLabel="Map data integrity"
            spotlightTitle="Centroids, not crash sites"
            spotlightText="Historical reports show district and city totals. Individual accident coordinates are not represented in this layer."
            spotlightIcon={ShieldCheck}
          />
        </div>
        <section aria-label="Map coordinate quality" className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { label: "Source locations", value: quality?.total_locations ?? (locations ? rows.length : null), note: "Imported reporting-area coordinates" },
            { label: "Validated coordinates", value: quality?.valid_coordinates ?? (locations ? rows.length : null), note: "Locations eligible for centroid map" },
            { label: "Excluded coordinates", value: quality?.invalid_coordinates ?? null, note: "Retained in source lineage, not plotted" },
          ].map((entry) => (
            <article className="urban-panel urban-metric-card relative overflow-hidden p-5" key={entry.label}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.17em] text-cyan-300">
                {entry.label}
              </p>
              <p className="mt-3 text-3xl font-semibold tabular-nums text-white">
                {entry.value === null ? "Unavailable" : entry.value.toLocaleString("en-IN")}
              </p>
              <p className="mt-2 text-xs text-slate-300">{entry.note}</p>
            </article>
          ))}
        </section>
        <section className="mt-10">
          <HistoricalMapExplorer locations={rows} />
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <article className="urban-panel p-6">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Sparkles className="h-4 w-4 text-cyan-300" />
              Highest accident totals
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topLocations.map((location, index) => (
                <div key={location.district} className="urban-location-card rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">#{index + 1}</span>
                    <span className="text-xs text-slate-500">2020–2021</span>
                  </div>
                  <h3 className="mt-3 font-medium text-white">{location.district}</h3>
                  <div className="mt-2 text-2xl font-semibold text-cyan-300">
                    {location.total_accidents.toLocaleString("en-IN")}
                  </div>
                  <div className="mt-3 flex justify-between text-xs text-slate-500">
                    <span>2020 · {location.total_2020.toLocaleString("en-IN")}</span>
                    <span>2021 · {location.total_2021.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
            <ShieldCheck className="h-5 w-5 text-emerald-300" />
            <h2 className="mt-5 text-lg font-semibold text-white">Data quality guardrail</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Coordinates are validated against a Tamil Nadu bounding box before they reach this page. Invalid source coordinates are kept in the warehouse for lineage but excluded from the map.
            </p>
            <div className="urban-research-notice mt-5 p-4 text-sm leading-6 text-slate-300">
              This layer represents district/city centroids. It should not be interpreted as exact crash locations or confirmed road-level hotspots.
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
