from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

app = FastAPI(
    title="UrbanPulse API",
    version="0.1.0",
    description="Backend API for UrbanPulse urban risk intelligence.",
)

origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root() -> dict[str, str]:
    return {"name": "UrbanPulse API", "status": "online"}

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "healthy"}

@app.get("/api/v1/risk/summary")
def risk_summary() -> dict:
    return {
        "city_risk_score": 82,
        "high_risk_zones": 7,
        "predicted_risk_next_hour": 0.76,
        "source": "demo"
    }
