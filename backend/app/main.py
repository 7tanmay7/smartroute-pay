import time
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST, Counter, Histogram

from app.db.database import init_db, fast_cache
from app.services.model_trainer import ml_model
from app.services.event_bus import event_bus
from app.services.traffic_generator import traffic_generator
from app.routers import checkout, analytics, chaos, auth

app = FastAPI(
    title="SmartRoute Pay - Mini Payment Orchestration Platform",
    description="ML-powered payment routing, NPCI UPI MDR optimization, JWT authentication, deterministic eligibility rules, automated fallback recovery & live health dashboard.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROMETHEUS_TRANSACTIONS_TOTAL = Counter(
    "payment_orchestrator_transactions_total",
    "Total transactions processed",
    ["gateway", "status", "bank", "payment_method"]
)
PROMETHEUS_LATENCY_HISTOGRAM = Histogram(
    "payment_orchestrator_latency_seconds",
    "Transaction processing latency in seconds",
    ["gateway"]
)

app.include_router(auth.router)
app.include_router(checkout.router)
app.include_router(analytics.router)
app.include_router(chaos.router)

@app.on_event("startup")
async def startup_event():
    init_db()
    print("Initializing ML Gateway Scorer Model...")
    ml_model.load_or_train()
    print("ML Gateway Scorer initialized and ready.")
    traffic_generator.start()
    print("Background synthetic traffic generator activated.")

@app.on_event("shutdown")
async def shutdown_event():
    traffic_generator.stop()

@app.get("/")
def read_root():
    return {
        "service": "SmartRoute Pay Orchestrator",
        "status": "HEALTHY",
        "auth": "JWT Bearer Enabled",
        "docs": "/docs",
        "metrics": "/metrics"
    }

@app.get("/metrics")
def get_metrics():
    return PlainTextResponse(generate_latest().decode("utf-8"), media_type=CONTENT_TYPE_LATEST)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await event_bus.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        event_bus.disconnect(websocket)
