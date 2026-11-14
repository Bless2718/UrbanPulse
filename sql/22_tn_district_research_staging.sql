-- Research-only Tamil Nadu district accident staging.
-- NEVER merge into analytics.tn_district_accidents or model training from here
-- until reporting boundaries and 2024 source revisions have been reviewed.
CREATE SCHEMA IF NOT EXISTS staging;

CREATE TABLE IF NOT EXISTS staging.tn_district_research_imports (
    source_sha256 TEXT PRIMARY KEY
        CHECK (source_sha256 ~ '^[a-f0-9]{64}$'),
    source_path TEXT NOT NULL,
    validation_sha256 TEXT NOT NULL
        CHECK (validation_sha256 ~ '^[a-f0-9]{64}$'),
    row_count INTEGER NOT NULL CHECK (row_count > 0),
    year_first INTEGER NOT NULL CHECK (year_first >= 2016),
    year_last INTEGER NOT NULL CHECK (year_last <= 2024),
    review_state TEXT NOT NULL DEFAULT 'quarantined'
        CHECK (review_state = 'quarantined'),
    model_ready BOOLEAN NOT NULL DEFAULT FALSE
        CHECK (model_ready = FALSE),
    notes TEXT NOT NULL,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staging.tn_district_research_rows (
    source_sha256 TEXT NOT NULL
        REFERENCES staging.tn_district_research_imports(source_sha256),
    year INTEGER NOT NULL CHECK (year BETWEEN 2016 AND 2024),
    district_source_name TEXT NOT NULL CHECK (length(trim(district_source_name)) > 0),
    district_normalized TEXT NOT NULL CHECK (length(trim(district_normalized)) > 0),
    total_accidents INTEGER NOT NULL CHECK (total_accidents >= 0),
    total_deaths INTEGER NOT NULL CHECK (total_deaths >= 0),
    source_page INTEGER,
    source_url TEXT NOT NULL CHECK (source_url LIKE 'https://%'),
    dataset_status TEXT NOT NULL
        CHECK (dataset_status IN ('extracted_unreconciled', '2024_revision_unresolved')),
    is_ml_prediction BOOLEAN NOT NULL DEFAULT FALSE
        CHECK (is_ml_prediction = FALSE),
    model_ready BOOLEAN NOT NULL DEFAULT FALSE
        CHECK (model_ready = FALSE),
    notes TEXT NOT NULL CHECK (length(trim(notes)) > 0),
    row_sha256 TEXT NOT NULL CHECK (row_sha256 ~ '^[a-f0-9]{64}$'),
    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (source_sha256, year, district_source_name),
    UNIQUE (source_sha256, year, district_normalized)
);

CREATE TABLE IF NOT EXISTS staging.tn_district_research_checks (
    source_sha256 TEXT NOT NULL
        REFERENCES staging.tn_district_research_imports(source_sha256),
    year INTEGER NOT NULL CHECK (year BETWEEN 2016 AND 2024),
    row_count INTEGER NOT NULL CHECK (row_count > 0),
    accident_sum INTEGER NOT NULL CHECK (accident_sum >= 0),
    death_sum INTEGER NOT NULL CHECK (death_sum >= 0),
    booklet_accident_total INTEGER NOT NULL CHECK (booklet_accident_total >= 0),
    booklet_source_url TEXT NOT NULL CHECK (booklet_source_url LIKE 'https://%'),
    balance_status TEXT NOT NULL CHECK (balance_status = 'matches_booklet_extract'),
    boundary_review_required BOOLEAN NOT NULL DEFAULT TRUE
        CHECK (boundary_review_required = TRUE),
    source_revision_review_required BOOLEAN NOT NULL,
    PRIMARY KEY (source_sha256, year)
);

CREATE INDEX IF NOT EXISTS tn_district_research_rows_year_idx
    ON staging.tn_district_research_rows(year, district_normalized);
