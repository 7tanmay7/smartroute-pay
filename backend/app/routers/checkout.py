from fastapi import APIRouter, HTTPException, Depends
from app.models.schemas import TransactionRequest, TransactionRecord
from app.services.failure_recovery import failure_recovery_engine
from app.services.event_bus import event_bus
from app.services.health_monitor import health_service

router = APIRouter(prefix="/api/checkout", tags=["Checkout & Routing"])

@router.post("", response_model=TransactionRecord)
async def process_checkout(request: TransactionRequest):
    try:
        tx_record = failure_recovery_engine.process_transaction(request)
        
        # Broadcast event
        await event_bus.broadcast_event("TRANSACTION_PROCESSED", tx_record.dict())
        await event_bus.broadcast_event("HEALTH_UPDATE", health_service.get_system_overview().dict())
        
        return tx_record
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
