"""Exercise experimental backtesting against the disposable PostgreSQL CI service."""
from hashlib import sha256
import os
import unittest

from ingestion.import_tn_district_research import DATA_PATH
from ingestion.backtest_tn_district_experiments import db_connection, run_backtest


@unittest.skipUnless(
    os.getenv("TN_RESEARCH_DB_TEST") == "1",
    "Never run against a database without an explicitly enabled disposable test flag",
)
class DistrictExperimentDatabaseTests(unittest.TestCase):
    def test_every_fold_remains_historical_quarantined_and_traceable(self):
        sha = sha256(DATA_PATH.read_bytes()).hexdigest()
        connection = db_connection(os.environ["DATABASE_URL"])
        try:
            report = run_backtest(connection, sha)
            cur = connection.cursor()
            cur.execute("""SELECT COUNT(*), COUNT(*) FILTER (WHERE model_ready)
                           FROM staging.tn_district_research_rows WHERE source_sha256=%s""", (sha,))
            total, approved = cur.fetchone()
            cur.execute("""SELECT COUNT(*) FILTER (WHERE model_ready),
                                  COUNT(*) FILTER (WHERE NOT model_ready)
                           FROM research_review.tn_forecast_eligibility
                           WHERE source_sha256=%s""", (sha,))
            gate_ready, gate_blocked = cur.fetchone()
            connection.rollback()
            cur.close()
        finally:
            connection.close()

        self.assertEqual((total, approved), (331, 0))
        self.assertEqual((gate_ready, gate_blocked), (0, 42))
        self.assertEqual(len(report["candidates"]), 42)
        self.assertFalse(report["model_ready"])
        self.assertFalse(report["forecast_published"])
        self.assertFalse(report["prediction_year_2026_created"])
        self.assertEqual(report["excluded_years"], [2024])
        self.assertTrue(report["rolling_origin_folds"])
        self.assertEqual(report["source_sha256"], sha)

        for f in report["rolling_origin_folds"]:
            self.assertLessEqual(f["target_year"], 2023)
            self.assertLess(f["origin_year"], f["target_year"])
            self.assertEqual(f["target_year"] - f["origin_year"], f["horizon"])
            self.assertLessEqual(max(f["training_years"]), f["origin_year"])
            self.assertTrue(f["training_source_row_sha256"])
            self.assertTrue(f["holdout_source_row_sha256"])
            self.assertFalse(f["model_ready"])
            self.assertEqual(f["source_sha256"], sha)
        self.assertTrue(any(f["horizon"] == 1 for f in report["rolling_origin_folds"]))
        self.assertTrue(any(f["horizon"] == 2 for f in report["rolling_origin_folds"]))
        self.assertTrue(all(not s["model_ready"] for s in report["aggregate_diagnostics"]))
        self.assertTrue(all(not c["model_ready"] for c in report["candidates"]))

        missing = {(g["candidate_id"], g["year"]) for g in report["grouped_partial_years_skipped"]}
        self.assertIn(("VELLORE_LEGACY", 2016), missing)
        self.assertIn(("NAGAPATTINAM_LEGACY", 2021), missing)
        # Four groups are hypotheses: 2016 missing members for three, and
        # Mayiladuthurai is missing in every 2016–2021 group year.
        self.assertEqual(len(missing), 9)
        self.assertFalse(any(f["candidate_id"] == "NAGAPATTINAM_LEGACY"
                             for f in report["rolling_origin_folds"]))
        self.assertEqual(report["source_revision_2024"]["accident_revision_gap"], 343)
        self.assertEqual(report["source_revision_2024"]["death_revision_gap"], 375)

    def test_invalid_batch_pin_fails_closed(self):
        connection = db_connection(os.environ["DATABASE_URL"])
        try:
            with self.assertRaisesRegex(ValueError, "source SHA"):
                run_backtest(connection, "0" * 64)
        finally:
            connection.close()


if __name__ == "__main__":
    unittest.main()
