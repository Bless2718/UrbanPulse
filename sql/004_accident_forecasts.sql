CREATE SCHEMA IF NOT EXISTS analytics;

CREATE TABLE IF NOT EXISTS analytics.accident_forecasts (
    forecast_year INTEGER PRIMARY KEY,
    predicted_accidents DOUBLE PRECISION NOT NULL,
    model_name TEXT NOT NULL,
    validation_mae DOUBLE PRECISION NOT NULL,
    validation_rmse DOUBLE PRECISION NOT NULL,
    validation_mape_pct DOUBLE PRECISION NOT NULL,
    training_end_year INTEGER NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
