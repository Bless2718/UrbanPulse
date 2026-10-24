# UrbanPulse

UrbanPulse is an end-to-end portfolio project combining **Data Engineering, Data Analytics and Data Science** around urban road-accident intelligence.

## Current data flow

```text
Open-Meteo -> Python ingestion -> PostgreSQL raw -> dbt -> FastAPI -> Next.js
Road-accident CSV -> Python ingestion -> PostgreSQL raw -> dbt -> FastAPI -> Next.js
```

The accident source currently contains 28 annual records covering **1998-2025** with accident severity, fatalities, injuries and total persons involved. It is aggregate annual data, so UrbanPulse does not claim geographic hotspot analysis until a location-level source is added.

## Stack

- Next.js + TypeScript + Tailwind CSS
- FastAPI
- PostgreSQL
- Python ingestion jobs
- dbt
- Docker Compose
- GitHub Actions

## Start the database

```bash
docker compose up -d db
```

For an existing UrbanPulse database, apply the accident-table migration once:

```bash
docker exec -it urbanpulse-db-1 psql -U urbanpulse -d urbanpulse -f /docker-entrypoint-initdb.d/003_accident_yearly_summary.sql
```

## Load accident CSV

The repository includes:

```text
data/raw/accidents/road_accidents_1998_2025.csv
```

Build and run the ingestion job:

```bash
docker compose --profile jobs build ingestion
docker compose --profile jobs run --rm ingestion python pipelines/run_ingestion.py --source accidents
```

The loader is idempotent: records are upserted by year.

## Run dbt

```bash
docker compose --profile jobs run --rm transform deps
docker compose --profile jobs run --rm transform build
```

Important models:

- `stg_weather_observations`
- `weather_current`
- `stg_accident_yearly`
- `accident_yearly_metrics`

## Start API and dashboard

```bash
docker compose build api web
docker compose up -d api web
```

API checks:

```bash
curl http://localhost:8000/health
curl http://localhost:8000/api/v1/weather/current
curl http://localhost:8000/api/v1/accidents/summary
curl http://localhost:8000/api/v1/accidents/trend
```

Dashboard:

```text
http://localhost:3000
```

## Roadmap

- [x] Dockerized PostgreSQL warehouse
- [x] Weather ingestion
- [x] Annual accident CSV ingestion
- [x] Pipeline run logging
- [x] dbt weather mart
- [x] dbt accident staging + yearly metrics
- [x] FastAPI weather endpoint
- [x] FastAPI accident summary + trend endpoints
- [x] Dashboard backed by real accident and weather data
- [ ] Exploratory accident analysis
- [ ] Time-series baseline / forecasting
- [ ] Location-level accident source
- [ ] Geographic hotspot analytics
- [ ] Risk feature engineering
- [ ] Explainable ML model
- [ ] Monitoring
