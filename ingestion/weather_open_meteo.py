from __future__ import annotations

import os
from typing import Any

import httpx

from common import as_float, db_connection, json_text

OPEN_METEO_URL = os.getenv(
    "OPEN_METEO_URL",
    "https://api.open-meteo.com/v1/forecast",
)
LATITUDE = float(os.getenv("WEATHER_LATITUDE", "13.0827"))
LONGITUDE = float(os.getenv("WEATHER_LONGITUDE", "80.2707"))
LOCATION_NAME = os.getenv("WEATHER_LOCATION_NAME", "Chennai")
STATION_ID = os.getenv("WEATHER_STATION_ID", "open-meteo-chennai")


def fetch_current_weather() -> dict[str, Any]:
    response = httpx.get(
        OPEN_METEO_URL,
        params={
            "latitude": LATITUDE,
            "longitude": LONGITUDE,
            "current": ",".join(
                [
                    "temperature_2m",
                    "relative_humidity_2m",
                    "precipitation",
                    "weather_code",
                ]
            ),
            "timezone": "auto",
        },
        timeout=30.0,
        follow_redirects=True,
        headers={"User-Agent": "UrbanPulse/0.1 (+https://github.com/Bless2718/UrbanPulse)"},
    )
    response.raise_for_status()
    payload = response.json()

    if not isinstance(payload, dict) or not isinstance(payload.get("current"), dict):
        raise ValueError("Open-Meteo response does not contain a current-weather object")

    return payload


def load_weather(payload: dict[str, Any]) -> int:
    current = payload["current"]
    temperature = as_float(current.get("temperature_2m"))
    humidity = as_float(current.get("relative_humidity_2m"))
    precipitation = as_float(current.get("precipitation"))
    weather_code = current.get("weather_code")
    description = f"WMO weather code {weather_code}" if weather_code is not None else None

    with db_connection() as conn:
        cur = conn.cursor()
        try:
            cur.execute(
                """
                INSERT INTO raw.weather_observations (
                    station_id,
                    station_name,
                    temperature_c,
                    humidity_pct,
                    rainfall_mm,
                    weather_description,
                    payload
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb)
                RETURNING id
                """,
                (
                    STATION_ID,
                    LOCATION_NAME,
                    temperature,
                    humidity,
                    precipitation,
                    description,
                    json_text(payload),
                ),
            )
            inserted_id = cur.fetchone()[0]
            conn.commit()
        finally:
            cur.close()

    return int(inserted_id)


def run() -> int:
    return load_weather(fetch_current_weather())


if __name__ == "__main__":
    row_id = run()
    print(f"Loaded Open-Meteo weather observation id={row_id} for {LOCATION_NAME}")
