import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  Database,
  MapPinned,
  Workflow,
} from "lucide-react";

const metrics = [
  { label: "City Risk Score", value: "82", suffix: "/100", hint: "Demo data" },
  { label: "High-Risk Zones", value: "7", suffix: "", hint: "Demo data" },
  { label: "Predicted Risk", value: "76", suffix: "%", hint: "Next hour" },
  { label: "Pipeline Status", value: "Healthy", suffix: "", hint: "Starter" },
];

const riskZones = [
  { name: "Zone A", score: 91, level: "Critical" },
  { name: "Zone B", score: 84, level: "High" },
  { name: "Zone C", score: 72, level: "Elevated" },
  { name: "Zone D", score: 48, level: "Moderate" },
];

const pillars = [
  {
    title: "Data Engineering",
    description: "Automated ingestion, PostgreSQL, dbt-ready models, orchestration and data quality.",
    icon: Workflow,
  },
  {
    title: "Data Analytics",
    description: "Operational KPIs, spatial and temporal trends, hotspot analysis and decision-ready insights.",
    icon: Activity,
  },
  {
    title: "Data Science",
    description: "Risk prediction, feature engineering, model evaluation and explainable predictions.",
    icon: BrainCircuit,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <header className="mb-12 flex flex-col gap-6 border-b border-slate-800 pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-cyan-400">
              <MapPinned className="h-4 w-4" />
              Urban Risk Intelligence
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white md:text-6xl">
              Urban<span className="text-cyan-400">Pulse</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">
              A production-oriented data platform for identifying, explaining, and predicting urban accident risk.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-4 py-2 text-sm text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Platform starter online
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <article key={metric.label} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 backdrop-blur">
              <p className="text-sm text-slate-500">{metric.label}</p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-semibold text-white">{metric.value}</span>
                <span className="text-sm text-slate-500">{metric.suffix}</span>
              </div>
              <p className="mt-3 text-xs text-cyan-400">{metric.hint}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Risk operations</p>
                <h2 className="mt-1 text-xl font-semibold text-white">Priority zones</h2>
              </div>
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>

            <div className="space-y-5">
              {riskZones.map((zone) => (
                <div key={zone.name}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-200">{zone.name}</span>
                    <span className="text-slate-400">{zone.score}/100 · {zone.level}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-cyan-400" style={{ width: `${zone.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <Database className="h-6 w-6 text-cyan-400" />
            <p className="mt-5 text-sm text-slate-500">Current milestone</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Foundation</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Clean production structure first; real datasets, analytics and model training come next.
            </p>
            <div className="mt-6 space-y-3 text-sm">
              {["Next.js + Tailwind", "FastAPI", "PostgreSQL", "Docker Compose", "GitHub Actions"].map((item) => (
                <div key={item} className="flex items-center gap-3 text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {item}
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {pillars.map(({ title, description, icon: Icon }) => (
            <article key={title} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
              <Icon className="h-6 w-6 text-cyan-400" />
              <h3 className="mt-5 text-lg font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
            </article>
          ))}
        </section>

        <footer className="mt-12 border-t border-slate-800 pt-6 text-sm text-slate-600">
          UrbanPulse · Data Engineering × Analytics × Data Science
        </footer>
      </section>
    </main>
  );
}
