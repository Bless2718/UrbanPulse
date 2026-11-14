"""Offline contract tests: live weather may be displayed, accident risk never guessed."""
from datetime import datetime, timezone
from io import BytesIO
import json
from unittest.mock import patch
from urllib.error import URLError

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.live_conditions import router

app = FastAPI()
app.include_router(router)
client = TestClient(app)
NOW = datetime(2026, 11, 14, 14, 40, tzinfo=timezone.utc)  # 20:10 IST


def sample():
    return {
        "latitude": 13.1107,
        "longitude": 80.2459,
        "timezone": "Asia/Kolkata",
        "current": {
            "time": "2026-11-14T20:00",
            "temperature_2m": 27.1,
            "relative_humidity_2m": 75,
            "precipitation": 0.2,
            "rain": 0.1,
            "wind_speed_10m": 13.4,
            "visibility": 13060,
            "weather_code": 3,
            "is_day": 0,
        },
        "hourly": {
            "time": ["2026-11-14T20:00", "2026-11-14T21:00",
                     "2026-11-14T22:00", "2026-11-14T23:00"],
            "precipitation_probability": [2, 15, 33, 19],
            "precipitation": [0.0, 0.2, 0.1, 0.0],
            "visibility": [13060, 10000, 8300, 12000],
            "wind_speed_10m": [13.4, 12.2, 10.0, 8.0],
            "weather_code": [3, 51, 51, 3],
        },
    }


class FakeResponse:
    def __init__(self, obj):
        self.body = BytesIO(json.dumps(obj).encode("utf-8"))

    def __enter__(self):
        return self.body

    def __exit__(self, *_):
        return False


def with_data(data, city="Chennai"):
    with patch("app.live_conditions.urlopen", return_value=FakeResponse(data)) as fetch, \
            patch("app.live_conditions.utc_now", return_value=NOW):
        result = client.get("/api/v1/conditions/live", params={"city": city})
    return result, fetch


def test_six_verified_city_center_locations():
    resp = client.get("/api/v1/conditions/areas")
    assert resp.status_code == 200
    assert len(resp.json()["areas"]) == 6
    assert not resp.json()["accident_risk_model_ready"]


def test_chennai_hourly_weather_and_no_fabricated_accident_risk():
    resp, get = with_data(sample())
    assert resp.status_code == 200, resp.text
    result = resp.json()
    assert result["city"] == "Chennai"
    assert result["weather_age_minutes"] == 10
    assert result["weather_valid_at_local"] == "2026-11-14T20:00+05:30"
    assert result["current"]["temperature_c"] == 27.1
    assert result["current"]["is_day"] is False
    assert result["hourly_forecast"][1]["precipitation_probability_pct"] == 15
    assert result["other_context"]["day_or_night"] == "night"
    assert result["other_context"]["live_accident_incidents"]["count"] is None
    assert result["other_context"]["live_traffic_flow"]["congestion"] is None
    assert result["model"]["accident_risk_probability"] is None
    assert result["model"]["area_danger_rank"] is None
    assert result["model"]["calibrated_hourly_prediction_available"] is False
    url = get.call_args.args[0]
    assert "api.open-meteo.com" in url
    assert "13.08784" in url and "80.27847" in url
    assert "forecast_hours=6" in url


def test_other_city_and_alias_are_supported_without_arbitrary_coordinates():
    for city, expected in [("Coimbatore", "Coimbatore"),
                           ("MADURAI", "Madurai"),
                           ("Trichy", "Tiruchirappalli"),
                           ("Tirunelveli", "Tirunelveli")]:
        resp, _ = with_data(sample(), city)
        assert resp.status_code == 200
        assert resp.json()["city"] == expected


def test_unknown_city_is_rejected_and_does_not_trigger_external_request():
    with patch("app.live_conditions.urlopen") as request:
        resp = client.get("/api/v1/conditions/live", params={"city": "London"})
    assert resp.status_code == 422
    assert resp.json()["detail"]["code"] == "UNSUPPORTED_CITY"
    request.assert_not_called()


def test_stale_provider_data_is_not_shown_as_live():
    data = sample()
    data["current"]["time"] = "2026-11-14T10:00"
    resp, _ = with_data(data)
    assert resp.status_code == 503
    assert resp.json()["detail"]["code"] == "WEATHER_STALE"


def test_network_error_is_not_interpreted_as_good_weather():
    with patch("app.live_conditions.urlopen", side_effect=URLError("offline")):
        resp = client.get("/api/v1/conditions/live", params={"city": "Chennai"})
    assert resp.status_code == 503
    assert resp.json()["detail"]["code"] == "WEATHER_PROVIDER_UNAVAILABLE"


def test_missing_weather_values_are_not_assumed_zero():
    data = sample()
    for name in ["temperature_2m", "relative_humidity_2m", "precipitation", "rain",
                 "wind_speed_10m", "visibility", "weather_code", "is_day"]:
        data["current"][name] = None
    resp, _ = with_data(data)
    assert resp.status_code == 503
    assert resp.json()["detail"]["code"] == "WEATHER_VALUES_MISSING"


def test_missing_visibility_is_null_not_good_visibility():
    data = sample()
    data["current"]["visibility"] = None
    resp, _ = with_data(data)
    assert resp.status_code == 200
    assert resp.json()["current"]["visibility_m"] is None
    assert resp.json()["model"]["accident_risk_probability"] is None


def test_invalid_timezone_fails_closed():
    data = sample()
    data["timezone"] = "UTC"
    resp, _ = with_data(data)
    assert resp.status_code == 503
    assert resp.json()["detail"]["code"] == "WEATHER_PAYLOAD_INVALID"
