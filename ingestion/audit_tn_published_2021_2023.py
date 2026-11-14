"""Source-level Tamil Nadu accident-count transcription crosscheck (research only).

Compares a separately published OpenCity 2021-2023 transcription with the 331
quarantined Tamil Nadu research records. This independently verifies copying/
transcription consistency, NOT geographic comparability, independence of
underlying government reports, future forecast validity, or model readiness.

Does NOT connect to PostgreSQL. Does NOT train or approve ML models.
"""
from __future__ import annotations

import argparse
import csv
from datetime import datetime, timezone
import hashlib
import io
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
ORIGINAL = ROOT / "data/research/tamil_nadu/district_accidents_2016_2024_research.csv"
SECONDARY = ROOT / "data/research/tamil_nadu/opencity_published_2021_2023_crosscheck.csv"
REFERENCE_URL = "https://data.opencity.in/api/3/action/datastore_search?resource_id=764579ad-22e0-4f27-a694-34d0d2f843ea&limit=100"
RESOURCE_PAGE_URL = "https://data.opencity.in/dataset/tamil-nadu-road-accidents-reports/resource/764579ad-22e0-4f27-a694-34d0d2f843ea"
MORTH_2024_URL = "https://morth.gov.in/backend/documents/uploaded/Road%20Accidents%20in%20India%20-%202024.pdf"
TN_2024_BOOKLET_URL = "https://tnsta.gov.in/pdfpage/pdfpage_tn_9whfknJ_2025_08_06.pdf"
EXPECTED_COUNTS = {
    2021: (37, 55682, 15384),
    2022: (38, 64105, 17884),
    2023: (38, 67213, 18347),
}


def read_csv(path: Path, *, skip_comments: bool = False) -> list[dict]:
    text = path.read_text(encoding="utf-8-sig")
    if skip_comments:
        text = "\n".join(line for line in text.splitlines() if not line.lstrip().startswith("#"))
    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames is None:
        raise ValueError("Missing CSV header")
    required = {"year", "district_normalized", "total_accidents", "total_deaths"}
    if not required.issubset(set(reader.fieldnames)):
        raise ValueError("Missing required accident research columns")
    return list(reader)


def collect(rows: list[dict], years: set[int]) -> dict[tuple[int, str], tuple[int, int]]:
    result: dict[tuple[int, str], tuple[int, int]] = {}
    for row in rows:
        year = int(row["year"])
        if year not in years:
            continue
        district = row["district_normalized"].strip().upper()
        if not district or district == "TOTAL":
            raise ValueError("Invalid district identifier in year " + str(year))
        a, d = int(row["total_accidents"]), int(row["total_deaths"])
        if a < 0 or d < 0:
            raise ValueError("Negative accident/death count")
        key = (year, district)
        if key in result:
            raise ValueError("Duplicate reporting-area year: " + str(key))
        result[key] = (a, d)
    return result


def audit(original: Path = ORIGINAL, secondary: Path = SECONDARY) -> dict[str, Any]:
    primary_bytes = original.read_bytes()
    second_bytes = secondary.read_bytes()
    primary_rows = read_csv(original)
    secondary_rows = read_csv(secondary, skip_comments=True)
    if len(primary_rows) != 331 or len(secondary_rows) != 113:
        raise ValueError("Unexpected source batch size; no silent partial validation")
    original_values = collect(primary_rows, set(EXPECTED_COUNTS))
    other_values = collect(secondary_rows, set(EXPECTED_COUNTS))
    if len(original_values) != 113 or len(other_values) != 113:
        raise ValueError("Expected exactly 113 available district-year comparisons")
    expected_year_names = {
        2021: 37,
        2022: 38,
        2023: 38,
    }
    if any(sum(key[0] == year for key in other_values) != count
           for year, count in expected_year_names.items()):
        raise ValueError("Unexpected OpenCity missing-year pattern")
    if (2021, "MYILADUTHURAI") in other_values or (2021, "MYILADUTHURAI") in original_values:
        raise ValueError("2021 Mayiladuthurai is NA, not a zero accident observation")

    annual = []
    for year, (expected_rows, expected_accidents, expected_deaths) in EXPECTED_COUNTS.items():
        items = [values for (y, _), values in other_values.items() if y == year]
        report = {
            "year": year, "row_count": len(items),
            "accidents": sum(values[0] for values in items),
            "deaths": sum(values[1] for values in items),
        }
        if (report["row_count"], report["accidents"], report["deaths"]) != (
            expected_rows, expected_accidents, expected_deaths
        ):
            raise ValueError("Published secondary source year total differs: " + str(report))
        annual.append(report)

    missing_primary = sorted(other_values.keys() - original_values.keys())
    missing_secondary = sorted(original_values.keys() - other_values.keys())
    mismatches = [
        {
            "year": year, "district_normalized": district,
            "existing_accidents": original_values[(year, district)][0],
            "existing_deaths": original_values[(year, district)][1],
            "published_accidents": other_values[(year, district)][0],
            "published_deaths": other_values[(year, district)][1],
        }
        for year, district in sorted(original_values.keys() & other_values.keys())
        if original_values[(year, district)] != other_values[(year, district)]
    ]
    total_compared = len(original_values.keys() & other_values.keys())
    exact_matches = total_compared - len(mismatches)
    # 2024 is excluded from this reconciliation and deliberately never guessed.
    rows_2024 = collect(primary_rows, {2024})
    if len(rows_2024) != 38 or (
        sum(a for a, _ in rows_2024.values()),
        sum(d for _, d in rows_2024.values())
    ) != (67183, 18074):
        raise ValueError("Original 2024 booklet extract no longer matches its published totals")
    return {
        "audit": "2021_2023_published_transcription_crosscheck",
        "audit_date_utc": datetime.now(timezone.utc).isoformat(),
        "original_file_sha256": hashlib.sha256(primary_bytes).hexdigest(),
        "reference_snapshot_sha256": hashlib.sha256(second_bytes).hexdigest(),
        "reference_resource": RESOURCE_PAGE_URL,
        "reference_api": REFERENCE_URL,
        "source_note": "OpenCity republishes Tamil Nadu government accident data. Exact matches check transcription agreement, not independent data generation.",
        "annual_checks": annual,
        "compared_rows": total_compared,
        "matching_rows": exact_matches,
        "mismatching_rows": len(mismatches),
        "mismatches": mismatches,
        "missing_in_original": [{"year": y, "district": d} for y, d in missing_primary],
        "missing_in_secondary": [{"year": y, "district": d} for y, d in missing_secondary],
        "source_transcription_consistent": (
            exact_matches == 113 and not mismatches and not missing_primary and not missing_secondary
        ),
        "geography_crosswalk_verified": False,
        "2024_revision_resolved": False,
        "2024_booklet": {"accidents": 67183, "deaths": 18074, "url": TN_2024_BOOKLET_URL},
        "2024_later_national": {"accidents": 67526, "deaths": 18449, "url": MORTH_2024_URL},
        "2024_unallocated_gap": {"accidents": 343, "deaths": 375},
        "district_forecasting_approved": False,
        "model_ready": False,
        "next_requirements": [
            "Authoritative crosswalk of 2016-2024 accident-reporting jurisdictions",
            "Verify the creation and retrospective treatment of post-2016 districts",
            "Official revised 2024 district allocation, or a documented consistent-version choice",
            "Independent chronological validation on an approved comparable history",
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--original", type=Path, default=ORIGINAL)
    parser.add_argument("--reference", type=Path, default=SECONDARY)
    parser.add_argument("--output", type=Path, help="Optional local JSON research audit artifact")
    args = parser.parse_args()
    report = audit(args.original, args.reference)
    if not report["source_transcription_consistent"]:
        print(json.dumps(report, indent=2))
        raise SystemExit("Published source crosscheck failed: review mismatched rows before proceeding")
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({
            "saved_to": str(args.output),
            "matching_rows": report["matching_rows"],
            "mismatching_rows": report["mismatching_rows"],
            "model_ready": False,
        }, indent=2))
    else:
        print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
