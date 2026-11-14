"""Live Tamil Nadu city-centre weather context (not a crash-risk model).

One verified Open-Meteo model-grid request is made for a supported city.
No unsourced accident incidents, traffic speeds, hotspot labels or danger
probabilities are inferred. No API/database model-training path is changed.
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
import json
import math
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import urlopen
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/api/v1/conditions", tags=["live-conditions"])
LOCAL_TIMEZONE = ZoneInfo("Asia/Kolkata")
PROVIDER_URL = "https://api.open-meteo.com/v1/forecast"
PROVIDER_DOCS = "https://open-meteo.com/en/docs"
IMD_WARNINGS = "https://mausam.imd.gov.in/responsive/districtWiseWarningGIS.php"
TRAFFIC_REFERENCE = "https://docs.here.com/traffic-api/docs/introduction-to-here-traffic-api-v7"

# Open-Meteo geocoding city centres as verified on 2026-11-14.
# This is NOT a district-polygon sampling or road-segment assessment.
CITIES = {
    "chennai": ("Chennai", 13.08784, 80.27847),
    "coimbatore": ("Coimbatore", 11.00555, 76.96612),
    "madurai": ("Madurai", 9.91900, 78.11953),
    "salem": ("Salem", 11.65376, 78.15538),
    "tiruchirappalli": ("Tiruchirappalli", 10.81550, 78.69651),
    "tirunelveli": ("Tirunelveli", 8.72742, 77.68380),
}
CITY_ALIASES = {"trichy": "tiruchirappalli", "trichinopoly": "tiruchirappalli"}
CURRENT_FIELDS = {
    "temperature_c": "temperature_2m",
    "relative_humidity_pct": "relative_humidity_2m",
    "precipitation_mm": "precipitation",
    "rain_mm": "rain",
    "wind_speed_kmh": "wind_speed_10m",
    "visibility_m": "visibility",
    "weather_code": "weather_code",
    "is_day": "is_day",
}
HOURLY_FIELDS = {
    "precipitation_probability_pct": "precipitation_probability",
    "precipitation_mm": "precipitation",
    "visibility_m": "visibility",
    "wind_speed_kmh": "wind_speed_10m",
    "weather_code": "weather_code",
}
# Some Open-Meteo current values may be rounded to a future model time.
MAX_PAST_AGE = timedelta(hours=2)
MAX_FUTURE_OFFSET = timedelta(minutes=60)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _canonical_city(value: str) -> str:
    key = value.strip().casefold()
    key = CITY_ALIASES.get(key, key)
    if key not in CITIES:
        raise HTTPException(status_code=422, detail={
            "code": "UNSUPPORTED_CITY",
            "message": "Live context is limited to six verified Tamil Nadu city centres.",
            "cities": [row[0] for row in CITIES.values()],
        })
    return key


def _provider_num(value, *, min_value: float | None = None, max_value: float | None = None):
    """Preserve missing data as None, never assume 0 means dry, safe, etc."""
    if type(value) not in (int, float) or not math.isfinite(float(value)):
        return None
    f = float(value)
    if min_value is not None and f < min_value:
        return None
    if max_value is not None and f > max_value:
        return None
    return f


def _parse_local_time(value: object) -> datetime:
    if not isinstance(value, str):
        raise ValueError("Weather time absent")
    date = datetime.fromisoformat(value)
    if date.tzinfo is not None:
        # Provider returned an unexpected offset: reject rather than guess.
        raise ValueError("Expected Asia/Kolkata-local ISO time")
    return date.replace(tzinfo=LOCAL_TIMEZONE)


def _weather_payload(key: str) -> dict:
    name, latitude, longitude = CITIES[key]
    params = urlencode({
        "latitude": latitude,
        "longitude": longitude,
        "current": "temperature_2m,relative_humidity_2m,precipitation,rain,"
                   "wind_speed_10m,visibility,weather_code,is_day",
        "hourly": "precipitation_probability,precipitation,visibility,wind_speed_10m,weather_code",
        "forecast_hours": 6,
        "timezone": "Asia/Kolkata",
    })
    try:
        with urlopen(f"{PROVIDER_URL}?{params}", timeout=10) as response:
            data = json.load(response)
    except (HTTPError, URLError, TimeoutError, ValueError, OSError) as exc:
        raise HTTPException(status_code=503, detail={
            "code": "WEATHER_PROVIDER_UNAVAILABLE",
            "message": "Live weather conditions could not be retrieved; no fallback conditions are invented.",
        }) from exc

    if not isinstance(data, dict) or not isinstance(data.get("current"), dict) or \
            data.get("timezone") != "Asia/Kolkata":
        raise HTTPException(status_code=503, detail={
            "code": "WEATHER_PAYLOAD_INVALID",
            "message": "Current conditions or expected timezone are missing.",
        })

    current = data["current"]
    try:
        valid_time = _parse_local_time(current.get("time"))
    except ValueError as exc:
        raise HTTPException(status_code=503, detail={
            "code": "WEATHER_TIME_INVALID",
            "message": "Weather provider did not supply a valid local observation time.",
        }) from exc
    fetched = utc_now()
    age = fetched - valid_time.astimezone(timezone.utc)
    if age > MAX_PAST_AGE or age < -MAX_FUTURE_OFFSET:
        raise HTTPException(status_code=503, detail={
            "code": "WEATHER_STALE",
            "message": "Latest weather grid estimate is outside the freshness window.",
        })

    state = {}
    for result, field in CURRENT_FIELDS.items():
        value = current.get(field)
        if field == "is_day":
            state[result] = bool(value) if value in (0, 1) and type(value) is int else None
        elif field == "weather_code":
            n = _provider_num(value, min_value=0, max_value=99)
            state[result] = int(n) if n is not None else None
        elif field in ("precipitation", "rain", "wind_speed_10m", "visibility"):
            state[result] = _provider_num(value, min_value=0)
        elif field == "relative_humidity_2m":
            state[result] = _provider_num(value, min_value=0, max_value=100)
        else:
            state[result] = _provider_num(value, min_value=-80, max_value=60)

    if all(value is None for value in state.values()):
        raise HTTPException(status_code=503, detail={
            "code": "WEATHER_VALUES_MISSING",
            "message": "No usable live weather values were returned.",
        })

    hourly = data.get("hourly")
    predictions = []
    if isinstance(hourly, dict) and isinstance(hourly.get("time"), list):
        for index, raw_time in enumerate(hourly["time"][:24]):
            try:
                timestamp = _parse_local_time(raw_time)
            except ValueError:
                continue
            if timestamp < valid_time:
                continue
            entry = {"valid_time_local": timestamp.isoformat(timespec="minutes")}
            for label, source in HOURLY_FIELDS.items():
                samples = hourly.get(source)
                item = samples[index] if isinstance(samples, list) and index < len(samples) else None
                if source == "weather_code":
                    v = _provider_num(item, min_value=0, max_value=99)
                    entry[label] = int(v) if v is not None else None
                else:
                    entry[label] = _provider_num(item, min_value=0,
                                               max_value=100 if source == "precipitation_probability" else None)
            predictions.append(entry)
            if len(predictions) == 6:
                break

    return {
        "city": name,
        "geographic_scope": "approximate_city_centre_weather_grid_not_road_segment",
        "location": {
            "latitude": latitude,
            "longitude": longitude,
            "provider_grid_latitude": _provider_num(data.get("latitude"), min_value=-90, max_value=90),
            "provider_grid_longitude": _provider_num(data.get("longitude"), min_value=-180, max_value=180),
        },
        "timezone": "Asia/Kolkata",
        "source": {"name": "Open-Meteo", "url": PROVIDER_DOCS,
                   "type": "weather_model_grid_estimate_not_station_observation"},
        "weather_valid_at_local": valid_time.isoformat(timespec="minutes"),
        "retrieved_at_utc": fetched.isoformat(timespec="seconds"),
        "weather_age_minutes": round(age.total_seconds() / 60, 1),
        "current": state,
        "hourly_forecast": predictions,
        "other_context": {
            "day_or_night": "day" if state["is_day"] is True
                            else "night" if state["is_day"] is False else "unknown",
            "imd_warnings": {
                "status": "published_external_context_not_automatically_ingested",
                "url": IMD_WARNINGS,
            },
            "live_accident_incidents": {
                "status": "unavailable_no_verified_public_tamil_nadu_live_feed",
                "count": None,
            },
            "live_traffic_flow": {
                "status": "not_connected_requires_licensed_provider",
                "provider_docs_url": TRAFFIC_REFERENCE,
                "congestion": None,
            },
        },
        "model": {
            "weather_is_context_only": True,
            "accident_risk_probability": None,
            "area_danger_rank": None,
            "calibrated_hourly_prediction_available": False,
            "status": "blocked_missing_timestamped_geocoded_crashes_and_traffic_exposure",
            "note": "No per-city or per-road accident danger percentage is computed from live weather alone.",
        },
    }


@router.get("/areas")
def areas() -> dict:
    return {
        "geographic_scope": "approximate_city_centres",
        "areas": [{"city": name, "latitude": lat, "longitude": lon}
                  for name, lat, lon in CITIES.values()],
        "accident_risk_model_ready": False,
    }


@router.get("/live")
def live_conditions(city: str = Query(default="Chennai", min_length=2, max_length=80)) -> dict:
    return _weather_payload(_canonical_city(city))
