"""Historical time-window crash counts, not a machine-learning probability."""
from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import text
from app.database import engine

router = APIRouter(prefix="/api/v1/accidents", tags=["historical-risk"])


@router.get("/historical-time-pattern")
def historical_time_pattern(
    city: str = Query(min_length=2, max_length=100),
    hour: int = Query(ge=0, le=23),
    year: int | None = Query(default=None, ge=1900, le=2100),
) -> dict:
    sql = text("""
        SELECT city, year, start_hour, end_hour, accident_count, source, source_url
        FROM analytics.city_time_accident_counts
        WHERE lower(city) = lower(:city)
          AND start_hour <= :hour AND end_hour > :hour
          AND (:year IS NULL OR year = :year)
        ORDER BY year DESC, start_hour, source
    """)
    try:
        with engine.connect() as conn:
            rows = [dict(r) for r in conn.execute(sql, {"city": city.strip(), "hour": hour, "year": year}).mappings()]
    except Exception as exc:
        raise HTTPException(status_code=503, detail={
            "code": "HISTORICAL_DATA_UNAVAILABLE",
            "message": "Create analytics.city_time_accident_counts and import verified records.",
        }) from exc
    if not rows:
        raise HTTPException(status_code=404, detail={
            "code": "NO_HISTORICAL_RECORDS",
            "message": "No sourced accident counts cover this city and hour.",
        })
    return {
        "city": city.strip(),
        "requested_hour": hour,
        "year_filter": year,
        "metric": "reported_accident_count_in_source_time_window",
        "is_ml_prediction": False,
        "is_probability": False,
        "records": rows,
        "note": "Counts are for the full source time interval, not the selected hour. "
                "Do not interpret as an individual accident probability.",
    }


@router.get("/historical-cities")
def historical_cities() -> dict:
    try:
        with engine.connect() as conn:
            cities = list(conn.execute(text(
                "SELECT DISTINCT city FROM analytics.city_time_accident_counts ORDER BY city"
            )).scalars())
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Historical time-window table is unavailable.") from exc
    return {"cities": cities, "geography_type": "city", "is_ml_prediction": False}
