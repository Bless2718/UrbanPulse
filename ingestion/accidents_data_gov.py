from __future__ import annotations

import hashlib
import json
import os
from typing import Any, Iterator

import httpx

from common import as_int, db_connection, first_value, json_text

BASE_URL = "https://api.data.gov.in/resource"
API_KEY = os.getenv("DATA_GOV_API_KEY", "")
RESOURCE_ID = os.getenv("DATA_GOV_ACCIDENT_RESOURCE_ID", "")
PAGE_SIZE = int(os.getenv("DATA_GOV_PAGE_SIZE", "1000"))


def fetch_pages(
    resource_id: str = RESOURCE_ID,
    api_key: str = API_KEY,
    page_size: int = PAGE_SIZE,
) -> Iterator[list[dict[str, Any]]]:
    if not resource_id:
        raise ValueError("DATA_GOV_ACCIDENT_RESOURCE_ID is required")
    if not api_key:
        raise ValueError("DATA_GOV_API_KEY is required")

    offset = 0
    while True:
        response = httpx.get(
            f"{BASE_URL}/{resource_id}",
            params={
                "api-key": api_key,
                "format": "json",
                "limit": page_size,
                "offset": offset,
            },
            timeout=45.0,
            follow_redirects=True,
            headers={"User-Agent": "UrbanPulse/0.1 (+https://github.com/Bless2718/UrbanPulse)"},
        )
        response.raise_for_status()
        body = response.json()
        records = body.get("records", [])

        if not isinstance(records, list):
            raise ValueError("data.gov.in response does not contain a records list")
        if not records:
            break

        yield records

        if len(records) < page_size:
            break
        offset += page_size


def record_hash(record: dict[str, Any]) -> str:
    canonical = json.dumps(record, sort_keys=True, ensure_ascii=False, default=str)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def normalize(record: dict[str, Any]) -> tuple[Any, ...]:
    state_ut = first_value(
        record,
        ["state_ut", "state/ut", "state", "states/uts", "State/UT"],
    )
    year = as_int(first_value(record, ["year", "Year"]))
    accidents = as_int(
        first_value(
            record,
            ["accidents", "total_accidents", "total number of road accidents", "road_accidents"],
        )
    )
    killed = as_int(
        first_value(record, ["persons_killed", "killed", "persons killed", "deaths"])
    )
    injured = as_int(
        first_value(record, ["persons_injured", "injured", "persons injured"])
    )
    return state_ut, year, accidents, killed, injured


def load_records(records: list[dict[str, Any]], resource_id: str = RESOURCE_ID) -> int:
    rows = []
    for record in records:
        state_ut, year, accidents, killed, injured = normalize(record)
        rows.append(
            (
                resource_id,
                record_hash(record),
                state_ut,
                year,
                accidents,
                killed,
                injured,
                json_text(record),
            )
        )

    if not rows:
        return 0

    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.executemany(
                """
                INSERT INTO raw.accident_records (
                    resource_id,
                    source_record_hash,
                    state_ut,
                    year,
                    accidents,
                    persons_killed,
                    persons_injured,
                    payload
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb)
                ON CONFLICT (resource_id, source_record_hash) DO NOTHING
                """,
                rows,
            )
        conn.commit()

    return len(rows)


def run() -> int:
    total = 0
    for records in fetch_pages():
        total += load_records(records)
    return total


if __name__ == "__main__":
    count = run()
    print(f"Processed {count} road-accident records")
