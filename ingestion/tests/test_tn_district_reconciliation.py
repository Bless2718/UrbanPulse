"""Pure, offline tests for Phase 2 reporting rules (no external database)."""
import unittest
from ingestion.reconcile_tn_district_research import (
    EXPECTED_GROUPS, evaluate_gate, flag_change, investigation_tags,
)


class ReconciliationReviewUnitTests(unittest.TestCase):
    def test_2017_individual_drop_is_flagged(self):
        row = flag_change(3245, 1069, 2016, 2017)
        self.assertEqual(row["pct_change"], -67.1)
        self.assertTrue(row["anomaly_40pct"])

    def test_grouped_2017_vellore_less_extreme(self):
        row = flag_change(3245, 2915, 2016, 2017)
        self.assertEqual(row["pct_change"], -10.2)
        self.assertFalse(row["anomaly_40pct"])

    def test_2022_kancheepuram_group_remains_large_jump(self):
        row = flag_change(2524, 4055, 2021, 2022)
        self.assertEqual(row["pct_change"], 60.7)
        self.assertTrue(row["anomaly_40pct"])

    def test_2022_thiruvallur_individual_spike(self):
        row = flag_change(1274, 2595, 2021, 2022)
        self.assertEqual(row["pct_change"], 103.7)
        self.assertTrue(row["anomaly_40pct"])

    def test_missing_previous_year_is_not_accident_zero(self):
        self.assertEqual(flag_change(None, 771, None, 2023),
                         {"pct_change": None, "anomaly_40pct": False})
        self.assertIsNone(flag_change(0, 771, 2022, 2023)["pct_change"])
        self.assertIsNone(flag_change(500, 771, 2020, 2023)["pct_change"])

    def test_no_forecasting_promotion_with_complete_history(self):
        complete = {
            "candidate_id": "SAMPLE",
            "candidate_type": "original_reporting_area",
            "observed_years": 9,
            "incomplete_year_coverage": False,
            "partial_group_years": 0,
            "anomaly_count": 0,
            "model_ready": False,
        }
        result = evaluate_gate(complete)
        self.assertFalse(result["model_ready"])
        self.assertEqual(result["eligibility_status"],
                         "blocked_pending_independent_boundary_and_revision_reconciliation")
        self.assertIn("2024_revised_district_allocation_unavailable", result["blocking_reasons"])

    def test_short_group_history_adds_both_reasons(self):
        row = evaluate_gate({
            "candidate_id": "NAGAPATTINAM_LEGACY",
            "candidate_type": "exploratory_parent_group",
            "observed_years": 9,
            "incomplete_year_coverage": False,
            "partial_group_years": 6,
            "anomaly_count": 1,
            "model_ready": False,
        })
        self.assertFalse(row["model_ready"])
        self.assertIn("group_components_missing_for_some_years", row["blocking_reasons"])
        self.assertIn("parent_child_grouping_hypothesis_not_geospatially_verified", row["blocking_reasons"])

    def test_2020_covid_is_caveat_not_data_replacement(self):
        self.assertIn("covid_period_traffic_exposure_may_differ",
                      investigation_tags("VELLORE", 2020, False))
        self.assertIn("2017_source_lists_newer_district_labels_before_2019_formation",
                      investigation_tags("VELLORE", 2017, True))

    def test_exact_four_exploratory_groups(self):
        self.assertEqual(len(EXPECTED_GROUPS), 4)
        self.assertIn("NAGAPATTINAM_LEGACY", EXPECTED_GROUPS)


if __name__ == "__main__":
    unittest.main()
