import json
import time
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy import create_engine, Column, String, Float, Boolean, Integer, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "sqlite:///./payment_orchestrator.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class DBTransaction(Base):
    __tablename__ = "transactions"

    transaction_id = Column(String, primary_key=True, index=True)
    customer_id = Column(String, index=True)
    merchant_id = Column(String, index=True)
    amount = Column(Float)
    currency = Column(String)
    bank = Column(String)
    payment_method = Column(String)
    device = Column(String)
    location = Column(String)
    final_status = Column(String, index=True)
    chosen_gateway = Column(String)
    total_attempts = Column(Integer, default=1)
    fallback_used = Column(Boolean, default=False)
    mdr_cost_inr = Column(Float, default=0.0)
    mdr_savings_inr = Column(Float, default=0.0)
    total_latency_ms = Column(Float)
    attempts_json = Column(Text)
    routing_decision_json = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class DBAlert(Base):
    __tablename__ = "alerts"

    alert_id = Column(String, primary_key=True, index=True)
    gateway_id = Column(String)
    bank = Column(String)
    payment_method = Column(String)
    failure_rate_increase = Column(Float)
    current_failure_rate = Column(Float)
    message = Column(String)
    recommended_action = Column(String)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Fast State & In-Memory Rolling Metrics
class FastStateCache:
    def __init__(self):
        self._gateway_sliding_window: Dict[str, List[Dict[str, Any]]] = {
            "gateway_a": [],
            "gateway_b": [],
            "gateway_c": []
        }
        self._manual_rules: List[Dict[str, Any]] = []
        self._total_mdr_savings_today: float = 14280.50
        self._chaos_settings = {
            "gateways": {
                "gateway_a": {"gateway_id": "gateway_a", "forced_failure_rate": 0.05, "added_latency_ms": 120.0, "maintenance_mode": False},
                "gateway_b": {"gateway_id": "gateway_b", "forced_failure_rate": 0.02, "added_latency_ms": 90.0, "maintenance_mode": False},
                "gateway_c": {"gateway_id": "gateway_c", "forced_failure_rate": 0.08, "added_latency_ms": 150.0, "maintenance_mode": False},
            },
            "simulated_bank_outage": None,
            "simulated_method_outage": None
        }

    def record_attempt(self, gateway_id: str, success: bool, latency_ms: float, bank: str, method: str):
        if gateway_id not in self._gateway_sliding_window:
            self._gateway_sliding_window[gateway_id] = []
        
        record = {
            "success": success,
            "latency_ms": latency_ms,
            "bank": bank,
            "method": method,
            "timestamp": time.time()
        }
        self._gateway_sliding_window[gateway_id].append(record)
        if len(self._gateway_sliding_window[gateway_id]) > 200:
            self._gateway_sliding_window[gateway_id].pop(0)

    def add_mdr_savings(self, savings_inr: float):
        if savings_inr > 0:
            self._total_mdr_savings_today += savings_inr

    def get_total_mdr_savings(self) -> float:
        return round(self._total_mdr_savings_today, 2)

    def get_gateway_stats(self, gateway_id: str) -> Dict[str, Any]:
        records = self._gateway_sliding_window.get(gateway_id, [])
        if not records:
            return {
                "success_rate": 95.0,
                "avg_latency_ms": 100.0,
                "total": 0,
                "failed": 0
            }
        
        total = len(records)
        successful = sum(1 for r in records if r["success"])
        failed = total - successful
        avg_latency = sum(r["latency_ms"] for r in records) / total
        success_rate = (successful / total) * 100.0 if total > 0 else 95.0
        
        return {
            "success_rate": round(success_rate, 1),
            "avg_latency_ms": round(avg_latency, 1),
            "total": total,
            "failed": failed
        }

    def set_chaos(self, chaos_dict: dict):
        self._chaos_settings = chaos_dict

    def get_chaos(self) -> dict:
        return self._chaos_settings

    def add_manual_rule(self, rule: dict):
        self._manual_rules.append(rule)

    def get_manual_rules(self) -> list:
        return [r for r in self._manual_rules if r.get("active", True)]

    def set_manual_rules(self, rules: list):
        self._manual_rules = rules

fast_cache = FastStateCache()
