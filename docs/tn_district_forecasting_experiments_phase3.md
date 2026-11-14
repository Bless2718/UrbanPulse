# UrbanPulse Phase 3 — historical district forecasting experiment lab

## What it does (and does NOT do)

Phase 3 adds a **read-only diagnostic backtest** over the quarantined Phase 1 and Phase 2 district accident research data. It runs three simple baseline methods and evaluates them only on **historical years**; it does NOT approve a single district for production predictions. No model files, training datasets, database tables, API endpoints, or frontend pages are written or changed.

All accident histories remain **research-only**. Official district administrative boundaries do not prove stable police/transport reporting jurisdictions. **The anomaly/metric summaries are not certified forecast skill**. They are diagnostic aids for deciding whether further data reconciliation is worth pursuing.

## Data and safeguards

- The database is opened in a read-only transaction; only the imported source version specified by its 64-character SHA-256 is used. If multiple source versions exist and none is specified, the command fails closed.
- Checks that the Phase 1 source is still quarantined and the entire Phase 2 eligibility register has exactly 42 blocked candidates. The command refuses unexpected gate changes.
- Experiments use original district/city source labels and the four Phase 2 exploratory group hypotheses, all with **model_ready=false**. The four group histories are not certified geographic crosswalks.
- **2024 is completely excluded** from training and holdout evaluation due to the unresolved 343-accident and 375-death statewide revision discrepancy. The report still records the unresolved revision for review.
- Group-years where not every parent/child reporting label appears are **dropped** (not zero-filled or interpolated). The program lists excluded group-years in the report. For example, Nagapattinam/Mayiladuthurai has only 2022 and 2023 complete member coverage and is therefore **unscored**.
- Missing years break the contiguous training prefix rather than being treated as zeros or stitched together.
- Every fold contains the source batch SHA, the original training and holdout record SHA(s), origin year, target year, method, actual value and predicted value. A holdout year's real value never enters its training prefix.
- No 2026 district predictions are generated or exposed. There is no automatic ranking or deployment of a winning model.

## Forecast methods and chronological validation

All methods use at least **four consecutive years** available at the end of the training origin. They predict counts for a **one-year** or **two-year** future historical holdout, from that origin only:

| Method | Formula/description |
| --- | --- |
| persistence | Hold the last observed accident count constant for either horizon |
| moving_average_3 | Average the three most recent training-year counts, held constant for either horizon |
| linear_drift | Fit least-squares linear trend to the last four training years, extrapolate the requested horizon, clamp negative counts to zero |

Origins are rolled forward chronologically; the observed target year must be **at most 2023**. Two-year tests do not use the intervening year's actual accident count. Missing intermediate target-years are not made up. Fold-level metrics report absolute error; pooled summaries by candidate type, horizon and method report **MAE**, **RMSE**, and **WAPE** (WAPE undefined/null if total actual count is zero). Pooled summaries weight candidates according to the number of folds, so they are not comparisons of equally supported districts.

**Interpretation limits:** The history has as few as 3 annual records for some districts. Reporting boundaries are not verified even for 9-year series, and COVID-era traffic exposure may have shifted sharply. Accuracy numbers on these historical folds are not evidence of real future forecast reliability until data reconciliation and rigorous independent validation are complete.

## How to run on Windows PowerShell

Once the feature PR is merged into feature/city-hourly-risk-api and the local branch is pulled:

~~~powershell
docker compose --profile jobs build ingestion
docker compose --profile jobs run --rm ingestion python ingestion/backtest_tn_district_experiments.py
~~~

The second command reads PostgreSQL and prints a JSON report; it writes **nothing** to any PostgreSQL table.

To save the report to a Windows folder:

~~~powershell
New-Item -ItemType Directory -Force .\reports | Out-Null
docker compose --profile jobs run --rm -v "${PWD}/reports:/app/reports" ingestion python ingestion/backtest_tn_district_experiments.py --output /app/reports/tn_district_backtest.json
~~~

The saved file is reports/tn_district_backtest.json on the host. If multiple imported batches exist, add --source-sha followed by the exact full SHA-256 from staging.tn_district_research_imports.

Offline regression tests:

~~~powershell
python -m unittest discover -s ingestion/tests -p test_tn_district_experiments.py -v
~~~

GitHub Actions executes these tests and a dedicated PostgreSQL integration check on a disposable PostgreSQL 16 instance. The integration tests verify that 331 staging records remain quarantined, 42 eligibility candidates remain blocked, 2024 is excluded, all group-year gaps are skipped, and backtest folds do not leak future target data.

## When will the frontend change?

**Not in Phase 3.** The current district forecast lab page and statewide forecast API remain untouched. Phase 3 produces an **offline JSON diagnostic report** only. A future experimental dashboard phase can display audited historical-versus-predicted charts, errors, sample sizes, source version and explicit **UNVERIFIED / NOT FOR DECISIONS** labels. Publishing future-looking district forecast values on the public dashboard must wait for verified reporting boundaries, the 2024 revision decision, and independent temporal validation.

## Next research decisions

1. Verify historical police/transport reporting area definitions and administrative crosswalks (including the 2019 splits and Mayiladuthurai).
2. Explain the unusually large 2022 Thiruvallur and Kancheepuram/Chengalpattu shifts.
3. Resolve or explicitly version the conflicting 2024 district/statewide reports.
4. Revisit eligibility with sign-off, then conduct independent backtests on a separate approved dataset before any production predictions.

**Outputs are retrospective experiments, not publishable forecasts.**
