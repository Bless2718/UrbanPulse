# Live Tamil Nadu weather and road-condition context (research-only integration)

## Findings from Firecrawl research (14 November 2026)

| Factor | Data availability | Implementation |
| --- | --- | --- |
| Weather model estimates: temperature, rainfall, humidity, wind, visibility, WMO code | **Available live** via [Open-Meteo Forecast API](https://open-meteo.com/en/docs) | Added API and web page; current valid time and retrieval time are always displayed |
| Weather forecast, precipitation probability | **Available** via Open-Meteo | Six upcoming hourly estimates (when provided) |
| Day/night | **Available** as Open-Meteo `is_day` | Display context only; not a learned accident predictor |
| Official weather warnings | Publicly [published by IMD](https://mausam.imd.gov.in/responsive/districtWiseWarningGIS.php) | Link to official warnings; **no machine ingestion** into risk model |
| Live road congestion / incidents | [HERE Traffic API v7](https://docs.here.com/traffic-api/docs/introduction-to-here-traffic-api-v7) offers a licensed API | **Not connected**; no API key, licensed access or verified coverage configured |
| Live geocoded Tamil Nadu crash events | No verified openly accessible official real-time data API found during this research | **Unavailable**; no counts or road locations are fabricated |
| Road geometry and traffic exposure | Need verified road and traffic flow measurements | **Not ingested** for accident-risk model |

Weather is a **model-grid estimate**, not an official road-surface sensor or guaranteed current station observation. The query coordinates are city centre points, **not district polygons or every road**. Missing fields remain null. Sources checked with Firecrawl live retrieval, including a successful JSON fetch from `api.open-meteo.com` using Chennai centre coordinates.

Open-Meteo's public no-key usage is meant for appropriate/noncommercial access with limits. Review provider terms before commercial use or large-volume collection.

## City centres (Open-Meteo geocoding reference)

These are static allowlisted cities, verified by the Open-Meteo Geocoding API with Tamil Nadu admin region:

| City | Latitude | Longitude |
| --- | ---: | ---: |
| Chennai | 13.08784 | 80.27847 |
| Coimbatore | 11.00555 | 76.96612 |
| Madurai | 9.91900 | 78.11953 |
| Salem | 11.65376 | 78.15538 |
| Tiruchirappalli | 10.81550 | 78.69651 |
| Tirunelveli | 8.72742 | 77.68380 |

No arbitrary lat/lon passed by users is forwarded to the provider. This reduces abuse and avoids making unverified geographic claims. Trichy is a supported alias for Tiruchirappalli.

## Run in your local UrbanPulse

After the feature PR is reviewed and merged into `feature/city-hourly-risk-api`, from PowerShell:

~~~powershell
git status --short
git switch feature/city-hourly-risk-api
git pull --ff-only origin feature/city-hourly-risk-api
docker compose up -d --build api web
~~~

**Important:** In earlier local work, Git pulls were blocked by edits to `docker-compose.yml`; preserve custom modifications with a backup and a targeted stash before pulling. Do not run `git reset --hard` or discard other untracked files.

Open http://localhost:3000/conditions and select one of the six cities. Select **View live conditions** to reload from the API. The API may return 503 if provider data is unavailable, invalid or more than two hours old: the UI then shows an honest unavailable state.

API endpoints:

~~~text
GET http://localhost:8000/api/v1/conditions/areas
GET http://localhost:8000/api/v1/conditions/live?city=Chennai
GET http://localhost:8000/api/v1/conditions/live?city=Coimbatore
~~~

The live response includes `source`, `weather_valid_at_local`, `retrieved_at_utc`, city-centre and provider-grid coordinates, current weather, upcoming hourly weather estimates, and explicit data availability flags.

### Important separation from accident predictions

- **No new accident-probability model was trained**, because annual district accident totals cannot label city-hour or road-segment risk.
- The existing `POST /api/v1/accidents/predict-risk` **continues to fail closed** until timestamped, geocoded crash labels, traffic exposure, stable reporting geography, and calibrated chronological validation exist.
- The response explicitly sets `accident_risk_probability = null`, `area_danger_rank = null`, `calibrated_hourly_prediction_available = false`; missing live accidents and traffic are `null`, never zero.
- Live weather cannot resolve the outstanding 2016–2024 district boundary anomalies or the provisional-versus-revised 2024 totals. This new page does not bypass Phase 2/3 research data quarantine.
- There is **no periodic collection** or automatic background refresh: the page makes one weather request each time it is opened/reloaded. To train a future model, source time-aligned weather features historically and pair them with verified hour/location-specific crash and exposure data, not annual totals.

## Testing

Run backend tests with:

~~~powershell
cd apps/api
python -m pytest -q
~~~

GitHub Actions also runs frontend lint and the Next.js production build. Backend test fixtures simulate Open-Meteo responses; they do not require outbound network or an actual live traffic feed.

## Requirements for later accident-danger modeling

1. Find legally usable geocoded crash-event records with time, crash severity, road and reporting-area metadata.
2. Collect traffic exposure (e.g., speeds and vehicle counts), road attributes, roadworks and incident event timestamps at matching spatial/temporal resolution.
3. Align historical hourly weather observations/reanalysis **without future-information leakage** and document coverage/missingness.
4. Backtest holdouts by time and geography; calibrate probabilities and uncertainty, address class imbalance, and evaluate biases across areas.
5. Only then display risk probabilities or comparative danger rankings on UrbanPulse. A rough weather hazard label alone is not a crash probability.
