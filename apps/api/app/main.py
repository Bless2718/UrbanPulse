from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.database import engine

app = FastAPI(
    title="UrbanPulse API",
    version="0.5.0",
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
        SELECT weather_observation_id, station_id, station_name,
               temperature_c, humidity_pct, rainfall_mm,
               weather_description, ingested_at
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
            detail="Weather analytics model is unavailable. Run dbt build first.",
        ) from exc
    if row is None:
        raise HTTPException(status_code=404, detail="No weather observations available")
    return {
        **dict(row),
        "ingested_at": row["ingested_at"].isoformat() if row["ingested_at"] else None,
    }


@app.get("/api/v1/accidents/summary")
def accident_summary() -> dict:
    query = text(
        """
        SELECT *
        FROM analytics.accident_yearly_metrics
        ORDER BY year DESC
        LIMIT 1
        """
    )
    try:
        with engine.connect() as conn:
            row = conn.execute(query).mappings().first()
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Accident analytics model is unavailable. Run accident ingestion and dbt build first.",
        ) from exc
    if row is None:
        raise HTTPException(status_code=404, detail="No accident data available")
    return dict(row)


@app.get("/api/v1/accidents/trend")
def accident_trend() -> list[dict]:
    query = text(
        """
        SELECT year, total_accidents, fatal_accidents, fatal_killed,
               total_persons_involved, yoy_accident_change_pct
        FROM analytics.accident_yearly_metrics
        ORDER BY year
        """
    )
    try:
        with engine.connect() as conn:
            rows = conn.execute(query).mappings().all()
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Accident analytics model is unavailable. Run accident ingestion and dbt build first.",
        ) from exc
    return [dict(row) for row in rows]


@app.get("/api/v1/accidents/eda")
def accident_eda() -> dict:
    query = text("SELECT * FROM analytics.accident_eda_summary LIMIT 1")
    try:
        with engine.connect() as conn:
            row = conn.execute(query).mappings().first()
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="EDA summary is unavailable. Run dbt build first.",
        ) from exc
    if row is None:
        raise HTTPException(status_code=404, detail="No EDA summary available")
    return dict(row)


@app.get("/api/v1/accidents/forecast")
def accident_forecast() -> dict:
    query = text(
        """
        SELECT forecast_year, predicted_accidents, model_name,
               validation_mae, validation_rmse, validation_mape_pct,
               training_end_year, generated_at
        FROM analytics.accident_forecasts
        ORDER BY forecast_year DESC
        LIMIT 1
        """
    )
    try:
        with engine.connect() as conn:
            row = conn.execute(query).mappings().first()
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Forecast is unavailable. Run the ML baseline job first.",
        ) from exc
    if row is None:
        raise HTTPException(status_code=404, detail="No accident forecast available")

    result = dict(row)
    if result.get("generated_at") is not None:
        result["generated_at"] = result["generated_at"].isoformat()
    return result


@app.get("/api/v1/accidents/locations")
def accident_locations() -> list[dict]:
    query = text(
        """
        SELECT district, total_2020, total_2021, total_accidents,
               latitude, longitude, coordinate_valid
        FROM analytics.accident_location_metrics
        WHERE coordinate_valid = true
        ORDER BY total_accidents DESC, district
        """
    )
    try:
        with engine.connect() as conn:
            rows = conn.execute(query).mappings().all()
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Location analytics are unavailable. Run district ingestion and dbt build first.",
        ) from exc
    return [dict(row) for row in rows]


@app.get("/api/v1/accidents/location-quality")
def accident_location_quality() -> dict:
    query = text(
        """
        SELECT
            count(*) as total_locations,
            count(*) filter (where coordinate_valid) as valid_coordinates,
            count(*) filter (where not coordinate_valid) as invalid_coordinates
        FROM analytics.accident_location_metrics
        """
    )
    try:
        with engine.connect() as conn:
            row = conn.execute(query).mappings().first()
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Location quality summary is unavailable. Run district ingestion and dbt build first.",
        ) from exc
    return dict(row or {})
