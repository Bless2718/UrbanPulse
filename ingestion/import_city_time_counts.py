"""Import sourced city/year/time-window accident counts.

CSV columns: city,year,start_hour,end_hour,accident_count,source,source_url
Only import verified, cited source values; do not generate synthetic counts.
Run: python ingestion/import_city_time_counts.py path/to/verified.csv
"""
import csv
import os
import sys
from pathlib import Path

from sqlalchemy import create_engine, text

INSERT = text("""
    INSERT INTO analytics.city_time_accident_counts
        (city, year, start_hour, end_hour, accident_count, source, source_url)
    VALUES (:city, :year, :start_hour, :end_hour, :accident_count, :source, :source_url)
    ON CONFLICT (city, year, start_hour, end_hour, source)
    DO UPDATE SET accident_count = EXCLUDED.accident_count,
                  source_url = EXCLUDED.source_url,
                  imported_at = now()
""")


def read_rows(path: Path) -> list[dict]:
    required = {"city", "year", "start_hour", "end_hour", "accident_count", "source", "source_url"}
    with path.open(encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream)
        if not required.issubset(reader.fieldnames or []):
            raise ValueError(f"Missing CSV columns: {sorted(required - set(reader.fieldnames or []))}")
        rows = []
        seen = set()
        for row in reader:
            clean = {
                "city": row["city"].strip(),
                "year": int(row["year"]),
                "start_hour": int(row["start_hour"]),
                "end_hour": int(row["end_hour"]),
                "accident_count": int(row["accident_count"]),
                "source": row["source"].strip(),
                "source_url": row["source_url"].strip(),
            }
            if not clean["city"] or not clean["source"] or not clean["source_url"].startswith(("https://", "http://")):
                raise ValueError("Every row requires city, source and an HTTP(S) source URL")
            if not (1900 <= clean["year"] <= 2100 and 0 <= clean["start_hour"] < clean["end_hour"] <= 24 and clean["accident_count"] >= 0):
                raise ValueError(f"Invalid year/time window/count: {clean}")
            key = tuple(clean[k] for k in ("city", "year", "start_hour", "end_hour", "source"))
            if key in seen:
                raise ValueError(f"Duplicate row: {key}")
            seen.add(key)
            rows.append(clean)
    if not rows:
        raise ValueError("CSV has no records")
    return rows


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python ingestion/import_city_time_counts.py verified.csv")
    rows = read_rows(Path(sys.argv[1]))
    url = os.environ.get("DATABASE_URL", "postgresql+pg8000://urbanpulse:urbanpulse_dev@localhost:5432/urbanpulse")
    engine = create_engine(url)
    with engine.begin() as connection:
        connection.execute(INSERT, rows)
    print(f"Imported {len(rows)} sourced city-time records")


if __name__ == "__main__":
    main()
