FROM python:3.13-slim

WORKDIR /app

COPY ingestion/requirements.txt ./ingestion/requirements.txt
RUN pip install --no-cache-dir -r ingestion/requirements.txt

COPY ingestion ./ingestion
COPY pipelines ./pipelines

ENV PYTHONUNBUFFERED=1

CMD ["python", "pipelines/run_ingestion.py", "--source", "weather"]
