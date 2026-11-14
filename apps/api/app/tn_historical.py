"""Tamil Nadu historical accident statistics (not city-hour predictions)."""
from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import text
from app.database import engine

router = APIRouter(prefix="/api/v1/accidents/tamil-nadu", tags=["historical-analytics"])


def fetch(query, params=None):
    try:
        with engine.connect() as conn:
            return [dict(row) for row in conn.execute(text(query), params or {}).mappings()]
    except Exception as exc:
        raise HTTPException(status_code=503, detail={
            "code": "HISTORICAL_DATA_UNAVAILABLE",
            "message": "Apply sql/21_tamil_nadu_historical.sql and import both CSVs.",
        }) from exc


@router.get("/annual")
def annual():
    rows = fetch("SELECT * FROM analytics.tn_annual_accidents ORDER BY year")
    return {"geography": "Tamil Nadu", "granularity": "year",
            "is_ml_prediction": False, "records": rows}


@router.get("/districts")
def districts(year: int = Query(default=2023, ge=2021, le=2023)):
    rows = fetch("""
        SELECT district, year, total_accidents, total_deaths, source_url
        FROM analytics.tn_district_accidents
        WHERE year=:year ORDER BY total_accidents DESC, district
    """, {"year": year})
    return {"geography": "Tamil Nadu districts and reporting jurisdictions",
            "granularity": "district_year", "year": year,
            "is_ml_prediction": False, "records": rows}


@router.get("/district-intelligence")
def district_intelligence():
    """Historical reporting-area observations, with explicit coverage metadata.

    Totals across reporting jurisdictions are not asserted to equal the
    independently sourced Tamil Nadu statewide annual series.
    """
    rows = fetch("""
        SELECT district, year, total_accidents, total_deaths, source_url
        FROM analytics.tn_district_accidents
        ORDER BY year, district
    """)
    years = sorted({int(row["year"]) for row in rows})
    coverage = [
        {
            "year": year,
            "reporting_areas": sum(1 for row in rows if row["year"] == year),
        }
        for year in years
    ]
    return {
        "geography": "Tamil Nadu districts and reporting jurisdictions",
        "granularity": "reporting_area_year",
        "metric_definitions": {
            "total_accidents": "reported accident count",
            "total_deaths": "reported deaths",
        },
        "is_ml_prediction": False,
        "available_years": years,
        "coverage_by_year": coverage,
        "reporting_areas": len({row["district"] for row in rows}),
        "records": rows,
        "note": (
            "Reporting jurisdictions may include cities as well as districts. "
            "Counts are not exposure-adjusted risks and must not be combined "
            "with the separate statewide series. No location-level forecast."
        ),
    }


@router.get("/district-trend")
def district_trend(district: str = Query(min_length=2, max_length=100)):
    rows = fetch("""
        SELECT district, year, total_accidents, total_deaths, source_url
        FROM analytics.tn_district_accidents
        WHERE lower(district)=lower(:district) ORDER BY year
    """, {"district": district.strip()})
    if not rows:
        raise HTTPException(status_code=404, detail="No records for this district")
    return {"district": district.strip(), "granularity": "district_year",
            "is_ml_prediction": False, "records": rows}
