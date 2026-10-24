CREATE SCHEMA IF NOT EXISTS raw;

CREATE TABLE IF NOT EXISTS raw.accident_district_summary (
    id BIGSERIAL PRIMARY KEY,
    source TEXT NOT NULL DEFAULT 'public-github-dataset',
    source_row_id INTEGER,
    district TEXT NOT NULL UNIQUE,
    fatal_2020 INTEGER,
    fatal_2021 INTEGER,
    nonfatal_2020 INTEGER,
    nonfatal_2021 INTEGER,
    total_2020 INTEGER,
    total_2021 INTEGER,
    total_accidents INTEGER,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    payload JSONB NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accident_district_total
    ON raw.accident_district_summary (total_accidents DESC);
