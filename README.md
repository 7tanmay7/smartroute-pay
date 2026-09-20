# SmartRoute Pay — Mini Payment Orchestration Platform

> **Target Priority**: Juspay ■■■■■ → Deloitte ■■■■ → KPMG ■■■ → HighRadius ■■■  
> **Positioning**: Built as a high-depth transaction-routing platform where Machine Learning serves as one decision component inside a resilient, distributed payment workflow with deterministic eligibility, fallback cascade, event streaming, fast caching, and operational monitoring.

---

## 🏗️ System Architecture & Core Flow

```
Customer Checkout ──► FastAPI Router ──► Deterministic Eligibility Rules ──► ML Gateway Success Scorer
                                                                                   │
                                                                                   ▼
Event Bus / WebSockets ◄── Transaction DB ◄── Primary Attempt (Gateway B) ◄── Gateway Ranking
        │                                             │
        ▼                                      (If FAILED & Retryable)
Live Dashboard & Prometheus                           │
                                                      ▼
                                           Fallback Attempt (Gateway A) ──► SUCCESS
```

---

## 🚀 Key Feature Set

1. **Deterministic Gateway Eligibility Engine**: Evaluates hard business rules before ML scoring (e.g. gateway maintenance mode / circuit breakers, maximum transaction limits per gateway, manual routing overrides).
2. **ML Gateway Success Scorer**: `HistGradientBoostingClassifier` trained on transaction features:
   - `bank`, `payment_method`, `gateway`, `amount`, `merchant`, `hour`, `day_of_week`, `device`, `location`, `previous_failure_rate`, `gateway_success_rate`, `bank_gateway_failure_rate`.
   - Outputs success probability scores (e.g., Gateway A: 94.2%, Gateway B: 98.1%, Gateway C: 87.3%) and ranks eligible routes.
3. **Failure Recovery & Fallback Cascade**:
   - Classifies error codes into *Retryable* (`BANK_TIMEOUT`, `GATEWAY_DOWN`, `NETWORK_ERROR`) vs *Non-Retryable* (`CARD_DECLINED`, `INSUFFICIENT_FUNDS`).
   - Automatically executes fallback attempts on next-best ranked gateways when retryable failures occur.
4. **Near-Real-Time Degradation Alerts**:
   - Calculates rolling sliding-window success rates and latencies per gateway and bank/method combination.
   - Detects degradation anomalies (e.g. *"Alert Gateway C / UPI / Bank X failure rate ↑ 14.2%"*).
   - Generates actionable recommendations with 1-click override execution.
5. **Interactive Store Checkout & Visualizer**: Customer store simulation demonstrating live routing step-by-step.
6. **Gateway Chaos Control Sandbox**: Sliders to force gateway failure rates, inject latencies, and trigger bank outages live.
7. **Prometheus Telemetry**: `/metrics` endpoint exposing transaction rates, latency histograms, and fallback counters.

---

## 💡 Juspay / Deloitte Interview Angle

### How to frame this project in an interview:
> *"I built a production-grade transaction-routing system where ML is one decision component inside a distributed payment workflow. Rather than treating payment routing as a simple prediction script, I designed a multi-layer orchestration pipeline with deterministic eligibility filtering, gradient-boosted gateway success scoring, error-code classification for smart fallback recovery, Redis fast-state sliding window health tracking, event streaming, and operational Prometheus monitoring."*

### Key Technical Talking Points:
- **Why Eligibility Rules Before ML?**: ML models can predict high probabilities for gateways that are undergoing scheduled maintenance or hard compliance limits. Enforcing deterministic filters first guarantees 100% policy compliance before ML inference.
- **Retryability Classification**: Non-retryable errors (e.g. invalid CVV) are terminated immediately to prevent unnecessary gateway API charges and latency for the user. Retryable infrastructure timeouts trigger zero-downtime fallback cascade.
- **Cold Start & Degradation Adaptation**: Hybrid probability scoring blends static model predictions (70%) with fast-state rolling metric windows (30%) to adapt within seconds to real-time gateway degradation.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide React, Recharts, Vite.
- **Backend API**: Python 3.11, FastAPI, Pydantic v2, SQLAlchemy.
- **Machine Learning**: Scikit-Learn, Pandas, NumPy.
- **Database & Cache**: SQLite / PostgreSQL, Fast-state memory cache (Redis protocol support).
- **Monitoring**: Prometheus client (`/metrics`), Grafana, WebSockets.

---

## 💻 How to Run Locally

### 1. Run Backend Server
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
- API Documentation: http://localhost:8000/docs
- Prometheus Metrics: http://localhost:8000/metrics

### 2. Run Frontend Dashboard
```bash
cd frontend
npm install
npm run dev
```
- Open http://localhost:3000 in your browser!

### 3. Run with Docker Compose
```bash
docker-compose up --build
```
- App & API: http://localhost:8000
- Prometheus Dashboard: http://localhost:9090
- Grafana: http://localhost:3001
