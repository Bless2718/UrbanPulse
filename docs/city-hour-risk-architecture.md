# City-hour accident risk prediction — architecture and data contract

## Scope
Request: Chennai, 2026-11-14, 10:30 Asia/Kolkata, weather_mode=auto.
Define the target before training: probability of >=1 reported crash in a
**specified city and one-hour interval**, conditional on available features.
A percentage is not meaningful until calibrated against city-hour negative
examples and appropriate exposure. Do not confuse this with a person's
individual chance of crashing.

## Current data limitations
- Annual 1998–2025 accident aggregates cannot determine city-hour risk.
- 2020–2021 district totals cannot determine hour-of-day patterns.
- Current weather observations are not historical hourly weather or a
  forecast valid at the requested prediction time.
- Existing location endpoint represents districts/centroids, not verified
  crash coordinates. The available-locations API labels them as districts.

## Required training tables
1. raw.accident_events: event_id, occurred_at_local (Asia/Kolkata),
   city_id, source, severity, latitude/longitude when permitted, reporting
   coverage and provenance. Deduplicate events; handle missing times.
2. reference.cities: city_id, canonical_name, state, timezone,
   latitude, longitude, administrative boundaries and aliases.
3. raw.weather_hourly: city_id/station_id, valid_at_utc, observed or
   forecast-issued-at UTC, precipitation_mm, temperature_c, humidity_pct,
   wind_speed, visibility, source and quality flags.
4. analytics.city_hour_exposure: city_id, hour_start_utc, traffic volume
   or defensible proxy, data coverage, road network exposure, holiday and
   weekday. Build *zero-crash* hours as well as crash hours.

## Feature pipeline
Create city-hour records with local calendar features, lagged crash counts,
weather joined by valid time, and traffic/exposure. For future predictions
use only forecasts issued before the prediction; never join future observed
weather into training features that simulate real-time inference. Timezone
must be explicit, and weather auto must fail clearly when unavailable.

## Model and evaluation
Start with a city-hour count model (Poisson/negative binomial baseline) and
compare gradient-boosted classification for at-least-one crash. Split by
chronological periods, with city holdouts where possible; assess calibration
(Brier score/reliability curves), precision/recall, and drift. Report the
target window, coverage, uncertainty and model version. Use a risk category
rather than a numeric probability when calibration is inadequate.

## API
GET /api/v1/accidents/available-locations returns existing *district*
names with prediction_ready=false. It does not assert these are supported
city-level model locations.

POST /api/v1/accidents/predict-risk accepts city, date, time (HH:MM local)
and weather_mode (auto/clear/rain/heavy/fog). Until validated model
artifacts and live weather inputs are integrated, it returns HTTP 503
MODEL_NOT_READY with probability=null. Do not silently fall back to
annual accident forecasts.

## Implementation next
Acquire licensed timestamped accident events and matched hourly weather;
establish city coverage, exposure and missingness; implement ingestion/dbt
models; train and calibrate; version and serve the model; then connect
Next.js city/time form to the endpoint with an explicit unavailable state.
