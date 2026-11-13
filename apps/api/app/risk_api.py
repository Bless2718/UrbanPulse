"""City/time accident risk API contracts.

No calibrated hourly model is deployed yet. Never fabricate probabilities from
annual or district aggregate counts.
"""
from datetime import date, time
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import text

from app.database import engine

router = APIRouter(prefix="/api/v1/accidents", tags=["accident-risk"])


class RiskRequest(BaseModel):
    city: str = Field(min_length=2, max_length=100)
    date: date
    time: time
    weather_mode: Literal["auto", "clear", "rain", "heavy", "fog"] = "auto"

    @field_validator("city")
    @classmethod
    def normalize_city(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError("City must contain at least two characters")
        return value

    @field_validator("time")
    @classmethod
    def require_minute_precision(cls, value: time) -> time:
        if value.second or value.microsecond or value.tzinfo is not None:
            raise ValueError("Time must be local HH:MM without seconds or timezone")
        return value


@router.get("/available-locations")
def available_locations() -> dict:
    """District-level coverage only; do not mislabel it as city-level coverage."""
    query = text("""
        SELECT DISTINCT district
        FROM analytics.accident_location_metrics
        WHERE coordinate_valid = true AND district IS NOT NULL
        ORDER BY district
    """)
    try:
        with engine.connect() as connection:
            names = [row[0] for row in connection.execute(query)]
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Location analytics unavailable; run district ingestion and dbt build.",
        ) from exc
    return {
        "geography_type": "district",
        "prediction_ready": False,
        "locations": names,
        "note": "District totals are not hourly city-level training data.",
    }


@router.post("/predict-risk")
def predict_risk(request: RiskRequest) -> dict:
    """Fail closed until a trained, validated city-hour model is deployed."""
    raise HTTPException(
        status_code=503,
        detail={
            "code": "MODEL_NOT_READY",
            "message": "Hourly city accident probabilities are unavailable until "
                       "timestamped city-level accidents, matched weather and "
                       "exposure data are ingested and a calibrated model is validated.",
            "requested_city": request.city,
            "requested_date": request.date.isoformat(),
            "requested_time": request.time.strftime("%H:%M"),
            "weather_mode": request.weather_mode,
            "timezone": "Asia/Kolkata",
            "probability": None,
        },
    )
