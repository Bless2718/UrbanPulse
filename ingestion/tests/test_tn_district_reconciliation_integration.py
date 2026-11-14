"""Integration test: Phase 2 review views over disposable PostgreSQL import."""
from hashlib import sha256
import os
import unittest

from ingestion.import_tn_district_research import DATA_PATH
from ingestion.reconcile_tn_district_research import db_connection, report_from_db


@unittest.skipUnless(
    os.getenv("TN_RESEARCH_DB_TEST") == "1",
    "Run only against an expressly enabled disposable PostgreSQL CI database",
)
class ReconciliationReviewIntegrationTests(unittest.TestCase):
    def test_review_only_views_and_all_forecast_gates_blocked(self):
        sha = sha256(DATA_PATH.read_bytes()).hexdigest()
        conn = db_connection(os.environ["DATABASE_URL"])
        try:
            report = report_from_db(conn, sha)
        finally:
            conn.close()
        self.assertEqual(report["source_sha256"], sha)
        self.assertEqual(report["data_rows"], 331)
        self.assertFalse(report["model_ready"])
        self.assertEqual(len(report["annual_validation"]), 9)
        self.assertEqual(len(report["exploratory_group_history"]), 36)
        self.assertEqual(len(report["forecast_eligibility"]), 42)  # 38 names + 4 groups
        self.assertTrue(all(not r["model_ready"] for r in report["forecast_eligibility"]))
        self.assertTrue(all(r["boundary_verification_required"]
                            for r in report["forecast_eligibility"]))

        grouped = {
            (r["group_id"], r["year"]): r
            for r in report["exploratory_group_history"]
        }
        self.assertEqual(grouped[("VELLORE_LEGACY", 2016)]["total_accidents"], 3245)
        self.assertEqual(grouped[("VELLORE_LEGACY", 2017)]["total_accidents"], 2915)
        self.assertFalse(grouped[("VELLORE_LEGACY", 2016)]["all_members_present"])
        self.assertTrue(grouped[("VELLORE_LEGACY", 2017)]["all_members_present"])
        self.assertEqual(grouped[("KANCHEEPURAM_LEGACY", 2021)]["total_accidents"], 2524)
        self.assertEqual(grouped[("KANCHEEPURAM_LEGACY", 2022)]["total_accidents"], 4055)
        self.assertEqual(grouped[("NAGAPATTINAM_LEGACY", 2021)]["total_accidents"], 1024)
        self.assertEqual(grouped[("NAGAPATTINAM_LEGACY", 2022)]["total_accidents"], 1252)
        self.assertFalse(grouped[("NAGAPATTINAM_LEGACY", 2021)]["all_members_present"])
        self.assertTrue(grouped[("NAGAPATTINAM_LEGACY", 2022)]["all_members_present"])

        anomalies = report["change_flags"]
        self.assertTrue(any(r["kind"] == "original_reporting_area"
                            and r["candidate_id"] == "THIRUVALLUR"
                            and r["year"] == 2022 for r in anomalies))
        self.assertTrue(any(r["kind"] == "exploratory_parent_group"
                            and r["candidate_id"] == "KANCHEEPURAM_LEGACY"
                            and r["year"] == 2022 for r in anomalies))
        self.assertFalse(any(r["candidate_id"] == "VELLORE_LEGACY"
                             and r["year"] == 2017 for r in anomalies))

        rev = report["revision_2024"]
        self.assertEqual(rev["accident_revision_gap"], 343)
        self.assertEqual(rev["death_revision_gap"], 375)
        self.assertTrue(rev["revision_unresolved"])
        self.assertTrue(rev["district_allocation_missing"])
        self.assertFalse(rev["model_ready"])

        conn = db_connection(os.environ["DATABASE_URL"])
        cur = conn.cursor()
        try:
            # Disposable DB has no analytics tables and no accidental writes.
            cur.execute("""SELECT to_regclass('analytics.tn_district_accidents'),
                                  to_regclass('analytics.tn_annual_accidents'),
                                  to_regclass('analytics.tn_statewide_forecasts')""")
            self.assertEqual(tuple(cur.fetchone()), (None, None, None))
            cur.execute("""SELECT count(*) FROM information_schema.tables
                           WHERE table_schema = 'research_review'
                             AND table_type = 'BASE TABLE'""")
            self.assertEqual(cur.fetchone()[0], 0)
            conn.rollback()
        finally:
            cur.close()
            conn.close()


if __name__ == "__main__":
    unittest.main()
