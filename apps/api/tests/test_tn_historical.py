from unittest.mock import patch
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.tn_historical import router

app = FastAPI()
app.include_router(router)
client = TestClient(app)


def test_annual_contract():
    with patch("app.tn_historical.fetch", return_value=[{"year": 2023, "total_accidents": 67213}]):
        result = client.get("/api/v1/accidents/tamil-nadu/annual")
    assert result.status_code == 200
    assert result.json()["is_ml_prediction"] is False


def test_district_year_validation():
    result = client.get("/api/v1/accidents/tamil-nadu/districts?year=2020")
    assert result.status_code == 422


def test_unknown_district():
    with patch("app.tn_historical.fetch", return_value=[]):
        result = client.get("/api/v1/accidents/tamil-nadu/district-trend?district=unknown")
    assert result.status_code == 404
