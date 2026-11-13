"""Weather context for risk prediction, using Open-Meteo forecast data.

Weather is contextual input only; it is not an accident probability.
"""
from datetime import date, time
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import urlopen
import json

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/v1/weather", tags=["weather-context"])

# Verified reference coordinates; add other cities only with verified coordinates.
CITY_COORDINATES = {"chennai": (13.0827, 80.2707)}
BASE_URL = "https://api.open-meteo.com/v1/forecast"


class WeatherContextRequest(BaseModel):
    city: str = Field(min_length=2, max_length=100)
    date: date
    time: time


def fetch_weather_context(city: str, target_date, target_time: time) -> dict:
    coordinates = CITY_COORDINATES.get(city.strip().casefold())
    if coordinates is None:
        raise HTTPException(status_code=422, detail={
            "code": "CITY_NOT_SUPPORTED",
            "message": "Weather context currently supports Chennai only.",
        })
    lat, lon = coordinates
    # Hourly weather is sampled at the start of the containing hour.
    hour = target_time.hour
    requested_hour = f"{target_date.isoformat()}T{hour:02d}:00"
    params = urlencode({
        "latitude": lat, "longitude": lon,
        "hourly": "temperature_2m,relative_humidity_2m,precipitation,"
                  "wind_speed_10m,visibility,weather_code",
        "timezone": "Asia/Kolkata",
        "start_date": target_date.isoformat(),
        "end_date": target_date.isoformat(),
    })
    try:
        with urlopen(f"{BASE_URL}?{params}", timeout=12) as response:
            payload = json.load(response)
    except (HTTPError, URLError, TimeoutError, ValueError) as exc:
        raise HTTPException(status_code=503, detail={
            "code": "WEATHER_UNAVAILABLE",
            "message": "Weather provider could not return the requested forecast.",
        }) from exc

    hourly = payload.get("hourly", {})
    times = hourly.get("time", [])
    if requested_hour not in times:
        raise HTTPException(status_code=422, detail={
            "code": "FORECAST_OUT_OF_RANGE",
            "message": "Requested hour is not available in the forecast. "
                       "Use a date in the provider's supported forecast window.",
        })
    index = times.index(requested_hour)
    fields = {
        "temperature_c": "temperature_2m",
        "humidity_pct": "relative_humidity_2m",
        "precipitation_mm": "precipitation",
        "wind_speed_kmh": "wind_speed_10m",
        "visibility_m": "visibility",
        "weather_code": "weather_code",
    }
    values = {}
    for output_name, source_name in fields.items():
        samples = hourly.get(source_name, [])
        values[output_name] = samples[index] if len(samples) > index else None
    return {
        "city": "Chennai",
        "date": target_date.isoformat(),
        "requested_time": target_time.strftime("%H:%M"),
        "weather_hour": requested_hour,
        "timezone": "Asia/Kolkata",
        "source": "Open-Meteo forecast",
        "weather_type": "forecast",
        "hour_alignment": "start_of_hour",
        "coordinates": {"latitude": lat, "longitude": lon},
        **values,
    }


@router.post("/context")
def weather_context(request: WeatherContextRequest) -> dict:
    return fetch_weather_context(request.city, request.date, request.time)
