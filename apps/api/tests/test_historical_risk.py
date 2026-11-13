"""Historical accident-pattern API tests, using a mocked database."""
from unittest.mock import MagicMock, patch
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.historical_risk import router

app = FastAPI()
app.include_router(router)
client = TestClient(app)


def test_hour_maps_to_source_interval():
    connection = MagicMock()
    connection.execute.return_value.mappings.return_value = [{
        "city": "Chennai", "year": 2023, "start_hour": 9,
        "end_hour": 12, "accident_count": 586,
        "source": "verified-source", "source_url": "https://example.org/source",
    }]
    connection.__enter__.return_value = connection
    with patch("app.historical_risk.engine.connect", return_value=connection):
        response = client.get("/api/v1/accidents/historical-time-pattern",
                              params={"city": "Chennai", "hour": 10, "year": 2023})
    assert response.status_code == 200
    data = response.json()
    assert data["is_ml_prediction"] is False
    assert data["is_probability"] is False
    assert data["records"][0]["start_hour"] == 9
    assert data["records"][0]["end_hour"] == 12


def test_invalid_hour_rejected():
    response = client.get("/api/v1/accidents/historical-time-pattern",
                          params={"city": "Chennai", "hour": 25})
    assert response.status_code == 422


def test_no_records_returns_404():
    connection = MagicMock()
    connection.execute.return_value.mappings.return_value = []
    connection.__enter__.return_value = connection
    with patch("app.historical_risk.engine.connect", return_value=connection):
        response = client.get("/api/v1/accidents/historical-time-pattern",
                              params={"city": "Chennai", "hour": 10})
    assert response.status_code == 404
