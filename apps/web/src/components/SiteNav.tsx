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
    <header className="urban-nav-shell sticky top-0 z-40 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1470px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:flex-nowrap sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex shrink-0 items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
          aria-label="UrbanPulse home"
        >
          <span className="urban-logo-mark grid h-11 w-11 place-items-center rounded-xl sm:h-12 sm:w-12">
            <RadioTower className="h-6 w-6 text-[#6dfaff]" strokeWidth={1.8}/>
          </span>
          <span>
            <span className="block text-lg font-bold tracking-tight text-white sm:text-xl">UrbanPulse</span>
            <span className="mt-0.5 block text-[9px] font-medium uppercase tracking-[0.3em] text-slate-300 sm:text-[10px]">
              Risk intelligence
            </span>
          </span>
        </Link>

        <nav aria-label="Main navigation"
          className="urban-nav-pill flex w-full items-center gap-1 overflow-x-auto rounded-2xl p-1 sm:w-auto">
          {sections.map(({ id, href, label, short, icon: Icon }) => (
            <Link key={id} href={href} aria-label={label}
              aria-current={active === id ? "page" : undefined}
              className={"inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-transparent px-3 py-2.5 text-xs font-medium transition sm:px-4 sm:text-sm " +
                (active === id ? "urban-nav-active text-white" :
                  "text-slate-300 hover:border-white/10 hover:bg-white/[0.07] hover:text-white") +
                " focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"}>
              <Icon className={"h-4 w-4 shrink-0 " + (active === id ? "text-[#88faff]" : "text-slate-300")}
                strokeWidth={1.8} />
              <span className="sm:hidden">{short}</span>
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
