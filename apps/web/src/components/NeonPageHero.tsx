import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, Radar, ShieldCheck } from "lucide-react";

type Props = {
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
  icon: LucideIcon;
  spotlightTitle: string;
  spotlightText: string;
  spotlightLabel?: string;
  spotlightHref?: string;
  spotlightIcon?: LucideIcon;
};

function RadarArt() {
  return (
    <svg viewBox="0 0 640 270" className="urban-subpage-radar" fill="none" aria-hidden="true"
      preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="urban-page-radar-glow">
          <stop stopColor="#00dfff" stopOpacity=".25" />
          <stop offset="1" stopColor="#00aeff" stopOpacity="0" />
        </radialGradient>
        <pattern id="urban-page-grid" width="19" height="19" patternUnits="userSpaceOnUse">
          <path d="M19 0H0V19" stroke="#1c91c2" strokeOpacity=".16" strokeWidth=".7" />
        </pattern>
      </defs>
      <rect width="640" height="270" fill="url(#urban-page-grid)" />
      <circle cx="360" cy="120" r="150" fill="url(#urban-page-radar-glow)" />
      {[34, 65, 102, 141].map(radius =>
        <circle key={radius} cx="360" cy="120" r={radius}
          stroke="#08cafb" strokeOpacity={radius === 34 ? ".48" : ".18"} strokeWidth="1" />)}
      <path d="M360 120L500 62" stroke="#20edff" strokeOpacity=".58" strokeWidth="1.4" />
      <path d="M25 197C125 147 185 224 282 137S449 69 611 171"
        stroke="#00ccff" strokeOpacity=".6" strokeWidth="1" strokeDasharray="3 5" />
      <path d="M40 73C158 159 251 62 362 112S503 167 628 50"
        stroke="#3c98fa" strokeOpacity=".3" strokeWidth="1" />
      <g fill="#73f9ff">
        <circle cx="360" cy="120" r="4" />
        <circle cx="246" cy="162" r="3" />
        <circle cx="470" cy="82" r="3" />
        <circle cx="549" cy="165" r="3" />
      </g>
      <circle cx="360" cy="120" r="14" fill="#00dfff" opacity=".2" />
    </svg>
  );
}

export default function NeonPageHero({
  eyebrow, title, accent, description, icon: Icon,
  spotlightTitle, spotlightText, spotlightHref, spotlightLabel, spotlightIcon: SpotlightIcon = Radar,
}: Props) {
  const spotlight = (
    <div className="relative z-[1] flex h-full flex-col justify-between gap-5">
      <div className="flex items-center justify-between">
        <span className="urban-kpi-icon grid h-11 w-11 place-items-center rounded-xl">
          <SpotlightIcon className="h-6 w-6 text-cyan-200" strokeWidth={1.7} />
        </span>
        {spotlightHref && <ArrowUpRight className="h-5 w-5 text-cyan-200" />}
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300">
          {spotlightLabel || "Research workspace"}
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">
          {spotlightTitle}
        </h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-300">
          {spotlightText}
        </p>
      </div>
    </div>
  );

  return (
    <section className="urban-page-hero relative grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.65fr)]">
      <div className="relative flex min-h-[220px] min-w-0 items-center overflow-hidden py-4">
        <RadarArt />
        <div className="relative z-[1]">
          <p className="urban-eyebrow inline-flex items-center gap-2 rounded-full border border-cyan-400/50 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200">
            <Icon className="h-4 w-4" /> {eyebrow}
          </p>
          <h1 className="mt-5 max-w-[860px] text-[clamp(2.2rem,3.6vw,3.7rem)] font-bold leading-[1.08] tracking-[-0.048em] text-white">
            {title}{" "}
            <span className="block bg-gradient-to-r from-[#69f9ff] via-[#0ddfff] to-[#6aa4ff] bg-clip-text text-transparent">
              {accent}
            </span>
          </h1>
          <p className="mt-4 max-w-[650px] text-sm leading-7 text-slate-300 sm:text-base">
            {description}
          </p>
        </div>
      </div>
      {spotlightHref ? (
        <Link href={spotlightHref}
          className="urban-panel urban-map-card relative min-h-[215px] overflow-hidden p-5 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 sm:p-6">
          {spotlight}
          <div className="urban-spotlight-sheen" aria-hidden="true" />
        </Link>
      ) : (
        <aside className="urban-panel urban-map-card relative min-h-[215px] overflow-hidden p-5 sm:p-6">
          {spotlight}
          <div className="urban-spotlight-sheen" aria-hidden="true" />
        </aside>
      )}
      <span className="sr-only">
        <ShieldCheck className="inline" /> Decorative radar artwork does not indicate real accident locations.
      </span>
    </section>
  );
}
