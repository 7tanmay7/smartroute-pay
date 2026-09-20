import pytest
from app.models.schemas import TransactionRequest, BankName, PaymentMethod, TransactionStatus
from app.services.ml_router import routing_engine
from app.services.failure_recovery import failure_recovery_engine
from app.services.health_monitor import health_service
from app.db.database import fast_cache, init_db

@pytest.fixture(autouse=True)
def setup_db():
    init_db()

def test_npci_upi_mdr_optimization_for_high_value():
    # UPI Transaction > ₹2,000 (e.g. ₹2,499)
    req = TransactionRequest(
        customer_id="cust_npci_test",
        merchant_id="merch_amazon",
        amount=2499.0,
        bank=BankName.HDFC,
        payment_method=PaymentMethod.UPI,
        optimize_npci_mdr=True
    )
    decision = routing_engine.evaluate_and_route(req)

    # Should select Gateway B (0.0% Zero-MDR) over Gateway C (1.1% Wallet fee)
    assert decision.selected_gateway == "gateway_b"
    assert decision.npci_mdr_savings_inr > 0.0

def test_deterministic_eligibility_rules():
    req = TransactionRequest(
        customer_id="cust_test_1",
        merchant_id="merch_amazon",
        amount=150000.0,
        bank=BankName.HDFC,
        payment_method=PaymentMethod.UPI
    )
    decision = routing_engine.evaluate_and_route(req)
    gw_c_score = next(s for s in decision.ranked_scores if s.gateway_id == "gateway_c")
    assert gw_c_score.eligible is False

def test_fallback_recovery_cascade():
    chaos = fast_cache.get_chaos()
    chaos["gateways"]["gateway_b"]["forced_failure_rate"] = 0.99
    fast_cache.set_chaos(chaos)

    req = TransactionRequest(
        customer_id="cust_test_3",
        merchant_id="merch_amazon",
        amount=500.0,
        bank=BankName.HDFC,
        payment_method=PaymentMethod.UPI
    )

    record = failure_recovery_engine.process_transaction(req)
    assert record.total_attempts >= 2
    assert record.fallback_used is True

    chaos["gateways"]["gateway_b"]["forced_failure_rate"] = 0.02
    fast_cache.set_chaos(chaos)
