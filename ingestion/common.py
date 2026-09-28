from __future__ import annotations

import json
import os
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Iterator

import psycopg
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://urbanpulse:urbanpulse_dev@localhost:5432/urbanpulse",
)


@contextmanager
def db_connection() -> Iterator[psycopg.Connection]:
    with psycopg.connect(DATABASE_URL) as conn:
        yield conn


def first_value(payload: dict[str, Any], aliases: list[str]) -> Any:
    lowered = {str(k).strip().lower(): v for k, v in payload.items()}
    for alias in aliases:
        if alias.lower() in lowered:
            return lowered[alias.lower()]
    return None


def as_int(value: Any) -> int | None:
    if value in (None, "", "NA", "N/A", "-", "Nil", "NIL"):
        return None
    try:
        return int(float(str(value).replace(",", "").strip()))
    except (TypeError, ValueError):
        return None


def as_float(value: Any) -> float | None:
    if value in (None, "", "NA", "N/A", "-", "Nil", "NIL", "TRACE"):
        return None
    try:
        return float(str(value).replace(",", "").strip())
    except (TypeError, ValueError):
        return None


def json_text(payload: dict[str, Any]) -> str:
    return json.dumps(payload, ensure_ascii=False, default=str)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)
