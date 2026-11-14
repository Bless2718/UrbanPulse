"use client";

import { useMemo, useState } from "react";

type AnnualRecord = {
  year: number;
  total_accidents: number;
  provisional: boolean;
};

type ForecastPoint = {
  year: number;
  total: number;
};

type ChartPoint = {
  year: number;
  total: number;
  provisional: boolean;
  forecast: boolean;
};

type Props = {
  history: AnnualRecord[];
  forecast: ForecastPoint;
};

type Range = 5 | 10 | "all";
type View = "line" | "bar";

const WIDTH = 900;
const HEIGHT = 340;
const LEFT = 70;
const RIGHT = 25;
const TOP = 22;
const BOTTOM = 48;
const PLOT_WIDTH = WIDTH - LEFT - RIGHT;
const PLOT_HEIGHT = HEIGHT - TOP - BOTTOM;

function formatCount(value: number) {
  return Math.round(value).toLocaleString("en-IN");
}

export default function ForecastInteractiveChart({ history, forecast }: Props) {
  const [range, setRange] = useState<Range>(10);
  const [view, setView] = useState<View>("line");
  const [selectedYear, setSelectedYear] = useState(forecast.year);

  const records = useMemo(() => {
    const unique = new Map<number, AnnualRecord>();
    for (const row of history) {
      if (
        Number.isInteger(row.year) &&
        Number.isFinite(row.total_accidents) &&
        row.total_accidents >= 0 &&
        row.year < forecast.year
      ) {
        unique.set(row.year, row);
      }
    }
    const sorted = Array.from(unique.values()).sort((a, b) => a.year - b.year);
    const visible = range === "all" ? sorted : sorted.slice(-range);
    const observed: ChartPoint[] = visible.map((row) => ({
      year: row.year,
      total: row.total_accidents,
      provisional: row.provisional,
      forecast: false,
    }));
    return [
      ...observed,
      {
        year: forecast.year,
        total: forecast.total,
        provisional: false,
        forecast: true,
      },
    ];
  }, [history, forecast.year, forecast.total, range]);

  const maxValue = Math.max(1, ...records.map((row) => row.total));
  const ceiling = Math.ceil(maxValue / 10000) * 10000 || 10000;
  const x = (index: number) =>
    LEFT + (records.length === 1 ? PLOT_WIDTH / 2 : (index / (records.length - 1)) * PLOT_WIDTH);
  const y = (total: number) => TOP + PLOT_HEIGHT * (1 - total / ceiling);
  const observed = records.filter((row) => !row.forecast);
  const observedLine = observed
    .map((row, index) => (index === 0 ? "M" : "L") + x(index) + "," + y(row.total))
    .join(" ");
  const forecastIndex = records.length - 1;
  const lastObserved = observed.length ? observed[observed.length - 1] : null;
  const forecastSegment = lastObserved
    ? "M" + x(forecastIndex - 1) + "," + y(lastObserved.total) +
      " L" + x(forecastIndex) + "," + y(forecast.total)
    : "";
  const selected = records.find((row) => row.year === selectedYear) ?? records[forecastIndex];
  const selectedIndex = records.findIndex((row) => row.year === selected.year);
  const previous = selectedIndex > 0 ? records[selectedIndex - 1] : null;
  const difference = previous ? selected.total - previous.total : null;
  const percent = previous && previous.total > 0
    ? (100 * (selected.total - previous.total)) / previous.total
    : null;
  const tickEvery = records.length > 18 ? 5 : records.length > 10 ? 2 : 1;

  return (
    <div className="mt-7 rounded-2xl border border-white/10 bg-slate-950/40 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-white">Explore observed accidents and forecast</h3>
          <p className="mt-1 text-xs text-slate-400">
            Choose a view and period, then hover, click, or focus a data point to inspect it.
          </p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Chart controls">
          <div className="inline-flex rounded-lg border border-white/10 p-1" aria-label="Chart view">
            {(["line", "bar"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={view === mode}
                onClick={() => setView(mode)}
                className={
                  "rounded-md px-3 py-1.5 text-xs font-medium transition " +
                  (view === mode ? "bg-cyan-400/20 text-cyan-200" : "text-slate-400 hover:text-white")
                }
              >
                {mode === "line" ? "Line" : "Bar"}
              </button>
            ))}
          </div>
          <div className="inline-flex rounded-lg border border-white/10 p-1" aria-label="History range">
            {([5, 10, "all"] as const).map((period) => (
              <button
                key={period}
                type="button"
                aria-pressed={range === period}
                onClick={() => setRange(period)}
                className={
                  "rounded-md px-3 py-1.5 text-xs font-medium transition " +
                  (range === period ? "bg-cyan-400/20 text-cyan-200" : "text-slate-400 hover:text-white")
                }
              >
                {period === "all" ? "All" : String(period) + "Y"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-4 rounded-sm bg-cyan-400" /> Observed
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-4 rounded-sm border border-dashed border-amber-300 bg-amber-300/30" />
          Experimental forecast
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full border-2 border-cyan-300" />
          Provisional observation
        </span>
      </div>

      <div className="mt-3 overflow-x-auto" tabIndex={0} aria-label="Scrollable accident chart">
        <svg
          viewBox={"0 0 " + WIDTH + " " + HEIGHT}
          className="min-w-[640px] w-full"
          role="img"
          aria-label={
            "Tamil Nadu statewide annual accident " + view + " chart with " +
            observed.length + " observed years and the " + forecast.year + " experimental forecast"
          }
        >
          {[0, 1, 2, 3, 4].map((tick) => {
            const total = (ceiling * tick) / 4;
            const pos = y(total);
            return (
              <g key={tick}>
                <line x1={LEFT} y1={pos} x2={WIDTH - RIGHT} y2={pos} stroke="#334155" strokeOpacity="0.55" strokeDasharray="4 6" />
                <text x={LEFT - 12} y={pos + 4} textAnchor="end" fill="#94a3b8" fontSize="12">
                  {formatCount(total)}
                </text>
              </g>
            );
          })}
          {records.map((row, index) => (
            (index % tickEvery === 0 || index === forecastIndex) && (
              <text key={"label-" + row.year} x={x(index)} y={HEIGHT - 15} textAnchor="middle" fill={row.forecast ? "#fcd34d" : "#94a3b8"} fontSize="12">
                {row.year}
              </text>
            )
          ))}

          {view === "line" ? (
            <>
              {observed.length > 1 && (
                <path d={observedLine} fill="none" stroke="#22d3ee" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
              )}
              {forecastSegment && (
                <path d={forecastSegment} fill="none" stroke="#fbbf24" strokeWidth="3" strokeDasharray="7 6" strokeLinecap="round" />
              )}
              {records.map((row, index) => (
                <g
                  key={row.year}
                  role="button"
                  tabIndex={0}
                  aria-label={row.year + ": " + formatCount(row.total) + (row.forecast ? " predicted accidents" : row.provisional ? " provisional accidents" : " observed accidents")}
                  aria-pressed={selected.year === row.year}
                  onMouseEnter={() => setSelectedYear(row.year)}
                  onFocus={() => setSelectedYear(row.year)}
                  onClick={() => setSelectedYear(row.year)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedYear(row.year);
                    }
                  }}
                  className="cursor-pointer outline-none"
                >
                  <circle cx={x(index)} cy={y(row.total)} r="14" fill="transparent" />
                  <circle
                    cx={x(index)}
                    cy={y(row.total)}
                    r={selected.year === row.year ? 7 : 5}
                    fill={row.forecast ? "#fbbf24" : row.provisional ? "#020617" : "#22d3ee"}
                    stroke={row.forecast ? "#fbbf24" : "#67e8f9"}
                    strokeWidth={row.provisional || row.forecast ? 2.5 : 1}
                  />
                  {selected.year === row.year && (
                    <circle cx={x(index)} cy={y(row.total)} r="11" fill="none" stroke={row.forecast ? "#fbbf24" : "#22d3ee"} strokeOpacity="0.5" strokeWidth="2" />
                  )}
                </g>
              ))}
            </>
          ) : (
            records.map((row, index) => {
              const barWidth = Math.min(34, (PLOT_WIDTH / records.length) * 0.7);
              const barHeight = Math.max(1, TOP + PLOT_HEIGHT - y(row.total));
              return (
                <g
                  key={row.year}
                  role="button"
                  tabIndex={0}
                  aria-label={row.year + ": " + formatCount(row.total) + (row.forecast ? " predicted accidents" : " observed accidents")}
                  aria-pressed={selected.year === row.year}
                  onMouseEnter={() => setSelectedYear(row.year)}
                  onFocus={() => setSelectedYear(row.year)}
                  onClick={() => setSelectedYear(row.year)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedYear(row.year);
                    }
                  }}
                  className="cursor-pointer outline-none"
                >
                  <rect
                    x={x(index) - barWidth / 2}
                    y={y(row.total)}
                    width={barWidth}
                    height={barHeight}
                    rx="3"
                    fill={row.forecast ? "#fbbf24" : "#22d3ee"}
                    fillOpacity={row.forecast ? 0.45 : row.provisional ? 0.5 : 0.8}
                    stroke={selected.year === row.year || row.forecast ? (row.forecast ? "#fcd34d" : "#a5f3fc") : "none"}
                    strokeWidth="2"
                    strokeDasharray={row.forecast ? "5 3" : undefined}
                  />
                </g>
              );
            })
          )}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3" aria-live="polite">
        <div>
          <p className="text-xs text-slate-400">
            {selected.year} · {selected.forecast ? "Experimental forecast" : selected.provisional ? "Provisional observation" : "Finalized observation"}
          </p>
          <p className="mt-1 text-2xl font-semibold text-white">{formatCount(selected.total)} <span className="text-sm font-normal text-slate-400">accidents</span></p>
        </div>
        <div className="text-right text-sm text-slate-300">
          {difference === null ? (
            "No prior year in view"
          ) : (
            <>
              <span className={difference > 0 ? "text-rose-300" : difference < 0 ? "text-emerald-300" : "text-slate-300"}>
                {(difference > 0 ? "+" : "") + formatCount(difference)}
                {percent === null ? "" : " (" + (percent > 0 ? "+" : "") + percent.toFixed(1) + "%)"}
              </span>
              <p className="mt-1 text-xs text-slate-500">
                {selected.forecast ? "Forecast vs. last observed year" : "Change from previous displayed year"}
              </p>
            </>
          )}
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        The amber point is a model output, not a reported accident count. The dashed segment is
        not a confidence interval. No uncertainty range has been calibrated.
      </p>
    </div>
  );
}
