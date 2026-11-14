import { BrainCircuit, ShieldAlert, TrendingUp } from "lucide-react";

export type StatewideForecast = {
  geography: string;
  forecast_year: number;
  predicted_accidents: number;
  model_name: string;
  training_end_year: number;
  training_includes_provisional: boolean;
  provisional_input_years: number[];
  status: string;
  note: string;
  validation: {
    mae: number;
    rmse: number;
    mape_pct?: number;
  };
  backtest_years: number[];
  backtest_finalized_only: boolean;
  generated_at: string;
};

type AnnualRecord = {
  year: number;
  total_accidents: number;
  provisional: boolean;
};

type Props = {
  forecast: StatewideForecast | null;
  history: AnnualRecord[];
};

export default function StatewideForecastPanel({ forecast, history }: Props) {
  const observed = history
    .filter((record) => Number.isFinite(record.total_accidents))
    .slice(-5);
  const bars = [
    ...observed.map((record) => ({
      year: record.year,
      total: record.total_accidents,
      provisional: record.provisional,
      predicted: false,
    })),
    ...(forecast
      ? [{
          year: forecast.forecast_year,
          total: forecast.predicted_accidents,
          provisional: false,
          predicted: true,
        }]
      : []),
  ];
  const maxTotal = Math.max(1, ...bars.map((row) => row.total));
  const isPersistence = forecast?.model_name === "persistence";

  return (
    <section
      aria-labelledby="statewide-forecast-heading"
      className="mt-10 rounded-3xl border border-cyan-400/15 bg-gradient-to-br from-cyan-400/[0.055] to-slate-950/40 p-6 md:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-cyan-300">
            <BrainCircuit className="h-4 w-4" />
            Experimental statewide forecast
          </p>
          <h2 id="statewide-forecast-heading" className="mt-2 text-2xl font-semibold text-white">
            Tamil Nadu annual accident prediction
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Observed statewide accident totals compared with a separate, model-generated
            annual forecast. This is not a district, city, or road-level risk prediction.
          </p>
        </div>
        <TrendingUp className="h-6 w-6 text-cyan-300" />
      </div>

      {forecast ? (
        <>
          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.06] p-5">
              <p className="text-xs uppercase tracking-wider text-cyan-300">
                {forecast.forecast_year} forecast
              </p>
              <p className="mt-3 text-4xl font-semibold tracking-tight text-white">
                {forecast.predicted_accidents.toLocaleString("en-IN")}
              </p>
              <p className="mt-2 text-xs text-slate-400">Predicted accidents · experimental</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
              <p className="text-xs uppercase tracking-wider text-slate-500">Selected model</p>
              <p className="mt-3 text-xl font-semibold capitalize text-white">
                {forecast.model_name.replaceAll("_", " ")}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Selected by historical backtest MAE
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Historical backtest MAPE
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {forecast.validation.mape_pct == null
                  ? "—"
                  : `${forecast.validation.mape_pct.toFixed(2)}%`}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Not a guarantee of {forecast.forecast_year} accuracy
              </p>
            </div>
          </div>

          <div className="mt-7 rounded-2xl border border-white/10 bg-slate-950/40 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-white">
                Observed history vs. forecast
              </h3>
              <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-4 rounded-sm bg-cyan-400" />
                  Observed
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-4 rounded-sm border border-dashed border-amber-300 bg-amber-300/20" />
                  Forecast
                </span>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              {bars.map((row) => (
                <div
                  key={`${row.year}-${row.predicted ? "forecast" : "observed"}`}
                  className="grid grid-cols-[5rem_minmax(0,1fr)_5.5rem] items-center gap-3"
                >
                  <span className="text-xs text-slate-400">
                    {row.year}{row.predicted ? " (F)" : row.provisional ? " (P)" : ""}
                  </span>
                  <div className="h-3 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className={
                        row.predicted
                          ? "h-full rounded-full border border-dashed border-amber-300 bg-amber-300/35"
                          : "h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-400"
                      }
                      style={{ width: `${Math.max(2, (row.total / maxTotal) * 100)}%` }}
                    />
                  </div>
                  <span className={`text-right text-sm font-medium ${row.predicted ? "text-amber-200" : "text-slate-200"}`}>
                    {row.total.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs leading-5 text-slate-500">
              P = provisional observed count. F = model forecast, not an observed count.
              Bars show relative annual totals; no uncertainty interval is available.
            </p>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-2xl border border-white/10 p-5">
              <h3 className="text-sm font-semibold text-white">Backtest details</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-400">Mean absolute error</dt>
                  <dd className="font-medium text-white">{forecast.validation.mae.toLocaleString("en-IN")}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-400">Root mean squared error</dt>
                  <dd className="font-medium text-white">{forecast.validation.rmse.toLocaleString("en-IN")}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-400">Validation period</dt>
                  <dd className="font-medium text-white">
                    {forecast.backtest_years.length
                      ? `${Math.min(...forecast.backtest_years)}–${Math.max(...forecast.backtest_years)}`
                      : "Unavailable"}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-xs text-slate-500">
                {forecast.backtest_finalized_only
                  ? "Backtesting used finalized annual observations."
                  : "Backtest input finalization is not confirmed."}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.035] p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-200">
                <ShieldAlert className="h-4 w-4" />
                Interpret with caution
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {forecast.note}
                {isPersistence
                  ? ` The persistence model repeats the ${forecast.training_end_year} observed total; it does not predict a change in trend.`
                  : ""}
              </p>
              {forecast.training_includes_provisional && (
                <p className="mt-3 text-xs leading-5 text-amber-200/90">
                  Training includes provisional {forecast.provisional_input_years.join(", ")} data,
                  which may be revised.
                </p>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/40 p-6">
          <p className="text-sm text-slate-400">
            Statewide forecast is currently unavailable. Run the Tamil Nadu statewide
            training job and confirm the prediction API is accessible.
          </p>
        </div>
      )}
    </section>
  );
}
