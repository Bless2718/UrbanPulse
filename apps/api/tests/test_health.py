from unittest.mock import patch

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_when_database_is_reachable() -> None:
    # CI does not run a PostgreSQL instance; verify the endpoint contract
    # without assuming an external database is available.
    with patch("app.main.engine") as engine:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "database": "connected"}
    engine.connect.assert_called_once()


def test_health_when_database_is_unavailable() -> None:
    with patch("app.main.engine.connect", side_effect=ConnectionError("offline")):
        response = client.get("/health")

    assert response.status_code == 503
