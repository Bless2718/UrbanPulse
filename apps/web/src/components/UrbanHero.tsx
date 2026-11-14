import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  Layers3,
  MapPin,
  MapPinned,
  ShieldCheck,
} from "lucide-react";

/** Abstract network art is purely decorative, never a live incident or risk map. */
function GeoArt() {
  const nodes = [
    [95, 206], [156, 174], [221, 233], [302, 115], [359, 199],
    [424, 139], [481, 250], [566, 116], [590, 234], [512, 320],
  ];
  return (
    <svg className="urban-geo-svg" viewBox="0 0 690 390" fill="none"
      aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <defs>
        <pattern id="urban-geo-grid" width="24" height="24" patternUnits="userSpaceOnUse"
          patternTransform="matrix(0.99 -0.19 0.34 0.55 0 0)">
          <path d="M24 0H0V24" stroke="#0784bd" strokeOpacity=".22" strokeWidth=".7" />
        </pattern>
        <radialGradient id="urban-geo-glow">
          <stop stopColor="#09cfff" stopOpacity=".3" />
          <stop offset="1" stopColor="#09cfff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="urban-geo-line" x1="0" y1="0" x2="650" y2="340" gradientUnits="userSpaceOnUse">
          <stop stopColor="#004767" stopOpacity=".05" />
          <stop offset=".55" stopColor="#00ddff" stopOpacity=".88" />
          <stop offset="1" stopColor="#3579ff" stopOpacity=".22" />
        </linearGradient>
        <filter id="urban-node-glow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      <ellipse cx="360" cy="200" rx="295" ry="170" fill="url(#urban-geo-glow)" />
      <path d="M44 248L275 49 601 95 655 318 232 364Z" fill="url(#urban-geo-grid)" opacity=".98" />
      <g stroke="#0c91c1" strokeOpacity=".18" strokeWidth=".7">
        <path d="M40 295L611 82M76 351L644 136M122 390L670 204M32 215L539 35M84 147L668 335" />
        <path d="M121 58L320 379M222 30L407 376M329 10L482 363M437 23L576 338" />
      </g>
      <path d="M142 269C188 227 172 190 235 163C292 137 289 101 339 95
        C395 91 420 135 442 110C480 72 532 96 552 136C562 160 539 189 580 217
        C612 238 571 277 545 269C509 256 501 305 457 318C413 328 385 279 339 290
        C293 299 269 271 247 303C226 336 164 310 142 269Z"
        stroke="url(#urban-geo-line)" strokeWidth="1.5" />
      <path d="M199 209L302 115 359 199 424 139 481 250 566 116
        M156 174L221 233 359 199 481 250 512 320
        M95 206L221 233 302 115 566 116 590 234"
        stroke="#16bfff" strokeOpacity=".27" strokeWidth="1" strokeDasharray="3 5" />
      <g className="urban-beacon">
        <circle cx="359" cy="199" r="61" stroke="#00eaff" strokeOpacity=".12" />
        <circle cx="359" cy="199" r="43" stroke="#00eaff" strokeOpacity=".28" />
        <ellipse cx="359" cy="199" rx="31" ry="13" stroke="#04e5ff" strokeOpacity=".72" />
        <ellipse cx="359" cy="199" rx="17" ry="7" stroke="#04e5ff" />
        <path d="M359 75V199" stroke="#05dfff" strokeWidth="2" strokeOpacity=".8" />
        <path d="M359 65V199" stroke="#00eaff" strokeWidth="7" strokeOpacity=".25" filter="url(#urban-node-glow)" />
        <circle cx="359" cy="199" r="6" fill="#b3faff" />
      </g>
      {nodes.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="9" fill="#00cfff" opacity=".62" filter="url(#urban-node-glow)" />
          <circle cx={x} cy={y} r="3" fill="#b8faff" />
        </g>
      ))}
    </svg>
  );
}

function TopographicWave() {
  return (
    <svg className="urban-map-wave" viewBox="0 0 510 155" fill="none"
      aria-hidden="true" preserveAspectRatio="none">
      {Array.from({ length: 18 }, (_, i) => {
        const y = 76 + i * 5.6;
        return (
          <path key={i}
            d={"M-5 " + y + " C105 " + (y + 44) + " 175 " + (y - 91) + " 277 " +
              (y - 34) + " S442 " + (y + 5) + " 520 " + (y - 86)}
            stroke="#05d9ff" strokeOpacity={Math.max(.05, .32 - i * .011)}
            strokeWidth=".75" strokeDasharray={i % 3 === 0 ? "2 5" : "1 3"} />
        );
      })}
      <circle cx="351" cy="90" r="6" fill="#00eaff" opacity=".7" />
    </svg>
  );
}

export default function UrbanHero() {
  return (
    <section className="urban-hero grid gap-5 lg:grid-cols-[minmax(0,1.88fr)_minmax(340px,0.85fr)] lg:items-stretch">
      <div className="relative z-[1] min-w-0 pt-2 lg:py-3">
        <div className="urban-hero-geo"><GeoArt /></div>
        <div className="relative z-[2]">
          <span className="urban-eyebrow inline-flex items-center gap-2 rounded-full border border-cyan-400/50 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.23em] text-cyan-200 sm:text-xs">
            <ShieldCheck className="h-4 w-4" />
            Urban accident intelligence
          </span>
          <h1 className="urban-hero-title mt-4 max-w-[850px] text-[clamp(2.3rem,4.1vw,4.1rem)] font-bold leading-[1.07] tracking-[-0.05em] text-white">
            From raw accident data to
            <span className="block bg-gradient-to-r from-[#70f9ff] via-[#20d9ff] to-[#58a1ff] bg-clip-text text-transparent">
              decision-ready risk signals.
            </span>
          </h1>
          <p className="mt-4 max-w-[700px] text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
            UrbanPulse combines ingestion, PostgreSQL, dbt analytics, experimental forecasting
            and geospatial exploration in one end-to-end research platform.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs font-medium text-slate-100 sm:text-sm">
            <span className="inline-flex items-center gap-2">
              <Layers3 className="h-5 w-5 text-cyan-300" /> Ingest &amp; unify
            </span>
            <span className="hidden h-5 w-px bg-cyan-400/20 sm:block" />
            <span className="inline-flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-cyan-300" /> Analyze &amp; forecast
            </span>
            <span className="hidden h-5 w-px bg-cyan-400/20 sm:block" />
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-5 w-5 text-cyan-300" /> Explore spatially
            </span>
          </div>
        </div>
      </div>
      <Link href="/map"
        className="urban-panel urban-map-card group relative z-[2] flex min-h-[235px] flex-col overflow-hidden p-6 sm:p-7 lg:min-h-[260px]"
        aria-label="Explore the Tamil Nadu accident map">
        <div className="relative z-10 flex items-start justify-between">
          <MapPinned className="h-9 w-9 text-cyan-300 drop-shadow-[0_0_13px_rgba(0,229,255,0.7)]" />
          <ArrowUpRight className="h-6 w-6 text-sky-200 transition group-hover:-translate-y-1 group-hover:translate-x-1" />
        </div>
        <p className="relative z-10 mt-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">
          Explore geospatial view
        </p>
        <h2 className="relative z-10 mt-2 text-[clamp(1.3rem,1.9vw,1.85rem)] font-semibold tracking-tight text-white">
          Tamil Nadu accident map
        </h2>
        <p className="relative z-10 mt-2 max-w-[350px] text-sm leading-6 text-slate-300">
          View reporting-area centroids and compare historical accident concentration across locations.
        </p>
        <TopographicWave />
      </Link>
    </section>
  );
}
