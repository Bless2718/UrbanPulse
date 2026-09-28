# UrbanPulse

**UrbanPulse** is an end-to-end urban risk intelligence platform built to demonstrate **Data Engineering, Data Analytics, and Data Science** in one portfolio project.

The first use case is urban road-accident risk. The platform is being developed as a real data product: source ingestion -> raw warehouse -> transformations -> analytics -> ML -> API -> Tailwind dashboard.

## Current stack

- **Frontend:** Next.js, TypeScript, Tailwind CSS
- **Backend:** FastAPI, Python
- **Database:** PostgreSQL + JSONB raw layer
- **Data Engineering:** configurable ingestion, pipeline-run logging, Airflow-ready DAG, dbt-ready models
- **Data Science:** ML workspace for feature engineering, training, evaluation and inference
- **DevOps:** Docker Compose, GitHub Actions

## Repository structure

```text
apps/
  web/                Next.js + Tailwind dashboard
  api/                FastAPI
ingestion/            Source connectors
pipelines/            Pipeline entry points
airflow/dags/         Orchestration DAGs
sql/                  PostgreSQL initialization
dbt/                  Transformation project
analytics/            Analysis work
ml/                   Features/training/evaluation/inference
docs/                 Architecture and source documentation
data/                 Local raw/processed data (gitignored)
```

## Start PostgreSQL + app

```bash
cp .env.example .env
docker compose up --build
```

If you created the Docker database before the warehouse SQL was added, reset the local development volume once:

```bash
docker compose down -v
docker compose up --build
```

## Run ingestion locally

Create a Python environment from the repository root:

```bash
python -m venv .venv

# Windows PowerShell
.venv\Scripts\Activate.ps1

pip install -r ingestion/requirements.txt
```

For IMD weather, the starter defaults to Chennai-Meenambakkam station `43279`:

```bash
python pipelines/run_ingestion.py --source weather
```

For data.gov.in road-accident ingestion, add these values to `.env`:

```env
DATA_GOV_API_KEY=your_key
DATA_GOV_ACCIDENT_RESOURCE_ID=your_resource_id
```

Then run:

```bash
python pipelines/run_ingestion.py --source accidents
```

Or run both:

```bash
python pipelines/run_ingestion.py --source all
```

## Data model added in Phase 1

- `raw.weather_observations`
- `raw.accident_records`
- `analytics.pipeline_runs`

Every source payload is retained as JSONB for lineage and reprocessing, while frequently analyzed accident/weather fields are normalized into typed columns.

## Roadmap

- [x] Monorepo starter
- [x] Tailwind CSS UI
- [x] FastAPI backend
- [x] PostgreSQL
- [x] Docker Compose
- [x] GitHub Actions
- [x] IMD weather ingestion connector
- [x] data.gov.in accident ingestion connector
- [x] Raw warehouse schema
- [x] Pipeline observability table
- [x] Airflow ingestion DAG starter
- [ ] Choose and profile primary accident resource
- [ ] dbt staging + analytics marts
- [ ] Exploratory/geospatial analytics
- [ ] Accident-risk feature engineering
- [ ] Baseline ML model
- [ ] SHAP explanations
- [ ] Interactive map
- [ ] Model/data monitoring

See [docs/data-sources.md](docs/data-sources.md) for source design.
