from fastapi import APIRouter, HTTPException
from app.db.database import fast_cache
from app.services.traffic_generator import traffic_generator
from app.models.schemas import ChaosSettings, ManualRuleConfig
from typing import List

router = APIRouter(prefix="/api/chaos", tags=["Chaos Sandbox & Rules"])

@router.get("/settings")
def get_chaos_settings():
    return fast_cache.get_chaos()

@router.post("/settings")
def update_chaos_settings(payload: ChaosSettings):
    fast_cache.set_chaos(payload.dict())
    return {"status": "success", "chaos": fast_cache.get_chaos()}

@router.post("/traffic/toggle")
def toggle_traffic(payload: dict):
    enabled = payload.get("enabled", True)
    if enabled:
        traffic_generator.start()
        msg = "Synthetic live traffic started"
    else:
        traffic_generator.stop()
        msg = "Synthetic live traffic stopped"
    return {"status": "success", "traffic_active": traffic_generator.is_running, "message": msg}

@router.get("/rules")
def get_rules():
    return fast_cache.get_manual_rules()

@router.post("/rules")
def add_rule(rule: ManualRuleConfig):
    fast_cache.add_manual_rule(rule.dict())
    return {"status": "success", "rules": fast_cache.get_manual_rules()}

@router.delete("/rules")
def clear_rules():
    fast_cache.set_manual_rules([])
    return {"status": "success", "rules": []}
