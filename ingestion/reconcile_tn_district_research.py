"""UrbanPulse Phase 2: read-only district reconciliation report.

Data remains in Phase 1 staging, unmodified. The only optional DB change,
--install-views, creates or replaces views in the new research_review schema.
The default mode executes SELECT only and writes a JSON review report to
stdout (and optionally a local file), never to analytics or ML tables.

Examples from repo root:
  python ingestion/reconcile_tn_district_research.py --install-views
  python ingestion/reconcile_tn_district_research.py --output reports/tn_review.json
  python ingestion/reconcile_tn_district_research.py --source-sha <sha>
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
from typing import Any
from urllib.parse import unquote, urlparse

SCHEMA_PATH = Path(__file__).resolve().parents[1] / "sql/23_tn_district_reconciliation_views.sql"
EXPECTED_GROUPS = {
    "VELLORE_LEGACY",
    "KANCHEEPURAM_LEGACY",
    "TIRUNELVELI_LEGACY",
    "NAGAPATTINAM_LEGACY",
}
REVIEW_SCHEMA = "research_review"
SOURCE_REVISION_URL = "https://sansad.in/getFile/annex/270/AU2172_BvsIBX.pdf?source=pqars"


def flag_change(previous: int | None, current: int, previous_year: int | None, year: int) -> dict:
    """A 40%-threshold flag is a review trigger, NEVER evidence of bad data."""
    if previous is None or previous_year != year - 1 or previous <= 0:
        return {"pct_change": None, "anomaly_40pct": False}
    percent = round(100.0 * (current - previous) / previous, 1)
    return {"pct_change": percent, "anomaly_40pct": abs(100.0 * (current - previous) / previous) >= 40}


def investigation_tags(candidate_id: str, year: int, anomaly_40pct: bool) -> list[str]:
    tags: list[str] = []
    if year == 2017 and candidate_id in {"VELLORE", "KANCHEEPURAM", "TIRUNELVELI"}:
        tags.append("2017_source_lists_newer_district_labels_before_2019_formation")
    if year == 2022 and candidate_id in {"THIRUVALLUR", "CHENGALPATTU", "KANCHEEPURAM_LEGACY"}:
        tags.append("2022_reporting_change_or_real_growth_unresolved")
    if year == 2022 and candidate_id in {"NAGAPATTINAM", "NAGAPATTINAM_LEGACY"}:
        tags.append("mayiladuthurai_first_separately_reported_in_2022")
    if year in {2020, 2021}:
        tags.append("covid_period_traffic_exposure_may_differ")
    if year == 2024:
        tags.append("2024_statewide_revision_not_allocated_to_districts")
    if anomaly_40pct:
        tags.append("year_over_year_change_at_least_40pct")
    return tags


def evaluate_gate(row: dict) -> dict:
    """No implicit promotion, even when nine years and no anomalies are present."""
    reasons = ["district_reporting_boundary_equivalence_unverified", "2024_revised_district_allocation_unavailable"]
    if row["incomplete_year_coverage"]:
        reasons.append("fewer_than_nine_observed_years")
    if row["partial_group_years"]:
        reasons.append("group_components_missing_for_some_years")
    if row["anomaly_count"]:
        reasons.append("large_year_over_year_change_requires_investigation")
    if row["candidate_type"] == "exploratory_parent_group":
        reasons.append("parent_child_grouping_hypothesis_not_geospatially_verified")
    return {
        **row,
        "model_ready": False,
        "eligibility_status": "blocked_pending_independent_boundary_and_revision_reconciliation",
        "blocking_reasons": reasons,
    }


def db_connection(db_url: str):
    try:
        import pg8000.dbapi
    except ImportError as exc:
        raise RuntimeError("Install ingestion/requirements.txt before connecting to PostgreSQL") from exc
    url = urlparse(db_url)
    if url.scheme not in {"postgresql", "postgresql+pg8000"} or not url.hostname:
        raise ValueError("DATABASE_URL must specify a PostgreSQL hostname")
    if not url.username or not url.path.strip("/"):
        raise ValueError("DATABASE_URL must include a database and user")
    return pg8000.dbapi.connect(
        host=url.hostname, port=url.port or 5432,
        database=url.path.lstrip("/"), user=unquote(url.username),
        password=unquote(url.password or ""),
    )


def execute_read(cursor, sql: str, params: tuple = ()) -> list[dict]:
    # Only vetted constant SELECT statements are ever called here.
    cursor.execute(sql, params)
    names = [col[0] for col in cursor.description]
    return [dict(zip(names, tuple(row))) for row in cursor.fetchall()]


def install_views(connection) -> None:
    statements = [x.strip() for x in SCHEMA_PATH.read_text(encoding="utf-8").split(";") if x.strip()]
    # Fail closed if someone extends this DDL file with INSERT/UPDATE/DELETE etc.
    for statement in statements:
        substantive = "\n".join(
            ln for ln in statement.splitlines() if not ln.lstrip().startswith("--")
        ).strip()
        if not re.match(r"^CREATE\s+(?:SCHEMA\s+IF\s+NOT\s+EXISTS|OR\s+REPLACE\s+VIEW)\b", substantive, re.I):
            raise ValueError("Phase 2 migrations may only create the isolated schema and its review views")
        if "research_review." not in substantive and not substantive.upper().startswith("CREATE SCHEMA IF NOT EXISTS RESEARCH_REVIEW"):
            raise ValueError("Refusing a migration outside research_review")
    cursor = connection.cursor()
    try:
        for statement in statements:
            cursor.execute(statement)
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()


def report_from_db(connection, source_sha: str | None = None) -> dict[str, Any]:
    cursor = connection.cursor()
    try:
        cursor.execute("SET TRANSACTION READ ONLY")
        versions = execute_read(cursor, """
            SELECT source_sha256, row_count, year_first, year_last, review_state, model_ready
            FROM staging.tn_district_research_imports ORDER BY imported_at, source_sha256
        """)
        if source_sha:
            chosen = [v for v in versions if v["source_sha256"] == source_sha]
            if len(chosen) != 1:
                raise ValueError("Requested research source SHA not found")
        elif len(versions) == 1:
            chosen = versions
        else:
            raise ValueError("Expected exactly one imported source version; pass --source-sha to select one")
        version = chosen[0]
        if version["model_ready"] is not False or version["review_state"] != "quarantined":
            raise ValueError("Research source has unexpectedly been approved for ML")
        sha = version["source_sha256"]
        checks = execute_read(cursor, """
            SELECT year, row_count, accident_sum, death_sum,
                   booklet_accident_total, booklet_source_url,
                   boundary_review_required, source_revision_review_required
            FROM staging.tn_district_research_checks
            WHERE source_sha256=%s ORDER BY year
        """, (sha,))
        actuals = execute_read(cursor, """
            SELECT year, COUNT(*)::integer AS row_count,
                   SUM(total_accidents)::bigint AS accident_sum,
                   SUM(total_deaths)::bigint AS death_sum,
                   BOOL_AND(NOT model_ready AND NOT is_ml_prediction) AS all_quarantined
            FROM staging.tn_district_research_rows
            WHERE source_sha256=%s GROUP BY year ORDER BY year
        """, (sha,))
        if len(checks) != 9 or len(actuals) != 9 or sum(r["row_count"] for r in actuals) != version["row_count"]:
            raise ValueError("Missing or unexpected staged observations / manifest years")
        for a, c in zip(actuals, checks):
            if not (a["year"] == c["year"] and a["row_count"] == c["row_count"]
                    and a["accident_sum"] == c["accident_sum"] == c["booklet_accident_total"]
                    and a["death_sum"] == c["death_sum"]
                    and a["all_quarantined"] is True and c["boundary_review_required"] is True):
                raise ValueError(f"Stored provenance / row total mismatch for {a['year']}")
        groups = execute_read(cursor, """
            SELECT source_sha256, group_id, year, total_accidents, total_deaths,
                   members_present, expected_members, all_members_present,
                   observed_source_names, origin_row_sha256, source_urls,
                   review_state, model_ready
            FROM research_review.tn_group_history
            WHERE source_sha256=%s ORDER BY group_id, year
        """, (sha,))
        if {x["group_id"] for x in groups} != EXPECTED_GROUPS:
            raise ValueError("Missing or unexpected exploratory parent grouping")
        if len(groups) != 36 or any(x["model_ready"] is not False for x in groups):
            raise ValueError("Expected four quarantined groups across all nine years")

        anomalies = execute_read(cursor, """
            SELECT 'original_reporting_area'::text AS kind, candidate_id, year,
                   previous_year, previous_accidents, total_accidents,
                   pct_change, anomaly_40pct, model_ready
            FROM research_review.tn_individual_changes
            WHERE source_sha256=%s AND anomaly_40pct
            UNION ALL
            SELECT 'exploratory_parent_group'::text, candidate_id, year,
                   previous_year, previous_accidents, total_accidents,
                   pct_change, anomaly_40pct, model_ready
            FROM research_review.tn_group_changes
            WHERE source_sha256=%s AND anomaly_40pct
            ORDER BY kind, candidate_id, year
        """, (sha, sha))
        for row in anomalies:
            computed = flag_change(row["previous_accidents"], row["total_accidents"], row["previous_year"], row["year"])
            if not computed["anomaly_40pct"] or row["model_ready"] is not False:
                raise ValueError("Anomaly rule and database view are inconsistent")
            row["investigation_tags"] = investigation_tags(row["candidate_id"], row["year"], True)

        revision = execute_read(cursor, """
            SELECT year, booklet_accidents, booklet_deaths,
                   later_statewide_accidents, later_statewide_deaths,
                   accident_revision_gap, death_revision_gap,
                   booklet_source_url, later_report_url, revision_unresolved,
                   district_allocation_missing, model_ready
            FROM research_review.tn_2024_revision WHERE source_sha256=%s
        """, (sha,))
        if len(revision) != 1 or revision[0]["year"] != 2024 or \
            (revision[0]["accident_revision_gap"], revision[0]["death_revision_gap"]) != (343, 375) or \
            revision[0]["model_ready"] is not False:
            raise ValueError("2024 revision check is not in the expected unresolved state")
        eligibility = execute_read(cursor, """
            SELECT source_sha256, candidate_id, candidate_type, observed_years,
                   first_year, last_year, missing_years, partial_group_years,
                   anomaly_count, incomplete_year_coverage,
                   boundary_verification_required, source_revision_unresolved,
                   model_ready, eligibility_status
            FROM research_review.tn_forecast_eligibility
            WHERE source_sha256=%s ORDER BY candidate_type, candidate_id
        """, (sha,))
        if not eligibility or any(
            v["model_ready"] is not False or not v["boundary_verification_required"]
            or not v["source_revision_unresolved"] for v in eligibility
        ):
            raise ValueError("Forecast eligibility quarantine unexpectedly lifted")
        eligibility = [evaluate_gate(e) for e in eligibility]
        return {
            "phase": 2,
            "generated_at_utc": datetime.now(timezone.utc).isoformat(),
            "source_sha256": sha,
            "review_state": "investigation_only",
            "model_ready": False,
            "data_rows": version["row_count"],
            "annual_validation": checks,
            "exploratory_group_history": groups,
            "change_flags": anomalies,
            "revision_2024": revision[0],
            "forecast_eligibility": eligibility,
            "investigations": [
                {
                    "id": "2017_retrospective_reporting",
                    "evidence": "https://tnrd.tn.gov.in/policynotes/42--PN-RURAL-ENG-2022-23-WEB.pdf",
                    "finding": "Five later-formed administrative districts appear separately in the 2017 accident source",
                    "unresolved": "Whether old police reporting geography matches later administrative boundaries",
                },
                {
                    "id": "mayiladuthurai_2022_first_row",
                    "evidence": "https://mayiladuthurai.nic.in/",
                    "finding": "Government district formation dated 28 December 2020; separate accident reporting begins only in 2022 extract",
                    "unresolved": "Accident-report geographic treatment of Nagapattinam during 2020–2021",
                },
                {
                    "id": "kancheepuram_thiruvallur_2022_shift",
                    "evidence": "https://tnsta.gov.in/pdfpage/pdfpage_tn_2ratnSA_2023_07_25.pdf",
                    "finding": "2022 counts rise sharply for Thiruvallur and the exploratory Kancheepuram grouping",
                    "unresolved": "Transport report reporting-unit change versus real changes in collision exposure",
                },
                {
                    "id": "national_2024_revision",
                    "evidence": SOURCE_REVISION_URL,
                    "finding": "2024 state totals differ from older district booklet totals",
                    "unresolved": "No authenticated district-level allocation of the later revision",
                },
            ],
            "next_gate": "Independent reporting-geometry crosswalk, source revision resolution, and documented human sign-off before any chronological model backtest",
        }
    finally:
        connection.rollback()  # Ends SELECT-only transaction without persisting anything
        cursor.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--install-views", action="store_true",
                        help="Create/replace only research_review schema views (no data table writes)")
    parser.add_argument("--source-sha", help="Explicit full batch SHA-256 when multiple research versions exist")
    parser.add_argument("--output", type=Path,
                        help="Optional local JSON report; use a bind mount if running through Docker")
    args = parser.parse_args()
    if args.source_sha and not re.fullmatch(r"[a-f0-9]{64}", args.source_sha):
        parser.error("--source-sha must be the complete lowercase SHA-256")
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        parser.error("DATABASE_URL is required to read the research staging database")
    connection = db_connection(database_url)
    try:
        if args.install_views:
            install_views(connection)
        report = report_from_db(connection, args.source_sha)
    finally:
        connection.close()
    rendered = json.dumps(report, indent=2, ensure_ascii=False, default=str) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered, encoding="utf-8")
        print(json.dumps({
            "saved_to": str(args.output), "data_rows": report["data_rows"],
            "group_year_rows": len(report["exploratory_group_history"]),
            "anomalies": len(report["change_flags"]),
            "eligibility_candidates": len(report["forecast_eligibility"]),
            "model_ready": False,
        }, indent=2))
    else:
        print(rendered, end="")


if __name__ == "__main__":
    main()
