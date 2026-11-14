"""Serve the persisted Tamil Nadu statewide accident forecast."""
from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException
from sqlalchemy import text

from app.database import engine

router = APIRouter(prefix="/api/v1/predictions", tags=["predictions"])


def as_object(value):
    return json.loads(value) if isinstance(value, str) else value


@router.get("/tamil-nadu/annual")
def tamil_nadu_annual_prediction() -> dict:
    query = text("""
        SELECT forecast_json, validation_json, generated_at
        FROM analytics.tn_statewide_forecasts
        ORDER BY forecast_year DESC
        LIMIT 1
    """)
    try:
        with engine.connect() as conn:
            row = conn.execute(query).mappings().first()
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Tamil Nadu forecast unavailable. Run statewide ML training first.",
        ) from exc

    if row is None:
        raise HTTPException(status_code=404, detail="No statewide forecast has been trained")

    forecast = as_object(row["forecast_json"])
    evaluation = as_object(row["validation_json"])
    return {
        **forecast,
        "validation": evaluation["models"][forecast["model_name"]],
        "backtest_years": evaluation["backtest_years"],
        "backtest_finalized_only": evaluation["backtest_finalized_only"],
        "generated_at": row["generated_at"].isoformat(),
    }
