from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class PaymentMethod(str, Enum):
    UPI = "UPI"
    CREDIT_CARD = "CREDIT_CARD"
    DEBIT_CARD = "DEBIT_CARD"
    NET_BANKING = "NET_BANKING"

class BankName(str, Enum):
    HDFC = "HDFC Bank"
    ICICI = "ICICI Bank"
    SBI = "State Bank of India"
    AXIS = "Axis Bank"
    CHASE = "Chase Bank"

class DeviceType(str, Enum):
    MOBILE = "MOBILE"
    DESKTOP = "DESKTOP"

class TransactionStatus(str, Enum):
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    PENDING = "PENDING"
    FALLBACK_RECOVERED = "FALLBACK_RECOVERED"

class FailureReasonCode(str, Enum):
    BANK_TIMEOUT = "BANK_TIMEOUT"
    GATEWAY_DOWN = "GATEWAY_DOWN"
    NETWORK_ERROR = "NETWORK_ERROR"
    INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS"
    INVALID_CVV = "INVALID_CVV"
    CARD_DECLINED = "CARD_DECLINED"
    EXPIRED_CARD = "EXPIRED_CARD"
    NONE = "NONE"

# Request Schema
class TransactionRequest(BaseModel):
    customer_id: str = Field(default="cust_1001", description="Unique Customer ID")
    merchant_id: str = Field(default="merch_amazon", description="Merchant Identifier")
    amount: float = Field(default=2499.00, gt=0, description="Transaction amount in INR")
    currency: str = Field(default="INR", description="3-letter currency code")
    bank: BankName = Field(default=BankName.HDFC, description="Issuing bank")
    payment_method: PaymentMethod = Field(default=PaymentMethod.UPI, description="Payment instrument")
    device: DeviceType = Field(default=DeviceType.MOBILE, description="User device type")
    location: str = Field(default="Mumbai, IN", description="Geographic location")
    force_gateway: Optional[str] = Field(default=None, description="Optional manual gateway override")
    optimize_npci_mdr: bool = Field(default=True, description="Enable NPCI >₹2000 UPI Interchange MDR optimization")

# Gateway Scoring & Eligibility
class GatewayScore(BaseModel):
    gateway_id: str
    gateway_name: str
    success_probability: float  # e.g., 0.981 for 98.1%
    mdr_fee_percent: float     # e.g., 0.0 for 0%, 1.1 for 1.1%
    mdr_cost_inr: float        # Fee amount in INR
    eligible: bool
    rejection_reason: Optional[str] = None
    rank: int = 1
    final_score: float = 0.0   # Multi-objective combined score

class RoutingDecision(BaseModel):
    selected_gateway: str
    ranked_scores: List[GatewayScore]
    eligibility_logs: List[str]
    rule_overrides_applied: List[str]
    npci_mdr_savings_inr: float = 0.0
    strategy_used: str = "NPCI_MDR_OPTIMIZED"
    decision_latency_ms: float

# Attempt Detail
class TransactionAttempt(BaseModel):
    attempt_number: int
    gateway_id: str
    gateway_name: str
    success: bool
    error_code: FailureReasonCode
    error_message: Optional[str] = None
    retryable: bool
    latency_ms: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# Full Transaction Schema
class TransactionRecord(BaseModel):
    transaction_id: str
    customer_id: str
    merchant_id: str
    amount: float
    currency: str
    bank: str
    payment_method: str
    device: str
    location: str
    final_status: TransactionStatus
    chosen_gateway: str
    attempts: List[TransactionAttempt]
    total_attempts: int
    fallback_used: bool
    mdr_cost_inr: float = 0.0
    mdr_savings_inr: float = 0.0
    routing_decision: RoutingDecision
    total_latency_ms: float
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Gateway Health & Alerts
class GatewayHealthMetrics(BaseModel):
    gateway_id: str
    gateway_name: str
    success_rate: float  # 0.0 to 100.0
    avg_latency_ms: float
    total_transactions_window: int
    failed_transactions_window: int
    degraded: bool
    circuit_broken: bool

class SystemHealthOverview(BaseModel):
    overall_success_rate: float
    total_transactions_today: int
    total_mdr_savings_today: float
    gateways: List[GatewayHealthMetrics]
    active_alerts: List[Dict[str, Any]]
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class DegradationAlert(BaseModel):
    alert_id: str
    gateway_id: str
    bank: str
    payment_method: str
    failure_rate_increase: float
    current_failure_rate: float
    message: str
    recommended_action: str
    active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ChaosGatewayConfig(BaseModel):
    gateway_id: str
    forced_failure_rate: float = Field(default=0.0, ge=0.0, le=1.0)
    added_latency_ms: float = Field(default=0.0, ge=0.0)
    maintenance_mode: bool = False

class ChaosSettings(BaseModel):
    gateways: Dict[str, ChaosGatewayConfig]
    simulated_bank_outage: Optional[str] = None
    simulated_method_outage: Optional[str] = None

class ManualRuleConfig(BaseModel):
    rule_id: str
    bank: Optional[str] = None
    payment_method: Optional[str] = None
    target_gateway: str
    active: bool = True
    description: str
