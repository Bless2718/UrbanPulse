from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.database import engine

app = FastAPI(
    title="UrbanPulse API",
    version="0.2.0",
    description="Backend API for UrbanPulse urban risk intelligence.",
)

origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict[str, str]:
    return {"name": "UrbanPulse API", "status": "online"}


@app.get("/health")
def health() -> dict[str, str]:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database unavailable: {exc}") from exc


@app.get("/api/v1/weather/current")
def current_weather() -> dict:
    query = text(
        """
        SELECT
            weather_observation_id,
            station_id,
            station_name,
            temperature_c,
            humidity_pct,
            rainfall_mm,
            weather_description,
            ingested_at
        FROM analytics.weather_current
        ORDER BY ingested_at DESC
        LIMIT 1
        """
    )

    try:
        with engine.connect() as conn:
            row = conn.execute(query).mappings().first()
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Weather analytics model is unavailable. Run the dbt transform job first.",
        ) from exc

    if row is None:
        raise HTTPException(status_code=404, detail="No weather observations available")

    return {
        **dict(row),
        "ingested_at": row["ingested_at"].isoformat() if row["ingested_at"] else None,
    }


@app.get("/api/v1/risk/summary")
def risk_summary() -> dict:
    return {
        "city_risk_score": 82,
        "high_risk_zones": 7,
        "predicted_risk_next_hour": 0.76,
        "source": "demo",
    }
