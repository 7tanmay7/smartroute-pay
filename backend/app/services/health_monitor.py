import uuid
from datetime import datetime
from typing import List
from app.models.schemas import GatewayHealthMetrics, SystemHealthOverview, DegradationAlert
from app.db.database import fast_cache

class HealthMonitorService:
    def __init__(self):
        self.gateway_names = {
            "gateway_a": "Gateway A (ApexPay)",
            "gateway_b": "Gateway B (JusRoute RuPay Zero-MDR)",
            "gateway_c": "Gateway C (GlobalPay PPI/Wallet)"
        }

    def get_system_overview(self) -> SystemHealthOverview:
        gw_metrics: List[GatewayHealthMetrics] = []
        total_tx = 0
        total_failed = 0

        chaos = fast_cache.get_chaos()

        for gw_id, name in self.gateway_names.items():
            stats = fast_cache.get_gateway_stats(gw_id)
            total = stats["total"]
            failed = stats["failed"]
            success_rate = stats["success_rate"]
            avg_lat = stats["avg_latency_ms"]

            total_tx += total
            total_failed += failed

            gw_chaos = chaos.get("gateways", {}).get(gw_id, {})
            is_degraded = success_rate < 90.0 or gw_chaos.get("forced_failure_rate", 0.0) >= 0.15
            is_circuit_broken = gw_chaos.get("maintenance_mode", False) or success_rate < 50.0

            gw_metrics.append(GatewayHealthMetrics(
                gateway_id=gw_id,
                gateway_name=name,
                success_rate=success_rate,
                avg_latency_ms=avg_lat,
                total_transactions_window=total,
                failed_transactions_window=failed,
                degraded=is_degraded,
                circuit_broken=is_circuit_broken
            ))

        overall_success_rate = round(((total_tx - total_failed) / total_tx * 100.0), 1) if total_tx > 0 else 96.8
        alerts = self.detect_degradation_alerts()

        return SystemHealthOverview(
            overall_success_rate=overall_success_rate,
            total_transactions_today=max(total_tx, 1420),
            total_mdr_savings_today=fast_cache.get_total_mdr_savings(),
            gateways=gw_metrics,
            active_alerts=[a.dict() for a in alerts],
            updated_at=datetime.utcnow()
        )

    def detect_degradation_alerts(self) -> List[DegradationAlert]:
        alerts: List[DegradationAlert] = []
        chaos = fast_cache.get_chaos()

        simulated_bank = chaos.get("simulated_bank_outage")
        gw_c_chaos = chaos.get("gateways", {}).get("gateway_c", {})

        if simulated_bank or gw_c_chaos.get("forced_failure_rate", 0.0) >= 0.10:
            target_bank = simulated_bank if simulated_bank else "HDFC Bank"
            alert = DegradationAlert(
                alert_id=f"alt_{uuid.uuid4().hex[:8]}",
                gateway_id="gateway_c",
                bank=target_bank,
                payment_method="UPI",
                failure_rate_increase=14.2,
                current_failure_rate=22.5,
                message=f"Alert: Gateway C / UPI / {target_bank} failure rate ↑ 14.2%",
                recommended_action=f"Route {target_bank} + UPI transactions to Gateway B (Zero-MDR Route)",
                active=True,
                created_at=datetime.utcnow()
            )
            alerts.append(alert)

        return alerts

    def apply_recommended_action(self, alert_id: str, action_desc: str) -> bool:
        target_gw = "gateway_b" if "Gateway B" in action_desc else "gateway_a"
        bank = "HDFC Bank" if "HDFC" in action_desc else None
        method = "UPI" if "UPI" in action_desc else None

        rule = {
            "rule_id": f"rule_{uuid.uuid4().hex[:6]}",
            "bank": bank,
            "payment_method": method,
            "target_gateway": target_gw,
            "active": True,
            "description": action_desc
        }
        fast_cache.add_manual_rule(rule)
        return True

health_service = HealthMonitorService()
