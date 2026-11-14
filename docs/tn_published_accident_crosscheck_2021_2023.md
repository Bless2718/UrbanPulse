# UrbanPulse: Firecrawl-assisted published accident-data crosscheck

## Summary

**Status:** Published accident/death counts checked for 2021–2023; historical reporting geography and 2024 revisions **still unverified**. No forecasting candidate is promoted.

On 14 November 2026, the OpenCity CKAN published district accident resource was retrieved using Firecrawl and compared against all 331 original UrbanPulse research records. The resource contains 38 district/reporting-area labels, one TOTAL row, and 2021–2023 accident and fatality counts.

**Important:** OpenCity republishes figures derived from the Tamil Nadu government, the same original authority that UrbanPulse used. Agreement is a useful **independent transcription check**, not two independent measurement systems or proof that the reporting areas have stable boundaries.

## Provenance

- Published reference page: https://data.opencity.in/dataset/tamil-nadu-road-accidents-reports/resource/764579ad-22e0-4f27-a694-34d0d2f843ea
- Machine-readable CKAN API: https://data.opencity.in/api/3/action/datastore_search?resource_id=764579ad-22e0-4f27-a694-34d0d2f843ea&limit=100
- Local frozen review snapshot: data/research/tamil_nadu/opencity_published_2021_2023_crosscheck.csv
- Original (preserved): data/research/tamil_nadu/district_accidents_2016_2024_research.csv
- Verification tool: ingestion/audit_tn_published_2021_2023.py

## Audited result

| Year | Numeric reporting areas | Accidents | Deaths |
| --- | ---: | ---: | ---: |
| 2021 | 37 | 55,682 | 15,384 |
| 2022 | 38 | 64,105 | 17,884 |
| 2023 | 38 | 67,213 | 18,347 |

All **113 of 113** available district-year accident and death pairs exactly match UrbanPulse's research extract. **Zero mismatches**. Mayiladuthurai has NA in the published 2021 reference, so no fabricated zero row was added. The reported 2022 increases in Thiruvallur and Chengalpattu are also reflected in the published reference; the cause of those changes is **not** established by this match.

## Still unresolved

1. **Historical accident-reporting geography.** Several district names appear in 2017 accident tables even though those civil districts were formed in 2019. The official [Tamil Nadu district administration](https://mayiladuthurai.nic.in/) dates Mayiladuthurai's formation from Nagapattinam to 28 December 2020, while the reference marks its 2021 accident count NA. Administrative creation orders do not establish how the transport/police accident dataset retrospectively labels districts.
2. **2024 source revision.** The [Tamil Nadu Transport Department's March 2025 monthly information booklet](https://tnsta.gov.in/pdfpage/pdfpage_tn_9whfknJ_2025_08_06.pdf) reports **provisional 2024 totals of 67,183 accidents and 18,074 deaths**. The [Government of India Ministry of Road Transport and Highways, Road Accidents in India 2024](https://morth.gov.in/backend/documents/uploaded/Road%20Accidents%20in%20India%20-%202024.pdf) reports **67,526 accidents and 18,449 deaths** for Tamil Nadu, i.e. +343 accidents and +375 deaths. The national statewide totals do **not** supply verified revised counts for all 38 Tamil Nadu reporting areas in this research.
3. **Model sufficiency.** Three years of crosschecked published district observations are insufficient for the existing four-year-minimum rolling-origin backtests. Earlier years must also have independently confirmed geographical comparability before being used for future claims.

## Run the audit

From the UrbanPulse repository root:

~~~powershell
docker compose --profile jobs build ingestion
docker compose --profile jobs run --rm ingestion python ingestion/audit_tn_published_2021_2023.py
~~~

This performs local CSV comparisons only and creates **no database writes or ML output**. It fails if a source is incomplete, duplicates rows, 2024 totals unexpectedly change, or any mismatch occurs. It reports the source SHA-256 values and explicit `model_ready=false`/`district_forecasting_approved=false`.

To save JSON into your host reports directory:

~~~powershell
New-Item -ItemType Directory -Force .\reports | Out-Null
docker compose --profile jobs run --rm -v "${PWD}/reports:/app/reports" ingestion python ingestion/audit_tn_published_2021_2023.py --output /app/reports/tn_publication_crosscheck.json
~~~

### Database and dashboard isolation

The imported PostgreSQL research records, district eligibility gates, existing Phase 3 JSON backtests, statewide forecasts, production APIs and forecast models are **unchanged**. The Forecast Evaluation dashboard now states that the 113 published numerical records match, while continuing to warn that **0 of 42 district/group candidates are approved for future forecasting**. This avoids implying that a good transcription validates a time-series model.

### Future approval prerequisites

Get actual official police/transport reporting-jurisdiction crosswalks and revised 2024 district allocations; resolve 2022 step changes. Rebuild time-consistent annual district series and evaluate with independent chronological backtests. Only a separate approval process may update forecast eligibility.
