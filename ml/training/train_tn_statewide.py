"""Backtest Tamil Nadu annual accidents and persist an experimental forecast."""
from __future__ import annotations

import json
import os
from pathlib import Path
from urllib.parse import unquote, urlparse

import numpy as np
import pandas as pd
import pg8000.dbapi

BACKTEST_YEARS = int(os.getenv("TN_BACKTEST_YEARS", "10"))
MODELS = ("persistence", "rolling_3y", "trend_5y")


def connect():
    raw_url = os.environ.get("DATABASE_URL")
    if not raw_url:
        raise RuntimeError("Set DATABASE_URL to the UrbanPulse PostgreSQL connection URL")
    url = urlparse(raw_url)
    return pg8000.dbapi.connect(
        host=url.hostname or "db",
        port=url.port or 5432,
        user=unquote(url.username or ""),
        password=unquote(url.password or ""),
        database=(url.path or "/urbanpulse").lstrip("/"),
    )


def load_history() -> pd.DataFrame:
    conn = connect()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT year, total_accidents, provisional "
            "FROM analytics.tn_annual_accidents ORDER BY year"
        )
        rows = cur.fetchall()
    finally:
        cur.close()
        conn.close()

    df = pd.DataFrame(rows, columns=["year", "total_accidents", "provisional"])
    if df.empty:
        raise ValueError("Tamil Nadu annual accident table is empty")
    df["year"] = pd.to_numeric(df["year"], errors="raise").astype(int)
    df["total_accidents"] = pd.to_numeric(
        df["total_accidents"], errors="raise"
    ).astype(float)
    df["provisional"] = df["provisional"].astype(bool)
    if df["year"].duplicated().any():
        raise ValueError("Duplicate years in Tamil Nadu annual data")
    if not (df["total_accidents"] >= 0).all():
        raise ValueError("Negative accident totals found")
    if not np.all(np.diff(df["year"].to_numpy()) == 1):
        raise ValueError("Missing years in annual accident data")
    return df


def predict(history: pd.DataFrame, model: str) -> float:
    values = history["total_accidents"].to_numpy(dtype=float)
    if model == "persistence":
        estimate = values[-1]
    elif model == "rolling_3y":
        estimate = values[-3:].mean()
    elif model == "trend_5y":
        slope, intercept = np.polyfit(np.arange(5), values[-5:], 1)
        estimate = slope * 5 + intercept
    else:
        raise ValueError(f"Unknown model: {model}")
    return max(0.0, float(estimate))


def evaluate(df: pd.DataFrame) -> tuple[dict, pd.DataFrame]:
    # Exclude provisional years from both targets and historical backtest inputs.
    final = df.loc[~df["provisional"]].copy()
    if len(final) < 10 or BACKTEST_YEARS < 1:
        raise ValueError("Insufficient finalized years or invalid TN_BACKTEST_YEARS")
    if not np.all(np.diff(final["year"].to_numpy()) == 1):
        raise ValueError("Finalized years must be contiguous for backtesting")
    test_years = final["year"].tolist()[5:][-BACKTEST_YEARS:]
    rows = []
    for year in test_years:
        history = final[final["year"] < year]
        actual = float(final.loc[final["year"] == year, "total_accidents"].iloc[0])
        rows.append({
            "year": int(year),
            "actual": actual,
            **{model: predict(history, model) for model in MODELS},
        })
    backtest = pd.DataFrame(rows)
    actuals = backtest["actual"].to_numpy(dtype=float)
    metrics = {}
    for model in MODELS:
        errors = actuals - backtest[model].to_numpy(dtype=float)
        metrics[model] = {
            "mae": round(float(np.abs(errors).mean()), 2),
            "rmse": round(float(np.sqrt(np.square(errors).mean())), 2),
        }
        if (actuals > 0).all():
            metrics[model]["mape_pct"] = round(
                float(np.mean(np.abs(errors / actuals)) * 100), 2
            )
    winner = min(MODELS, key=lambda model: metrics[model]["mae"])
    return {
        "geography": "Tamil Nadu statewide",
        "target": "annual_total_accidents",
        "backtest_years": [int(year) for year in backtest["year"]],
        "backtest_finalized_only": True,
        "models": metrics,
        "selected_model": winner,
        "selection_metric": "mae",
        "caution": "Limited annual observations; not a production-grade risk estimate.",
    }, backtest


def persist(summary: dict, forecast: dict) -> None:
    conn = connect()
    cur = conn.cursor()
    try:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS analytics.tn_statewide_forecasts (
                forecast_year INTEGER PRIMARY KEY,
                predicted_accidents INTEGER NOT NULL CHECK (predicted_accidents >= 0),
                model_name TEXT NOT NULL,
                training_end_year INTEGER NOT NULL,
                status TEXT NOT NULL,
                forecast_json JSONB NOT NULL,
                validation_json JSONB NOT NULL,
                generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)
        cur.execute("""
            INSERT INTO analytics.tn_statewide_forecasts (
                forecast_year, predicted_accidents, model_name, training_end_year,
                status, forecast_json, validation_json
            ) VALUES (%s, %s, %s, %s, %s, CAST(%s AS JSONB), CAST(%s AS JSONB))
            ON CONFLICT (forecast_year) DO UPDATE SET
                predicted_accidents = EXCLUDED.predicted_accidents,
                model_name = EXCLUDED.model_name,
                training_end_year = EXCLUDED.training_end_year,
                status = EXCLUDED.status,
                forecast_json = EXCLUDED.forecast_json,
                validation_json = EXCLUDED.validation_json,
                generated_at = NOW()
        """, (
            forecast["forecast_year"], forecast["predicted_accidents"],
            forecast["model_name"], forecast["training_end_year"],
            forecast["status"], json.dumps(forecast), json.dumps(summary),
        ))
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


def main() -> None:
    df = load_history()
    summary, backtest = evaluate(df)
    latest_year = int(df["year"].iloc[-1])
    if latest_year != 2025:
        raise ValueError(
            f"Expected data through 2025 for a 2026 forecast; found {latest_year}"
        )
    winner = summary["selected_model"]
    forecast = {
        "geography": "Tamil Nadu statewide",
        "forecast_year": 2026,
        "predicted_accidents": int(round(predict(df, winner))),
        "model_name": winner,
        "training_end_year": latest_year,
        "training_includes_provisional": bool(df["provisional"].any()),
        "provisional_input_years": [
            int(year) for year in df.loc[df["provisional"], "year"]
        ],
        "status": "experimental",
        "note": "Provisional inputs may change; no calibrated uncertainty interval.",
    }
    eval_dir, forecast_dir = Path("ml/evaluation"), Path("ml/inference")
    eval_dir.mkdir(parents=True, exist_ok=True)
    forecast_dir.mkdir(parents=True, exist_ok=True)
    (eval_dir / "tn_statewide_metrics.json").write_text(
        json.dumps(summary, indent=2) + "\n", encoding="utf-8"
    )
    backtest.round(2).to_csv(eval_dir / "tn_statewide_backtest.csv", index=False)
    (forecast_dir / "tn_statewide_forecast_2026.json").write_text(
        json.dumps(forecast, indent=2) + "\n", encoding="utf-8"
    )
    persist(summary, forecast)
    print(json.dumps({
        "selected_model": winner,
        "validation": summary["models"][winner],
        "forecast": forecast,
    }, indent=2))


if __name__ == "__main__":
    main()
