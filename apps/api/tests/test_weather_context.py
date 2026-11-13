"""Weather context API tests without external network calls."""
from datetime import date, time
from unittest.mock import patch
from io import BytesIO
import json

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.weather_context import router

app = FastAPI()
app.include_router(router)
client = TestClient(app)


def test_chennai_hour_alignment():
    sample = {
        "hourly": {
            "time": ["2026-11-14T10:00"],
            "temperature_2m": [29.2],
            "relative_humidity_2m": [80],
            "precipitation": [0.5],
            "wind_speed_10m": [12],
            "visibility": [10000],
            "weather_code": [3],
        }
    }

    class FakeResponse:
        def __enter__(self):
            return BytesIO(json.dumps(sample).encode("utf-8"))

        def __exit__(self, *args):
            return False

    with patch("app.weather_context.urlopen", return_value=FakeResponse()):
        result = client.post("/api/v1/weather/context", json={
            "city": "Chennai", "date": "2026-11-14", "time": "10:30",
        })
    assert result.status_code == 200
    data = result.json()
    assert data["weather_hour"] == "2026-11-14T10:00"
    assert data["temperature_c"] == 29.2
    assert data["timezone"] == "Asia/Kolkata"


def test_unknown_city_rejected():
    result = client.post("/api/v1/weather/context", json={
        "city": "Unknown City", "date": "2026-11-14", "time": "10:30",
    })
    assert result.status_code == 422


def test_missing_forecast_hour_is_not_fabricated():
    class FakeResponse:
        def __enter__(self):
            return BytesIO(b'{"hourly":{"time":[]}}')

        def __exit__(self, *args):
            return False

    with patch("app.weather_context.urlopen", return_value=FakeResponse()):
        result = client.post("/api/v1/weather/context", json={
            "city": "Chennai", "date": "2026-11-14", "time": "10:30",
        })
    assert result.status_code == 422
    assert result.json()["detail"]["code"] == "FORECAST_OUT_OF_RANGE"
