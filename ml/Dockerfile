FROM python:3.13-slim

WORKDIR /app

COPY ml/requirements.txt ./ml/requirements.txt
RUN pip install --no-cache-dir -r ml/requirements.txt

COPY ml ./ml

ENV PYTHONUNBUFFERED=1

CMD ["python", "ml/training/train_baseline.py"]
