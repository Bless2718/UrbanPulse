import assert from "node:assert/strict";
import { test } from "node:test";
import { parseEvaluationReport, calculateFoldMetrics } from "../src/lib/forecastEvaluation.ts";

const SHA = "a".repeat(64);
const ROW = "f".repeat(64);

function fixture() {
  const original = Array.from({ length: 38 }, (_, i) => ({
    candidate_id: "AREA_" + String(i + 1).padStart(2, "0"),
    candidate_type: "original_reporting_area",
    observed_2016_2023_years: i === 0 ? 5 : 3,
    included_years: i === 0 ? [2016, 2017, 2018, 2019, 2020] : [2021, 2022, 2023],
    evaluated: i === 0,
    folds: i === 0 ? 1 : 0,
    model_ready: false,
    eligibility_status: "blocked_pending_independent_boundary_and_revision_reconciliation",
    reason_if_unscored: i === 0 ? null : "insufficient_consecutive_historical_training_and_holdout_years",
  }));
  const groups = Array.from({ length: 4 }, (_, i) => ({
    candidate_id: "GROUP_" + String(i + 1),
    candidate_type: "exploratory_parent_group",
    observed_2016_2023_years: 2,
    included_years: [2022, 2023],
    evaluated: false,
    folds: 0,
    model_ready: false,
    eligibility_status: "blocked_pending_independent_boundary_and_revision_reconciliation",
    reason_if_unscored: "insufficient_consecutive_historical_training_and_holdout_years",
  }));
  const fold = {
    source_sha256: SHA,
    candidate_id: "AREA_01",
    candidate_type: "original_reporting_area",
    origin_year: 2019,
    target_year: 2020,
    horizon: 1,
    method: "persistence",
    training_years: [2016, 2017, 2018, 2019],
    training_source_row_sha256: [ROW, ROW, ROW, ROW],
    holdout_source_row_sha256: [ROW],
    actual: 110,
    prediction: 100,
    model_ready: false,
    label: "RESEARCH_DIAGNOSTIC_NOT_A_DEPLOYABLE_FORECAST",
  };
  return {
    phase: 3,
    generated_at_utc: "2026-11-14T10:00:00Z",
    source_sha256: SHA,
    model_ready: false,
    forecast_published: false,
    prediction_year_2026_created: false,
    label: fold.label,
    methods: ["persistence", "moving_average_3", "linear_drift"],
    horizons: [1, 2],
    min_training_years: 4,
    last_eligible_holdout_year: 2023,
    excluded_years: [2024],
    source_revision_2024: {
      accident_revision_gap: 343, death_revision_gap: 375,
      revision_unresolved: true, model_ready: false,
    },
    candidates: [...original, ...groups],
    rolling_origin_folds: [fold],
    grouped_partial_years_skipped: [
      { candidate_id: "GROUP_1", year: 2021, reason: "not_all_parent_child_members_reported" },
    ],
    warnings: ["Not a future forecast"],
  };
}

test("valid quarantined report exposes only historically evaluated folds", () => {
  const report = parseEvaluationReport(fixture());
  assert.equal(report.candidates.length, 42);
  assert.equal(report.folds.length, 1);
  assert.equal(report.partial_group_years_skipped, 1);
  assert.equal(report.source_sha256, SHA);
  assert.equal(report.source_revision_accident_gap, 343);
  assert.deepEqual(calculateFoldMetrics(report.folds), { folds: 1, mae: 10, rmse: 10, wape: 100 / 11 });
});

test("no folds is an honest empty state, not an invented accuracy number", () => {
  const source = fixture();
  source.rolling_origin_folds = [];
  source.candidates[0].folds = 0;
  source.candidates[0].evaluated = false;
  const report = parseEvaluationReport(source);
  assert.deepEqual(calculateFoldMetrics(report.folds), { folds: 0, mae: null, rmse: null, wape: null });
});

test("disallow 2024 and 2026 prediction targets", () => {
  const source = fixture();
  source.rolling_origin_folds[0].target_year = 2024;
  source.rolling_origin_folds[0].origin_year = 2023;
  assert.throws(() => parseEvaluationReport(source), /historical holdout/);
  source.rolling_origin_folds[0].target_year = 2026;
  assert.throws(() => parseEvaluationReport(source), /historical holdout/);
});

test("fail closed if any record or metadata is model-ready", () => {
  const source = fixture();
  source.candidates[0].model_ready = true;
  assert.throws(() => parseEvaluationReport(source), /appears approved/);
  source.candidates[0].model_ready = false;
  source.rolling_origin_folds[0].model_ready = true;
  assert.throws(() => parseEvaluationReport(source), /quarantine/);
});

test("reject mismatched source hashes and missing row-level provenance", () => {
  const source = fixture();
  source.rolling_origin_folds[0].source_sha256 = "b".repeat(64);
  assert.throws(() => parseEvaluationReport(source), /source pin/);
  source.rolling_origin_folds[0].source_sha256 = SHA;
  source.rolling_origin_folds[0].holdout_source_row_sha256 = [];
  assert.throws(() => parseEvaluationReport(source), /holdout provenance/);
});

test("reject incorrect forecasting gate and inconsistent summary counts", () => {
  const source = fixture();
  source.candidates[0].eligibility_status = "approved";
  assert.throws(() => parseEvaluationReport(source), /appears approved/);
  source.candidates[0].eligibility_status = "blocked_pending_independent_boundary_and_revision_reconciliation";
  source.candidates[0].folds = 2;
  assert.throws(() => parseEvaluationReport(source), /fold-count mismatch/);
});

test("no display if 2024 source revision is treated as resolved", () => {
  const source = fixture();
  source.source_revision_2024.revision_unresolved = false;
  assert.throws(() => parseEvaluationReport(source), /revision gate/);
});
