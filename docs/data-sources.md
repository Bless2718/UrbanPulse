# UrbanPulse Data Sources

## 1. India Meteorological Department (IMD)

UrbanPulse starts with the IMD Current Weather API.

- Default station: Chennai-Meenambakkam
- Station ID: `43279`
- Environment variable: `IMD_STATION_ID`
- API base: `https://mausam.imd.gov.in/api/current_wx_api.php`

The raw response is stored in PostgreSQL as JSONB so upstream schema changes do not destroy source fidelity.

## 2. Open Government Data Platform India

Road-accident data is ingested through data.gov.in's resource API.

Environment variables:

- `DATA_GOV_API_KEY`
- `DATA_GOV_ACCIDENT_RESOURCE_ID`
- `DATA_GOV_PAGE_SIZE`

The portal exposes multiple road-accident datasets, and their fields vary. UrbanPulse therefore:

1. preserves each complete record in `payload JSONB`;
2. computes a stable SHA-256 hash for deduplication;
3. normalizes common fields such as State/UT, year, accidents, persons killed and persons injured;
4. keeps the resource ID with every record for lineage.

## Why raw + normalized columns?

This is intentional medallion-style ingestion. The raw payload provides auditability and reprocessing,
while selected typed columns make SQL exploration fast before dbt models are introduced.
