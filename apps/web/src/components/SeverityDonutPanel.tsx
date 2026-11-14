import { Database, ShieldAlert } from "lucide-react";

export type SeveritySummary = {
  year: number;
  total_accidents: number;
  fatal_accidents: number;
  grievous_injury_accidents: number;
  minor_injury_accidents: number;
  non_injury_accidents: number;
  fatal_killed: number;
};

type Props = { summary: SeveritySummary | null };

const COLORS = ["#ac79ff", "#168fff", "#2de4f6", "#55e4d8"];
const asCount = (value: number) => value.toLocaleString("en-IN");

export default function SeverityDonutPanel({ summary }: Props) {
  const categories = summary ? [
    { label: "Fatal accidents", count: summary.fatal_accidents },
    { label: "Grievous injury", count: summary.grievous_injury_accidents },
    { label: "Minor injury", count: summary.minor_injury_accidents },
    { label: "Non-injury", count: summary.non_injury_accidents },
  ] : [];
  const valid = Boolean(
    summary &&
    Number.isInteger(summary.year) &&
    Number.isInteger(summary.total_accidents) && summary.total_accidents > 0 &&
    categories.every((entry) => Number.isInteger(entry.count) && entry.count >= 0) &&
    categories.reduce((sum, entry) => sum + entry.count, 0) === summary.total_accidents
  );

  const stops = valid && summary ? categories.reduce<{ start: number; end: number; color: string }[]>(
    (result, entry, index) => {
      const start = result.length ? result[result.length - 1].end : 0;
      const end = start + entry.count * 100 / summary.total_accidents;
      result.push({ start, end, color: COLORS[index] });
      return result;
    }, []) : [];

  const gradient = stops.length ? "conic-gradient(" +
    stops.map((part) => part.color + " " + part.start + "% " + part.end + "%").join(", ") + ")" : "none";

  return (
    <section aria-labelledby="severity-profile-title"
      className="urban-panel urban-severity-panel min-w-0 p-5 sm:p-7">
      <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-cyan-300">
        <Database className="h-4 w-4" /> Latest severity profile
      </p>
      <h2 id="severity-profile-title" className="mt-2 text-[clamp(1.3rem,2vw,1.7rem)] font-semibold tracking-tight text-white">
        {summary ? summary.year + " breakdown" : "Severity unavailable"}
      </h2>
      <p className="mt-1 text-xs text-slate-400">
        Imported accident series · crash categories, not individuals killed
      </p>
      <div className="mt-5 h-px bg-gradient-to-r from-cyan-300/25 to-transparent" />

      {valid && summary ? (
        <>
          <div className="mt-6 grid items-center gap-6 sm:grid-cols-[minmax(135px,0.9fr)_minmax(0,1fr)] lg:grid-cols-1 xl:grid-cols-[minmax(150px,0.9fr)_minmax(0,1fr)]">
            <div className="urban-donut mx-auto grid h-[185px] w-[185px] max-w-full shrink-0 place-items-center rounded-full sm:h-[165px] sm:w-[165px] xl:h-[195px] xl:w-[195px]"
              style={{ background: gradient }} role="img"
              aria-label={"Accident severity split for " + summary.year + ": " +
                categories.map((entry) => entry.label + " " + entry.count).join(", ")}>
              <div className="urban-donut-hole flex h-[70%] w-[70%] flex-col items-center justify-center rounded-full text-center">
                <span className="text-2xl font-semibold tracking-tight tabular-nums text-white sm:text-3xl">
                  {asCount(summary.total_accidents)}
                </span>
                <span className="mt-1 text-xs text-slate-300">Accidents</span>
              </div>
            </div>
            <div className="min-w-0 space-y-1">
              {categories.map((entry, index) => (
                <div key={entry.label} className="flex items-center justify-between gap-3 border-b border-white/[0.075] py-2.5 text-xs last:border-0 sm:text-sm">
                  <span className="inline-flex min-w-0 items-center gap-2 text-slate-200">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                    <span>{entry.label}</span>
                  </span>
                  <span className="shrink-0 text-right tabular-nums text-white">
                    {asCount(entry.count)}
                    <span className="ml-1 text-[10px] text-slate-400">
                      ({(entry.count * 100 / summary.total_accidents).toFixed(1)}%)
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-6 text-xs text-slate-400">
            {asCount(summary.fatal_killed)} persons killed reported separately from fatal accident count.
          </p>
        </>
      ) : (
        <div role="status" className="mt-7 rounded-xl border border-amber-300/20 bg-amber-300/[0.035] p-4">
          <ShieldAlert className="mb-2 h-5 w-5 text-amber-300" />
          <p className="text-sm leading-6 text-slate-300">
            {summary
              ? "The severity categories do not reconcile with the supplied accident total. A percentage donut would be misleading, so it is not displayed."
              : "No severity summary is available from the existing accident analytics API."}
          </p>
          {summary && (
            <dl className="mt-4 space-y-2 text-xs text-slate-300">
              <div className="flex justify-between gap-2"><dt>Total accidents</dt><dd>{asCount(summary.total_accidents)}</dd></div>
              {categories.map((item) => (
                <div className="flex justify-between gap-2" key={item.label}>
                  <dt>{item.label}</dt><dd>{asCount(item.count)}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </section>
  );
}
