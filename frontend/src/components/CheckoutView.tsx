import React, { useState } from 'react';
import { BankName, PaymentMethod, TransactionRequest, TransactionRecord } from '../types';
import { api } from '../services/api';
import { CreditCard, CheckCircle, XCircle, Sparkles, RefreshCw, Cpu, ShieldCheck, Percent } from 'lucide-react';

interface CheckoutViewProps {
  onTransactionComplete: (tx: TransactionRecord) => void;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({ onTransactionComplete }) => {
  const [amount, setAmount] = useState<number>(2499.0);
  const [bank, setBank] = useState<BankName>('HDFC Bank');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [optimizeMdr, setOptimizeMdr] = useState<boolean>(true);
  const [forceGateway, setForceGateway] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [lastTransaction, setLastTransaction] = useState<TransactionRecord | null>(null);

  const products = [
    { name: 'UPI >₹2,000 High-Value Order (NPCI MDR Target)', price: 2499.00, icon: '⚡' },
    { name: 'Electronics Purchase', price: 8999.00, icon: '💻' },
    { name: 'Subscription Package', price: 1499.00, icon: '📦' },
    { name: 'High Volume Bulk Order (>₹100k Limit)', price: 125000.00, icon: '💎' },
  ];

  const handlePayNow = async () => {
    setIsProcessing(true);
    try {
      const request: TransactionRequest = {
        customer_id: `cust_${Math.floor(1000 + Math.random() * 9000)}`,
        merchant_id: 'merch_tech_store',
        amount: amount,
        currency: 'INR',
        bank: bank,
        payment_method: paymentMethod,
        device: 'MOBILE',
        location: 'Mumbai, IN',
        force_gateway: forceGateway || undefined,
        optimize_npci_mdr: optimizeMdr
      };

      const result = await api.processCheckout(request);
      setLastTransaction(result);
      onTransactionComplete(result);
    } catch (err) {
      console.error('Checkout failed', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      {/* Left Form */}
      <div className="lg:col-span-5 space-y-6">
        <div className="p-6 rounded-xl shadcn-card space-y-5">
          
          <div className="flex items-center space-x-3 pb-4 border-b border-zinc-800">
            <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Merchant Checkout Simulator</h2>
              <p className="text-xs text-zinc-400">Test ML routing & NPCI &gt;₹2,000 MDR Optimization</p>
            </div>
          </div>

          {/* Sample Product Selection */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Sample Cart Preset</label>
            <div className="space-y-1.5">
              {products.map((p) => (
                <div
                  key={p.name}
                  onClick={() => setAmount(p.price)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between ${
                    amount === p.price
                      ? 'bg-zinc-100 border-zinc-100 text-zinc-950 font-bold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <span>{p.icon}</span>
                    <span>{p.name}</span>
                  </span>
                  <span>₹{p.price.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-400">Transaction Amount (INR)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white font-bold text-sm focus:outline-none focus:border-zinc-500"
            />
            {amount > 2000 && paymentMethod === 'UPI' && (
              <p className="text-[10px] text-emerald-400 font-semibold flex items-center space-x-1 mt-1">
                <Percent className="w-3 h-3" />
                <span>NPCI &gt;₹2,000 Interchange Rule Active: Routing engine will optimize for Zero-MDR.</span>
              </p>
            )}
          </div>

          {/* Bank Selector */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-400">Issuing Bank</label>
            <select
              value={bank}
              onChange={(e) => setBank(e.target.value as BankName)}
              className="w-full px-3.5 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs font-semibold focus:outline-none"
            >
              <option value="HDFC Bank">HDFC Bank</option>
              <option value="ICICI Bank">ICICI Bank</option>
              <option value="State Bank of India">State Bank of India (SBI)</option>
              <option value="Axis Bank">Axis Bank</option>
              <option value="Chase Bank">Chase Bank</option>
            </select>
          </div>

          {/* Payment Method */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-400">Payment Instrument</label>
            <div className="grid grid-cols-2 gap-2">
              {(['UPI', 'CREDIT_CARD', 'DEBIT_CARD', 'NET_BANKING'] as PaymentMethod[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                    paymentMethod === m
                      ? 'bg-zinc-100 text-zinc-950 border-zinc-100'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {m.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* NPCI MDR Optimization Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-800">
            <div>
              <span className="text-xs font-bold text-white">NPCI &gt;₹2,000 MDR Optimization</span>
              <p className="text-[10px] text-zinc-400">Prioritize Zero-MDR gateway for high-value UPI</p>
            </div>
            <input
              type="checkbox"
              checked={optimizeMdr}
              onChange={(e) => setOptimizeMdr(e.target.checked)}
              className="w-4 h-4 accent-zinc-100 rounded cursor-pointer"
            />
          </div>

          {/* Pay Button */}
          <button
            onClick={handlePayNow}
            disabled={isProcessing}
            className="w-full py-3 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-extrabold text-sm shadow flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-zinc-950" />
                <span>Processing Multi-Objective Route...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-zinc-950" />
                <span>Execute Payment (₹{amount.toLocaleString()})</span>
              </>
            )}
          </button>

        </div>
      </div>

      {/* Right Column: Live Step-by-Step Decision Visualizer */}
      <div className="lg:col-span-7 space-y-6">
        {lastTransaction ? (
          <div className="p-6 rounded-xl shadcn-card space-y-6">
            
            {/* Status */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center space-x-3">
                {lastTransaction.final_status === 'SUCCESS' && (
                  <div className="p-2.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                )}
                {lastTransaction.final_status === 'FALLBACK_RECOVERED' && (
                  <div className="p-2.5 rounded-lg bg-zinc-900 text-white border border-zinc-800">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  </div>
                )}
                {lastTransaction.final_status === 'FAILED' && (
                  <div className="p-2.5 rounded-lg bg-red-950 text-red-400 border border-red-800">
                    <XCircle className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    {lastTransaction.final_status === 'FALLBACK_RECOVERED'
                      ? 'Recovered via Smart Fallback'
                      : lastTransaction.final_status === 'SUCCESS'
                      ? 'Transaction Approved'
                      : 'Transaction Declined'}
                  </h3>
                  <p className="text-xs text-zinc-400">Tx ID: {lastTransaction.transaction_id} • Latency: {lastTransaction.total_latency_ms}ms</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xl font-black text-white">₹{lastTransaction.amount.toLocaleString()}</span>
                {lastTransaction.mdr_savings_inr > 0 && (
                  <p className="text-[10px] text-emerald-400 font-bold">Saved ₹{lastTransaction.mdr_savings_inr} Merchant MDR</p>
                )}
              </div>
            </div>

            {/* Gateway Multi-Objective Scores */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-zinc-400" />
                <span>1. Multi-Objective Gateway Scoring (Probability & MDR Fee)</span>
              </h4>

              <div className="grid grid-cols-3 gap-3">
                {lastTransaction.routing_decision.ranked_scores.map((score) => (
                  <div
                    key={score.gateway_id}
                    className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                      score.gateway_id === lastTransaction.chosen_gateway
                        ? 'bg-zinc-900 border-zinc-100 ring-1 ring-zinc-100'
                        : 'bg-zinc-950 border-zinc-800 opacity-80'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-white">{score.gateway_name.split(' ')[0]}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                        Rank #{score.rank}
                      </span>
                    </div>

                    <div>
                      <p className="text-[10px] text-zinc-400">Success Prob: <strong className="text-white">{(score.success_probability * 100).toFixed(1)}%</strong></p>
                      <p className="text-[10px] text-zinc-400">MDR Fee: <strong className="text-emerald-400">{score.mdr_fee_percent}% (₹{score.mdr_cost_inr})</strong></p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rule Logs */}
            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1 font-mono text-xs text-zinc-300">
              <p className="text-[10px] text-zinc-400 font-bold uppercase font-sans">Decision Rationale & NPCI Rule Logs:</p>
              {lastTransaction.routing_decision.eligibility_logs.map((log, idx) => (
                <p key={idx} className="text-[11px] text-zinc-400">› {log}</p>
              ))}
            </div>

            {/* Execution Cascade */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-zinc-400" />
                <span>2. Attempt Audit Trail</span>
              </h4>

              <div className="space-y-2">
                {lastTransaction.attempts.map((attempt) => (
                  <div
                    key={attempt.attempt_number}
                    className="p-3 rounded-lg border border-zinc-800 bg-zinc-950 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="w-6 h-6 rounded bg-zinc-800 font-bold text-white flex items-center justify-center text-xs">
                        #{attempt.attempt_number}
                      </span>
                      <div>
                        <p className="font-bold text-white">{attempt.gateway_name}</p>
                        <p className="text-[11px] text-zinc-400">{attempt.success ? 'Execution Approved' : `FAILED (${attempt.error_code})`}</p>
                      </div>
                    </div>
                    <span className="font-mono text-zinc-400">{attempt.latency_ms}ms</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : (
          <div className="p-12 rounded-xl shadcn-card text-center space-y-3 border-dashed border-zinc-800">
            <Cpu className="w-8 h-8 text-zinc-500 mx-auto" />
            <h3 className="font-bold text-sm text-white">Awaiting Payment Execution</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Select product and click <strong>Execute Payment</strong> to watch real-time NPCI &gt;₹2,000 MDR cost optimization and gateway routing decisions live!
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
