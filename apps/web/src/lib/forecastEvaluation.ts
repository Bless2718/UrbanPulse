/**
 * Validate and reduce an offline Phase 3 JSON report before it can appear
 * anywhere in the frontend. This is historical research only.
 * Refuse missing provenance, mixed source versions, 2024+ folds or any
 * candidate/record that claims model-ready status.
 */
export type ForecastMethod = "persistence" | "moving_average_3" | "linear_drift";
export type ForecastHorizon = 1 | 2;
export type CandidateType = "original_reporting_area" | "exploratory_parent_group";

export type EvaluationFold = {
  candidate_id: string;
  candidate_type: CandidateType;
  method: ForecastMethod;
  horizon: ForecastHorizon;
  origin_year: number;
  target_year: number;
  actual: number;
  prediction: number;
};

export type EvaluationCandidate = {
  candidate_id: string;
  candidate_type: CandidateType;
  observed_2016_2023_years: number;
  evaluated: boolean;
  folds: number;
  included_years: number[];
  reason_if_unscored: string | null;
};

export type EvaluationReport = {
  source_sha256: string;
  generated_at_utc: string;
  label: string;
  candidates: EvaluationCandidate[];
  folds: EvaluationFold[];
  partial_group_years_skipped: number;
  source_revision_accident_gap: number;
  source_revision_death_gap: number;
  warnings: string[];
};

type ObjectValue = Record<string, unknown>;
const methods: ForecastMethod[] = ["persistence", "moving_average_3", "linear_drift"];
const categories: CandidateType[] = ["original_reporting_area", "exploratory_parent_group"];
const hashPattern = /^[a-f0-9]{64}$/;

function isRecord(value: unknown): value is ObjectValue {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function isInt(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}
function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
function assertSafe(condition: unknown, reason: string): asserts condition {
  if (!condition) throw new Error("Untrusted experimental report: " + reason);
}
function key(type: CandidateType, id: string): string {
  return type + ":" + id;
}
function isYearArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((x) => isInt(x, 2016, 2023));
}

/** Defensive parse of the disk-exported research file, never a model endpoint. */
export function parseEvaluationReport(input: unknown): EvaluationReport {
  assertSafe(isRecord(input), "not an object");
  const source = input.source_sha256;
  assertSafe(typeof source === "string" && hashPattern.test(source), "source SHA absent");
  assertSafe(input.phase === 3, "wrong phase");
  assertSafe(input.model_ready === false && input.forecast_published === false
    && input.prediction_year_2026_created === false, "research quarantine flags missing");
  assertSafe(input.label === "RESEARCH_DIAGNOSTIC_NOT_A_DEPLOYABLE_FORECAST",
    "not an authorized Phase 3 experiment");
  assertSafe(input.last_eligible_holdout_year === 2023
    && Array.isArray(input.excluded_years)
    && input.excluded_years.length === 1 && input.excluded_years[0] === 2024,
  "2024 exclusion not declared");
  assertSafe(Array.isArray(input.methods) && input.methods.length === 3
    && methods.every((x) => input.methods!.includes(x)), "method list changed");
  assertSafe(Array.isArray(input.horizons) && input.horizons.length === 2
    && input.horizons.includes(1) && input.horizons.includes(2), "horizon list changed");
  assertSafe(input.min_training_years === 4, "training window rule changed");
  assertSafe(typeof input.generated_at_utc === "string" && !Number.isNaN(Date.parse(input.generated_at_utc)),
    "generation timestamp missing");
  assertSafe(isRecord(input.source_revision_2024), "revision record absent");
  const revision = input.source_revision_2024;
  assertSafe(revision.accident_revision_gap === 343 && revision.death_revision_gap === 375
    && revision.revision_unresolved === true && revision.model_ready === false,
  "2024 revision gate changed");
  assertSafe(Array.isArray(input.candidates) && input.candidates.length === 42,
    "expected 42 original/grouped candidates");
  assertSafe(Array.isArray(input.rolling_origin_folds), "holdout rows absent");
  assertSafe(Array.isArray(input.grouped_partial_years_skipped), "partial groups not declared");
  assertSafe(Array.isArray(input.warnings) && input.warnings.every((w) => typeof w === "string"),
    "research warnings missing");

  const candidateKeys = new Set<string>();
  const candidates: EvaluationCandidate[] = input.candidates.map((raw) => {
    assertSafe(isRecord(raw), "candidate malformed");
    assertSafe(categories.includes(raw.candidate_type as CandidateType)
      && typeof raw.candidate_id === "string" && /^[A-Z0-9_ ]{2,100}$/.test(raw.candidate_id),
    "candidate identification invalid");
    const category = raw.candidate_type as CandidateType;
    const id = raw.candidate_id as string;
    const identity = key(category, id);
    assertSafe(!candidateKeys.has(identity), "duplicate candidate");
    candidateKeys.add(identity);
    assertSafe(raw.model_ready === false &&
      raw.eligibility_status === "blocked_pending_independent_boundary_and_revision_reconciliation",
    "candidate appears approved");
    assertSafe(isInt(raw.observed_2016_2023_years, 0, 8)
      && isInt(raw.folds, 0, 100) && typeof raw.evaluated === "boolean"
      && isYearArray(raw.included_years), "candidate metadata malformed");
    assertSafe(new Set(raw.included_years).size === raw.included_years.length
      && raw.included_years.length === raw.observed_2016_2023_years,
    "candidate year coverage mismatch");
    assertSafe(raw.reason_if_unscored === null || typeof raw.reason_if_unscored === "string",
      "unscored reason malformed");
    return {
      candidate_id: id, candidate_type: category,
      observed_2016_2023_years: raw.observed_2016_2023_years,
      evaluated: raw.evaluated, folds: raw.folds,
      included_years: raw.included_years as number[],
      reason_if_unscored: raw.reason_if_unscored as string | null,
    };
  });
  assertSafe(candidates.filter((c) => c.candidate_type === "original_reporting_area").length === 38
    && candidates.filter((c) => c.candidate_type === "exploratory_parent_group").length === 4,
  "candidate categories mismatch");

  const foldKeys = new Set<string>();
  const foldCountByCandidate = new Map<string, number>();
  const folds: EvaluationFold[] = input.rolling_origin_folds.map((raw) => {
    assertSafe(isRecord(raw), "fold malformed");
    assertSafe(raw.source_sha256 === source && raw.model_ready === false
      && raw.label === input.label, "fold missing source pin or quarantine");
    assertSafe(categories.includes(raw.candidate_type as CandidateType)
      && typeof raw.candidate_id === "string", "fold candidate malformed");
    const candidateType = raw.candidate_type as CandidateType;
    const candidateId = raw.candidate_id as string;
    const candidateKey = key(candidateType, candidateId);
    assertSafe(candidateKeys.has(candidateKey), "fold candidate not in review manifest");
    assertSafe(methods.includes(raw.method as ForecastMethod)
      && (raw.horizon === 1 || raw.horizon === 2), "unsupported model/horizon");
    assertSafe(isInt(raw.origin_year, 2019, 2022) && isInt(raw.target_year, 2020, 2023)
      && raw.target_year === raw.origin_year + raw.horizon, "fold is not a historical holdout");
    assertSafe(isCount(raw.actual) && isCount(raw.prediction), "invalid accident count");
    assertSafe(isYearArray(raw.training_years) && raw.training_years.length >= 4
      && raw.training_years[raw.training_years.length - 1] === raw.origin_year
      && raw.training_years.every((y, i) => i === 0 || y === raw.training_years[i-1] + 1),
    "chronological training history invalid");
    assertSafe(Array.isArray(raw.training_source_row_sha256)
      && raw.training_source_row_sha256.length >= raw.training_years.length
      && raw.training_source_row_sha256.every((h) => typeof h === "string" && hashPattern.test(h)),
    "missing training provenance");
    assertSafe(Array.isArray(raw.holdout_source_row_sha256)
      && raw.holdout_source_row_sha256.length > 0
      && raw.holdout_source_row_sha256.every((h) => typeof h === "string" && hashPattern.test(h)),
    "missing holdout provenance");
    const foldKey = [candidateKey, raw.origin_year, raw.target_year, raw.method].join(":");
    assertSafe(!foldKeys.has(foldKey), "duplicate holdout fold");
    foldKeys.add(foldKey);
    foldCountByCandidate.set(candidateKey, (foldCountByCandidate.get(candidateKey) ?? 0) + 1);
    return {
      candidate_id: candidateId, candidate_type: candidateType,
      method: raw.method as ForecastMethod, horizon: raw.horizon as ForecastHorizon,
      origin_year: raw.origin_year, target_year: raw.target_year,
      actual: raw.actual as number, prediction: raw.prediction as number,
    };
  });
  for (const c of candidates) {
    const n = foldCountByCandidate.get(key(c.candidate_type, c.candidate_id)) ?? 0;
    assertSafe(n === c.folds && c.evaluated === (n > 0), "candidate fold-count mismatch");
  }
  const skipped = input.grouped_partial_years_skipped;
  for (const item of skipped) {
    assertSafe(isRecord(item) && typeof item.candidate_id === "string"
      && isInt(item.year, 2016, 2023)
      && item.reason === "not_all_parent_child_members_reported", "invalid excluded group-year");
  }
  return {
    source_sha256: source,
    generated_at_utc: input.generated_at_utc,
    label: input.label as string,
    candidates,
    folds,
    partial_group_years_skipped: skipped.length,
    source_revision_accident_gap: 343,
    source_revision_death_gap: 375,
    warnings: input.warnings as string[],
  };
}

/** Metrics are always computed from the currently selected candidate folds. */
export function calculateFoldMetrics(folds: EvaluationFold[]): {
  folds: number; mae: number | null; rmse: number | null; wape: number | null;
} {
  if (!folds.length) return { folds: 0, mae: null, rmse: null, wape: null };
  const totalAbs = folds.reduce((sum, f) => sum + Math.abs(f.prediction - f.actual), 0);
  const totalSq = folds.reduce((sum, f) => sum + (f.prediction - f.actual) ** 2, 0);
  const actualTotal = folds.reduce((sum, f) => sum + f.actual, 0);
  return {
    folds: folds.length,
    mae: totalAbs / folds.length,
    rmse: Math.sqrt(totalSq / folds.length),
    wape: actualTotal > 0 ? (100 * totalAbs / actualTotal) : null,
  };
}
