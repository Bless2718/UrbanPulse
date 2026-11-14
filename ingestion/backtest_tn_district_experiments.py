"""UrbanPulse Phase 3 — offline, research-only annual accident backtests.

An experiment is *not* a deployable prediction. The 2016–2024 source remains
quarantined: 2024 is excluded entirely; no 2026 forecasts are generated; no
production or training tables are written; all output says model_ready=False.

Run:
  python ingestion/backtest_tn_district_experiments.py --output /app/reports/district_backtest.json
"""
from __future__ import annotations

import argparse
from collections import defaultdict
from datetime import datetime, timezone
import json
import math
import os
from pathlib import Path
import re
import sys
from typing import Any

# Support both python -m ingestion.backtest... and python ingestion/backtest... .
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ingestion.reconcile_tn_district_research import db_connection, execute_read

METHODS = ("persistence", "moving_average_3", "linear_drift")
HORIZONS = (1, 2)
MIN_TRAIN_YEARS = 4
LAST_REVIEW_YEAR = 2023
EXPECTED_STAGING_ROWS = 331
EXPECTED_CANDIDATES = 42
SOURCE_VALIDATION = "quarantined_source_unverified_reporting_boundaries"
EXPERIMENT_LABEL = "RESEARCH_DIAGNOSTIC_NOT_A_DEPLOYABLE_FORECAST"


def predict(method: str, training: list[tuple[int, int]], horizon: int) -> float:
    """Predict from the chronological training prefix ONLY."""
    if horizon not in HORIZONS:
        raise ValueError("Only one- and two-year historical horizons are supported")
    if len(training) < MIN_TRAIN_YEARS:
        raise ValueError("Not enough annual data to evaluate")
    years = [year for year, _ in training]
    if len(set(years)) != len(years) or any(b != a + 1 for a, b in zip(years, years[1:])):
        raise ValueError("Training prefix must consist of consecutive distinct years")
    values = [float(value) for _, value in training]
    if any(not math.isfinite(v) or v < 0 for v in values):
        raise ValueError("Training counts must be finite nonnegative observations")
    if method == "persistence":
        forecast = values[-1]
    elif method == "moving_average_3":
        forecast = sum(values[-3:]) / 3
    elif method == "linear_drift":
        # Deterministic least-squares slope on the trailing 4 annual observations.
        # A h=2 prediction is made directly from the origin, not from true h=1.
        recent = values[-4:]
        x = (0.0, 1.0, 2.0, 3.0)
        mean_x = 1.5
        mean_y = sum(recent) / 4
        slope = sum((xi - mean_x) * (yi - mean_y) for xi, yi in zip(x, recent)) / 5.0
        forecast = mean_y + slope * (3 + horizon - mean_x)
    else:
        raise ValueError(f"Unsupported method: {method}")
    return round(max(0.0, forecast), 2)


def metrics(folds: list[dict]) -> dict:
    if not folds:
        return {"folds": 0, "mae": None, "rmse": None, "wape_percent": None}
    errors = [float(f["prediction"]) - float(f["actual"]) for f in folds]
    absolute = sum(abs(error) for error in errors)
    actual_sum = sum(float(f["actual"]) for f in folds)
    return {
        "folds": len(folds),
        "mae": round(absolute / len(folds), 2),
        "rmse": round(math.sqrt(sum(e * e for e in errors) / len(folds)), 2),
        "wape_percent": round(100 * absolute / actual_sum, 2) if actual_sum > 0 else None,
    }


def evaluate_series(
    *,
    source_sha: str,
    candidate_id: str,
    candidate_type: str,
    observations: list[dict],
) -> tuple[list[dict], dict]:
    """Rolling-origin tests; all historical target values stay out of training."""
    if not re.fullmatch(r"[a-f0-9]{64}", source_sha):
        raise ValueError("Research source batch hash invalid")
    if candidate_type not in {"original_reporting_area", "exploratory_parent_group"}:
        raise ValueError("Unsupported candidate kind")
    observations = sorted(observations, key=lambda o: o["year"])
    if len({o["year"] for o in observations}) != len(observations):
        raise ValueError(f"Duplicate year in candidate {candidate_id}")
    if any(o.get("model_ready") is not False for o in observations):
        raise ValueError("Refusing any data promoted to model-ready")
    if any(o["year"] >= 2024 for o in observations):
        raise ValueError("Phase 3 accepts no 2024 or future rows")
    if any(o["count"] < 0 for o in observations):
        raise ValueError("Accident counts cannot be negative")
    # A partial parent group-year is not a like-for-like observation.
    if candidate_type == "exploratory_parent_group" and any(
        o.get("all_members_present") is not True for o in observations
    ):
        raise ValueError("Partial group-year must be filtered before model evaluation")
    for obs in observations:
        hashes = obs["row_sha256"]
        if not hashes or any(not re.fullmatch(r"[a-f0-9]{64}", h) for h in hashes):
            raise ValueError("Every original observation needs its provenance row hash")
    index = {o["year"]: o for o in observations}
    folds: list[dict] = []
    # Build a fresh training window from each origin, never using values beyond it.
    for origin in sorted(index):
        for horizon in HORIZONS:
            target = origin + horizon
            if target > LAST_REVIEW_YEAR or target not in index:
                continue
            # Require a COMPLETE consecutive history from first observed year.
            # A missing historical member or year breaks the prefix: no stitching.
            contiguous: list[dict] = [index[origin]]
            year = origin - 1
            while year in index:
                contiguous.insert(0, index[year])
                year -= 1
            if len(contiguous) < MIN_TRAIN_YEARS:
                continue
            # Ensure target is a real observed holdout, and is not used in training.
            train_pairs = [(r["year"], r["count"]) for r in contiguous]
            truth = index[target]
            for method in METHODS:
                value = predict(method, train_pairs, horizon)
                folds.append({
                    "source_sha256": source_sha,
                    "candidate_id": candidate_id,
                    "candidate_type": candidate_type,
                    "origin_year": origin,
                    "target_year": target,
                    "horizon": horizon,
                    "method": method,
                    "training_years": [r["year"] for r in contiguous],
                    "training_source_row_sha256": [h for r in contiguous for h in r["row_sha256"]],
                    "holdout_source_row_sha256": truth["row_sha256"],
                    "actual": truth["count"],
                    "prediction": value,
                    "absolute_error": round(abs(value - truth["count"]), 2),
                    "model_ready": False,
                    "label": EXPERIMENT_LABEL,
                    "warnings": [
                        "historical_reporting_geometry_not_verified",
                        "2024_excluded_due_to_unresolved_statewide_revision",
                        "no_2026_prediction_or_production_model",
                    ],
                })
    brief = {
        "candidate_id": candidate_id,
        "candidate_type": candidate_type,
        "observed_2016_2023_years": len(observations),
        "included_years": [o["year"] for o in observations],
        "folds": len(folds),
        "evaluated": bool(folds),
        "model_ready": False,
        "eligibility_status": "blocked_pending_independent_boundary_and_revision_reconciliation",
        "reason_if_unscored": None if folds else "insufficient_consecutive_historical_training_and_holdout_years",
    }
    return folds, brief


def summarize(folds: list[dict]) -> list[dict]:
    buckets: dict[tuple, list[dict]] = defaultdict(list)
    for fold in folds:
        buckets[(fold["candidate_type"], fold["horizon"], fold["method"])].append(fold)
    return [
        {
            "candidate_type": candidate_type,
            "horizon": horizon,
            "method": method,
            **metrics(bucket),
            "source_caution": SOURCE_VALIDATION,
            "model_ready": False,
        }
        for (candidate_type, horizon, method), bucket in sorted(buckets.items())
    ]


def run_backtest(connection, requested_sha: str | None = None) -> dict[str, Any]:
    cursor = connection.cursor()
    try:
        cursor.execute("SET TRANSACTION READ ONLY")
        versions = execute_read(cursor, """
            SELECT source_sha256, row_count, review_state, model_ready
            FROM staging.tn_district_research_imports
            ORDER BY source_sha256
        """)
        if requested_sha:
            chosen = [v for v in versions if v["source_sha256"] == requested_sha]
            if len(chosen) != 1:
                raise ValueError("Requested source SHA is not imported")
        elif len(versions) == 1:
            chosen = versions
        else:
            raise ValueError("Ambiguous research sources: pass --source-sha")
        version = chosen[0]
        sha = version["source_sha256"]
        if version["row_count"] != EXPECTED_STAGING_ROWS or version["model_ready"] is not False or version["review_state"] != "quarantined":
            raise ValueError("Unexpected source version or unauthorized source approval")

        # Phase 2 gates remain hard-blocked. We conduct diagnostics ON the
        # quarantined histories, never convert these into approved training data.
        eligible = execute_read(cursor, """
            SELECT candidate_id, candidate_type, model_ready,
                   boundary_verification_required, source_revision_unresolved
            FROM research_review.tn_forecast_eligibility
            WHERE source_sha256=%s ORDER BY candidate_type, candidate_id
        """, (sha,))
        if len(eligible) != EXPECTED_CANDIDATES or any(
            r["model_ready"] is not False or
            r["boundary_verification_required"] is not True or
            r["source_revision_unresolved"] is not True
            for r in eligible
        ):
            raise ValueError("Research eligibility gate unexpectedly changed")
        gate_keys = {(r["candidate_type"], r["candidate_id"]) for r in eligible}
        if len(gate_keys) != EXPECTED_CANDIDATES:
            raise ValueError("Duplicate candidate from eligibility gate")

        rev = execute_read(cursor, """
            SELECT accident_revision_gap, death_revision_gap, revision_unresolved, model_ready
            FROM research_review.tn_2024_revision WHERE source_sha256=%s
        """, (sha,))
        if len(rev) != 1 or rev[0]["accident_revision_gap"] != 343 or rev[0]["death_revision_gap"] != 375 or \
                rev[0]["revision_unresolved"] is not True or rev[0]["model_ready"] is not False:
            raise ValueError("2024 data revision not flagged as unresolved")

        originals = execute_read(cursor, """
            SELECT district_normalized AS candidate_id, year, total_accidents AS count,
                   row_sha256, source_url, source_page, model_ready, is_ml_prediction
            FROM staging.tn_district_research_rows
            WHERE source_sha256=%s AND year<=2023
            ORDER BY district_normalized, year
        """, (sha,))
        group = execute_read(cursor, """
            SELECT group_id AS candidate_id, year, total_accidents AS count,
                   origin_row_sha256 AS row_hashes, all_members_present,
                   model_ready, source_urls
            FROM research_review.tn_group_history
            WHERE source_sha256=%s AND year<=2023
            ORDER BY group_id, year
        """, (sha,))
        if any(r["model_ready"] is not False or r["is_ml_prediction"] is not False for r in originals):
            raise ValueError("Invalid research record flags")
        if any(g["model_ready"] is not False for g in group):
            raise ValueError("Group eligibility unexpectedly changed")

        histories: dict[tuple, list[dict]] = defaultdict(list)
        for r in originals:
            key = ("original_reporting_area", r["candidate_id"])
            if key not in gate_keys:
                raise ValueError("Source district missing from eligibility manifest")
            histories[key].append({
                "year": r["year"], "count": r["count"],
                "row_sha256": [r["row_sha256"]], "model_ready": False
            })
        dropped_group_years = []
        for g in group:
            key = ("exploratory_parent_group", g["candidate_id"])
            if key not in gate_keys:
                raise ValueError("Group missing from eligibility manifest")
            if g["all_members_present"] is not True:
                dropped_group_years.append({"candidate_id": g["candidate_id"], "year": g["year"],
                                            "reason": "not_all_parent_child_members_reported"})
                continue
            histories[key].append({
                "year": g["year"], "count": g["count"],
                "row_sha256": g["row_hashes"], "model_ready": False,
                "all_members_present": True
            })
        all_folds: list[dict] = []
        candidates: list[dict] = []
        for candidate_type, candidate_id in sorted(gate_keys):
            result, brief = evaluate_series(
                source_sha=sha, candidate_id=candidate_id, candidate_type=candidate_type,
                observations=histories.get((candidate_type, candidate_id), []),
            )
            all_folds.extend(result)
            candidates.append(brief)
        if not all_folds or any(f["target_year"] >= 2024 or f["origin_year"] >= f["target_year"]
                                or max(f["training_years"]) >= f["target_year"] for f in all_folds):
            raise ValueError("Chronological holdout validation failed")
        return {
            "phase": 3,
            "generated_at_utc": datetime.now(timezone.utc).isoformat(),
            "source_sha256": sha,
            "label": EXPERIMENT_LABEL,
            "model_ready": False,
            "forecast_published": False,
            "prediction_year_2026_created": False,
            "methods": list(METHODS),
            "horizons": list(HORIZONS),
            "min_training_years": MIN_TRAIN_YEARS,
            "last_eligible_holdout_year": LAST_REVIEW_YEAR,
            "excluded_years": [2024],
            "source_revision_2024": rev[0],
            "source_caution": SOURCE_VALIDATION,
            "grouped_partial_years_skipped": dropped_group_years,
            "candidates": candidates,
            "aggregate_diagnostics": summarize(all_folds),
            "rolling_origin_folds": all_folds,
            "warnings": [
                "Research-only retrospective diagnostics, NOT certified forecast accuracy.",
                "All original and grouped series have unverified accident-reporting boundaries.",
                "The 2024 district booklet does not reconcile to later statewide figures; it was excluded.",
                "Small yearly samples, reporting changes and COVID-era exposure shifts can dominate metrics.",
                "No candidate is approved or exposed by the production forecasting API or web frontend.",
            ],
        }
    finally:
        connection.rollback()
        cursor.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-sha", help="Specific quarantined import SHA-256 (required for multiple batches)")
    parser.add_argument("--output", type=Path, help="Optional local JSON file; otherwise print full JSON to stdout")
    args = parser.parse_args()
    if args.source_sha and not re.fullmatch(r"[a-f0-9]{64}", args.source_sha):
        parser.error("--source-sha must be the exact 64-character lowercase hexadecimal SHA-256")
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        parser.error("DATABASE_URL is required")
    connection = db_connection(db_url)
    try:
        report = run_backtest(connection, args.source_sha)
    finally:
        connection.close()
    contents = json.dumps(report, indent=2, default=str) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(contents, encoding="utf-8")
        print(json.dumps({
            "saved_to": str(args.output),
            "historical_folds": len(report["rolling_origin_folds"]),
            "candidates": len(report["candidates"]),
            "model_ready": False,
            "forecast_published": False,
        }, indent=2))
    else:
        print(contents, end="")


if __name__ == "__main__":
    main()
