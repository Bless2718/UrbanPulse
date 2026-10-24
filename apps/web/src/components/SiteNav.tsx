import Link from "next/link";
import { Activity, Map, RadioTower } from "lucide-react";

type Props = {
  active?: "dashboard" | "map";
};

export default function SiteNav({ active = "dashboard" }: Props) {
  return (
    <div className="border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
            <RadioTower className="h-4 w-4 text-cyan-300" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wide text-white">UrbanPulse</div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Risk intelligence</div>
          </div>
        </Link>

        <nav className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
          <Link
            href="/"
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition ${
              active === "dashboard"
                ? "bg-white/10 text-white"
                : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
            }`}
          >
            <Activity className="h-4 w-4" />
            Dashboard
          </Link>
          <Link
            href="/map"
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition ${
              active === "map"
                ? "bg-white/10 text-white"
                : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
            }`}
          >
            <Map className="h-4 w-4" />
            Map
          </Link>
        </nav>
      </div>
    </div>
  );
}
