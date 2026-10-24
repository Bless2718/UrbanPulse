import Link from "next/link";
import { ArrowLeft, MapPinned, ShieldCheck, Sparkles } from "lucide-react";

import AccidentMap from "@/components/AccidentMap";
import SiteNav from "@/components/SiteNav";

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
    <main className="min-h-screen">
      <SiteNav active="map" />

      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-400/[0.06] px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-cyan-300">
              <MapPinned className="h-3.5 w-3.5" />
              Geospatial explorer
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white md:text-6xl">
              Tamil Nadu accident map
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-400">
              Compare district/city accident concentration using validated centroid coordinates and 2020–2021 totals.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/[0.025] p-2">
            <div className="rounded-xl px-4 py-3 text-center">
              <div className="text-xl font-semibold text-white">{quality?.total_locations ?? rows.length}</div>
              <div className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">Source rows</div>
            </div>
            <div className="rounded-xl bg-emerald-400/[0.05] px-4 py-3 text-center">
              <div className="text-xl font-semibold text-emerald-300">{quality?.valid_coordinates ?? rows.length}</div>
              <div className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">Map-ready</div>
            </div>
            <div className="rounded-xl bg-rose-400/[0.04] px-4 py-3 text-center">
              <div className="text-xl font-semibold text-rose-300">{quality?.invalid_coordinates ?? 0}</div>
              <div className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">Rejected</div>
            </div>
          </div>
        </div>

        <section className="mt-10">
          <AccidentMap locations={rows} />
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <article className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Sparkles className="h-4 w-4 text-cyan-300" />
              Highest accident totals
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topLocations.map((location, index) => (
                <div key={location.district} className="rounded-2xl border border-white/[0.07] bg-slate-950/50 p-4">
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
            <div className="mt-5 rounded-2xl border border-amber-300/15 bg-amber-300/[0.035] p-4 text-sm leading-6 text-slate-400">
              This layer represents district/city centroids. It should not be interpreted as exact crash locations or confirmed road-level hotspots.
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
