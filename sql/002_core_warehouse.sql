CREATE SCHEMA IF NOT EXISTS raw;
CREATE SCHEMA IF NOT EXISTS staging;
CREATE SCHEMA IF NOT EXISTS analytics;

CREATE TABLE IF NOT EXISTS raw.weather_observations (
    id BIGSERIAL PRIMARY KEY,
    source TEXT NOT NULL DEFAULT 'imd',
    station_id TEXT NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    station_name TEXT,
    temperature_c DOUBLE PRECISION,
    humidity_pct DOUBLE PRECISION,
    rainfall_mm DOUBLE PRECISION,
    weather_description TEXT,
    payload JSONB NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weather_station_observed
    ON raw.weather_observations (station_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS raw.accident_records (
    id BIGSERIAL PRIMARY KEY,
    source TEXT NOT NULL DEFAULT 'data.gov.in',
    resource_id TEXT NOT NULL,
    source_record_hash TEXT NOT NULL,
    state_ut TEXT,
    year INTEGER,
    accidents INTEGER,
    persons_killed INTEGER,
    persons_injured INTEGER,
    payload JSONB NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (resource_id, source_record_hash)
);

CREATE INDEX IF NOT EXISTS idx_accident_state_year
    ON raw.accident_records (state_ut, year);

CREATE TABLE IF NOT EXISTS analytics.pipeline_runs (
    id BIGSERIAL PRIMARY KEY,
    pipeline_name TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    records_processed BIGINT NOT NULL DEFAULT 0,
    error_message TEXT
);
