CREATE SCHEMA IF NOT EXISTS analytics;
CREATE TABLE IF NOT EXISTS analytics.tn_annual_accidents (
 year INTEGER PRIMARY KEY CHECK (year BETWEEN 1900 AND 2100),
 provisional BOOLEAN NOT NULL,
 fatal_accidents INTEGER NOT NULL CHECK (fatal_accidents >= 0),
 grievous_accidents INTEGER NOT NULL CHECK (grievous_accidents >= 0),
 minor_accidents INTEGER NOT NULL CHECK (minor_accidents >= 0),
 non_injury_accidents INTEGER NOT NULL CHECK (non_injury_accidents >= 0),
 total_accidents INTEGER NOT NULL CHECK (total_accidents >= 0),
 persons_killed INTEGER NOT NULL CHECK (persons_killed >= 0),
 persons_injured INTEGER NOT NULL CHECK (persons_injured >= 0),
 total_persons_involved INTEGER NOT NULL CHECK (total_persons_involved >= 0),
 source_url TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS analytics.tn_district_accidents (
 district TEXT NOT NULL,
 year INTEGER NOT NULL CHECK (year BETWEEN 1900 AND 2100),
 total_accidents INTEGER NOT NULL CHECK (total_accidents >= 0),
 total_deaths INTEGER NOT NULL CHECK (total_deaths >= 0),
 source_url TEXT NOT NULL,
 PRIMARY KEY (district, year)
);
CREATE INDEX IF NOT EXISTS tn_district_year_idx ON analytics.tn_district_accidents (year);
