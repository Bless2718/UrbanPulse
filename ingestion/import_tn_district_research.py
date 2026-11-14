"""Validate and import Tamil Nadu district-year research data into isolated staging.

Safe by default: no database connection unless --apply is specified.
This script NEVER writes to analytics, raw, forecasts, or production models.

From the repository root:
    python ingestion/import_tn_district_research.py
    python ingestion/import_tn_district_research.py --apply

DATABASE_URL is required for --apply. For the existing Windows Compose setup:
    postgresql+pg8000://urbanpulse:urbanpulse_dev@127.0.0.1:5433/urbanpulse
"""
from __future__ import annotations

import argparse
from collections import defaultdict
import csv
from hashlib import sha256
import json
import os
from pathlib import Path
import re
from urllib.parse import unquote, urlparse

REPO_ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = REPO_ROOT / "data/research/tamil_nadu/district_accidents_2016_2024_research.csv"
VALIDATION_PATH = REPO_ROOT / "data/research/tamil_nadu/district_annual_validation_2016_2024.csv"
SCHEMA_PATH = REPO_ROOT / "sql/22_tn_district_research_staging.sql"

DATA_FIELDS = (
    "year", "district_source_name", "district_normalized",
    "total_accidents", "total_deaths", "source_page", "source_url",
    "dataset_status", "is_ml_prediction", "notes",
)
VALIDATION_FIELDS = (
    "year", "rows", "accident_sum", "published_total",
    "difference", "deaths_sum", "source",
)

# Semantic SHA-256 (canonical JSON of CSV dictionaries), independent of CSV
# line endings. A deliberate future source revision needs a reviewed new version.
DATA_DIGEST = "d44bfed680645beaad93ad68a11f98f9543d246cc26d5a0a8bc7e63979a5b250"
VALIDATION_DIGEST = "de875331f2b161df4e10249f867fad85e6135f9d2d901f18d6a67f9d437cea08"

BOOKLET_2016_2022 = "https://tnsta.gov.in/pdfpage/pdfpage_tn_2ratnSA_2023_07_25.pdf"
REPORT_2023 = (
    "https://data.opencity.in/dataset/"
    "2fc34e49-936f-4255-a4c3-1ef92f25adf3/resource/"
    "539efd74-aeaa-404c-870f-cd8b696fe3df/download/"
    "a3e73b47-eeb2-4dd6-929b-23e75cc7895a.pdf"
)
BOOKLET_2024 = "https://tnsta.gov.in/pdfpage/pdfpage_tn_9whfknJ_2025_08_06.pdf"

# These are the totals printed in the research source material.
# Matching a booklet is a transcription check, NOT boundary verification.
EXPECTED = {
    2016: (32, 71431, 17218, BOOKLET_2016_2022, 148),
    2017: (37, 66763, 17918, BOOKLET_2016_2022, 149),
    2018: (37, 67279, 18392, BOOKLET_2016_2022, 150),
    2019: (37, 62685, 18129, BOOKLET_2016_2022, 151),
    2020: (37, 49844, 14527, BOOKLET_2016_2022, 152),
    2021: (37, 55682, 15384, BOOKLET_2016_2022, 153),
    2022: (38, 64105, 17884, BOOKLET_2016_2022, 154),
    2023: (38, 67213, 18347, REPORT_2023, 3),
    2024: (38, 67183, 18074, BOOKLET_2024, None),
}


def read_csv(path: Path, required_fields: tuple[str, ...]) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames != list(required_fields):
            raise ValueError(f"{path.name}: unexpected CSV columns: {reader.fieldnames}")
        rows = list(reader)
    if not rows:
        raise ValueError(f"{path.name}: empty CSV")
    if any(None in row or any(value is None for value in row.values()) for row in rows):
        raise ValueError(f"{path.name}: malformed CSV row")
    return rows


def canonical_digest(rows: list[dict[str, str]]) -> str:
    content = json.dumps(rows, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return sha256(content.encode("utf-8")).hexdigest()


def parse_integer(value: str, description: str) -> int:
    if not re.fullmatch(r"(0|[1-9][0-9]*)", value):
        raise ValueError(f"Invalid {description}: {value!r}")
    return int(value)


def validate_extract(
    data_path: Path = DATA_PATH,
    validation_path: Path = VALIDATION_PATH,
) -> tuple[list[dict], list[dict], dict]:
    data = read_csv(data_path, DATA_FIELDS)
    checks = read_csv(validation_path, VALIDATION_FIELDS)
    if canonical_digest(data) != DATA_DIGEST:
        raise ValueError("District research CSV differs from the reviewed 331-row extract")
    if canonical_digest(checks) != VALIDATION_DIGEST:
        raise ValueError("Annual checks CSV differs from the reviewed source totals")

    seen_source: set[tuple[int, str]] = set()
    seen_normalized: set[tuple[int, str]] = set()
    grouped: dict[int, dict[str, int]] = defaultdict(
        lambda: {"rows": 0, "accidents": 0, "deaths": 0}
    )
    records: list[dict] = []
    for index, row in enumerate(data, start=2):
        year = parse_integer(row["year"], f"year at line {index}")
        if year not in EXPECTED:
            raise ValueError(f"Unexpected source year {year}")
        name = row["district_source_name"].strip()
        normalized = row["district_normalized"].strip()
        if not name or not normalized or name != name.upper() or normalized != normalized.upper():
            raise ValueError(f"Invalid published/normalized district at line {index}")
        original_key = (year, name)
        normalized_key = (year, normalized)
        if original_key in seen_source or normalized_key in seen_normalized:
            raise ValueError(f"Duplicate district-year at line {index}: {name}/{normalized}")
        seen_source.add(original_key)
        seen_normalized.add(normalized_key)

        accidents = parse_integer(row["total_accidents"], f"accidents at line {index}")
        deaths = parse_integer(row["total_deaths"], f"deaths at line {index}")
        page_raw = row["source_page"].strip()
        page = parse_integer(page_raw, f"page at line {index}") if page_raw else None
        expected_rows, expected_accidents, expected_deaths, source, expected_page = EXPECTED[year]
        if row["source_url"].strip() != source or page != expected_page:
            raise ValueError(f"Source URL or document page does not match year {year} at line {index}")
        status = "2024_revision_unresolved" if year == 2024 else "extracted_unreconciled"
        if row["dataset_status"].strip() != status or row["is_ml_prediction"].lower() != "false":
            raise ValueError(f"Research/ML status invalid at line {index}")
        notes = row["notes"].strip()
        if not notes:
            raise ValueError(f"Missing extraction caveat at line {index}")
        if year == 2024 and "67526" not in notes:
            raise ValueError("2024 must retain its unresolved revised-total warning")

        normalized_record = {
            "year": year,
            "district_source_name": name,
            "district_normalized": normalized,
            "total_accidents": accidents,
            "total_deaths": deaths,
            "source_page": page,
            "source_url": source,
            "dataset_status": status,
            "is_ml_prediction": False,
            "notes": notes,
        }
        normalized_record["row_sha256"] = sha256(
            json.dumps(normalized_record, sort_keys=True, separators=(",", ":")).encode("utf-8")
        ).hexdigest()
        records.append(normalized_record)
        grouped[year]["rows"] += 1
        grouped[year]["accidents"] += accidents
        grouped[year]["deaths"] += deaths

    if len(records) != 331 or len(checks) != len(EXPECTED):
        raise ValueError("Unexpected record count or incomplete year validation manifest")

    check_years: set[int] = set()
    summary: list[dict] = []
    for line, row in enumerate(checks, start=2):
        year = parse_integer(row["year"], f"check year at line {line}")
        if year in check_years or year not in EXPECTED:
            raise ValueError(f"Duplicate/unknown validation year: {year}")
        check_years.add(year)
        expected_rows, expected_accidents, expected_deaths, source, _ = EXPECTED[year]
        actual = grouped[year]
        manifest = {
            "rows": parse_integer(row["rows"], f"row count for {year}"),
            "accidents": parse_integer(row["accident_sum"], f"accident sum for {year}"),
            "deaths": parse_integer(row["deaths_sum"], f"death sum for {year}"),
        }
        published = parse_integer(row["published_total"], f"booklet total for {year}")
        difference = parse_integer(row["difference"], f"balance difference for {year}")
        if (actual != manifest or
            actual != {"rows": expected_rows, "accidents": expected_accidents, "deaths": expected_deaths} or
            published != expected_accidents or difference != 0 or row["source"].strip() != source):
            raise ValueError(f"Published accident totals or provenance mismatch for {year}")
        summary.append({
            "year": year,
            "row_count": expected_rows,
            "accident_sum": expected_accidents,
            "death_sum": expected_deaths,
            "booklet_accident_total": published,
            "booklet_source_url": source,
            "balance_status": "matches_booklet_extract",
            "boundary_review_required": True,
            "source_revision_review_required": year == 2024,
        })

    if check_years != set(EXPECTED):
        raise ValueError("Missing validation years")
    summary.sort(key=lambda x: x["year"])
    metadata = {
        "record_count": len(records),
        "years": sorted(EXPECTED),
        "semantic_data_sha256": DATA_DIGEST,
        "semantic_validation_sha256": VALIDATION_DIGEST,
        "source_file_sha256": sha256(data_path.read_bytes()).hexdigest(),
        "validation_file_sha256": sha256(validation_path.read_bytes()).hexdigest(),
        "model_ready": False,
        "review_state": "quarantined",
        "warning": "2024 booklet 67,183 vs later statewide 67,526; district boundary continuity unverified",
    }
    return records, summary, metadata


def postgres_connection(database_url: str):
    try:
        import pg8000.dbapi
    except ImportError as exc:
        raise RuntimeError("Install ingestion/requirements.txt to use --apply") from exc
    parsed = urlparse(database_url)
    if parsed.scheme not in {"postgresql", "postgresql+pg8000"} or not parsed.hostname:
        raise ValueError("DATABASE_URL must be a PostgreSQL URL with a hostname")
    if not parsed.username or not parsed.path.strip("/"):
        raise ValueError("DATABASE_URL must specify a username and database name")
    return pg8000.dbapi.connect(
        host=parsed.hostname,
        port=parsed.port or 5432,
        user=unquote(parsed.username),
        password=unquote(parsed.password or ""),
        database=parsed.path.lstrip("/"),
    )


def apply_to_staging(
    records: list[dict],
    checks: list[dict],
    metadata: dict,
    database_url: str,
    schema_path: Path = SCHEMA_PATH,
) -> dict:
    connection = postgres_connection(database_url)
    cursor = connection.cursor()
    key = metadata["source_file_sha256"]
    try:
        # DDL and inserts share one transaction. A validation or DB error rolls back.
        # Only staging.tn_district_research_* tables are ever addressed.
        for statement in schema_path.read_text(encoding="utf-8").split(";"):
            if statement.strip():
                cursor.execute(statement)

        cursor.execute(
            """INSERT INTO staging.tn_district_research_imports
               (source_sha256, source_path, validation_sha256, row_count,
                year_first, year_last, review_state, model_ready, notes)
               VALUES (%s, %s, %s, %s, 2016, 2024, 'quarantined', FALSE, %s)
               ON CONFLICT (source_sha256) DO NOTHING""",
            (
                key, "data/research/tamil_nadu/district_accidents_2016_2024_research.csv",
                metadata["validation_file_sha256"], len(records), metadata["warning"],
            ),
        )
        cursor.execute(
            """SELECT row_count, validation_sha256, review_state, model_ready
               FROM staging.tn_district_research_imports WHERE source_sha256=%s""",
            (key,),
        )
        stored = cursor.fetchone()
        if stored != (len(records), metadata["validation_file_sha256"], "quarantined", False):
            raise ValueError("Research import ID already exists with mismatched metadata")

        for row in records:
            cursor.execute(
                """INSERT INTO staging.tn_district_research_rows
                   (source_sha256, year, district_source_name, district_normalized,
                    total_accidents, total_deaths, source_page, source_url,
                    dataset_status, is_ml_prediction, model_ready, notes, row_sha256)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, FALSE, FALSE, %s, %s)
                   ON CONFLICT (source_sha256, year, district_source_name) DO NOTHING""",
                (key, row["year"], row["district_source_name"], row["district_normalized"],
                 row["total_accidents"], row["total_deaths"], row["source_page"],
                 row["source_url"], row["dataset_status"], row["notes"], row["row_sha256"]),
            )
        for row in checks:
            cursor.execute(
                """INSERT INTO staging.tn_district_research_checks
                   (source_sha256, year, row_count, accident_sum, death_sum,
                    booklet_accident_total, booklet_source_url, balance_status,
                    boundary_review_required, source_revision_review_required)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, TRUE, %s)
                   ON CONFLICT (source_sha256, year) DO NOTHING""",
                (key, row["year"], row["row_count"], row["accident_sum"],
                 row["death_sum"], row["booklet_accident_total"],
                 row["booklet_source_url"], row["balance_status"],
                 row["source_revision_review_required"]),
            )

        cursor.execute(
            """SELECT year, COUNT(*), SUM(total_accidents), SUM(total_deaths),
                      BOOL_AND(NOT model_ready AND NOT is_ml_prediction)
               FROM staging.tn_district_research_rows
               WHERE source_sha256=%s GROUP BY year ORDER BY year""",
            (key,),
        )
        stored_years = cursor.fetchall()
        expected_years = [
            (x["year"], x["row_count"], x["accident_sum"], x["death_sum"], True)
            for x in checks
        ]
        if stored_years != expected_years:
            raise ValueError("Post-insert staging totals failed verification")

        cursor.execute(
            """SELECT COUNT(*), BOOL_AND(boundary_review_required),
                      BOOL_AND(balance_status='matches_booklet_extract')
               FROM staging.tn_district_research_checks WHERE source_sha256=%s""",
            (key,),
        )
        stored_checks = cursor.fetchone()
        if stored_checks != (9, True, True):
            raise ValueError("Post-insert research check verification failed")
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()
    return {"table": "staging.tn_district_research_rows",
            "source_sha256": key, "records": len(records), "years": len(checks),
            "model_ready": False, "import": "committed"}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", type=Path, default=DATA_PATH)
    parser.add_argument("--validation", type=Path, default=VALIDATION_PATH)
    parser.add_argument(
        "--apply", action="store_true",
        help="Explicitly insert into the isolated staging tables (requires DATABASE_URL)",
    )
    args = parser.parse_args()
    records, checks, metadata = validate_extract(args.csv, args.validation)
    if args.apply:
        url = os.getenv("DATABASE_URL")
        if not url:
            parser.error("DATABASE_URL is required for --apply (no implicit local database)")
        result = apply_to_staging(records, checks, metadata, url)
        print(json.dumps({"result": result, "yearly_checks": checks, "warnings": metadata["warning"]}, indent=2))
    else:
        print(json.dumps({
            "result": "dry-run validation passed; database unchanged",
            "metadata": metadata,
            "yearly_checks": checks,
        }, indent=2))


if __name__ == "__main__":
    main()
