import { BarChart3 } from "lucide-react";

export type StatewideHistoryPoint = {
  year: number;
  total_accidents: number;
  persons_killed: number;
  provisional: boolean;
  source_url: string;
};

type Props = {
  records: StatewideHistoryPoint[];
};

const formatCount = (value: number) => value.toLocaleString("en-IN");

export default function StatewideHistoryChart({ records }: Props) {
  const points = [...records]
    .filter((item) =>
      Number.isInteger(item.year) &&
      Number.isFinite(item.total_accidents) &&
      item.total_accidents >= 0 &&
      Number.isFinite(item.persons_killed) &&
      item.persons_killed >= 0
    )
    .sort((a, b) => a.year - b.year)
    .slice(-7);

  const width = 720;
  const height = 285;
  const left = 71;
  const right = 24;
  const top = 19;
  const bottom = 45;
  const plotHeight = height - top - bottom;
  const max = Math.max(1, ...points.map((row) => row.total_accidents));
  // A zero-origin axis avoids exaggerating modest changes in accident totals.
  const ceiling = Math.ceil((max * 1.12) / 10000) * 10000;
  const x = (index: number) =>
    left + (points.length < 2 ? (width - left - right) / 2 : (index * (width - left - right)) / (points.length - 1));
  const y = (count: number) => top + plotHeight * (1 - count / ceiling);
  const line = points.map((row, i) => (i === 0 ? "M " : "L ") + x(i) + " " + y(row.total_accidents)).join(" ");

  return (
    <section aria-labelledby="history-plot-title" className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-cyan-300">
            <BarChart3 className="h-4 w-4" /> Statewide historical analysis
          </p>
          <h2 id="history-plot-title" className="mt-2 text-xl font-semibold text-white">
            Reported accident trend
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
            Published Tamil Nadu annual totals. This is observed history, not a forecast or a road-level risk score.
          </p>
        </div>
        {points.length > 0 && (
          <div className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-right">
            <div className="text-xs text-slate-500">Period displayed</div>
            <div className="mt-0.5 text-sm font-medium text-white">{points[0].year}–{points[points.length - 1].year}</div>
          </div>
        )}
      </div>

      {points.length ? (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <span className="inline-flex items-center gap-2">
              <span className="h-0.5 w-5 rounded-full bg-cyan-400" /> Reported accidents
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-0.5 w-5 border-t-2 border-dashed border-amber-300" /> Provisional interval
            </span>
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.08] bg-slate-950/50 p-3">
            <svg
              className="w-full min-w-[480px]"
              viewBox={"0 0 " + width + " " + height}
              role="img"
              aria-label={"Tamil Nadu annual reported accidents from " + points[0].year + " to " + points[points.length - 1].year + ". Provisional observations are identified in the table."}
            >
              {[0, 1, 2, 3, 4].map((tick) => {
                const value = ceiling * tick / 4;
                return (
                  <g key={tick}>
                    <line x1={left} x2={width - right} y1={y(value)} y2={y(value)}
                      stroke="#334155" strokeDasharray="3 5" strokeWidth="1" />
                    <text x={left - 12} y={y(value) + 4} textAnchor="end"
                      fontSize="12" fill="#94a3b8">{formatCount(value)}</text>
                  </g>
                );
              })}
              {points.length > 1 && (
                <path d={line} stroke="#22d3ee" fill="none" strokeWidth="3"
                  strokeLinejoin="round" strokeLinecap="round" />
              )}
              {points.slice(1).map((point, idx) =>
                (point.provisional || points[idx].provisional) ? (
                  <line key={"provisional-" + point.year}
                    x1={x(idx)} y1={y(points[idx].total_accidents)}
                    x2={x(idx + 1)} y2={y(point.total_accidents)}
                    stroke="#fbbf24" strokeWidth="3" strokeDasharray="6 5" />
                ) : null
              )}
              {points.map((point, idx) => (
                <g key={point.year}>
                  <circle cx={x(idx)} cy={y(point.total_accidents)} r="5"
                    fill={point.provisional ? "#fbbf24" : "#22d3ee"}>
                    <title>{point.year}: {formatCount(point.total_accidents)} accidents{point.provisional ? " (provisional)" : ""}</title>
                  </circle>
                  <text x={x(idx)} y={height - 14} fill="#cbd5e1" fontSize="12"
                    textAnchor="middle">{point.year}</text>
                </g>
              ))}
            </svg>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <caption className="mb-3 text-left text-xs text-slate-500">
                Annual reported accidents and persons killed; most recent years shown
              </caption>
              <thead className="border-b border-white/10 text-xs uppercase tracking-[0.13em] text-slate-500">
                <tr>
                  <th scope="col" className="pb-3">Year</th>
                  <th scope="col" className="pb-3 text-right">Accidents</th>
                  <th scope="col" className="pb-3 text-right">Persons killed</th>
                  <th scope="col" className="pb-3 pl-5 text-right">Source status</th>
                </tr>
              </thead>
              <tbody>
                {[...points].reverse().slice(0, 5).map((point) => (
                  <tr key={point.year} className="border-b border-white/[0.06] text-slate-300">
                    <td className="py-3 font-medium text-white">{point.year}</td>
                    <td className="py-3 text-right tabular-nums">{formatCount(point.total_accidents)}</td>
                    <td className="py-3 text-right tabular-nums">{formatCount(point.persons_killed)}</td>
                    <td className="py-3 pl-5 text-right text-xs">
                      {point.provisional
                        ? <span className="text-amber-200">Provisional</span>
                        : <span className="text-slate-400">Reported</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            The chart starts at zero. Provisional source years can be revised; the disputed 2024 district-versus-statewide revision remains unresolved.
            {points.find((row) => row.source_url)?.source_url && (
              <> <a className="text-cyan-300 hover:underline" target="_blank" rel="noopener noreferrer"
                href={points.find((row) => row.source_url)?.source_url}>Read source publication</a>.</>
            )}
          </p>
        </>
      ) : (
        <div role="status" className="mt-6 rounded-xl border border-white/10 p-6 text-sm text-slate-400">
          Historical accident observations are currently unavailable. No substitute values are shown.
        </div>
      )}
    </section>
  );
}
