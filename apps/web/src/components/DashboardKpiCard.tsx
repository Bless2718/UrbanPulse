import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
  sparkline?: number[];
  tag?: string | null;
  tone?: "cyan" | "blue" | "amber";
  featured?: boolean;
};

function Sparkline({ numbers, tone }: { numbers: number[]; tone: string }) {
  const points = numbers.filter((value) => Number.isFinite(value) && value >= 0);
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(1, max - min);
  const toX = (i: number) => 2 + (i / (points.length - 1)) * 134;
  const toY = (value: number) => 43 - ((value - min) / range) * 29;
  const d = points.map((v, i) => (i ? "L" : "M") + " " + toX(i) + " " + toY(v)).join(" ");
  const stroke = tone === "amber" ? "#fbbf24" : tone === "blue" ? "#60a5fa" : "#22e5ff";
  return (
    <svg className="pointer-events-none absolute bottom-4 right-4 w-[104px] opacity-70 sm:w-[125px]"
      viewBox="0 0 140 52" aria-hidden="true">
      <path d={d} stroke={stroke} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={toX(points.length - 1)} cy={toY(points[points.length - 1])}
        r="4" fill={stroke} />
    </svg>
  );
}

export default function DashboardKpiCard({
  label, value, note, icon: Icon, sparkline, tag, tone = "cyan", featured = false,
}: Props) {
  return (
    <article className={"urban-panel urban-kpi relative min-h-[142px] overflow-hidden p-4 sm:p-5 " +
      (featured ? "urban-kpi-featured" : "")}>
      <div className="relative z-[1] flex items-start gap-3">
        <div className="urban-kpi-icon grid h-11 w-11 shrink-0 place-items-center rounded-xl">
          <Icon className="h-[23px] w-[23px] text-cyan-200" strokeWidth={1.6} />
        </div>
        <div className="min-w-0">
          <p className="mt-1 text-[10px] font-semibold uppercase leading-4 tracking-[0.18em] text-slate-300 sm:text-[11px]">
            {label}
          </p>
          <p className="mt-2 text-[clamp(1.5rem,2.5vw,2.35rem)] font-semibold leading-none tracking-tight tabular-nums text-white">
            {value}
          </p>
          <p className="mt-3 max-w-[205px] text-[11px] leading-5 text-slate-300">
            {note}
          </p>
          {tag && (
            <span className="mt-2 inline-flex max-w-full rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] leading-4 text-emerald-200">
              {tag}
            </span>
          )}
        </div>
      </div>
      {sparkline && <Sparkline numbers={sparkline} tone={tone} />}
    </article>
  );
}
