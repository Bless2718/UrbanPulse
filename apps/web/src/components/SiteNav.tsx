import Link from "next/link";
import { Activity, BarChart3, CloudRain, FlaskConical, Map, RadioTower } from "lucide-react";

type Page = "dashboard" | "map" | "districts" | "evaluation" | "conditions";
type Props = { active?: Page };

const sections = [
  { id: "dashboard", href: "/", label: "Dashboard", short: "Home", icon: Activity },
  { id: "districts", href: "/forecast/districts", label: "District Lab", short: "Districts", icon: FlaskConical },
  { id: "evaluation", href: "/forecast/evaluation", label: "Evaluation", short: "Models", icon: BarChart3 },
  { id: "conditions", href: "/conditions", label: "Live Conditions", short: "Weather", icon: CloudRain },
  { id: "map", href: "/map", label: "Map", short: "Map", icon: Map },
] as const;

export default function SiteNav({ active = "dashboard" }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:flex-nowrap sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex shrink-0 items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
          aria-label="UrbanPulse home"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
            <RadioTower className="h-4 w-4 text-cyan-300" />
          </span>
          <span>
            <span className="block text-sm font-semibold tracking-wide text-white">UrbanPulse</span>
            <span className="block text-[10px] uppercase tracking-[0.19em] text-slate-500">Risk intelligence</span>
          </span>
        </Link>
        <nav
          aria-label="Main navigation"
          className="flex w-full items-center gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03] p-1 sm:w-auto"
        >
          {sections.map(({ id, href, label, short, icon: Icon }) => (
            <Link
              key={id}
              href={href}
              aria-label={label}
              aria-current={active === id ? "page" : undefined}
              className={"inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition sm:text-sm " +
                (active === id
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-slate-400 hover:bg-white/[0.06] hover:text-white") +
                " focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"}
            >
              <Icon className={"h-4 w-4 shrink-0 " + (active === id ? "text-cyan-300" : "")} />
              <span className="sm:hidden">{short}</span>
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
