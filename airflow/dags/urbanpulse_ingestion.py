from datetime import datetime

from airflow import DAG
from airflow.operators.bash import BashOperator

with DAG(
    dag_id="urbanpulse_ingestion",
    description="Ingest UrbanPulse weather and road-accident source data",
    start_date=datetime(2026, 1, 1),
    schedule="0 */6 * * *",
    catchup=False,
    tags=["urbanpulse", "ingestion"],
) as dag:
    weather = BashOperator(
        task_id="ingest_imd_weather",
        bash_command="python /opt/urbanpulse/pipelines/run_ingestion.py --source weather",
    )

    accidents = BashOperator(
        task_id="ingest_data_gov_accidents",
        bash_command="python /opt/urbanpulse/pipelines/run_ingestion.py --source accidents",
    )

    weather >> accidents
