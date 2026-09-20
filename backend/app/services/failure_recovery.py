import time
import uuid
import json
from datetime import datetime
from typing import List
from app.models.schemas import (
    TransactionRequest, TransactionRecord, TransactionAttempt,
    TransactionStatus, FailureReasonCode, RoutingDecision
)
from app.services.gateways import get_gateway_adapter
from app.services.ml_router import routing_engine
from app.db.database import DBTransaction, SessionLocal, fast_cache

RETRYABLE_ERROR_CODES = {
    FailureReasonCode.BANK_TIMEOUT,
    FailureReasonCode.GATEWAY_DOWN,
    FailureReasonCode.NETWORK_ERROR
}

class FailureRecoveryEngine:
    def is_retryable(self, error_code: FailureReasonCode) -> bool:
        return error_code in RETRYABLE_ERROR_CODES

    def process_transaction(self, request: TransactionRequest) -> TransactionRecord:
        tx_id = f"tx_{uuid.uuid4().hex[:10]}"
        start_time = time.time()

        # Step 1: Run Multi-Objective ML & Eligibility Engine
        routing_decision: RoutingDecision = routing_engine.evaluate_and_route(request)
        ranked_scores = routing_decision.ranked_scores

        attempts: List[TransactionAttempt] = []
        final_status = TransactionStatus.FAILED
        chosen_gateway = routing_decision.selected_gateway
        fallback_used = False

        candidate_gateways = [s.gateway_id for s in ranked_scores if s.eligible]
        if not candidate_gateways:
            candidate_gateways = [routing_decision.selected_gateway]

        # Step 2: Attempt Execution Cascade
        attempt_num = 1
        for gw_id in candidate_gateways:
            adapter = get_gateway_adapter(gw_id)
            success, error_code, error_msg, latency_ms = adapter.execute_payment(request)
            
            retryable = self.is_retryable(error_code)

            attempt = TransactionAttempt(
                attempt_number=attempt_num,
                gateway_id=gw_id,
                gateway_name=adapter.name,
                success=success,
                error_code=error_code,
                error_message=error_msg,
                retryable=retryable,
                latency_ms=round(latency_ms, 2)
            )
            attempts.append(attempt)

            if success:
                if attempt_num == 1:
                    final_status = TransactionStatus.SUCCESS
                else:
                    final_status = TransactionStatus.FALLBACK_RECOVERED
                    fallback_used = True
                chosen_gateway = gw_id
                break
            else:
                if not retryable:
                    final_status = TransactionStatus.FAILED
                    chosen_gateway = gw_id
                    break
                else:
                    fallback_used = True
                    attempt_num += 1

        total_latency = round((time.time() - start_time) * 1000.0, 2)

        # Get chosen gateway MDR details
        chosen_score = next((s for s in ranked_scores if s.gateway_id == chosen_gateway), None)
        mdr_cost = chosen_score.mdr_cost_inr if chosen_score else 0.0
        mdr_savings = routing_decision.npci_mdr_savings_inr if final_status in [TransactionStatus.SUCCESS, TransactionStatus.FALLBACK_RECOVERED] else 0.0

        # Update global fast cache accumulator
        if mdr_savings > 0:
            fast_cache.add_mdr_savings(mdr_savings)

        tx_record = TransactionRecord(
            transaction_id=tx_id,
            customer_id=request.customer_id,
            merchant_id=request.merchant_id,
            amount=request.amount,
            currency=request.currency,
            bank=request.bank.value if hasattr(request.bank, "value") else str(request.bank),
            payment_method=request.payment_method.value if hasattr(request.payment_method, "value") else str(request.payment_method),
            device=request.device.value if hasattr(request.device, "value") else str(request.device),
            location=request.location,
            final_status=final_status,
            chosen_gateway=chosen_gateway,
            attempts=attempts,
            total_attempts=len(attempts),
            fallback_used=fallback_used,
            mdr_cost_inr=mdr_cost,
            mdr_savings_inr=mdr_savings,
            routing_decision=routing_decision,
            total_latency_ms=total_latency,
            created_at=datetime.utcnow()
        )

        self._persist_transaction(tx_record)
        return tx_record

    def _persist_transaction(self, record: TransactionRecord):
        try:
            db = SessionLocal()
            db_tx = DBTransaction(
                transaction_id=record.transaction_id,
                customer_id=record.customer_id,
                merchant_id=record.merchant_id,
                amount=record.amount,
                currency=record.currency,
                bank=record.bank,
                payment_method=record.payment_method,
                device=record.device,
                location=record.location,
                final_status=record.final_status.value if hasattr(record.final_status, "value") else str(record.final_status),
                chosen_gateway=record.chosen_gateway,
                total_attempts=record.total_attempts,
                fallback_used=record.fallback_used,
                mdr_cost_inr=record.mdr_cost_inr,
                mdr_savings_inr=record.mdr_savings_inr,
                total_latency_ms=record.total_latency_ms,
                attempts_json=json.dumps([a.dict() for a in record.attempts], default=str),
                routing_decision_json=json.dumps(record.routing_decision.dict(), default=str),
                created_at=record.created_at
            )
            db.add(db_tx)
            db.commit()
            db.close()
        except Exception as e:
            print(f"Error persisting transaction: {e}")

failure_recovery_engine = FailureRecoveryEngine()
