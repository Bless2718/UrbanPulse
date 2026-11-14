-- Phase 2 exploratory accident-reporting reconciliation.
-- No raw/analytics/staging writes. Every view is scoped by source_sha256 so
-- independently versioned research batches can never be silently combined.
CREATE SCHEMA IF NOT EXISTS research_review;

CREATE OR REPLACE VIEW research_review.tn_group_members AS
SELECT groups.group_id, groups.member, groups.evidence_url,
       'administrative_split_confirmed_reporting_geometry_unverified'::text AS hypothesis_status,
       FALSE AS model_ready
FROM (VALUES
 ('VELLORE_LEGACY','VELLORE','https://tnrd.tn.gov.in/policynotes/42--PN-RURAL-ENG-2022-23-WEB.pdf'),
 ('VELLORE_LEGACY','RANIPET','https://tnrd.tn.gov.in/policynotes/42--PN-RURAL-ENG-2022-23-WEB.pdf'),
 ('VELLORE_LEGACY','TIRUPATHUR','https://tnrd.tn.gov.in/policynotes/42--PN-RURAL-ENG-2022-23-WEB.pdf'),
 ('KANCHEEPURAM_LEGACY','KANCHEEPURAM','https://tnrd.tn.gov.in/policynotes/42--PN-RURAL-ENG-2022-23-WEB.pdf'),
 ('KANCHEEPURAM_LEGACY','CHENGALPATTU','https://tnrd.tn.gov.in/policynotes/42--PN-RURAL-ENG-2022-23-WEB.pdf'),
 ('TIRUNELVELI_LEGACY','TIRUNELVELI','https://www.tnurbantree.tn.gov.in/tenkasi/wp-content/uploads/sites/13/2020/06/TENKASI-DIST-GO.pdf'),
 ('TIRUNELVELI_LEGACY','TENKASI','https://www.tnurbantree.tn.gov.in/tenkasi/wp-content/uploads/sites/13/2020/06/TENKASI-DIST-GO.pdf'),
 ('NAGAPATTINAM_LEGACY','NAGAPATTINAM','https://mayiladuthurai.nic.in/'),
 ('NAGAPATTINAM_LEGACY','MYILADUTHURAI','https://mayiladuthurai.nic.in/')
) AS groups(group_id, member, evidence_url);

CREATE OR REPLACE VIEW research_review.tn_group_history AS
WITH member_counts AS (
 SELECT group_id, COUNT(*)::integer AS expected_members
 FROM research_review.tn_group_members GROUP BY group_id
)
SELECT r.source_sha256, m.group_id, r.year,
       SUM(r.total_accidents)::bigint AS total_accidents,
       SUM(r.total_deaths)::bigint AS total_deaths,
       COUNT(*)::integer AS members_present,
       mc.expected_members,
       (COUNT(*) = mc.expected_members) AS all_members_present,
       ARRAY_AGG(r.district_source_name ORDER BY r.district_source_name) AS observed_source_names,
       ARRAY_AGG(r.row_sha256 ORDER BY r.row_sha256) AS origin_row_sha256,
       ARRAY_AGG(DISTINCT r.source_url ORDER BY r.source_url) AS source_urls,
       'exploratory_only_unverified_reporting_geography'::text AS review_state,
       FALSE AS model_ready
FROM staging.tn_district_research_rows r
JOIN research_review.tn_group_members m ON m.member = r.district_normalized
JOIN member_counts mc ON mc.group_id = m.group_id
GROUP BY r.source_sha256, m.group_id, r.year, mc.expected_members;

CREATE OR REPLACE VIEW research_review.tn_individual_changes AS
WITH lagged AS (
 SELECT r.source_sha256, r.district_normalized AS candidate_id, r.year,
        r.total_accidents::bigint AS total_accidents,
        LAG(r.total_accidents) OVER (
          PARTITION BY r.source_sha256, r.district_normalized ORDER BY r.year
        )::bigint AS previous_accidents,
        LAG(r.year) OVER (
          PARTITION BY r.source_sha256, r.district_normalized ORDER BY r.year
        ) AS previous_year
 FROM staging.tn_district_research_rows r
)
SELECT *, CASE WHEN previous_year = year - 1 AND previous_accidents > 0
    THEN ROUND(100.0*(total_accidents-previous_accidents)/previous_accidents, 1)
    ELSE NULL END AS pct_change,
    (previous_year = year - 1 AND previous_accidents > 0
       AND ABS(100.0*(total_accidents-previous_accidents)/previous_accidents) >= 40)
       AS anomaly_40pct,
    FALSE AS model_ready
FROM lagged;

CREATE OR REPLACE VIEW research_review.tn_group_changes AS
WITH lagged AS (
 SELECT h.source_sha256, h.group_id AS candidate_id, h.year,
        h.total_accidents, h.all_members_present,
        LAG(h.total_accidents) OVER (
          PARTITION BY h.source_sha256, h.group_id ORDER BY h.year
        ) AS previous_accidents,
        LAG(h.year) OVER (
          PARTITION BY h.source_sha256, h.group_id ORDER BY h.year
        ) AS previous_year,
        LAG(h.all_members_present) OVER (
          PARTITION BY h.source_sha256, h.group_id ORDER BY h.year
        ) AS previous_all_members_present
 FROM research_review.tn_group_history h
)
SELECT *, CASE WHEN previous_year = year - 1 AND previous_accidents > 0
    THEN ROUND(100.0*(total_accidents-previous_accidents)/previous_accidents, 1)
    ELSE NULL END AS pct_change,
    (previous_year = year - 1 AND previous_accidents > 0
      AND ABS(100.0*(total_accidents-previous_accidents)/previous_accidents) >= 40)
      AS anomaly_40pct,
    FALSE AS model_ready
FROM lagged;

-- Compare sources without inventing a revised district allocation.
CREATE OR REPLACE VIEW research_review.tn_2024_revision AS
SELECT c.source_sha256, c.year, c.accident_sum AS booklet_accidents,
       c.death_sum AS booklet_deaths,
       67526::integer AS later_statewide_accidents,
       18449::integer AS later_statewide_deaths,
       (67526-c.accident_sum)::bigint AS accident_revision_gap,
       (18449-c.death_sum)::bigint AS death_revision_gap,
       c.booklet_source_url,
       'https://sansad.in/getFile/annex/270/AU2172_BvsIBX.pdf?source=pqars'::text AS later_report_url,
       (c.accident_sum <> 67526 OR c.death_sum <> 18449) AS revision_unresolved,
       TRUE AS district_allocation_missing,
       FALSE AS model_ready
FROM staging.tn_district_research_checks c WHERE c.year=2024;

-- A consolidated review register, NOT an approved model input view.
-- Lack of 40% anomalies never implies verified jurisdiction continuity.
CREATE OR REPLACE VIEW research_review.tn_forecast_eligibility AS
WITH candidate_counts AS (
 SELECT r.source_sha256, r.district_normalized AS candidate_id,
        'original_reporting_area'::text AS candidate_type,
        COUNT(*)::integer AS observed_years,
        MIN(r.year) AS first_year, MAX(r.year) AS last_year,
        COUNT(*) FILTER (WHERE r.year=2024)::integer AS has_2024,
        COUNT(*) FILTER (WHERE r.year BETWEEN 2016 AND 2024)::integer AS data_years,
        0::integer AS partial_group_years
 FROM staging.tn_district_research_rows r
 GROUP BY r.source_sha256, r.district_normalized
 UNION ALL
 SELECT g.source_sha256, g.group_id, 'exploratory_parent_group'::text,
        COUNT(*)::integer, MIN(g.year), MAX(g.year),
        COUNT(*) FILTER (WHERE g.year=2024)::integer,
        COUNT(*) FILTER (WHERE g.year BETWEEN 2016 AND 2024)::integer,
        COUNT(*) FILTER (WHERE NOT g.all_members_present)::integer
 FROM research_review.tn_group_history g
 GROUP BY g.source_sha256, g.group_id
), anomalies AS (
 SELECT source_sha256, candidate_id, 'original_reporting_area'::text AS candidate_type,
        COUNT(*) FILTER (WHERE anomaly_40pct)::integer AS anomaly_count
 FROM research_review.tn_individual_changes
 GROUP BY source_sha256, candidate_id
 UNION ALL
 SELECT source_sha256, candidate_id, 'exploratory_parent_group'::text,
        COUNT(*) FILTER (WHERE anomaly_40pct)::integer
 FROM research_review.tn_group_changes
 GROUP BY source_sha256, candidate_id
)
SELECT cc.source_sha256, cc.candidate_id, cc.candidate_type,
       cc.observed_years, cc.first_year, cc.last_year,
       (9-cc.data_years)::integer AS missing_years,
       cc.partial_group_years, a.anomaly_count,
       (cc.observed_years <> 9) AS incomplete_year_coverage,
       TRUE AS boundary_verification_required,
       COALESCE(rv.revision_unresolved, TRUE) AS source_revision_unresolved,
       FALSE AS model_ready,
       'blocked_pending_independent_boundary_and_revision_reconciliation'::text AS eligibility_status
FROM candidate_counts cc
JOIN anomalies a ON a.source_sha256=cc.source_sha256
 AND a.candidate_id=cc.candidate_id AND a.candidate_type=cc.candidate_type
LEFT JOIN research_review.tn_2024_revision rv ON rv.source_sha256=cc.source_sha256;
