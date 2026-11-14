# Phase 2 — Tamil Nadu district reconciliation (research only)

**Status: exploratory; no group or district is forecast-ready.** Phase 2 reads the 331 imported 2016–2024 records; it does not modify original staging rows, production analytics, APIs, or forecasts.

## Source-boundary investigation

The official [Tamil Nadu rural-development policy note](https://tnrd.tn.gov.in/policynotes/42--PN-RURAL-ENG-2022-23-WEB.pdf) describes the administrative 2019 splits of Vellore (Ranipet and Tirupathur), Kancheepuram (Chengalpattu), Tirunelveli (Tenkasi), and Villupuram (Kallakurichi). The [Tenkasi government order](https://www.tnurbantree.tn.gov.in/tenkasi/wp-content/uploads/sites/13/2020/06/TENKASI-DIST-GO.pdf) confirms the 12 November 2019 action. The [Mayiladuthurai district administration](https://mayiladuthurai.nic.in/) confirms its formation on 28 December 2020 from Nagapattinam.

**Administrative parent-child relationships DO NOT establish equivalence of accident/police reporting boundaries.** The extract already lists some 2019 districts in 2017, and Mayiladuthurai first appears as an independent accident-reporting area in 2022 despite its 2020 formation. Whether the report retrospectively reallocates earlier figures is unresolved.

| Exploratory group | Accident reporting labels | Status |
| --- | --- | --- |
| VELLORE_LEGACY | Vellore, Ranipet, Tirupathur | Reporting geography unverified |
| KANCHEEPURAM_LEGACY | Kancheepuram, Chengalpattu | Reporting geography unverified |
| TIRUNELVELI_LEGACY | Tirunelveli, Tenkasi | Reporting geography unverified |
| NAGAPATTINAM_LEGACY | Nagapattinam, Myiladuthurai | Pre-2022 coverage unverified |

Villupuram/Kallakurichi is recognized in the research but deliberately excluded from the **four** exploratory groups requested. All individual areas remain blocked.

## Anomaly and revision screening

The report flags absolute year-on-year changes of **at least 40%** only between consecutive recorded years. It never imputes missing observations or calls the jumps data errors.

- Vellore alone fell 67.1% in 2017; exploratory grouping reduces the drop to about 10.2%, but that is not proof of consistent geometry.
- Kancheepuram + Chengalpattu rises from 2,524 in 2021 to 4,055 in 2022 (60.7%); the discrepancy remains after grouping.
- Thiruvallur rises from 1,274 in 2021 to 2,595 in 2022 (103.7%); it is not absorbed into any group.
- Nagapattinam/Mayiladuthurai grouping compares one reporting area in 2021 against two in 2022 and must be treated as noncomparable until source definitions are checked.
- 2020–2021 COVID-era exposure shifts are tagged as possible context, not corrected records.

The [2024 district booklet](https://tnsta.gov.in/pdfpage/pdfpage_tn_9whfknJ_2025_08_06.pdf) sums to **67,183 accidents and 18,074 deaths**, while the [Government of India Rajya Sabha reply of 11 March 2026](https://sansad.in/getFile/annex/270/AU2172_BvsIBX.pdf?source=pqars) reports **67,526 and 18,449**. The gaps are **343 accidents and 375 deaths**. No revised district distribution is available in these research sources; none is fabricated.

## Database review objects

The optional installer adds only six PostgreSQL **views**, all in the separate research_review schema. Every view partitions by the imported source_sha256, retains source origin and stays quarantined. The forecast eligibility view emits **model_ready=false** for all 38 original reporting areas and four exploratory groups. No tables are created under research_review.

| View name | Role |
| --- | --- |
| tn_group_members | Hypothesis membership and official source links |
| tn_group_history | Sums, year-by-year member completeness, source row hashes |
| tn_individual_changes | 40%-threshold flags in raw reporting series |
| tn_group_changes | Same flags for exploratory grouped series |
| tn_2024_revision | Differences between 2024 district booklet and later state totals |
| tn_forecast_eligibility | Blocked status, coverage and investigation reasons |

## Run on local Docker (from repository root)

First rebuild the ingestion image so it includes Phase 2:

~~~powershell
docker compose --profile jobs build ingestion
docker compose --profile jobs run --rm ingestion python ingestion/reconcile_tn_district_research.py --install-views
~~~

The second command installs **views only** and prints a JSON review report. Later runs without --install-views execute SELECT queries only:

~~~powershell
docker compose --profile jobs run --rm ingestion python ingestion/reconcile_tn_district_research.py
~~~

To save a local Windows copy of the report, create a bind-mounted folder:

~~~powershell
New-Item -ItemType Directory -Force .\reports | Out-Null
docker compose --profile jobs run --rm -v "${PWD}/reports:/app/reports" ingestion python ingestion/reconcile_tn_district_research.py --output /app/reports/tn_district_review.json
~~~

If there are multiple source versions, the CLI fails closed until --source-sha is supplied with an exact SHA-256 from staging.tn_district_research_imports. It never mixes versions.

Useful SQL:

~~~sql
SELECT group_id, year, total_accidents, members_present, expected_members, model_ready
FROM research_review.tn_group_history ORDER BY group_id, year;

SELECT candidate_id, candidate_type, observed_years, anomaly_count, model_ready
FROM research_review.tn_forecast_eligibility ORDER BY candidate_type, candidate_id;

SELECT * FROM research_review.tn_2024_revision;
~~~

Offline unit tests: python -m unittest discover -s ingestion/tests -p test_tn_district_reconciliation.py -v

GitHub Actions runs the review against disposable PostgreSQL 16 and checks 36 grouped-year values, 42 blocked candidates, the 2022 anomalies, and 2024 revision gaps without touching a real database.

## Requirements before future forecasting

1. Independently verify reporting jurisdiction history and historical boundary crosswalks, including Villupuram/Kallakurichi and Nagapattinam/Mayiladuthurai.
2. Investigate 2022 Thiruvallur and Kancheepuram jumps against methodology, police boundaries and traffic exposure.
3. Obtain revised 2024 district allocations or document an explicitly chosen consistent source version.
4. Only after independent reviewer sign-off, create a separately versioned training dataset and conduct chronological one-year and two-year-ahead backtests.

**This PR does not implement any approval or training interface.**
