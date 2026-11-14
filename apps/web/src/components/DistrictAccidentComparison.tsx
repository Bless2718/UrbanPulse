"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, MapPinned } from "lucide-react";

type District = {
  district: string;
  year: number;
  total_accidents: number;
  total_deaths: number;
  source_url: string;
};

type DistrictResponse = {
  geography: string;
  granularity: string;
  year: number;
  is_ml_prediction: boolean;
  records: District[];
};

export default function DistrictAccidentComparison() {
  const [year, setYear] = useState(2023);
  const [records, setRecords] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");
      setRecords([]);

      try {
        const response = await fetch(
          `/api/tamil-nadu/districts?year=${year}`,
          { signal: controller.signal }
        );

        if (!response.ok) throw new Error("API request failed");

        const data: DistrictResponse = await response.json();

        if (!Array.isArray(data.records)) {
          throw new Error("Invalid API response");
        }

        setRecords(
          [...data.records].sort(
            (a, b) => b.total_accidents - a.total_accidents
          )
        );
      } catch (err) {
        if (controller.signal.aborted) return;
        setError("Unable to load district accident data.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    load();

    return () => controller.abort();
  }, [year]);

  const visible = showAll ? records : records.slice(0, 12);
  const maxAccidents = Math.max(
    1,
    ...records.map((row) => row.total_accidents)
  );

  return (
    <section className="mt-10 rounded-3xl border border-white/10 bg-white/[0.025] p-6 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">
            District and city reporting areas
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Accident comparison
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Compare reported accidents and deaths across Tamil Nadu.
          </p>
        </div>

        <div>
          <label
            htmlFor="district-year"
            className="mb-2 block text-xs text-slate-400"
          >
            Reporting year
          </label>
          <select
            id="district-year"
            value={year}
            onChange={(event) => {
              setYear(Number(event.target.value));
              setShowAll(false);
            }}
            className="rounded-xl border border-white/15 bg-slate-900 px-4 py-2 text-sm text-white"
          >
            <option value={2021}>2021</option>
            <option value={2022}>2022</option>
            <option value={2023}>2023</option>
          </select>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
        <span>
          {loading
            ? "Loading..."
            : `${records.length} reporting areas`}
        </span>
        <span>Sorted by total accidents</span>
      </div>

      {error && (
        <p role="alert" className="mt-6 text-sm text-rose-300">
          {error}
        </p>
      )}

      {!loading && !error && records.length === 0 && (
        <p className="mt-6 text-sm text-slate-400">
          No district records available for this year.
        </p>
      )}

      {loading && (
        <p className="mt-8 text-sm text-slate-400">
          Fetching district statistics...
        </p>
      )}

      {!loading && !error && records.length > 0 && (
        <>
          <div className="mt-7 space-y-5">
            {visible.map((row, index) => (
              <div key={`${row.year}-${row.district}`}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-200">
                    <span className="mr-3 text-slate-500">
                      {index + 1}.
                    </span>
                    {row.district}
                  </span>
                  <div className="flex gap-4 text-xs">
                    <span className="text-cyan-300">
                      {row.total_accidents.toLocaleString("en-IN")} accidents
                    </span>
                    <span className="text-slate-400">
                      {row.total_deaths.toLocaleString("en-IN")} deaths
                    </span>
                  </div>
                </div>

                <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-400"
                    style={{
                      width: `${Math.max(
                        0,
                        (row.total_accidents / maxAccidents) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {records.length > 12 && (
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="mt-7 rounded-xl border border-cyan-400/20 px-4 py-2 text-sm text-cyan-300 hover:bg-cyan-400/10"
            >
              {showAll ? "Show top 12" : "Show all reporting areas"}
            </button>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
            <a
              href={records[0].source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cyan-300 hover:underline"
            >
              OpenCity data source
            </a>

            <Link
              href="/map"
              className="inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-white"
            >
              <MapPinned className="h-4 w-4" />
              Explore accident map
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
