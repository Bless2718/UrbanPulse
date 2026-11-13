"""Contract tests that do not require a running database."""
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.risk_api import router

client = TestClient(FastAPI())
client.app.include_router(router)


def test_untrained_model_does_not_fabricate_probability():
    response = client.post("/api/v1/accidents/predict-risk", json={
        "city": "Chennai", "date": "2026-11-14",
        "time": "10:30", "weather_mode": "auto",
    })
    assert response.status_code == 503
    detail = response.json()["detail"]
    assert detail["code"] == "MODEL_NOT_READY"
    assert detail["probability"] is None
    assert detail["requested_time"] == "10:30"


def test_invalid_time_is_rejected():
    response = client.post("/api/v1/accidents/predict-risk", json={
        "city": "Chennai", "date": "2026-11-14",
        "time": "25:30", "weather_mode": "auto",
    })
    assert response.status_code == 422


def test_invalid_weather_is_rejected():
    response = client.post("/api/v1/accidents/predict-risk", json={
        "city": "Chennai", "date": "2026-11-14",
        "time": "10:30", "weather_mode": "unknown",
    })
    assert response.status_code == 422
