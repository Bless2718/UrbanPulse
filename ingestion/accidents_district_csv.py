from __future__ import annotations

import csv
import os
from pathlib import Path
from typing import Any

from common import as_float, as_int, db_connection, json_text

CSV_PATH = Path(
    os.getenv(
        "ACCIDENT_DISTRICT_CSV_PATH",
        "data/raw/accidents/tamil_nadu_district_accidents_2020_2021.csv",
    )
)


def read_rows() -> list[dict[str, Any]]:
    with CSV_PATH.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    if not rows:
        raise ValueError("District accident CSV is empty")
    return rows


def run() -> int:
    rows = read_rows()
    with db_connection() as conn:
        cur = conn.cursor()
        try:
            for row in rows:
                district = str(row.get("district") or "").strip()
                if not district:
                    raise ValueError(f"Missing district value: {row}")

                cur.execute(
                    """
                    INSERT INTO raw.accident_district_summary (
                        source_row_id, district, fatal_2020, fatal_2021,
                        nonfatal_2020, nonfatal_2021, total_2020, total_2021,
                        total_accidents, latitude, longitude, payload
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb)
                    ON CONFLICT (district) DO UPDATE SET
                        source_row_id = EXCLUDED.source_row_id,
                        fatal_2020 = EXCLUDED.fatal_2020,
                        fatal_2021 = EXCLUDED.fatal_2021,
                        nonfatal_2020 = EXCLUDED.nonfatal_2020,
                        nonfatal_2021 = EXCLUDED.nonfatal_2021,
                        total_2020 = EXCLUDED.total_2020,
                        total_2021 = EXCLUDED.total_2021,
                        total_accidents = EXCLUDED.total_accidents,
                        latitude = EXCLUDED.latitude,
                        longitude = EXCLUDED.longitude,
                        payload = EXCLUDED.payload,
                        ingested_at = NOW()
                    """,
                    (
                        as_int(row.get("_id")),
                        district,
                        as_int(row.get("2020_fatal")),
                        as_int(row.get("2021_fatal")),
                        as_int(row.get("2020_nonfatal")),
                        as_int(row.get("2021_nonfatal")),
                        as_int(row.get("total__2020")),
                        as_int(row.get("total__2021")),
                        as_int(row.get("total_accidents")),
                        as_float(row.get("latitude")),
                        as_float(row.get("longitude")),
                        json_text(row),
                    ),
                )
            conn.commit()
        finally:
            cur.close()
    return len(rows)


if __name__ == "__main__":
    print(f"Loaded {run()} district/city accident records")
