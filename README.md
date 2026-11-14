# UrbanPulse

UrbanPulse is an end-to-end portfolio project combining **Data Engineering, Data Analytics and Data Science** around urban road-accident intelligence.

## Forecasting focus and data coverage

UrbanPulse is an **accident forecasting project**. Its primary validated workflow is
historical backtesting followed by an **experimental 2026 Tamil Nadu statewide
annual accident forecast**. It is not a validated district-level or hourly
accident-probability predictor.

- **Statewide history:** 1993–2025 (2024–2025 provisional); 2026 experimental
  persistence forecast stored in `analytics.tn_statewide_forecasts`.
- **Statewide forecast API:** `GET /api/v1/predictions/tamil-nadu/annual`.
- **District history:** 2021–2023 in `analytics.tn_district_accidents`;
  district/city reporting jurisdictions may differ across years.
- **District Forecast Lab:** `http://localhost:3000/forecast/districts` combines
  historical district comparison, reporting coverage, and user-adjustable
  2026 what-if scenarios. **These scenarios are arithmetic illustrations, not
  trained or validated ML forecasts.** A longer consistent district history
  and chronological backtesting are required before real district predictions.

To generate or refresh the statewide forecast, set `DATABASE_URL` and run
`python ml/training/train_tn_statewide.py` after importing the statewide annual
dataset. This script requires data through 2025.

The legacy 1998–2025 accident source described below is a **different dataset
with different scope**; do not compare its forecast totals directly with the
Tamil Nadu statewide forecast.

## New: quarantined district research staging (2016–2024)

Phase 1 preserves the **331 district/city reporting-area observations** and
a nine-year transcription balance check separately from production data.
The data is intentionally **NOT approved for district ML training**: reporting
boundaries are unverified and the 2024 district booklet (67,183 accidents)
differs from later statewide reports (67,526). Existing
`analytics.tn_district_accidents`, statewide tables, APIs, and forecasts are untouched.

From the repository root, use the Docker ingestion image (the database
container must be healthy). The first command only checks local files:

```powershell
docker compose --profile jobs build ingestion
docker compose --profile jobs run --rm ingestion python ingestion/import_tn_district_research.py
docker compose --profile jobs run --rm ingestion python ingestion/import_tn_district_research.py --apply
```

The explicit `--apply` creates/inserts into **staging only**, in one
transaction, with idempotent source-hash versioning and stored annual checks.
It does not train or update predictions. Verify the persisted counts:

```powershell
docker compose exec db psql -U urbanpulse -d urbanpulse -c "SELECT year, COUNT(*) AS rows, SUM(total_accidents) AS accidents, SUM(total_deaths) AS deaths FROM staging.tn_district_research_rows GROUP BY year ORDER BY year;"
```

Run offline tests:

```powershell
python -m unittest discover -s ingestion/tests -v
```

See [district research staging guide](docs/tn_district_research_staging.md)
for data sources, digest controls, limitations, and the next release gate.

## Phase 2: district boundary and source-revision investigation

District research **remains quarantined**. The new reconciliation review
generates four exploratory parent-area histories and flags exceptional
year-on-year changes, missing group components, and the unresolved 2024
statewide-versus-district revision. It does **not** create a model-ready
district dataset or change existing predictions.

Run after Phase 1 import:

```powershell
docker compose --profile jobs build ingestion
docker compose --profile jobs run --rm ingestion python ingestion/reconcile_tn_district_research.py --install-views
```

This creates review-only PostgreSQL **views** in the separate
`research_review` schema, then prints a JSON investigation report. Subsequent
runs without `--install-views` use SELECT only. See
[Phase 2 evidence, caveats, runbook and approval gates](docs/tn_district_reconciliation_phase2.md).

## Current pipeline

```text
Weather / Accident CSV
        |
Python ingestion
        |
PostgreSQL raw
        |
dbt staging + analytics + ML features
        |
Baseline forecasting
        |
PostgreSQL forecast table
        |
FastAPI
        |
Next.js dashboard
```

The accident source contains **28 annual records from 1998-2025**. It is aggregate annual data, so the current project supports trend, severity and forecasting analysis but does not claim geographic hotspot prediction.

## Run the full accident pipeline

```bash
docker compose up -d db
docker compose --profile jobs build ingestion
docker compose --profile jobs run --rm ingestion python pipelines/run_ingestion.py --source accidents
docker compose --profile jobs run --rm transform deps
docker compose --profile jobs run --rm transform build
```

## Feature engineering

dbt now creates:

- `accident_yearly_metrics`
- `int_accident_features`
- `accident_ml_features`
- `accident_eda_summary`

Forecast features include:

- 1-year and 2-year accident lags
- 3-year and 5-year rolling accident averages
- severity indicators
- persons-per-accident ratio
- explicit 2023 structural-break flag

## Baseline forecasting

The ML job uses chronological backtesting rather than random train/test splitting. It compares:

1. persistence / last-year baseline
2. 3-year rolling-average baseline
3. linear regression using time and lag features

The model with the lowest validation MAE is selected.

Run it with:

```bash
docker compose --profile jobs build ml
docker compose --profile jobs run --rm ml
```

Outputs are written to:

```text
ml/evaluation/baseline_metrics.json
ml/evaluation/backtest_predictions.csv
ml/inference/forecast_2026.json
```

The selected forecast is also upserted into:

```text
analytics.accident_forecasts
```

## API and dashboard

```bash
docker compose build api web
docker compose up -d api web
```

Useful endpoints:

```bash
curl http://localhost:8000/health
curl http://localhost:8000/api/v1/accidents/summary
curl http://localhost:8000/api/v1/accidents/trend
curl http://localhost:8000/api/v1/accidents/eda
curl http://localhost:8000/api/v1/accidents/forecast
```

Dashboard:

```text
http://localhost:3000
```

## Modeling note

The 2023 total is dramatically lower than 2022. UrbanPulse explicitly flags 2023 as a structural-break candidate. With only 28 annual observations, the forecasting component is intentionally a transparent baseline experiment rather than a production-grade prediction system.

## Roadmap

- [x] Dockerized PostgreSQL warehouse
- [x] Weather ingestion
- [x] Annual accident CSV ingestion
- [x] dbt accident analytics
- [x] Exploratory analytics summary
- [x] Time-series feature engineering
- [x] Time-aware baseline backtesting
- [x] Forecast persistence + API endpoint
- [x] Dashboard forecast visibility
- [ ] Investigate the 2023 source-definition shift
- [ ] Add location-level accident source
- [ ] Geographic hotspot analytics
- [ ] Richer temporal / external features
- [ ] Production model monitoring


## Interactive accident map

After loading the district/city dataset and running dbt, the dashboard renders an interactive Leaflet + OpenStreetMap view from `/api/v1/accidents/locations`.

- marker size is proportional to combined 2020-2021 accidents
- popups show 2020, 2021, combined total and percentage change
- only coordinates that pass the Tamil Nadu geographic validation are exposed
- points represent district/city centroids, not individual crash locations

The map intentionally avoids labeling centroid values as crash hotspots.
