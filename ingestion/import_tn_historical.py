"""Import the two unmodified OpenCity CSV exports into separate analytics tables.

From repo root:
python ingestion/import_tn_historical.py data/raw/accidents/764579ad-22e0-4f27-a694-34d0d2f843ea.csv data/raw/accidents/c1fe08c4-9871-4c0b-b79b-c446f24f2c03.csv
"""
import csv
import os
import re
import sys
from pathlib import Path
from sqlalchemy import create_engine, text

DISTRICT_SOURCE = "https://data.opencity.in/dataset/tamil-nadu-road-accidents-reports/resource/764579ad-22e0-4f27-a694-34d0d2f843ea"
ANNUAL_SOURCE = "https://data.opencity.in/dataset/tamil-nadu-road-accidents-reports/resource/c1fe08c4-9871-4c0b-b79b-c446f24f2c03"

ANNUAL_COLUMNS = {
 "Fatal_Accidents": "fatal_accidents", "Grievous_Accidents": "grievous_accidents",
 "Minor_Accidents": "minor_accidents", "Non_Injury_Accidents": "non_injury_accidents",
 "Total_Accidents": "total_accidents", "Persons_Killed": "persons_killed",
 "Persons_Injured": "persons_injured", "Total_Persons_Involved": "total_persons_involved",
}


def read_csv(path):
    with Path(path).open(newline="", encoding="utf-8-sig") as stream:
        return list(csv.DictReader(stream))


def parse_annual(path):
    records = []
    seen = set()
    for row in read_csv(path):
        raw_year = row["Year"].strip()
        match = re.fullmatch(r"(\d{4})(\(P\))?", raw_year)
        if not match:
            raise ValueError(f"Unexpected year: {raw_year}")
        year = int(match.group(1))
        if year in seen:
            raise ValueError(f"Duplicate year: {year}")
        seen.add(year)
        record = {"year": year, "provisional": bool(match.group(2)), "source_url": ANNUAL_SOURCE}
        record.update({target: int(row[source].replace(",", "")) for source, target in ANNUAL_COLUMNS.items()})
        if any(record[key] < 0 for key in ANNUAL_COLUMNS.values()):
            raise ValueError(f"Negative annual counts: {year}")
        records.append(record)
    if not records:
        raise ValueError("Annual CSV is empty")
    return records


def parse_district(path):
    records = []
    seen = set()
    for row in read_csv(path):
        district = row["District"].strip().upper()
        if district == "TOTAL":  # published summary row; not a district
            continue
        if not district:
            raise ValueError("Missing district")
        for year in (2021, 2022, 2023):
            key = (district, year)
            if key in seen:
                raise ValueError(f"Duplicate district/year: {key}")
            seen.add(key)
            accidents_raw = row[f"Total Accidents {year}"].strip()
            deaths_raw = row[f"Total Deaths {year}"].strip()
            missing = {"", "NA", "N/A", "NULL", "-"}
            if accidents_raw.upper() in missing or deaths_raw.upper() in missing:
                if accidents_raw.upper() not in missing or deaths_raw.upper() not in missing:
                    raise ValueError(f"Partial missing district data: {key}")
                print(f"Skipping unavailable source values for {district}, {year} (NA is not zero)")
                continue
            record = {
                "district": district, "year": year,
                "total_accidents": int(accidents_raw.replace(",", "")),
                "total_deaths": int(deaths_raw.replace(",", "")),
                "source_url": DISTRICT_SOURCE,
            }
            if record["total_accidents"] < 0 or record["total_deaths"] < 0:
                raise ValueError(f"Negative district counts: {key}")
            records.append(record)
    if not records:
        raise ValueError("District CSV is empty")
    return records


def main():
    if len(sys.argv) != 3:
        raise SystemExit("Usage: python ingestion/import_tn_historical.py DISTRICT.csv ANNUAL.csv")
    districts = parse_district(sys.argv[1])
    annual = parse_annual(sys.argv[2])
    engine = create_engine(os.getenv(
        "DATABASE_URL", "postgresql+pg8000://urbanpulse:urbanpulse_dev@localhost:5432/urbanpulse"))
    with engine.begin() as conn:
        conn.execute(text("""
          INSERT INTO analytics.tn_annual_accidents
          (year, provisional, fatal_accidents, grievous_accidents, minor_accidents,
           non_injury_accidents, total_accidents, persons_killed, persons_injured,
           total_persons_involved, source_url)
          VALUES (:year, :provisional, :fatal_accidents, :grievous_accidents,
           :minor_accidents, :non_injury_accidents, :total_accidents, :persons_killed,
           :persons_injured, :total_persons_involved, :source_url)
          ON CONFLICT (year) DO UPDATE SET
           provisional=EXCLUDED.provisional, fatal_accidents=EXCLUDED.fatal_accidents,
           grievous_accidents=EXCLUDED.grievous_accidents, minor_accidents=EXCLUDED.minor_accidents,
           non_injury_accidents=EXCLUDED.non_injury_accidents, total_accidents=EXCLUDED.total_accidents,
           persons_killed=EXCLUDED.persons_killed, persons_injured=EXCLUDED.persons_injured,
           total_persons_involved=EXCLUDED.total_persons_involved, source_url=EXCLUDED.source_url
        """), annual)
        conn.execute(text("""
          INSERT INTO analytics.tn_district_accidents
           (district, year, total_accidents, total_deaths, source_url)
          VALUES (:district, :year, :total_accidents, :total_deaths, :source_url)
          ON CONFLICT (district, year) DO UPDATE SET
           total_accidents=EXCLUDED.total_accidents, total_deaths=EXCLUDED.total_deaths,
           source_url=EXCLUDED.source_url
        """), districts)
    print(f"Imported {len(annual)} annual and {len(districts)} district-year records")


if __name__ == "__main__":
    main()
