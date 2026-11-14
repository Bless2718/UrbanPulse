# Tamil Nadu district research staging — Phase 1

**Status:** quarantined research extract. **Not authorized for accident-forecast model training or district-level production API use.**

UrbanPulse is an accident **forecasting** project. This step prepares sourced input records without assuming district boundaries or model accuracy have been established.

## Versioned input files

| Repository file | Purpose | Reviewed rows |
| --- | --- | ---: |
| `data/research/tamil_nadu/district_accidents_2016_2024_research.csv` | Published district/city jurisdiction observations; no imputation | 331 |
| `data/research/tamil_nadu/district_annual_validation_2016_2024.csv` | Extract-vs-booklet annual count and totals checks | 9 |

Source files in this commit are manually transcribed research extracts from public reports. Their totals have been cross-added to match published booklet totals; they have **not** been independently verified against incident-level police case records.

The importer requires semantic SHA-256 digests of the reviewed files. If observations or sources change, the program fails closed until a reviewer updates the digest and published checks intentionally; CRLF/LF alone does not affect this semantic digest. The database additionally records byte-level SHA-256 of both files for batch provenance. Each record has its own canonical SHA-256.

- District observations canonical digest: `d44bfed680645beaad93ad68a11f98f9543d246cc26d5a0a8bc7e63979a5b250`
- Validation manifest canonical digest: `de875331f2b161df4e10249f867fad85e6135f9d2d901f18d6a67f9d437cea08`

## Data provenance and caveats

| Years | Source | Page reference | Annual status |
| --- | --- | --- | --- |
| 2016–2022 | [Tamil Nadu Transport Department Monthly Information Booklet, March 2023](https://tnsta.gov.in/pdfpage/pdfpage_tn_2ratnSA_2023_07_25.pdf) | Document pages 148–154 | Extracted, boundaries not reconciled |
| 2023 | [Tamil Nadu Road Accident Analysis 2023, final](https://data.opencity.in/dataset/2fc34e49-936f-4255-a4c3-1ef92f25adf3/resource/539efd74-aeaa-404c-870f-cd8b696fe3df/download/a3e73b47-eeb2-4dd6-929b-23e75cc7895a.pdf) | Report page 3 | Extracted, boundaries not reconciled |
| 2024 | [Tamil Nadu Transport Department annual booklet](https://tnsta.gov.in/pdfpage/pdfpage_tn_9whfknJ_2025_08_06.pdf) | Not recorded | **Source revision unresolved** |

2024 booklet records add up to **67,183 accidents and 18,074 deaths**. The later MoRTH nationwide reporting gives **67,526 accidents and 18,449 deaths** for Tamil Nadu. No verified revised district allocation has been obtained. Do not assume the earlier district series was adjusted to the later statewide figures.

There are 32 reporting areas in 2016, 37 in 2017–2021, and 38 in 2022–2024. Historical lists appear to retrospectively include reporting units established after 2017. The raw labels include a separate *CHENNAI CITY* jurisdiction. Field `district_normalized` is a spelling normalization only, **not** proof of a stable geographic unit.

## Source fields

- `year`: calendar year of report
- `district_source_name`: source label as printed
- `district_normalized`: name cleaned for spelling, not harmonized geography
- `total_accidents`, `total_deaths`: annual reported counts
- `source_page`, `source_url`: report provenance
- `dataset_status`: `extracted_unreconciled` or `2024_revision_unresolved`
- `is_ml_prediction`: always false
- `notes`: row-level extraction and reporting cautions

## Running the importer (safe dry-run first)

With Docker Desktop running, from repository root:

```powershell
docker compose up -d db
docker compose --profile jobs build ingestion
docker compose --profile jobs run --rm ingestion python ingestion/import_tn_district_research.py
```

The last command checks CSV structure, exact reviewed content digest, source pages and URLs, nonnegative integer values, unique reporting area/year names, recorded ML status, nine yearly counts, accident totals and death totals. **It does not connect to PostgreSQL.**

To insert the research extract into the staging schema, explicitly run:

```powershell
docker compose --profile jobs run --rm ingestion python ingestion/import_tn_district_research.py --apply
```

This uses `DATABASE_URL` from the Compose ingestion job, creates the isolated staging tables if necessary, and commits annual checks and observations together. No production analytics tables or prediction models are written. Re-running the same reviewed file is idempotent by source-file hash. A revised file becomes a distinct future version only after reviewer sign-off and digest-update.

For a local `.venv`, install `ingestion/requirements.txt`, set `DATABASE_URL` to your own dev PostgreSQL instance, and run the same Python script. No default database is assumed when `--apply` is used.

## Stored tables

- `staging.tn_district_research_imports`: versioned input, byte SHA-256, digest of validation file, status and review notes
- `staging.tn_district_research_rows`: source and normalized names, counts, pages, URLs, per-row digests and hard-blocking `model_ready=FALSE`
- `staging.tn_district_research_checks`: nine corresponding annual count/total checks, sources, boundary-review and source-revision-review flags

All rows and batches are constrained to `model_ready=FALSE`. There is **no training/export routine** tied to these tables in Phase 1.

Inspect imports:

```sql
SELECT source_sha256, row_count, year_first, year_last, review_state, model_ready
FROM staging.tn_district_research_imports;

SELECT year, COUNT(*) AS reporting_areas,
       SUM(total_accidents) AS accidents,
       SUM(total_deaths) AS deaths
FROM staging.tn_district_research_rows
GROUP BY year ORDER BY year;

SELECT year, booklet_accident_total, accident_sum,
       boundary_review_required, source_revision_review_required
FROM staging.tn_district_research_checks
ORDER BY year;
```

## Validation output expected

| Year | Rows | Accidents | Deaths |
| --- | ---: | ---: | ---: |
| 2016 | 32 | 71,431 | 17,218 |
| 2017 | 37 | 66,763 | 17,918 |
| 2018 | 37 | 67,279 | 18,392 |
| 2019 | 37 | 62,685 | 18,129 |
| 2020 | 37 | 49,844 | 14,527 |
| 2021 | 37 | 55,682 | 15,384 |
| 2022 | 38 | 64,105 | 17,884 |
| 2023 | 38 | 67,213 | 18,347 |
| 2024 | 38 | 67,183 | 18,074 |

## Next release gate — before any district forecasting

1. Verify 2016–2024 reporting jurisdiction definitions, especially apparent retrospective post-2019 split areas.
2. Identify revised **2024** district allocations or establish a consistent versioned source series, avoiding silent overwrites.
3. Reconcile 2021–2023 against existing `analytics.tn_district_accidents` with a documented crosswalk.
4. Obtain 2025 district data if accessible and harmonized, or evaluate a 2026 **two-year-ahead** horizon using earlier held-out years.
5. Backtest persistence and other baselines under chronological splits, report per-district errors and clearly label unsupported districts.

## Offline tests

```powershell
python -m unittest discover -s ingestion/tests -v
```

Tests cover reviewed totals, tampering, duplicate names, provenance, revision handling, and the no-database default.
