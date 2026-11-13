# Historical city/time accident counts — Stage 1

The importer expects a **verified, sourced** CSV with the header:

```csv
city,year,start_hour,end_hour,accident_count,source,source_url
```

Do not populate this file with estimates or examples and present them as real data.
For an interval 09:00–12:00, use start_hour=9 and end_hour=12.
Time intervals must be non-overlapping within each city/year/source for meaningful
time-of-day comparisons; the importer validates ranges but does not infer
whether the source's categories overlap.

## Setup (PowerShell from repository root)

Apply schema to an existing PostgreSQL database:

```powershell
Get-Content sql/20_city_time_accidents.sql | docker compose exec -T db psql -U urbanpulse -d urbanpulse
```

Install ingestion dependencies if necessary (use `python -m pip`):

```powershell
python -m pip install sqlalchemy==2.0.36 pg8000==1.31.5
python ingestion/import_city_time_counts.py data/raw/accidents/verified_city_time_counts.csv
```

The CSV is **not bundled**: obtain and verify a license-permitted source
before importing. Source URLs are mandatory for traceability. The importer
uses DATABASE_URL if set; otherwise the repository's local development DB.

## API

- GET /api/v1/accidents/historical-cities
- GET /api/v1/accidents/historical-time-pattern?city=Chennai&hour=10&year=2023

If the source uses a three-hour bucket, the response returns the count for
the entire three-hour interval; it does not divide the count by three or
fabricate an exact-hour estimate. No trained model is involved.

## Next
Obtain city-hour crash events, reliable non-crash exposure windows, and
time-aligned weather to build and calibrate a genuine predictive model.
