# UrbanPulse

UrbanPulse is an end-to-end portfolio project combining **Data Engineering, Data Analytics and Data Science** around urban road-accident intelligence.

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
