"use client";

import { useEffect, useMemo, useState } from "react";
import AccidentMap from "@/components/AccidentMap";

type AccidentLocation = {
  district: string;
  total_2020: number;
  total_2021: number;
  total_accidents: number;
  latitude: number;
  longitude: number;
};

type DistrictRecord = {
  district: string;
  year: number;
  total_accidents: number;
  total_deaths: number;
  source_url: string;
};

type DistrictResponse = {
  records: DistrictRecord[];
};

function normalizeDistrict(name: string): string {
  return name.toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
}

export default function HistoricalMapExplorer({
  locations,
}: {
  locations: AccidentLocation[];
}) {
  const [year, setYear] = useState("combined");
  const [loadedYear, setLoadedYear] = useState("");
  const [records, setRecords] = useState<DistrictRecord[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (year === "combined") return;

    const controller = new AbortController();
    setError("");
    setLoadedYear("");
    setRecords([]);

    async function load() {
      try {
        const response = await fetch(
          `/api/tamil-nadu/districts?year=${year}`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error("District API unavailable");
        const data: DistrictResponse = await response.json();
        if (!Array.isArray(data.records)) throw new Error("Invalid district response");
        if (controller.signal.aborted) return;
        setRecords(data.records);
        setLoadedYear(year);
      } catch {
        if (!controller.signal.aborted) {
          setError("Could not load historical district data. Try another year.");
        }
      }
    }

    load();
    return () => controller.abort();
  }, [year]);

  const { matchedLocations, unmatchedNames } = useMemo(() => {
    const byName = new Map(
      records.map((record) => [normalizeDistrict(record.district), record])
    );
    const matched = locations.flatMap((location) => {
      const record = byName.get(normalizeDistrict(location.district));
      return record
        ? [{
            ...location,
            total_accidents: record.total_accidents,
            total_deaths: record.total_deaths,
          }]
        : [];
    });
    const coordinateNames = new Set(
      locations.map((location) => normalizeDistrict(location.district))
    );
    const unmatched = records
      .filter((record) => !coordinateNames.has(normalizeDistrict(record.district)))
      .map((record) => record.district);
    return { matchedLocations: matched, unmatchedNames: unmatched };
  }, [locations, records]);

  const isCombined = year === "combined";
  const loading = !isCombined && loadedYear !== year && !error;
  const displayedLocations = isCombined ? locations : matchedLocations;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-300">
            Accident map layer
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {isCombined
              ? "Original 2020-2021 combined dataset"
              : `Tamil Nadu district report for ${year}`}
          </p>
        </div>
        <div>
          <label htmlFor="map-year" className="mb-2 block text-xs text-slate-400">
            Reporting period
          </label>
          <select
            id="map-year"
            value={year}
            onChange={(event) => setYear(event.target.value)}
            className="rounded-xl border border-white/15 bg-slate-900 px-4 py-2 text-sm text-white"
          >
            <option value="combined">2020-2021 combined</option>
            <option value="2021">2021 (newer source)</option>
            <option value="2022">2022</option>
            <option value="2023">2023</option>
          </select>
        </div>
      </div>

      {loading && (
        <p className="text-sm text-slate-400" role="status">
          Loading {year} accident records...
        </p>
      )}
      {error && <p className="text-sm text-rose-300" role="alert">{error}</p>}
      {!isCombined && !loading && !error && (
        <p className="text-sm text-slate-400" role="status">
          Mapped {matchedLocations.length} of {records.length} reporting areas.
          {unmatchedNames.length > 0 && (
            <span> {unmatchedNames.length} unmatched areas were excluded rather than assigned an uncertain location.</span>
          )}
        </p>
      )}

      {!loading && !error && (
        <AccidentMap
          locations={displayedLocations}
          displayYear={isCombined ? undefined : Number(year)}
        />
      )}

      <p className="text-xs leading-5 text-slate-500">
        Markers show reporting-area centroids, not individual crash sites.
        The combined 2020-2021 layer and newer annual layers come from different
        source datasets and should not be treated as interchangeable totals.
        Historical layers use exact normalized name matches only.
      </p>
    </div>
  );
}
