from __future__ import annotations

import csv
import os
from pathlib import Path
from typing import Any

from common import as_int, db_connection, json_text

DEFAULT_PATH = Path("data/raw/accidents/road_accidents_1998_2025.csv")
CSV_PATH = Path(os.getenv("ACCIDENT_CSV_PATH", str(DEFAULT_PATH)))


def read_rows(path: Path = CSV_PATH) -> list[dict[str, Any]]:
    if not path.exists():
        raise FileNotFoundError(f"Accident CSV not found: {path}")

    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))

    if not rows:
        raise ValueError("Accident CSV is empty")
    return rows


def normalize(row: dict[str, Any]) -> tuple[int, ...]:
    values = (
        as_int(row.get("_id")),
        as_int(row.get("YEAR")),
        as_int(row.get("Fatal Accidents")),
        as_int(row.get("Fatal Killed")),
        as_int(row.get("Grievous Injury - Accidents")),
        as_int(row.get("Grievous Injurty - Injured")),
        as_int(row.get("Minor Injury - Accidents")),
        as_int(row.get("Minor Injury - Injured")),
        as_int(row.get("Non Injury")),
        as_int(row.get("Total Accidents")),
        as_int(row.get("Total number of persons involved")),
    )
    if any(value is None for value in values):
        raise ValueError(f"Invalid or missing numeric value in row: {row}")
    return tuple(int(value) for value in values)


def load_rows(rows: list[dict[str, Any]], path: Path = CSV_PATH) -> int:
    with db_connection() as conn:
        cur = conn.cursor()
        try:
            for row in rows:
                (
                    source_row_id,
                    year,
                    fatal_accidents,
                    fatal_killed,
                    grievous_injury_accidents,
                    grievous_injury_injured,
                    minor_injury_accidents,
                    minor_injury_injured,
                    non_injury_accidents,
                    total_accidents,
                    total_persons_involved,
                ) = normalize(row)

                cur.execute(
                    """
                    INSERT INTO raw.accident_yearly_summary (
                        source,
                        source_file,
                        source_row_id,
                        year,
                        fatal_accidents,
                        fatal_killed,
                        grievous_injury_accidents,
                        grievous_injury_injured,
                        minor_injury_accidents,
                        minor_injury_injured,
                        non_injury_accidents,
                        total_accidents,
                        total_persons_involved,
                        payload
                    )
                    VALUES (
                        'csv', %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s::jsonb
                    )
                    ON CONFLICT (year) DO UPDATE SET
                        source_file = EXCLUDED.source_file,
                        source_row_id = EXCLUDED.source_row_id,
                        fatal_accidents = EXCLUDED.fatal_accidents,
                        fatal_killed = EXCLUDED.fatal_killed,
                        grievous_injury_accidents = EXCLUDED.grievous_injury_accidents,
                        grievous_injury_injured = EXCLUDED.grievous_injury_injured,
                        minor_injury_accidents = EXCLUDED.minor_injury_accidents,
                        minor_injury_injured = EXCLUDED.minor_injury_injured,
                        non_injury_accidents = EXCLUDED.non_injury_accidents,
                        total_accidents = EXCLUDED.total_accidents,
                        total_persons_involved = EXCLUDED.total_persons_involved,
                        payload = EXCLUDED.payload,
                        ingested_at = NOW()
                    """,
                    (
                        path.name,
                        source_row_id,
                        year,
                        fatal_accidents,
                        fatal_killed,
                        grievous_injury_accidents,
                        grievous_injury_injured,
                        minor_injury_accidents,
                        minor_injury_injured,
                        non_injury_accidents,
                        total_accidents,
                        total_persons_involved,
                        json_text(row),
                    ),
                )
            conn.commit()
        finally:
            cur.close()
    return len(rows)


def run() -> int:
    rows = read_rows()
    return load_rows(rows)


if __name__ == "__main__":
    count = run()
    print(f"Loaded {count} yearly accident records from {CSV_PATH}")
