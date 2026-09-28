from __future__ import annotations

import os
from typing import Any

import httpx

from common import as_float, db_connection, first_value, json_text

IMD_URL = os.getenv(
    "IMD_CURRENT_WEATHER_URL",
    "https://mausam.imd.gov.in/api/current_wx_api.php",
)
STATION_ID = os.getenv("IMD_STATION_ID", "43279")


def fetch_current_weather(station_id: str = STATION_ID) -> dict[str, Any]:
    response = httpx.get(
        IMD_URL,
        params={"id": station_id},
        timeout=30.0,
        follow_redirects=True,
        headers={"User-Agent": "UrbanPulse/0.1 (+https://github.com/Bless2718/UrbanPulse)"},
    )
    response.raise_for_status()
    data = response.json()

    if isinstance(data, list):
        if not data:
            raise ValueError("IMD returned an empty list")
        return data[0]
    if not isinstance(data, dict):
        raise ValueError(f"Unexpected IMD response type: {type(data).__name__}")
    return data


def load_weather(payload: dict[str, Any], station_id: str = STATION_ID) -> int:
    station_name = first_value(
        payload,
        ["station", "station_name", "Station", "Station Name", "city", "name"],
    )
    temperature = as_float(
        first_value(payload, ["temperature", "temp", "Temp", "Temperature"])
    )
    humidity = as_float(
        first_value(payload, ["humidity", "rh", "RH", "Relative Humidity"])
    )
    rainfall = as_float(
        first_value(payload, ["rainfall", "rain", "Rainfall", "rainfall_mm"])
    )
    description = first_value(
        payload,
        ["weather", "weather_description", "Weather", "forecast", "description"],
    )

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
                    station_id,
                    station_name,
                    temperature,
                    humidity,
                    rainfall,
                    str(description) if description is not None else None,
                    json_text(payload),
                ),
            )
            inserted_id = cur.fetchone()[0]
            conn.commit()
        finally:
            cur.close()
    return int(inserted_id)


def run() -> int:
    payload = fetch_current_weather()
    return load_weather(payload)


if __name__ == "__main__":
    row_id = run()
    print(f"Loaded IMD weather observation id={row_id} for station={STATION_ID}")
