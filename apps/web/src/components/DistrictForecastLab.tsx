"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ArrowUpRight, BarChart3, FlaskConical, ShieldAlert } from "lucide-react";

export type DistrictAccidentRecord = {
  district: string;
  year: number;
  total_accidents: number;
  total_deaths: number;
  source_url: string;
};

type Props = {
  records: DistrictAccidentRecord[];
  statewideForecast: {
    forecast_year: number;
    predicted_accidents: number;
    model_name: string;
    status: string;
  } | null;
};

type SeriesPoint = { year: number; total: number; kind: "observed" | "scenario" };

const TARGET_YEAR = 2026;
const nf = (n: number) => Math.round(n).toLocaleString("en-IN");

export default function DistrictForecastLab({ records, statewideForecast }: Props) {
  const availableYears = useMemo(
    () => [...new Set(records.map((r) => r.year))].sort((a, b) => a - b),
    [records]
  );
  const latestYear = availableYears[availableYears.length - 1] ?? 2023;
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [rankingYear, setRankingYear] = useState(latestYear);
  const [annualChange, setAnnualChange] = useState(0);
  const [metric, setMetric] = useState<"total_accidents" | "total_deaths">("total_accidents");
  const [showAll, setShowAll] = useState(false);

  const districts = useMemo(
    () => [...new Set(records.map((r) => r.district))].sort((a, b) => a.localeCompare(b)),
    [records]
  );
  const district = districts.includes(selectedDistrict) ? selectedDistrict : (districts[0] ?? "");
  const history = useMemo(
    () => records.filter((r) => r.district === district).sort((a, b) => a.year - b.year),
    [records, district]
  );
  const latest = history[history.length - 1] ?? null;
  const hasEnoughHistory = history.length >= 5 &&
    history.every((r, i) => i === 0 || r.year === history[i - 1].year + 1);
  const scenario = useMemo<SeriesPoint[]>(() => {
    if (!latest || latest.year >= TARGET_YEAR) return [];
    return Array.from({ length: TARGET_YEAR - latest.year }, (_, i) => {
      const year = latest.year + i + 1;
      return {
        year,
        total: latest.total_accidents * Math.pow(1 + annualChange / 100, i + 1),
        kind: "scenario" as const,
      };
    });
  }, [latest, annualChange]);
  const series: SeriesPoint[] = [
    ...history.map((r) => ({ year: r.year, total: r.total_accidents, kind: "observed" as const })),
    ...scenario,
  ];
  const ranking = records
    .filter((r) => r.year === (availableYears.includes(rankingYear) ? rankingYear : latestYear))
    .sort((a, b) => b[metric] - a[metric] || a.district.localeCompare(b.district));
  const visible = showAll ? ranking : ranking.slice(0, 10);
  const maxRanking = Math.max(1, ...ranking.map((r) => r[metric]));
  const historicalCoverage = history.length
    ? history.map((r) => r.year).join(", ")
    : "No records";
  const maxChart = Math.max(1, ...series.map((r) => r.total));
  const ceiling = Math.ceil(maxChart / 1000) * 1000;
  const w = 720, h = 290, left = 70, right = 22, top = 20, bottom = 42;
  const x = (index: number) => left + (series.length === 1 ? (w - left - right) / 2 : index * (w - left - right) / (series.length - 1));
  const y = (total: number) => top + (h - top - bottom) * (1 - total / ceiling);
  const observedLine = history.map((r, i) => (i ? "L" : "M") + x(i) + "," + y(r.total_accidents)).join(" ");
  const scenarioLine = latest && scenario.length
    ? ["M" + x(history.length - 1) + "," + y(latest.total_accidents),
      ...scenario.map((r, i) => "L" + x(history.length + i) + "," + y(r.total))].join(" ")
    : "";
  const source = latest?.source_url;
  const totalLatest = records.filter((r) => r.year === latestYear).length;

  return (
    <div className="mt-8 space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="urban-panel urban-metric-card relative overflow-hidden p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-cyan-300">Statewide ML forecast</p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {statewideForecast ? nf(statewideForecast.predicted_accidents) : "Unavailable"}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            {statewideForecast
              ? statewideForecast.forecast_year + " · " + statewideForecast.model_name + " · experimental"
              : "Run the statewide training pipeline"}
          </p>
          <Link href="/" className="mt-3 inline-flex items-center gap-1 text-xs text-cyan-300 hover:text-white">
            Full statewide forecast <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="urban-panel urban-metric-card relative overflow-hidden p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">District data coverage</p>
          <p className="mt-3 text-3xl font-semibold text-white">{availableYears.length} <span className="text-lg text-slate-400">years</span></p>
          <p className="mt-2 text-xs text-slate-400">
            {availableYears.length ? availableYears[0] + "–" + latestYear : "No district data"} · {totalLatest} reporting areas in latest year
          </p>
        </div>
        <div className="urban-panel urban-metric-card urban-amber-card relative overflow-hidden p-5">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-amber-200">
            <ShieldAlert className="h-4 w-4" /> District forecast status
          </p>
          <p className="mt-3 text-lg font-semibold text-white">Not model-validated</p>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            Short district history prevents a credible, backtested 2026 district ML prediction.
          </p>
        </div>
      </div>

      <section className="urban-panel urban-chart-panel p-5 sm:p-7" aria-labelledby="district-lab-heading">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-cyan-300">
              <FlaskConical className="h-4 w-4" /> Forecasting experiment
            </p>
            <h2 id="district-lab-heading" className="mt-2 text-2xl font-semibold text-white">
              District scenario explorer
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Explore historical reporting-area totals, then adjust an assumed annual change to see a
              hypothetical path through 2026. These scenarios are not trained predictions.
            </p>
          </div>
          <div>
            <label htmlFor="district-choice" className="mb-2 block text-xs text-slate-400">Reporting area</label>
            <select
              id="district-choice"
              value={district}
              onChange={(event) => setSelectedDistrict(event.target.value)}
              className="urban-select max-w-full rounded-xl px-4 py-2 text-sm text-white"
              disabled={!districts.length}
            >
              {districts.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
        </div>

        {!latest ? (
          <p className="mt-6 rounded-xl border border-amber-300/20 p-5 text-sm text-amber-200">
            District records are unavailable. Import the verified 2021–2023 district dataset to use this explorer.
          </p>
        ) : (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="urban-inner-panel rounded-xl p-4">
                <p className="text-xs text-slate-500">{latest.year} reported accidents</p>
                <p className="mt-2 text-2xl font-semibold text-white">{nf(latest.total_accidents)}</p>
              </div>
              <div className="urban-inner-panel rounded-xl p-4">
                <p className="text-xs text-slate-500">{latest.year} reported deaths</p>
                <p className="mt-2 text-2xl font-semibold text-white">{nf(latest.total_deaths)}</p>
              </div>
              <div className="urban-research-notice rounded-xl p-4">
                <p className="text-xs text-amber-200">2026 what-if scenario</p>
                <p className="mt-2 text-2xl font-semibold text-amber-100">
                  {scenario.length ? nf(scenario[scenario.length - 1].total) : "—"}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">Not an ML forecast</p>
              </div>
            </div>

            <div className="urban-inner-panel mt-6 rounded-xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="district-growth" className="text-sm font-medium text-white">
                  Assumed annual accident change
                </label>
                <span className="text-lg font-semibold text-amber-200">
                  {annualChange > 0 ? "+" : ""}{annualChange}%
                </span>
              </div>
              <input
                id="district-growth"
                type="range"
                min="-15"
                max="15"
                step="1"
                value={annualChange}
                onChange={(event) => setAnnualChange(Number(event.target.value))}
                className="urban-slider mt-4 w-full accent-cyan-300"
              />
              <div className="mt-2 flex justify-between text-xs text-slate-500">
                <span>−15% per year</span><span>0% (flat)</span><span>+15% per year</span>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-400">
                Scenario formula: last reported accident total × (1 + assumed annual rate) raised to the number of years ahead.
                The rate is user-selected, not estimated by a model.
              </p>
            </div>

            <div className="urban-chart-surface mt-6 overflow-x-auto rounded-xl p-3" tabIndex={0} aria-label="Scrollable district historical and scenario chart">
              <svg viewBox={"0 0 " + w + " " + h} className="min-w-[540px] w-full" role="img" aria-label={district + " observed annual accident totals and hypothetical scenario to 2026"}>
                {[0, 1, 2, 3, 4].map((tick) => {
                  const value = ceiling * tick / 4;
                  return (
                    <g key={tick}>
                      <line x1={left} x2={w - right} y1={y(value)} y2={y(value)} stroke="#334155" strokeDasharray="4 5" />
                      <text x={left - 12} y={y(value) + 4} fill="#94a3b8" fontSize="12" textAnchor="end">{nf(value)}</text>
                    </g>
                  );
                })}
                {history.length > 1 && <path d={observedLine} stroke="#22d3ee" strokeWidth="3" fill="none" strokeLinecap="round" />}
                {scenarioLine && <path d={scenarioLine} stroke="#fbbf24" strokeWidth="3" fill="none" strokeDasharray="7 6" strokeLinecap="round" />}
                {series.map((point, i) => (
                  <g key={point.year}>
                    <circle cx={x(i)} cy={y(point.total)} r="5" fill={point.kind === "observed" ? "#22d3ee" : "#fbbf24"} />
                    <text x={x(i)} y={h - 14} fontSize="12" textAnchor="middle" fill={point.kind === "observed" ? "#94a3b8" : "#fcd34d"}>{point.year}</text>
                    <title>{point.year + ": " + nf(point.total) + (point.kind === "observed" ? " reported accidents" : " hypothetical scenario accidents")}</title>
                  </g>
                ))}
              </svg>
            </div>
            <div className="mt-3 flex flex-wrap gap-5 text-xs text-slate-400">
              <span><span className="mr-2 inline-block h-2.5 w-3 rounded-sm bg-cyan-400" />Reported history</span>
              <span><span className="mr-2 inline-block h-2.5 w-3 rounded-sm bg-amber-300" />User-defined scenario</span>
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">
              Observed years for {district}: {historicalCoverage}. Reporting areas may include separate city jurisdictions.
              The scenario does not incorporate exposure, weather, traffic volume, or uncertainty estimates.
              {source && <> <a href={source} target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:underline">View data source</a>.</>}
            </p>
            <div className="mt-5 rounded-xl border border-amber-300/15 bg-amber-300/[0.035] p-4">
              <p className="text-sm font-medium text-amber-200">Forecast readiness: {hasEnoughHistory ? "Requires validation" : "Insufficient history"}</p>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                {hasEnoughHistory
                  ? "More years are present, but district-specific rolling backtests and source consistency checks are still required before deploying a prediction."
                  : "A credible district ML forecast needs a longer, consistently defined annual series and enough finalized years for out-of-sample backtesting."}
              </p>
            </div>
          </>
        )}
      </section>

      <section className="urban-panel urban-chart-panel p-5 sm:p-7" aria-labelledby="district-comparison-heading">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-cyan-300">
              <BarChart3 className="h-4 w-4" /> Historical context
            </p>
            <h2 id="district-comparison-heading" className="mt-2 text-xl font-semibold text-white">Compare reporting areas</h2>
            <p className="mt-2 text-sm text-slate-400">Reported counts, not future risk scores or predictions.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div>
              <label htmlFor="ranking-year" className="mb-1 block text-xs text-slate-400">Year</label>
              <select id="ranking-year" value={availableYears.includes(rankingYear) ? rankingYear : latestYear}
                onChange={(e) => { setRankingYear(Number(e.target.value)); setShowAll(false); }}
                className="urban-select rounded-lg px-3 py-2 text-sm text-white">
                {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="ranking-metric" className="mb-1 block text-xs text-slate-400">Metric</label>
              <select id="ranking-metric" value={metric} onChange={(e) => setMetric(e.target.value as typeof metric)}
                className="urban-select rounded-lg px-3 py-2 text-sm text-white">
                <option value="total_accidents">Accidents</option>
                <option value="total_deaths">Deaths</option>
              </select>
            </div>
          </div>
        </div>
        {ranking.length ? (
          <>
            <p className="mt-5 text-xs text-slate-500">{ranking.length} reporting areas · sorted by {metric === "total_accidents" ? "accident totals" : "deaths"}</p>
            <div className="mt-4 space-y-4">
              {visible.map((row, i) => (
                <button key={row.year + "-" + row.district} type="button"
                  onClick={() => { setSelectedDistrict(row.district); document.getElementById("district-lab-heading")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                  className="block w-full rounded-lg text-left transition hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-cyan-300"
                  aria-label={"Explore " + row.district + " historical trends and scenario"}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-slate-200"><span className="mr-2 text-slate-500">{i + 1}.</span>{row.district}</span>
                    <span className="shrink-0 font-medium text-cyan-300">{nf(row[metric])}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-400"
                      style={{ width: (100 * row[metric] / maxRanking) + "%" }} />
                  </div>
                </button>
              ))}
            </div>
            {ranking.length > 10 && (
              <button type="button" onClick={() => setShowAll(!showAll)}
                className="urban-primary-button mt-6 rounded-xl px-4 py-2 text-sm text-white">
                {showAll ? "Show top 10" : "Show all reporting areas"}
              </button>
            )}
          </>
        ) : <p className="mt-5 text-sm text-slate-400">No district data available for this year.</p>}
      </section>

      <div className="urban-panel p-5 text-sm text-slate-300">
        <div className="flex items-center gap-2 font-medium text-white"><Activity className="h-4 w-4 text-cyan-300" /> Next step for real district forecasting</div>
        <p className="mt-2 leading-6">
          Extend district-level observations beyond 2023, reconcile district and city jurisdiction names, and validate
          baseline forecasts on held-out years before publishing district-level predictions. Until then, only the
          statewide annual forecast is model-generated.
        </p>
      </div>
    </div>
  );
}
