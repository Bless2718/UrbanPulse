-- Idempotent table for sourced, aggregate city/time-window accident counts.
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE TABLE IF NOT EXISTS analytics.city_time_accident_counts (
    city TEXT NOT NULL,
    year INTEGER NOT NULL CHECK (year BETWEEN 1900 AND 2100),
    start_hour SMALLINT NOT NULL CHECK (start_hour BETWEEN 0 AND 23),
    end_hour SMALLINT NOT NULL CHECK (end_hour BETWEEN 1 AND 24),
    accident_count INTEGER NOT NULL CHECK (accident_count >= 0),
    source TEXT NOT NULL,
    source_url TEXT NOT NULL,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (city, year, start_hour, end_hour, source),
    CHECK (start_hour < end_hour)
);
CREATE INDEX IF NOT EXISTS city_time_counts_city_year_idx
    ON analytics.city_time_accident_counts (lower(city), year);
