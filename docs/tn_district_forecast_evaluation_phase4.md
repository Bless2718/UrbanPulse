# UrbanPulse Phase 4 — Forecast Evaluation Dashboard

## What the new page does

Open **http://localhost:3000/forecast/evaluation** after merging Phase 4, rebuilding the web container and exporting a Phase 3 report. The new page is linked in both the primary navigation and the District Lab.

**This is a historical experiment viewer, NOT a production district forecast.** It reads the Phase 3 **locally generated JSON** report; it does not call the production forecasting API, run model training, write any database tables, or publish future-looking 2026 predictions.

Features:

- Select any of 38 original district/city reporting areas or four **unverified** parent/child group hypotheses (42 candidates total). The page makes insufficient-history cases explicit rather than inventing scores.
- Select one- or two-year historical forecast horizon and persistence, three-year moving average, or four-year linear trend.
- Inspect observed-versus-backtested annual accident counts on actual historical holdout years, with a readable accessible table beneath the plot.
- Compare per-candidate historical MAE, RMSE and WAPE across the three baseline methods, with test fold counts and null/NA handling for absent data.
- See research provenance (source SHA-256, report date), excluded incomplete-group-year counts and the unresolved 2024 revision (+343 accidents/+375 deaths).
- A visible warning states that none of the 42 candidates is model-ready and that historic administrative/reporting boundaries have not been verified.

## Step 1 — update local project

After PR #8 (or the Phase 4 PR created for this branch) is reviewed and merged into **feature/city-hourly-risk-api**:

~~~powershell
git switch feature/city-hourly-risk-api
git pull --ff-only origin feature/city-hourly-risk-api
~~~

Do not discard any uncommitted local changes. Check git status --short if pull fails.

## Step 2 — generate the Phase 3 research JSON

From the repository root, after Phase 1 and Phase 2 database setup have already completed:

~~~powershell
New-Item -ItemType Directory -Force .\reports | Out-Null
docker compose --profile jobs build ingestion
docker compose --profile jobs run --rm -v "${PWD}/reports:/app/reports" ingestion python ingestion/backtest_tn_district_experiments.py --output /app/reports/tn_district_backtest.json
~~~

The report is generated at **reports/tn_district_backtest.json** on Windows. It is intentionally ignored by Git; it is NOT inserted into the production database or ML training tables.

## Step 3 — start the new frontend

~~~powershell
docker compose up -d --build web api
~~~

Open: **http://localhost:3000/forecast/evaluation**

The Compose web service mounts **./reports** at **/app/reports** as **read-only** and sets TN_DISTRICT_BACKTEST_REPORT_PATH. The Next.js page reads the report dynamically when visited/refreshed; regenerating JSON does not require rebuilding the web image.

If the report is missing, the page displays instructions and no numerical results. If the report is malformed, incompatible, provenance-invalid or changes any quarantine flag, the page **refuses to display it** rather than falling back to a different source or fabricating metrics.

To work outside Docker in apps/web (npm run dev), the same page also checks ../../reports/tn_district_backtest.json relative to the Next.js process working directory.

## Validation and safety guarantees

The report parser checks:

- Exact Phase 3 report marker, 64-character batch SHA-256 and the **42 quarantined candidates** (38 original areas + four exploratory groups).
- All candidate and fold-level model_ready values must remain **false**, with the explicit blocked eligibility status.
- No 2024/future targets or training observations, no 2026 prediction creation and no published forecast flag.
- Chronological holdout origin/target relationship, minimum four consecutive training years and source-row provenance hashes.
- No duplicate candidate identities or model/horizon/origin/target folds; candidate fold-count consistency.
- Unresolved 2024 source discrepancies of 343 accidents and 375 deaths; no reallocation to districts.

The UI recalculates per-candidate MAE, RMSE and WAPE from the selected historical test folds. It does not interpret low error as an approved model, and it avoids production claims.

Test the parser locally:

~~~powershell
cd apps/web
npm install
npm run test:evaluation
npm run lint
npm run build
~~~

GitHub Actions runs these tests, the existing frontend build and the ingestion/DB tests. There are **no** API, SQL, forecasting, or ML pipeline modifications in Phase 4.

## Important limitation

Experimental historical errors are not independently validated future forecasting accuracy. District reporting boundaries still need verification, the sharp 2022 Thiruvallur and Kancheepuram changes need investigation, and the 2024 state/district revision remains unresolved. No source version or model is promoted by visiting this page.
