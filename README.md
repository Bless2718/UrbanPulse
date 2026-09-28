# UrbanPulse

**UrbanPulse** is an end-to-end urban risk intelligence platform built to demonstrate **Data Engineering, Data Analytics, and Data Science** in one portfolio project.

The first use case is urban road-accident risk. The platform is being developed as a real data product: source ingestion -> raw warehouse -> transformations -> analytics -> ML -> API -> Tailwind dashboard.

## Current stack

- **Frontend:** Next.js, TypeScript, Tailwind CSS
- **Backend:** FastAPI, Python
- **Database:** PostgreSQL + JSONB raw layer
- **Data Engineering:** Dockerized ingestion jobs, pipeline-run logging, Airflow-ready DAG, dbt-ready models
- **Data Science:** ML workspace for feature engineering, training, evaluation and inference
- **DevOps:** Docker Compose, GitHub Actions

## Start PostgreSQL

```bash
docker compose up -d db
```

If you created the database before warehouse SQL changes:

```bash
docker compose down -v
docker compose up -d db
```

## Run ingestion with Docker

This is the recommended workflow because it is reproducible across Windows, macOS and Linux.

Weather:

```bash
docker compose --profile jobs run --rm ingestion python pipelines/run_ingestion.py --source weather
```

Accidents:

```bash
docker compose --profile jobs run --rm ingestion python pipelines/run_ingestion.py --source accidents
```

All sources:

```bash
docker compose --profile jobs run --rm ingestion python pipelines/run_ingestion.py --source all
```

For road-accident ingestion, add your data.gov.in values to `.env`:

```env
DATA_GOV_API_KEY=your_key
DATA_GOV_ACCIDENT_RESOURCE_ID=your_resource_id
```

## Data model

- `raw.weather_observations`
- `raw.accident_records`
- `analytics.pipeline_runs`

Every source payload is retained as JSONB for lineage and reprocessing, while commonly analyzed fields are normalized into typed columns.

## Roadmap

- [x] Monorepo starter
- [x] Tailwind CSS UI
- [x] FastAPI backend
- [x] PostgreSQL
- [x] Docker Compose
- [x] GitHub Actions
- [x] Dockerized ingestion runtime
- [x] IMD weather ingestion connector
- [x] data.gov.in accident ingestion connector
- [x] Raw warehouse schema
- [x] Pipeline observability
- [ ] Choose/profile primary accident resource
- [ ] dbt staging + analytics marts
- [ ] Exploratory/geospatial analytics
- [ ] Accident-risk feature engineering
- [ ] Baseline ML model
- [ ] SHAP explanations
- [ ] Interactive map
- [ ] Model/data monitoring
