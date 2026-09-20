export type PaymentMethod = "UPI" | "CREDIT_CARD" | "DEBIT_CARD" | "NET_BANKING";
export type BankName = "HDFC Bank" | "ICICI Bank" | "State Bank of India" | "Axis Bank" | "Chase Bank";
export type DeviceType = "MOBILE" | "DESKTOP";
export type TransactionStatus = "SUCCESS" | "FAILED" | "PENDING" | "FALLBACK_RECOVERED";

export interface TransactionRequest {
  customer_id: string;
  merchant_id: string;
  amount: number;
  currency: string;
  bank: BankName;
  payment_method: PaymentMethod;
  device: DeviceType;
  location: string;
  force_gateway?: string;
  optimize_npci_mdr?: boolean;
}

export interface GatewayScore {
  gateway_id: string;
  gateway_name: string;
  success_probability: number;
  mdr_fee_percent: number;
  mdr_cost_inr: number;
  eligible: boolean;
  rejection_reason?: string;
  rank: number;
  final_score: number;
}

export interface RoutingDecision {
  selected_gateway: string;
  ranked_scores: GatewayScore[];
  eligibility_logs: string[];
  rule_overrides_applied: string[];
  npci_mdr_savings_inr: number;
  strategy_used: string;
  decision_latency_ms: number;
}

export interface TransactionAttempt {
  attempt_number: number;
  gateway_id: string;
  gateway_name: string;
  success: boolean;
  error_code: string;
  error_message?: string;
  retryable: boolean;
  latency_ms: number;
  timestamp: string;
}

export interface TransactionRecord {
  transaction_id: string;
  customer_id: string;
  merchant_id: string;
  amount: number;
  currency: string;
  bank: string;
  payment_method: string;
  device: string;
  location: string;
  final_status: TransactionStatus;
  chosen_gateway: string;
  attempts: TransactionAttempt[];
  total_attempts: number;
  fallback_used: boolean;
  mdr_cost_inr: number;
  mdr_savings_inr: number;
  routing_decision: RoutingDecision;
  total_latency_ms: number;
  created_at: string;
}

export interface GatewayHealthMetrics {
  gateway_id: string;
  gateway_name: string;
  success_rate: number;
  avg_latency_ms: number;
  total_transactions_window: number;
  failed_transactions_window: number;
  degraded: boolean;
  circuit_broken: boolean;
}

export interface DegradationAlert {
  alert_id: string;
  gateway_id: string;
  bank: string;
  payment_method: string;
  failure_rate_increase: number;
  current_failure_rate: number;
  message: string;
  recommended_action: string;
  active: boolean;
  created_at: string;
}

export interface SystemHealthOverview {
  overall_success_rate: number;
  total_transactions_today: number;
  total_mdr_savings_today: number;
  gateways: GatewayHealthMetrics[];
  active_alerts: DegradationAlert[];
  updated_at: string;
}

export interface ChaosGatewayConfig {
  gateway_id: string;
  forced_failure_rate: number;
  added_latency_ms: number;
  maintenance_mode: boolean;
}

export interface ChaosSettings {
  gateways: Record<string, ChaosGatewayConfig>;
  simulated_bank_outage?: string | null;
  simulated_method_outage?: string | null;
}
