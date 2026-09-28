from __future__ import annotations

import argparse
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "ingestion"))

from common import db_connection  # noqa: E402
from accidents_data_gov import run as run_accidents  # noqa: E402
from weather_imd import run as run_weather  # noqa: E402


def log_start(pipeline_name: str) -> int:
    with db_connection() as conn:
        cur = conn.cursor()
        try:
            cur.execute(
                """
                INSERT INTO analytics.pipeline_runs (pipeline_name, status)
                VALUES (%s, 'running')
                RETURNING id
                """,
                (pipeline_name,),
            )
            run_id = cur.fetchone()[0]
            conn.commit()
        finally:
            cur.close()
    return int(run_id)


def log_finish(run_id: int, status: str, records: int = 0, error: str | None = None) -> None:
    with db_connection() as conn:
        cur = conn.cursor()
        try:
            cur.execute(
                """
                UPDATE analytics.pipeline_runs
                SET status = %s,
                    records_processed = %s,
                    error_message = %s,
                    completed_at = NOW()
                WHERE id = %s
                """,
                (status, records, error, run_id),
            )
            conn.commit()
        finally:
            cur.close()


def execute(name: str, fn) -> None:
    run_id = log_start(name)
    try:
        result = fn()
        records = result if isinstance(result, int) else 1
        log_finish(run_id, "success", records=records)
        print(f"{name}: success ({records} records)")
    except Exception as exc:
        log_finish(run_id, "failed", error=str(exc))
        raise


def main() -> None:
    parser = argparse.ArgumentParser(description="Run UrbanPulse ingestion pipelines")
    parser.add_argument(
        "--source",
        choices=["weather", "accidents", "all"],
        default="all",
    )
    args = parser.parse_args()

    if args.source in ("weather", "all"):
        execute("imd_current_weather", run_weather)
    if args.source in ("accidents", "all"):
        execute("data_gov_road_accidents", run_accidents)


if __name__ == "__main__":
    main()
