"""Offline, deterministic Phase 3 backtesting regression tests."""
import unittest

from ingestion.backtest_tn_district_experiments import (
    EXPERIMENT_LABEL, evaluate_series, metrics, predict, summarize
)

SHA = "a" * 64


def history(years, values):
    return [
        {"year": year, "count": val, "row_sha256": ["f" * 64], "model_ready": False}
        for year, val in zip(years, values)
    ]


class ResearchOnlyForecastingTests(unittest.TestCase):
    def test_three_baselines_use_origin_values_not_future(self):
        observed = [(2016, 10), (2017, 20), (2018, 30), (2019, 40)]
        self.assertEqual(predict("persistence", observed, 1), 40)
        self.assertEqual(predict("persistence", observed, 2), 40)
        self.assertEqual(predict("moving_average_3", observed, 1), 30)
        self.assertEqual(predict("moving_average_3", observed, 2), 30)
        self.assertEqual(predict("linear_drift", observed, 1), 50)
        self.assertEqual(predict("linear_drift", observed, 2), 60)

    def test_never_use_target_or_intermediate_horizon_actual_as_training(self):
        obs = history(range(2016, 2024), [10, 11, 13, 17, 19, 10000, 23, 27])
        folds, meta = evaluate_series(source_sha=SHA, candidate_id="DEMO",
                                      candidate_type="original_reporting_area", observations=obs)
        target_2021 = [
            r for r in folds if r["origin_year"] == 2019 and r["target_year"] == 2021
            and r["horizon"] == 2
        ]
        self.assertEqual(len(target_2021), 3)
        self.assertTrue(all(r["training_years"] == [2016, 2017, 2018, 2019] for r in target_2021))
        self.assertTrue(all(r["actual"] == 10000 and r["prediction"] < 100 for r in target_2021))
        self.assertTrue(all(not r["model_ready"] and r["label"] == EXPERIMENT_LABEL for r in folds))
        self.assertTrue(meta["evaluated"])

    def test_no_2024_data_accepted_under_any_circumstances(self):
        obs = history(range(2016, 2025), range(10, 19))
        with self.assertRaisesRegex(ValueError, "no 2024"):
            evaluate_series(source_sha=SHA, candidate_id="DEMO",
                            candidate_type="original_reporting_area", observations=obs)

    def test_missing_year_breaks_training_prefix_never_imputes(self):
        obs = history([2016, 2017, 2019, 2020, 2021, 2022, 2023], [10, 11, 10, 11, 12, 13, 14])
        folds, _ = evaluate_series(source_sha=SHA, candidate_id="DEMO",
                                   candidate_type="original_reporting_area", observations=obs)
        self.assertTrue(folds)
        self.assertTrue(all(min(f["training_years"]) >= 2019 for f in folds))
        self.assertTrue(all(f["origin_year"] == 2022 for f in folds))

    def test_not_enough_years_has_explicit_unscored_status(self):
        obs = history([2021, 2022, 2023], [100, 120, 145])
        folds, meta = evaluate_series(source_sha=SHA, candidate_id="MYILADUTHURAI",
                                      candidate_type="original_reporting_area", observations=obs)
        self.assertEqual(folds, [])
        self.assertFalse(meta["evaluated"])
        self.assertIsNotNone(meta["reason_if_unscored"])

    def test_group_partial_years_must_be_removed_before_evaluation(self):
        obs = history(range(2017, 2024), range(100, 107))
        obs[0]["all_members_present"] = False
        for row in obs[1:]:
            row["all_members_present"] = True
        with self.assertRaisesRegex(ValueError, "Partial group-year"):
            evaluate_series(source_sha=SHA, candidate_id="VELL",
                            candidate_type="exploratory_parent_group", observations=obs)

    def test_invalid_hash_and_duplicate_year_rejected(self):
        obs = history(range(2016, 2024), range(10, 18))
        obs[0]["row_sha256"] = ["broken"]
        with self.assertRaisesRegex(ValueError, "provenance"):
            evaluate_series(source_sha=SHA, candidate_id="DEMO",
                            candidate_type="original_reporting_area", observations=obs)
        obs[0]["row_sha256"] = ["f" * 64]
        obs[1]["year"] = 2016
        with self.assertRaisesRegex(ValueError, "Duplicate year"):
            evaluate_series(source_sha=SHA, candidate_id="DEMO",
                            candidate_type="original_reporting_area", observations=obs)

    def test_clamp_to_zero_and_reject_unknown_methods(self):
        train = [(2016, 100), (2017, 70), (2018, 40), (2019, 10)]
        self.assertEqual(predict("linear_drift", train, 2), 0)
        with self.assertRaisesRegex(ValueError, "Unsupported"):
            predict("random_method", train, 1)
        with self.assertRaisesRegex(ValueError, "consecutive"):
            predict("persistence", [(2016, 1), (2017, 1), (2019, 1), (2020, 1)], 1)

    def test_metrics_are_nonnegative_and_divide_by_zero_guarded(self):
        f = [{"actual": 10, "prediction": 20}, {"actual": 20, "prediction": 10}]
        m = metrics(f)
        self.assertEqual(m, {"folds": 2, "mae": 10, "rmse": 10, "wape_percent": 66.67})
        self.assertIsNone(metrics([{"actual": 0, "prediction": 2}])["wape_percent"])
        self.assertIsNone(metrics([])["mae"])

    def test_aggregate_summaries_never_promote_forecast(self):
        folds = [{
            "candidate_type": "original_reporting_area", "horizon": 1, "method": "persistence",
            "prediction": 100, "actual": 110,
        }]
        report = summarize(folds)
        self.assertEqual(len(report), 1)
        self.assertFalse(report[0]["model_ready"])


if __name__ == "__main__":
    unittest.main()
