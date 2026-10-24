from __future__ import annotations

import json
import math
import os
from pathlib import Path
from urllib.parse import unquote, urlparse

import numpy as np
import pandas as pd
import pg8000.dbapi
from sklearn.linear_model import LinearRegression

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+pg8000://urbanpulse:urbanpulse_dev@db:5432/urbanpulse",
)
BACKTEST_YEARS = int(os.getenv("ML_BACKTEST_YEARS", "5"))

FEATURES = [
    "year",
    "lag_1_accidents",
    "lag_2_accidents",
    "rolling_3y_accidents",
    "rolling_5y_accidents",
]


def db_args() -> dict:
    parsed = urlparse(DATABASE_URL)
    return {
        "user": unquote(parsed.username or ""),
        "password": unquote(parsed.password or ""),
        "host": parsed.hostname or "db",
        "port": parsed.port or 5432,
        "database": (parsed.path or "/urbanpulse").lstrip("/"),
    }


def connect():
    return pg8000.dbapi.connect(**db_args())


def load_features() -> pd.DataFrame:
    conn = connect()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT year, target_total_accidents, lag_1_accidents,
                   lag_2_accidents, rolling_3y_accidents,
                   rolling_5y_accidents, structural_break_2023_flag,
                   regime_label
            FROM analytics.accident_ml_features
            ORDER BY year
            """
        )
        rows = cur.fetchall()
        columns = [item[0] for item in cur.description]
    finally:
        cur.close()
        conn.close()

    frame = pd.DataFrame(rows, columns=columns)
    numeric_columns = [
        "year",
        "target_total_accidents",
        "lag_1_accidents",
        "lag_2_accidents",
        "rolling_3y_accidents",
        "rolling_5y_accidents",
        "structural_break_2023_flag",
    ]
    for column in numeric_columns:
        frame[column] = pd.to_numeric(frame[column], errors="coerce")
    return frame


def regression_prediction(train: pd.DataFrame, row: pd.DataFrame) -> float:
    clean_train = train.dropna(subset=FEATURES + ["target_total_accidents"])
    model = LinearRegression()
    model.fit(clean_train[FEATURES], clean_train["target_total_accidents"])
    return max(0.0, float(model.predict(row[FEATURES])[0]))


def metric_bundle(actual: np.ndarray, predicted: np.ndarray) -> dict[str, float]:
    errors = actual - predicted
    mae = float(np.mean(np.abs(errors)))
    rmse = float(math.sqrt(np.mean(np.square(errors))))
    mape = float(np.mean(np.abs(errors / actual)) * 100)
    return {
        "mae": round(mae, 2),
        "rmse": round(rmse, 2),
        "mape_pct": round(mape, 2),
    }


def backtest(frame: pd.DataFrame) -> tuple[dict, pd.DataFrame]:
    eligible = frame.dropna(subset=FEATURES + ["target_total_accidents"]).copy()
    test_years = eligible["year"].astype(int).tolist()[-BACKTEST_YEARS:]
    predictions: list[dict] = []

    for year in test_years:
        train = eligible[eligible["year"] < year]
        row = eligible[eligible["year"] == year]
        if train.empty or row.empty:
            continue

        actual = float(row["target_total_accidents"].iloc[0])
        predictions.append(
            {
                "year": int(year),
                "actual": actual,
                "persistence": float(row["lag_1_accidents"].iloc[0]),
                "rolling_3y": float(row["rolling_3y_accidents"].iloc[0]),
                "linear_regression": regression_prediction(train, row),
            }
        )

    result = pd.DataFrame(predictions)
    if result.empty:
        raise RuntimeError("Not enough rows to run a time-aware backtest")

    metrics = {}
    actual = result["actual"].to_numpy(dtype=float)
    for model_name in ["persistence", "rolling_3y", "linear_regression"]:
        metrics[model_name] = metric_bundle(
            actual,
            result[model_name].to_numpy(dtype=float),
        )

    winner = min(metrics, key=lambda name: metrics[name]["mae"])
    return {
        "backtest_years": [int(year) for year in result["year"].tolist()],
        "models": metrics,
        "selected_model": winner,
        "selection_metric": "mae",
        "structural_break_note": (
            "The 2023 observation is a structural-break candidate. "
            "Baseline results should not be treated as a production forecast."
        ),
    }, result


def build_2026_features(frame: pd.DataFrame) -> pd.DataFrame:
    history = frame.sort_values("year").dropna(subset=["target_total_accidents"])
    values = history["target_total_accidents"].astype(float)
    latest_year = int(history["year"].iloc[-1])

    return pd.DataFrame(
        [
            {
                "year": latest_year + 1,
                "lag_1_accidents": float(values.iloc[-1]),
                "lag_2_accidents": float(values.iloc[-2]),
                "rolling_3y_accidents": float(values.iloc[-3:].mean()),
                "rolling_5y_accidents": float(values.iloc[-5:].mean()),
            }
        ]
    )


def forecast(frame: pd.DataFrame, selected_model: str) -> dict:
    row = build_2026_features(frame)
    forecast_year = int(row["year"].iloc[0])

    if selected_model == "persistence":
        prediction = float(row["lag_1_accidents"].iloc[0])
    elif selected_model == "rolling_3y":
        prediction = float(row["rolling_3y_accidents"].iloc[0])
    else:
        train = frame.dropna(subset=FEATURES + ["target_total_accidents"])
        prediction = regression_prediction(train, row)

    return {
        "forecast_year": forecast_year,
        "predicted_accidents": int(round(prediction)),
        "model_name": selected_model,
        "training_end_year": forecast_year - 1,
    }


def persist_forecast(forecast_row: dict, selected_metrics: dict) -> None:
    conn = connect()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS analytics.accident_forecasts (
                forecast_year INTEGER PRIMARY KEY,
                predicted_accidents DOUBLE PRECISION NOT NULL,
                model_name TEXT NOT NULL,
                validation_mae DOUBLE PRECISION NOT NULL,
                validation_rmse DOUBLE PRECISION NOT NULL,
                validation_mape_pct DOUBLE PRECISION NOT NULL,
                training_end_year INTEGER NOT NULL,
                generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        cur.execute(
            """
            INSERT INTO analytics.accident_forecasts (
                forecast_year,
                predicted_accidents,
                model_name,
                validation_mae,
                validation_rmse,
                validation_mape_pct,
                training_end_year
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (forecast_year) DO UPDATE SET
                predicted_accidents = EXCLUDED.predicted_accidents,
                model_name = EXCLUDED.model_name,
                validation_mae = EXCLUDED.validation_mae,
                validation_rmse = EXCLUDED.validation_rmse,
                validation_mape_pct = EXCLUDED.validation_mape_pct,
                training_end_year = EXCLUDED.training_end_year,
                generated_at = NOW()
            """,
            (
                forecast_row["forecast_year"],
                forecast_row["predicted_accidents"],
                forecast_row["model_name"],
                selected_metrics["mae"],
                selected_metrics["rmse"],
                selected_metrics["mape_pct"],
                forecast_row["training_end_year"],
            ),
        )
        conn.commit()
    finally:
        cur.close()
        conn.close()


def write_artifacts(metrics: dict, predictions: pd.DataFrame, forecast_row: dict) -> None:
    evaluation_dir = Path("ml/evaluation")
    inference_dir = Path("ml/inference")
    evaluation_dir.mkdir(parents=True, exist_ok=True)
    inference_dir.mkdir(parents=True, exist_ok=True)

    with (evaluation_dir / "baseline_metrics.json").open("w", encoding="utf-8") as handle:
        json.dump(metrics, handle, indent=2)

    predictions.round(2).to_csv(
        evaluation_dir / "backtest_predictions.csv",
        index=False,
    )

    with (inference_dir / "forecast_2026.json").open("w", encoding="utf-8") as handle:
        json.dump(forecast_row, handle, indent=2)


def main() -> None:
    frame = load_features()
    metrics, predictions = backtest(frame)
    selected_model = metrics["selected_model"]
    forecast_row = forecast(frame, selected_model)
    selected_metrics = metrics["models"][selected_model]

    persist_forecast(forecast_row, selected_metrics)
    write_artifacts(metrics, predictions, forecast_row)

    print(json.dumps(
        {
            "selected_model": selected_model,
            "validation": selected_metrics,
            "forecast": forecast_row,
        },
        indent=2,
    ))


if __name__ == "__main__":
    main()
