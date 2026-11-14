"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, BarChart3, Database, FlaskConical, ShieldAlert } from "lucide-react";
import {
  calculateFoldMetrics, type EvaluationCandidate, type EvaluationFold,
  type EvaluationReport, type ForecastHorizon, type ForecastMethod,
} from "@/lib/forecastEvaluation";

const METHOD_LABELS: Record<ForecastMethod, string> = {
  persistence: "Last-year baseline",
  moving_average_3: "3-year moving average",
  linear_drift: "4-year linear trend",
};
const METHODS: ForecastMethod[] = ["persistence", "moving_average_3", "linear_drift"];
const count = (n: number) => Math.round(n).toLocaleString("en-IN");
const metric = (n: number | null, suffix = "") =>
  n === null ? "N/A" : n.toLocaleString("en-IN", { maximumFractionDigits: 1 }) + suffix;
const label = (c: EvaluationCandidate) => c.candidate_id.replaceAll("_", " ") +
  (c.candidate_type === "exploratory_parent_group" ? " · exploratory group" : "");

function SmallCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <p className="text-xs uppercase tracking-[0.13em] text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-400">{detail}</p>
    </div>
  );
}

function HistoricalChart({ rows, name }: { rows: EvaluationFold[]; name: string }) {
  const ordered = [...rows].sort((a, b) => a.target_year - b.target_year);
  if (!ordered.length) return (
    <div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-white/15 p-5 text-center text-sm text-slate-400">
      No historical holdout results for this selection. No missing observations have been invented.
    </div>
  );
  const w = 720, h = 310, l = 75, r = 25, t = 25, b = 50;
  const ymax = Math.max(1, ...ordered.flatMap((row) => [row.actual, row.prediction])) * 1.12;
  const x = (i: number) => l + (ordered.length === 1 ? (w - l - r) / 2 : i * (w - l - r) / (ordered.length - 1));
  const y = (v: number) => t + (h - t - b) * (1 - v / ymax);
  const actualLine = ordered.map((p, i) => (i ? "L" : "M") + x(i) + "," + y(p.actual)).join(" ");
  const predictedLine = ordered.map((p, i) => (i ? "L" : "M") + x(i) + "," + y(p.prediction)).join(" ");
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/40 p-3" tabIndex={0}
      aria-label={"Scrollable held-out year chart for " + name}>
      <svg viewBox={"0 0 " + w + " " + h} className="w-full min-w-[510px]" role="img"
        aria-label={name + ": reported accident counts and experimental predictions for historical holdout years"}>
        {[0, 1, 2, 3, 4].map((tick) => {
          const v = ymax * tick / 4;
          return <g key={tick}>
            <line x1={l} x2={w-r} y1={y(v)} y2={y(v)} stroke="#334155" strokeDasharray="4 5"/>
            <text x={l-12} y={y(v)+4} fontSize="12" textAnchor="end" fill="#94a3b8">{count(v)}</text>
          </g>;
        })}
        {ordered.length > 1 && <>
          <path d={actualLine} fill="none" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round"/>
          <path d={predictedLine} fill="none" stroke="#fbbf24" strokeWidth="3" strokeDasharray="8 5" strokeLinecap="round"/>
        </>}
        {ordered.map((p, i) => <g key={p.target_year}>
          <circle cx={x(i)} cy={y(p.actual)} r="5" fill="#22d3ee">
            <title>{p.target_year + " observed: " + count(p.actual)}</title>
          </circle>
          <circle cx={x(i)} cy={y(p.prediction)} r="5" fill="#fbbf24">
            <title>{p.target_year + " historical prediction: " + count(p.prediction)}</title>
          </circle>
          <text x={x(i)} y={h-16} fontSize="13" textAnchor="middle" fill="#cbd5e1">{p.target_year}</text>
        </g>)}
      </svg>
    </div>
  );
}

export default function ForecastEvaluationLab({ report }: { report: EvaluationReport }) {
  const candidates = useMemo(() => [...report.candidates].sort((a, b) =>
    (a.candidate_type === b.candidate_type ? a.candidate_id.localeCompare(b.candidate_id) :
      a.candidate_type === "original_reporting_area" ? -1 : 1)), [report.candidates]);
  const initial = candidates.find((c) => c.evaluated) ?? candidates[0];
  const [selection, setSelection] = useState(initial.candidate_type + ":" + initial.candidate_id);
  const [horizon, setHorizon] = useState<ForecastHorizon>(1);
  const [method, setMethod] = useState<ForecastMethod>("persistence");
  const chosen = candidates.find((c) => c.candidate_type + ":" + c.candidate_id === selection) ?? initial;
  const folds = useMemo(() => report.folds.filter((f) =>
    f.candidate_id === chosen.candidate_id && f.candidate_type === chosen.candidate_type
      && f.horizon === horizon && f.method === method).sort((a, b) => a.target_year - b.target_year),
    [report.folds, chosen.candidate_id, chosen.candidate_type, horizon, method]);
  const summary = calculateFoldMetrics(folds);
  const comparison = METHODS.map((m) => ({
    method: m,
    ...calculateFoldMetrics(report.folds.filter((f) => f.candidate_id === chosen.candidate_id
      && f.candidate_type === chosen.candidate_type && f.horizon === horizon && f.method === m)),
  }));
  return <div className="mt-7 space-y-6">
    <section role="note" className="rounded-2xl border border-amber-300/25 bg-amber-300/[0.045] p-5">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-1 h-6 w-6 shrink-0 text-amber-300"/>
        <div>
          <h2 className="font-semibold text-amber-100">Research only — not approved for forecasting</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            These charts compare <strong>historical held-out observations</strong> against retrospective baseline
            predictions. Accident-reporting boundaries are unverified, 2024 is excluded, and none of the
            42 candidates can be used for 2026 district forecasts or operational decisions.
          </p>
        </div>
      </div>
    </section>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SmallCard title="Research candidates" value={String(report.candidates.length)} detail="All blocked from deployment"/>
      <SmallCard title="Scored histories" value={String(report.candidates.filter((c) => c.evaluated).length)}
        detail="At least one historical test fold"/>
      <SmallCard title="Historical test folds" value={count(report.folds.length)} detail="Target years at most 2023"/>
      <SmallCard title="2024 source revision gap" value={"+" + report.source_revision_accident_gap}
        detail={"Later statewide count; +" + report.source_revision_death_gap + " deaths"}/>
    </div>

    <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-cyan-300">
            <FlaskConical className="h-4 w-4"/> Historical backtest explorer
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Actual vs. experimental prediction</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Select a reporting area, prediction horizon, and model. Chart years are historical
            test targets, not a complete accident history and not future predictions.
          </p>
        </div>
        <span className="rounded-full border border-amber-300/20 px-3 py-1.5 text-xs text-amber-200">
          Unverified geography
        </span>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <label htmlFor="evaluation-candidate" className="mb-2 block text-xs text-slate-400">Reporting area / group</label>
          <select id="evaluation-candidate" value={selection} onChange={(e) => setSelection(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-slate-900 px-4 py-3 text-sm text-white">
            <optgroup label="Original reporting areas">
              {candidates.filter((c) => c.candidate_type === "original_reporting_area").map((c) =>
                <option key={c.candidate_id} value={c.candidate_type + ":" + c.candidate_id}>
                  {label(c) + (c.evaluated ? "" : " · insufficient history")}
                </option>)}
            </optgroup>
            <optgroup label="Exploratory parent-child groups">
              {candidates.filter((c) => c.candidate_type === "exploratory_parent_group").map((c) =>
                <option key={c.candidate_id} value={c.candidate_type + ":" + c.candidate_id}>
                  {label(c) + (c.evaluated ? "" : " · insufficient history")}
                </option>)}
            </optgroup>
          </select>
        </div>
        <div>
          <label htmlFor="evaluation-horizon" className="mb-2 block text-xs text-slate-400">Historical horizon</label>
          <select id="evaluation-horizon" value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value) as ForecastHorizon)}
            className="w-full rounded-xl border border-white/15 bg-slate-900 px-4 py-3 text-sm text-white">
            <option value={1}>1 year ahead</option><option value={2}>2 years ahead</option>
          </select>
        </div>
        <div>
          <label htmlFor="evaluation-method" className="mb-2 block text-xs text-slate-400">Baseline method</label>
          <select id="evaluation-method" value={method} onChange={(e) => setMethod(e.target.value as ForecastMethod)}
            className="w-full rounded-xl border border-white/15 bg-slate-900 px-4 py-3 text-sm text-white">
            {METHODS.map((m) => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
          </select>
        </div>
      </div>
      {chosen.candidate_type === "exploratory_parent_group" && (
        <p role="note" className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.035] p-4 text-xs leading-5 text-amber-100">
          <AlertTriangle className="mr-2 inline h-4 w-4"/>
          This grouping is an unverified administrative hypothesis, not a confirmed accident-reporting
          geography. Years missing a group member were omitted from the experiment.
        </p>
      )}
      {!chosen.evaluated && <p role="status" className="mt-4 rounded-xl border border-white/10 p-4 text-sm text-amber-200">
        Insufficient consecutive historical observations for this candidate.
        Missing years were not filled or treated as zero.
      </p>}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SmallCard title="MAE (accidents)" value={metric(summary.mae)} detail="Mean absolute error"/>
        <SmallCard title="RMSE (accidents)" value={metric(summary.rmse)} detail="Penalizes larger misses"/>
        <SmallCard title="WAPE" value={metric(summary.wape, "%")} detail="Total absolute error / actual total"/>
        <SmallCard title="Test folds" value={String(summary.folds)} detail={horizon + "-year historical holdouts"}/>
      </div>
      <div className="mt-7 flex flex-wrap gap-5 text-xs text-slate-400">
        <span><span className="mr-2 inline-block h-2.5 w-4 rounded-sm bg-cyan-400"/>Observed accidents</span>
        <span><span className="mr-2 inline-block h-2.5 w-4 rounded-sm bg-amber-300"/>Backtested baseline</span>
      </div>
      <div className="mt-4"><HistoricalChart rows={folds} name={label(chosen)}/></div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[540px] text-left text-sm">
          <caption className="mb-3 text-left text-xs text-slate-400">
            Historical held-out years only; model origin precedes the observed test year
          </caption>
          <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
            <tr><th scope="col" className="pb-3 pr-4">Test year</th><th scope="col" className="pb-3 pr-4">Origin</th>
              <th scope="col" className="pb-3 pr-4 text-right">Observed</th>
              <th scope="col" className="pb-3 pr-4 text-right">Backtest</th>
              <th scope="col" className="pb-3 text-right">Abs. error</th></tr>
          </thead>
          <tbody>
            {folds.map((f) => <tr key={f.target_year} className="border-b border-white/[0.06] text-slate-200">
              <td className="py-3 pr-4">{f.target_year}</td><td className="py-3 pr-4 text-slate-400">{f.origin_year}</td>
              <td className="py-3 pr-4 text-right">{count(f.actual)}</td>
              <td className="py-3 pr-4 text-right text-amber-200">{count(f.prediction)}</td>
              <td className="py-3 text-right">{metric(Math.abs(f.actual-f.prediction))}</td>
            </tr>)}
            {!folds.length && <tr><td colSpan={5} className="py-5 text-center text-slate-500">No eligible historical test folds.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>

    <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
      <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-7">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-cyan-300">
          <BarChart3 className="h-4 w-4"/> Baseline comparison
        </div>
        <h2 className="mt-2 text-xl font-semibold text-white">Model error comparison</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Same reporting area and {horizon}-year horizon.
          Lower error does not certify a reliable district forecast.
        </p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[440px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
              <tr><th scope="col" className="pb-3">Method</th><th scope="col" className="pb-3 text-right">Folds</th>
                <th scope="col" className="pb-3 text-right">MAE</th><th scope="col" className="pb-3 text-right">RMSE</th>
                <th scope="col" className="pb-3 text-right">WAPE</th></tr>
            </thead>
            <tbody>
              {comparison.map((m) => <tr key={m.method} className={"border-b border-white/[0.06] " +
                (m.method === method ? "text-cyan-200" : "text-slate-300")}>
                <td className="py-4 pr-2">{METHOD_LABELS[m.method]}</td><td className="py-4 text-right">{m.folds}</td>
                <td className="py-4 text-right">{metric(m.mae)}</td><td className="py-4 text-right">{metric(m.rmse)}</td>
                <td className="py-4 text-right">{metric(m.wape, "%")}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-500">
          MAE/RMSE are accident counts; WAPE can be unavailable with zero observed totals.
          Each fold uses at least four consecutive training years and never trains on the test year.
        </p>
      </section>
      <aside className="rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-7">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-cyan-300">
          <Database className="h-4 w-4"/> Data provenance
        </div>
        <h2 className="mt-2 text-xl font-semibold text-white">Research status</h2>
        <dl className="mt-5 space-y-4 text-sm">
          <div><dt className="text-xs text-slate-500">Report date (UTC)</dt>
            <dd className="mt-1 text-white">{report.generated_at_utc.slice(0, 10)}</dd></div>
          <div><dt className="text-xs text-slate-500">Source batch SHA-256</dt>
            <dd className="mt-1 break-all font-mono text-xs text-slate-300">{report.source_sha256}</dd></div>
          <div><dt className="text-xs text-slate-500">2024 reporting</dt>
            <dd className="mt-1 text-amber-200">Excluded; source revision unresolved</dd></div>
          <div><dt className="text-xs text-slate-500">Partial group years skipped</dt>
            <dd className="mt-1 text-white">{report.partial_group_years_skipped}</dd></div>
          <div><dt className="text-xs text-slate-500">Approved for forecasting</dt>
            <dd className="mt-1 text-amber-200">0 of 42</dd></div>
        </dl>
        <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-6 text-slate-400">
          The page reads a separately generated JSON experiment report. It does not query the
          production forecasting API, recalculate models, or promote district predictions.
        </p>
      </aside>
    </div>
    <p className="text-xs leading-6 text-slate-500">
      Limited annual histories, unverified reporting boundaries, COVID-era exposure changes and the
      2024 revision prevent interpreting these historical diagnostics as real-world forecast reliability.
    </p>
  </div>;
}
