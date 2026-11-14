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


def test_district_intelligence_contract_and_coverage():
    records = [
        {"district": "Area A", "year": 2021, "total_accidents": 10,
         "total_deaths": 2, "source_url": "https://example.org/source"},
        {"district": "Area A", "year": 2022, "total_accidents": 12,
         "total_deaths": 3, "source_url": "https://example.org/source"},
        {"district": "Area B", "year": 2022, "total_accidents": 5,
         "total_deaths": 1, "source_url": "https://example.org/source"},
    ]
    with patch("app.tn_historical.fetch", return_value=records):
        response = client.get("/api/v1/accidents/tamil-nadu/district-intelligence")
    assert response.status_code == 200
    body = response.json()
    assert body["is_ml_prediction"] is False
    assert body["available_years"] == [2021, 2022]
    assert body["coverage_by_year"] == [
        {"year": 2021, "reporting_areas": 1},
        {"year": 2022, "reporting_areas": 2},
    ]
    assert body["reporting_areas"] == 2
    assert body["records"] == records


def test_district_intelligence_empty_dataset():
    with patch("app.tn_historical.fetch", return_value=[]):
        response = client.get("/api/v1/accidents/tamil-nadu/district-intelligence")
    assert response.status_code == 200
    body = response.json()
    assert body["available_years"] == []
    assert body["records"] == []
