import time
from datetime import datetime
from typing import List, Dict, Any
from app.models.schemas import TransactionRequest, GatewayScore, RoutingDecision
from app.services.model_trainer import ml_model
from app.db.database import fast_cache

class MLRoutingEngine:
    def __init__(self):
        self.all_gateways = [
            {"id": "gateway_a", "name": "Gateway A (ApexPay)"},
            {"id": "gateway_b", "name": "Gateway B (JusRoute RuPay Zero-MDR)"},
            {"id": "gateway_c", "name": "Gateway C (GlobalPay PPI/Wallet)"}
        ]

    def _get_gateway_mdr_rate(self, gateway_id: str, payment_method: str, amount: float) -> float:
        # NPCI Interchange fee rule for UPI > ₹2,000
        if payment_method == "UPI" and amount > 2000.0:
            if gateway_id == "gateway_b":
                return 0.0  # 0.0% Zero-MDR RuPay/Direct Bank route
            elif gateway_id == "gateway_a":
                return 0.90  # 0.90% Standard MDR
            elif gateway_id == "gateway_c":
                return 1.10  # 1.10% PPI/Wallet Interchange
        elif payment_method in ["CREDIT_CARD", "DEBIT_CARD"]:
            if gateway_id == "gateway_a":
                return 1.20
            elif gateway_id == "gateway_b":
                return 1.40
            return 1.50
        return 0.0

    def evaluate_and_route(self, request: TransactionRequest) -> RoutingDecision:
        start_time = time.time()
        eligibility_logs: List[str] = []
        rule_overrides_applied: List[str] = []

        chaos = fast_cache.get_chaos()
        manual_rules = fast_cache.get_manual_rules()

        # Step 1: Manual Overrides
        forced_gw = request.force_gateway
        if forced_gw:
            rule_overrides_applied.append(f"Manual Force Override requested for {forced_gw}")

        for rule in manual_rules:
            rule_bank = rule.get("bank")
            rule_method = rule.get("payment_method")
            if (not rule_bank or rule_bank == request.bank) and (not rule_method or rule_method == request.payment_method):
                target = rule.get("target_gateway")
                if target:
                    forced_gw = target
                    rule_overrides_applied.append(f"Active Rule matched: '{rule.get('description', 'Manual Rule')}' -> Directing to {target}")

        now = datetime.now()
        hour = now.hour
        day_of_week = now.weekday()

        scores: List[GatewayScore] = []
        is_high_value_upi = (request.payment_method == "UPI" or getattr(request.payment_method, "value", str(request.payment_method)) == "UPI") and request.amount > 2000.0

        if is_high_value_upi:
            eligibility_logs.append(f"[NPCI Rule Triggered] UPI Transaction > ₹2,000 detected (₹{request.amount}). Applying MDR Interchange Optimization.")

        # Step 2: Eligibility & Scorer
        for gw in self.all_gateways:
            gw_id = gw["id"]
            gw_name = gw["name"]
            is_eligible = True
            rejection_reason = None

            gw_chaos = chaos.get("gateways", {}).get(gw_id, {})

            # Rule 1: Maintenance Check
            if gw_chaos.get("maintenance_mode", False):
                is_eligible = False
                rejection_reason = "Gateway under maintenance (Circuit Breaker OPEN)"
                eligibility_logs.append(f"[{gw_name}] Rejected: Circuit Breaker OPEN.")

            # Rule 2: Single transaction limit for Gateway C
            elif gw_id == "gateway_c" and request.amount > 100000.0:
                is_eligible = False
                rejection_reason = "Amount exceeds Gateway C single-transaction limit (₹100,000)"
                eligibility_logs.append(f"[{gw_name}] Rejected: Amount ₹{request.amount} exceeds limit ₹100,000.")

            # Rule 3: Severe Degradation skip
            elif gw_chaos.get("forced_failure_rate", 0.0) >= 0.50:
                stats = fast_cache.get_gateway_stats(gw_id)
                if stats.get("success_rate", 100.0) < 60.0:
                    is_eligible = False
                    rejection_reason = f"Gateway degraded ({stats.get('success_rate')}% success)"
                    eligibility_logs.append(f"[{gw_name}] Rejected: Severe degradation detected.")

            if is_eligible:
                eligibility_logs.append(f"[{gw_name}] Passed deterministic eligibility checks.")

            # ML Probability Scorer
            stats = fast_cache.get_gateway_stats(gw_id)
            gw_succ_rate = stats.get("success_rate", 95.0) / 100.0
            prev_fail_rate = stats.get("failed", 0) / max(1, stats.get("total", 1))

            bank_gw_fail_rate = 1.0 - gw_succ_rate
            if gw_chaos.get("forced_failure_rate", 0.0) > 0:
                bank_gw_fail_rate += gw_chaos.get("forced_failure_rate", 0.0)

            features = {
                "bank": request.bank.value if hasattr(request.bank, "value") else str(request.bank),
                "payment_method": request.payment_method.value if hasattr(request.payment_method, "value") else str(request.payment_method),
                "gateway": gw_id,
                "merchant": request.merchant_id,
                "device": request.device.value if hasattr(request.device, "value") else str(request.device),
                "location": request.location,
                "amount": request.amount,
                "hour": hour,
                "day_of_week": day_of_week,
                "previous_failure_rate": prev_fail_rate,
                "gateway_success_rate": gw_succ_rate,
                "bank_gateway_failure_rate": bank_gw_fail_rate
            }

            predicted_prob = ml_model.predict_proba_safe(features, gw_id, is_eligible)
            mdr_rate = self._get_gateway_mdr_rate(gw_id, str(features["payment_method"]), request.amount)
            mdr_cost_inr = round(request.amount * (mdr_rate / 100.0), 2)

            # Multi-Objective Score: Weight Success Probability (70%) vs Low MDR Cost (30%)
            final_combined_score = predicted_prob
            if request.optimize_npci_mdr and is_high_value_upi and is_eligible:
                fee_penalty = (mdr_rate / 1.10) * 0.15
                final_combined_score = max(0.01, predicted_prob - fee_penalty)

            if forced_gw == gw_id:
                final_combined_score = 0.999
                predicted_prob = 0.999

            scores.append(GatewayScore(
                gateway_id=gw_id,
                gateway_name=gw_name,
                success_probability=round(predicted_prob, 3),
                mdr_fee_percent=mdr_rate,
                mdr_cost_inr=mdr_cost_inr,
                eligible=is_eligible,
                rejection_reason=rejection_reason,
                final_score=round(final_combined_score, 4)
            ))

        # Rank eligible gateways by final_score
        eligible_scores = [s for s in scores if s.eligible]
        if not eligible_scores:
            eligible_scores = scores
            eligibility_logs.append("WARNING: All gateways failed strict eligibility checks. Falling back to best available.")

        eligible_scores.sort(key=lambda s: s.final_score, reverse=True)
        for idx, score in enumerate(eligible_scores):
            score.rank = idx + 1

        selected_gw = eligible_scores[0]
        selected_id = selected_gw.gateway_id

        # Calculate MDR savings compared to 1.1% max PPI interchange
        max_possible_mdr = round(request.amount * 0.011, 2)
        actual_mdr = selected_gw.mdr_cost_inr
        mdr_savings = max(0.0, max_possible_mdr - actual_mdr)

        if mdr_savings > 0 and is_high_value_upi:
            eligibility_logs.append(f"MDR Savings Achieved: Saved ₹{mdr_savings:.2f} in merchant interchange fees by routing to {selected_gw.gateway_name} ({selected_gw.mdr_fee_percent}% fee vs 1.1% max).")

        decision_lat = round((time.time() - start_time) * 1000.0, 2)

        return RoutingDecision(
            selected_gateway=selected_id,
            ranked_scores=scores,
            eligibility_logs=eligibility_logs,
            rule_overrides_applied=rule_overrides_applied,
            npci_mdr_savings_inr=round(mdr_savings, 2),
            strategy_used="NPCI_MDR_MULTI_OBJECTIVE" if is_high_value_upi else "ML_PROBABILITY_RANKING",
            decision_latency_ms=decision_lat
        )

routing_engine = MLRoutingEngine()
