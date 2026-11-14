"use client";

import { useMemo, useState } from "react";
import { Activity, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export type AccidentTrendPoint = {
  year: number;
  total_accidents: number;
};

export type LegacyForecastPoint = {
  forecast_year: number;
  predicted_accidents: number;
  training_end_year: number;
  model_name: string;
};

type Props = {
  trend: AccidentTrendPoint[];
  forecast: LegacyForecastPoint | null;
};

const formatCount = (n: number) => n.toLocaleString("en-IN");

export default function AccidentTrendPanel({ trend, forecast }: Props) {
  const observed = useMemo(() =>
    [...trend]
      .filter((row) => Number.isInteger(row.year) && row.year > 1900 &&
        Number.isFinite(row.total_accidents) && row.total_accidents >= 0)
      .sort((a, b) => a.year - b.year).slice(-6), [trend]);

  const last = observed[observed.length - 1];
  const eligibleForecast = Boolean(last && forecast &&
    Number.isInteger(forecast.forecast_year) &&
    Number.isFinite(forecast.predicted_accidents) &&
    forecast.predicted_accidents >= 0 &&
    forecast.forecast_year === last.year + 1 &&
    forecast.training_end_year === last.year);

  const [mode, setMode] = useState<"actual" | "forecast">("actual");
  const showForecast = mode === "forecast" && eligibleForecast && forecast !== null;
  const w = 780, h = 265, l = 70, r = 29, t = 23, b = 43;
  const plotted = observed.length + (showForecast ? 1 : 0);
  const actualMax = Math.max(1, ...observed.map((row) => row.total_accidents));
  const maxValue = showForecast && forecast ? Math.max(actualMax, forecast.predicted_accidents) : actualMax;
  const ceiling = Math.max(1, Math.ceil(maxValue * 1.15 / 1000) * 1000);
  const x = (index: number) => l + (plotted <= 1 ? (w - l - r) / 2 : index * (w - l - r) / (plotted - 1));
  const y = (value: number) => t + (h - t - b) * (1 - value / ceiling);
  const points = observed.map((row, i) => ({ ...row, x: x(i), y: y(row.total_accidents) }));
  const lineSegments: string[] = [];
  for (let i = 1; i < points.length; i++) {
    // Do not connect across missing source years or infer intermediate values.
    if (points[i].year === points[i - 1].year + 1) {
      lineSegments.push("M " + points[i-1].x + " " + points[i-1].y +
        " L " + points[i].x + " " + points[i].y);
    }
  }
  const forecastX = showForecast ? x(observed.length) : 0;
  const forecastY = showForecast && forecast ? y(forecast.predicted_accidents) : 0;

  return (
    <section className="urban-panel urban-chart-panel min-w-0 p-5 sm:p-7"
      aria-labelledby="recent-accident-trend">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
            <Activity className="h-4 w-4" /> Observed history
          </p>
          <h2 id="recent-accident-trend" className="mt-2 text-[clamp(1.3rem,2vw,1.7rem)] font-semibold tracking-tight text-white">
            Recent accident trend
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Imported annual accident series · counts, not area-level probability
          </p>
        </div>
        {eligibleForecast ? (
          <div role="group" aria-label="Choose chart view" className="urban-segment-control inline-flex items-center gap-1 rounded-full p-1">
            <button type="button" onClick={() => setMode("actual")}
              aria-pressed={mode === "actual"}
              className={"rounded-full px-4 py-1.5 text-xs font-medium transition " +
                (mode === "actual" ? "urban-segment-selected text-white" : "text-slate-300 hover:text-white")}>
              Actual
            </button>
            <button type="button" onClick={() => setMode("forecast")}
              aria-pressed={mode === "forecast"}
              className={"rounded-full px-4 py-1.5 text-xs font-medium transition " +
                (mode === "forecast" ? "urban-segment-selected text-white" : "text-slate-300 hover:text-white")}>
              Forecast
            </button>
          </div>
        ) : (
          <Link href="/forecast/evaluation" className="inline-flex items-center gap-1.5 text-xs text-cyan-200 hover:text-white">
            Backtests <ArrowUpRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      {observed.length > 0 ? (
        <>
          <div className="mt-4 overflow-x-auto">
            <svg viewBox={"0 0 " + w + " " + h} className="w-full min-w-[450px]"
              role="img" aria-label={"Observed annual accidents " +
                observed[0].year + " through " + last.year +
                (showForecast && forecast ? "; experimental " + forecast.forecast_year +
                  " baseline " + formatCount(forecast.predicted_accidents) : "")}>
              <defs>
                <linearGradient id="urban-trend-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop stopColor="#04deef" stopOpacity=".25" />
                  <stop offset="1" stopColor="#04deef" stopOpacity=".008" />
                </linearGradient>
                <filter id="urban-trend-glow" x="-30%" y="-60%" width="160%" height="220%">
                  <feGaussianBlur stdDeviation="3" />
                </filter>
              </defs>
              {[0, 1, 2, 3, 4].map((tick) => {
                const value = ceiling * tick / 4;
                return <g key={tick}>
                  <line x1={l} x2={w-r} y1={y(value)} y2={y(value)}
                    stroke="#49a4da" strokeOpacity=".28" strokeDasharray="2 4" />
                  <text x={l-12} y={y(value)+4} textAnchor="end"
                    fontSize="11" fill="#b8cbe2">{formatCount(Math.round(value))}</text>
                </g>;
              })}
              {observed.length > 1 && (
                <path d={points.map((p, i) => (i ? "L " : "M ") + p.x + " " + p.y).join(" ") +
                  " L " + points[points.length-1].x + " " + y(0) +
                  " L " + points[0].x + " " + y(0) + " Z"}
                  fill="url(#urban-trend-fill)" opacity=".65" />
              )}
              {lineSegments.map((segment, index) => <g key={index}>
                <path d={segment} stroke="#00f2ff" strokeWidth="8" strokeOpacity=".23" filter="url(#urban-trend-glow)" />
                <path d={segment} stroke="#22e9fb" strokeWidth="3" strokeLinecap="round" />
              </g>)}
              {points.map((p) => (
                <g key={p.year}>
                  <circle cx={p.x} cy={p.y} r="5" fill="#21dce9" stroke="#7df8ff" strokeWidth="1.4">
                    <title>{p.year}: {formatCount(p.total_accidents)} reported accidents</title>
                  </circle>
                  <text x={p.x} y={h - 14} textAnchor="middle" fontSize="12" fill="#a9bbd2">
                    {p.year}
                  </text>
                </g>
              ))}
              {points.length > 0 && (
                <g>
                  <rect x={Math.max(l, points[points.length - 1].x - 72)}
                    y={Math.max(4, points[points.length - 1].y - 45)}
                    width="72" height="27" rx="7" fill="#021526"
                    stroke="#03d9ee" strokeWidth="1.1" />
                  <text x={Math.max(l, points[points.length - 1].x - 72) + 36}
                    y={Math.max(4, points[points.length - 1].y - 45) + 18}
                    fill="#f0fdff" fontSize="13" fontWeight="600" textAnchor="middle">
                    {formatCount(points[points.length - 1].total_accidents)}
                  </text>
                </g>
              )}
              {showForecast && forecast && (
                <>
                  <path d={"M " + points[points.length - 1].x + " " + points[points.length - 1].y +
                    " L " + forecastX + " " + forecastY}
                    stroke="#fbbf24" strokeWidth="3" strokeDasharray="7 6" />
                  <circle cx={forecastX} cy={forecastY} r="6" fill="#fbbf24" stroke="#fff5c4" strokeWidth="1.3">
                    <title>Experimental {forecast.forecast_year} baseline: {formatCount(forecast.predicted_accidents)} accidents</title>
                  </circle>
                  <text x={forecastX} y={h-14} textAnchor="middle" fontSize="12" fill="#fcd34d">
                    {forecast.forecast_year}
                  </text>
                </>
              )}
              <path d={"M " + l + " " + y(0) + " H " + (w-r)} stroke="#718ba9" strokeOpacity=".5" />
            </svg>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <p>
              {showForecast && forecast
                ? "Dashed amber = experimental " + forecast.model_name.replaceAll("_"," ") +
                  " baseline; not a certified prediction."
                : "Solid cyan = historically reported annual accident counts."}
            </p>
            <span>{showForecast ? "Observed + experimental" : "Historical observations"}</span>
          </div>
          <div className="sr-only">
            {observed.map(row => <span key={row.year}>
              {row.year}: {formatCount(row.total_accidents)} accidents.{" "}
            </span>)}
          </div>
        </>
      ) : (
        <p role="status" className="mt-7 rounded-xl border border-white/10 p-6 text-sm text-slate-400">
          Accident trend data is currently unavailable. No chart values have been fabricated.
        </p>
      )}
    </section>
  );
}
