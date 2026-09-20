import random
import time
from typing import Dict, Any, Tuple
from app.models.schemas import TransactionRequest, FailureReasonCode
from app.db.database import fast_cache

class BaseGatewayAdapter:
    def __init__(self, gateway_id: str, name: str, base_success_rate: float, base_latency_ms: float):
        self.gateway_id = gateway_id
        self.name = name
        self.base_success_rate = base_success_rate
        self.base_latency_ms = base_latency_ms

    def execute_payment(self, request: TransactionRequest) -> Tuple[bool, FailureReasonCode, str, float]:
        chaos = fast_cache.get_chaos()
        gw_chaos = chaos.get("gateways", {}).get(self.gateway_id, {})

        # Check maintenance mode
        if gw_chaos.get("maintenance_mode", False):
            latency = self.base_latency_ms + gw_chaos.get("added_latency_ms", 0.0)
            time.sleep(min(latency, 300.0) / 1000.0)
            return False, FailureReasonCode.GATEWAY_DOWN, f"{self.name} is currently under scheduled maintenance.", latency

        # Check bank outage chaos
        simulated_bank = chaos.get("simulated_bank_outage")
        simulated_method = chaos.get("simulated_method_outage")

        # Specific Chaos Scenario for Gateway C + Bank X + UPI (from problem prompt!)
        if self.gateway_id == "gateway_c" and simulated_bank and request.bank == simulated_bank:
            if not simulated_method or request.payment_method == simulated_method:
                # Force failure on Gateway C for this bank/method combo
                latency = self.base_latency_ms + 250.0
                time.sleep(min(latency, 300.0) / 1000.0)
                return False, FailureReasonCode.BANK_TIMEOUT, f"Simulated bank outage on {self.name} for {request.bank} {request.payment_method}", latency

        # Calculate effective failure rate based on base + forced chaos
        forced_fail = gw_chaos.get("forced_failure_rate", 0.0)
        effective_success_prob = max(0.05, min(0.99, (self.base_success_rate / 100.0) - forced_fail))

        # Add latency (simulated)
        added_lat = gw_chaos.get("added_latency_ms", 0.0)
        total_latency = self.base_latency_ms + added_lat + random.uniform(-15.0, 25.0)
        total_latency = max(20.0, total_latency)
        
        # Simulate slight delay (capped so non-blocking in tests)
        sleep_sec = min(total_latency / 1000.0, 0.2)
        time.sleep(sleep_sec)

        # Roll die for success/failure
        roll = random.random()
        if roll <= effective_success_prob:
            fast_cache.record_attempt(self.gateway_id, True, total_latency, request.bank, request.payment_method)
            return True, FailureReasonCode.NONE, "Transaction Approved", total_latency
        else:
            # Pick failure reason (80% retryable system/network failures, 20% user non-retryable)
            fail_type_roll = random.random()
            if fail_type_roll < 0.50:
                code = FailureReasonCode.BANK_TIMEOUT
                msg = f"Bank network timeout on {self.name}"
            elif fail_type_roll < 0.80:
                code = FailureReasonCode.GATEWAY_DOWN
                msg = f"{self.name} payment processing unit temporarily unavailable"
            elif fail_type_roll < 0.90:
                code = FailureReasonCode.NETWORK_ERROR
                msg = f"Socket connection dropped during handshaking with {self.name}"
            else:
                code = FailureReasonCode.CARD_DECLINED
                msg = "Card issuing bank declined authorization"

            fast_cache.record_attempt(self.gateway_id, False, total_latency, request.bank, request.payment_method)
            return False, code, msg, total_latency


class GatewayAAdapter(BaseGatewayAdapter):
    def __init__(self):
        super().__init__(
            gateway_id="gateway_a",
            name="Gateway A (ApexPay)",
            base_success_rate=94.2,
            base_latency_ms=110.0
        )

class GatewayBAdapter(BaseGatewayAdapter):
    def __init__(self):
        super().__init__(
            gateway_id="gateway_b",
            name="Gateway B (JusRoute)",
            base_success_rate=98.1,
            base_latency_ms=85.0
        )

class GatewayCAdapter(BaseGatewayAdapter):
    def __init__(self):
        super().__init__(
            gateway_id="gateway_c",
            name="Gateway C (GlobalPay)",
            base_success_rate=95.3,
            base_latency_ms=135.0
        )

# Registry of Adapters
gateway_adapters: Dict[str, BaseGatewayAdapter] = {
    "gateway_a": GatewayAAdapter(),
    "gateway_b": GatewayBAdapter(),
    "gateway_c": GatewayCAdapter()
}

def get_gateway_adapter(gateway_id: str) -> BaseGatewayAdapter:
    return gateway_adapters.get(gateway_id, gateway_adapters["gateway_a"])
