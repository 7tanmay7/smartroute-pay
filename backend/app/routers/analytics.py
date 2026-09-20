import json
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db, DBTransaction
from app.models.schemas import SystemHealthOverview
from app.services.health_monitor import health_service

router = APIRouter(prefix="/api", tags=["Analytics & Health"])

@router.get("/health/overview", response_model=SystemHealthOverview)
def get_health_overview():
    return health_service.get_system_overview()

@router.post("/alerts/{alert_id}/apply")
def apply_alert_recommendation(alert_id: str, payload: dict):
    action_desc = payload.get("recommended_action", "Route Bank X + UPI transactions to Gateway B")
    success = health_service.apply_recommended_action(alert_id, action_desc)
    return {"status": "success", "message": f"Applied override: {action_desc}"}

@router.get("/transactions")
def get_transactions(
    limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = None,
    gateway: Optional[str] = None,
    bank: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(DBTransaction)
    if status:
        query = query.filter(DBTransaction.final_status == status)
    if gateway:
        query = query.filter(DBTransaction.chosen_gateway == gateway)
    if bank:
        query = query.filter(DBTransaction.bank == bank)

    records = query.order_by(DBTransaction.created_at.desc()).limit(limit).all()

    result = []
    for r in records:
        attempts = json.loads(r.attempts_json) if r.attempts_json else []
        routing = json.loads(r.routing_decision_json) if r.routing_decision_json else {}
        result.append({
            "transaction_id": r.transaction_id,
            "customer_id": r.customer_id,
            "merchant_id": r.merchant_id,
            "amount": r.amount,
            "currency": r.currency,
            "bank": r.bank,
            "payment_method": r.payment_method,
            "device": r.device,
            "location": r.location,
            "final_status": r.final_status,
            "chosen_gateway": r.chosen_gateway,
            "total_attempts": r.total_attempts,
            "fallback_used": r.fallback_used,
            "total_latency_ms": r.total_latency_ms,
            "attempts": attempts,
            "routing_decision": routing,
            "created_at": r.created_at
        })

    return result

@router.get("/transactions/{transaction_id}")
def get_transaction_detail(transaction_id: str, db: Session = Depends(get_db)):
    tx = db.query(DBTransaction).filter(DBTransaction.transaction_id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    return {
        "transaction_id": tx.transaction_id,
        "customer_id": tx.customer_id,
        "merchant_id": tx.merchant_id,
        "amount": tx.amount,
        "currency": tx.currency,
        "bank": tx.bank,
        "payment_method": tx.payment_method,
        "device": tx.device,
        "location": tx.location,
        "final_status": tx.final_status,
        "chosen_gateway": tx.chosen_gateway,
        "total_attempts": tx.total_attempts,
        "fallback_used": tx.fallback_used,
        "total_latency_ms": tx.total_latency_ms,
        "attempts": json.loads(tx.attempts_json) if tx.attempts_json else [],
        "routing_decision": json.loads(tx.routing_decision_json) if tx.routing_decision_json else {},
        "created_at": tx.created_at
    }
