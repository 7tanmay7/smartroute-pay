import asyncio
import random
from app.models.schemas import TransactionRequest, BankName, PaymentMethod, DeviceType
from app.services.failure_recovery import failure_recovery_engine
from app.services.event_bus import event_bus
from app.services.health_monitor import health_service

class TrafficGenerator:
    def __init__(self):
        self.is_running = False
        self._task = None
        self.banks = [BankName.HDFC, BankName.ICICI, BankName.SBI, BankName.AXIS, BankName.CHASE]
        self.methods = [PaymentMethod.UPI, PaymentMethod.CREDIT_CARD, PaymentMethod.DEBIT_CARD, PaymentMethod.NET_BANKING]
        self.devices = [DeviceType.MOBILE, DeviceType.DESKTOP]

    def start(self):
        if not self.is_running:
            self.is_running = True
            self._task = asyncio.create_task(self._run_loop())

    def stop(self):
        self.is_running = False
        if self._task:
            self._task.cancel()

    async def _run_loop(self):
        while self.is_running:
            try:
                # Generate random synthetic transaction request
                bank = random.choice(self.banks)
                method = random.choice(self.methods)
                device = random.choice(self.devices)
                amount = round(float(random.choice([299.0, 499.0, 1299.0, 2499.0, 8999.0, 15000.0])), 2)

                req = TransactionRequest(
                    customer_id=f"cust_{random.randint(1000, 9999)}",
                    merchant_id=random.choice(["merch_amazon", "merch_swiggy", "merch_uber", "merch_flipkart"]),
                    amount=amount,
                    bank=bank,
                    payment_method=method,
                    device=device,
                    location=random.choice(["Mumbai, IN", "Bengaluru, IN", "Delhi, IN"])
                )

                # Process transaction through orchestrator
                tx_record = failure_recovery_engine.process_transaction(req)

                # Broadcast live transaction event over WebSocket
                await event_bus.broadcast_event("TRANSACTION_PROCESSED", tx_record.dict())

                # Also broadcast updated system health overview
                health_overview = health_service.get_system_overview()
                await event_bus.broadcast_event("HEALTH_UPDATE", health_overview.dict())

            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Error in traffic generator loop: {e}")

            # Sleep between synthetic transactions
            await asyncio.sleep(random.uniform(1.5, 3.5))

traffic_generator = TrafficGenerator()
