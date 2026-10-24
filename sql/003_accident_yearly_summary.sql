CREATE SCHEMA IF NOT EXISTS raw;

CREATE TABLE IF NOT EXISTS raw.accident_yearly_summary (
    id BIGSERIAL PRIMARY KEY,
    source TEXT NOT NULL DEFAULT 'csv',
    source_file TEXT NOT NULL,
    source_row_id INTEGER,
    year INTEGER NOT NULL UNIQUE,
    fatal_accidents INTEGER NOT NULL,
    fatal_killed INTEGER NOT NULL,
    grievous_injury_accidents INTEGER NOT NULL,
    grievous_injury_injured INTEGER NOT NULL,
    minor_injury_accidents INTEGER NOT NULL,
    minor_injury_injured INTEGER NOT NULL,
    non_injury_accidents INTEGER NOT NULL,
    total_accidents INTEGER NOT NULL,
    total_persons_involved INTEGER NOT NULL,
    payload JSONB NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (year BETWEEN 1900 AND 2100),
    CHECK (
        fatal_accidents >= 0
        AND fatal_killed >= 0
        AND grievous_injury_accidents >= 0
        AND grievous_injury_injured >= 0
        AND minor_injury_accidents >= 0
        AND minor_injury_injured >= 0
        AND non_injury_accidents >= 0
        AND total_accidents >= 0
        AND total_persons_involved >= 0
    )
);

CREATE INDEX IF NOT EXISTS idx_accident_yearly_summary_year
    ON raw.accident_yearly_summary (year DESC);
