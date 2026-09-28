# UrbanPulse

UrbanPulse is a portfolio-grade urban accident risk intelligence platform designed to demonstrate
Data Engineering, Data Analytics, and Data Science in one end-to-end project.

## Stack

- Frontend: Next.js, TypeScript, Tailwind CSS
- Backend: FastAPI, Python
- Database: PostgreSQL
- Data Engineering: Airflow/dbt-ready structure
- Data Science: scikit-learn/XGBoost-ready structure
- DevOps: Docker Compose, GitHub Actions

## Quick start

```bash
git clone https://github.com/Bless2718/UrbanPulse.git
cd UrbanPulse
cp .env.example .env
docker compose up --build
```

Frontend: http://localhost:3000  
API: http://localhost:8000  
API docs: http://localhost:8000/docs

## Roadmap

- [x] Monorepo starter
- [x] Tailwind CSS UI
- [x] FastAPI backend
- [x] PostgreSQL service
- [x] Docker Compose
- [x] GitHub Actions CI
- [ ] Accident data ingestion
- [ ] Weather ingestion
- [ ] Warehouse schema
- [ ] dbt transformations
- [ ] EDA and geospatial analytics
- [ ] Risk prediction model
- [ ] SHAP explainability
- [ ] Interactive risk map
- [ ] Monitoring
