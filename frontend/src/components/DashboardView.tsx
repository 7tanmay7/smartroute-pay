import React from 'react';
import { SystemHealthOverview, TransactionRecord } from '../types';
import {
  Activity,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Zap,
  TrendingDown,
  ShieldCheck,
  Percent,
  CheckCircle,
  XCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';

interface DashboardViewProps {
  overview: SystemHealthOverview | null;
  recentTransactions: TransactionRecord[];
  onApplyRecommendation: (alertId: string, actionDesc: string) => void;
  onOpenAuditDetail: (tx: TransactionRecord) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  overview,
  recentTransactions,
  onApplyRecommendation,
  onOpenAuditDetail,
}) => {
  const chartData = React.useMemo(() => {
    if (!recentTransactions.length) {
      return Array.from({ length: 10 }).map((_, i) => ({
        time: `${i + 1}m ago`,
        success_rate: 96.0 + Math.random() * 3,
        latency: 100 + Math.random() * 20
      }));
    }

    const chunks: { time: string; success_rate: number; latency: number }[] = [];
    const reversed = [...recentTransactions].reverse().slice(0, 15);
    
    reversed.forEach((tx, idx) => {
      chunks.push({
        time: `${idx + 1}s ago`,
        success_rate: tx.final_status === 'FAILED' ? 88.0 : tx.fallback_used ? 95.0 : 99.0,
        latency: tx.total_latency_ms
      });
    });
    return chunks;
  }, [recentTransactions]);

  const overallSR = overview?.overall_success_rate ?? 96.8;
  const mdrSavings = overview?.total_mdr_savings_today ?? 14280.50;

  return (
    <div className="space-y-6">
      
      {/* Active Degradation Alerts Banner */}
      {overview && overview.active_alerts && overview.active_alerts.length > 0 && (
        <div className="space-y-3">
          {overview.active_alerts.map((alert) => (
            <div
              key={alert.alert_id}
              className="p-4 rounded-xl bg-zinc-900 border border-zinc-700 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
            >
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-md bg-amber-500/10 text-amber-400 mt-0.5 border border-amber-500/20">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white text-xs">{alert.message}</span>
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Degradation Alert
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    <strong className="text-zinc-200">Recommended action:</strong> {alert.recommended_action}
                  </p>
                </div>
              </div>

              <button
                onClick={() => onApplyRecommendation(alert.alert_id, alert.recommended_action)}
                className="px-4 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs shadow flex items-center justify-center space-x-2 transition-all whitespace-nowrap"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Apply Override Rule</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Shadcn Stat Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Overall Success Rate */}
        <div className="p-5 rounded-xl shadcn-card relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Overall Success Rate</span>
            <Activity className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">{overallSR}%</span>
            <span className="text-xs font-semibold text-emerald-400 flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" /> +0.4%
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-3">Target benchmark: ≥ 96.0%</p>
        </div>

        {/* NPCI UPI >₹2,000 Merchant MDR Savings */}
        <div className="p-5 rounded-xl shadcn-card border-emerald-950/80 bg-zinc-900/90 relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center space-x-1">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>NPCI MDR Savings Today</span>
            </span>
            <Percent className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-white tracking-tight">₹{mdrSavings.toLocaleString()}</span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-3">Saved on UPI payments &gt;₹2,000 vs 1.1% fee</p>
        </div>

        {/* Processed Volume Today */}
        <div className="p-5 rounded-xl shadcn-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Processed Today</span>
            <Clock className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {overview?.total_transactions_today ?? 1420}
            </span>
            <span className="text-xs font-medium text-zinc-500">txs</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-3">Throughput ~42 tx/min</p>
        </div>

        {/* Fallback Recovery */}
        <div className="p-5 rounded-xl shadcn-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Fallback Recoveries</span>
            <ShieldCheck className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">99.2%</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-3">Prevented payment failures via smart retry</p>
        </div>

      </div>

      {/* Gateway Health Status Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
            Gateway Health & NPCI Fee Matrix
          </h3>
          <span className="text-xs text-zinc-500 font-mono">Real-time Sliding Window</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {overview?.gateways.map((gw) => (
            <div
              key={gw.gateway_id}
              className={`p-5 rounded-xl shadcn-card space-y-3 ${
                gw.circuit_broken ? 'border-red-900 bg-red-950/10' : gw.degraded ? 'border-amber-900 bg-amber-950/10' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{gw.gateway_name}</span>
                <span
                  className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                    gw.circuit_broken
                      ? 'bg-red-500/10 text-red-400 border-red-500/30'
                      : gw.degraded
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  {gw.circuit_broken ? 'CIRCUIT BROKEN' : gw.degraded ? 'DEGRADED' : 'HEALTHY'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800">
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase">Success Rate</p>
                  <p className="text-xl font-extrabold text-white mt-0.5">{gw.success_rate}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase">MDR Rate (&gt;₹2k UPI)</p>
                  <p className="text-xl font-extrabold text-emerald-400 mt-0.5">
                    {gw.gateway_id === 'gateway_b' ? '0.0% (Zero-MDR)' : gw.gateway_id === 'gateway_a' ? '0.9%' : '1.1%'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts & Live Stream Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Success Rate Chart */}
        <div className="lg:col-span-2 p-5 rounded-xl shadcn-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">System Performance Stream</h3>
              <p className="text-xs text-zinc-400">Success rate and multi-objective routing latency</p>
            </div>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fafafa" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#fafafa" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#52525b" fontSize={11} tickLine={false} />
                <YAxis domain={[80, 100]} stroke="#52525b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '6px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="success_rate" stroke="#fafafa" strokeWidth={2} fillOpacity={1} fill="url(#colorSr)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Audit Stream */}
        <div className="p-5 rounded-xl shadcn-card space-y-4 flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Clock className="w-4 h-4 text-zinc-400" />
              <span>Live Audit Stream</span>
            </h3>
            <span className="text-[10px] font-mono text-zinc-400 uppercase">Active</span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-64 space-y-2 pr-1">
            {recentTransactions.slice(0, 7).map((tx) => (
              <div
                key={tx.transaction_id}
                onClick={() => onOpenAuditDetail(tx)}
                className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-all flex items-center justify-between text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white">{tx.bank}</span>
                    <span className="text-[10px] text-zinc-400">{tx.payment_method}</span>
                  </div>
                  <p className="text-[10px] text-zinc-400">
                    ₹{tx.amount.toLocaleString()} • {tx.chosen_gateway}
                  </p>
                </div>

                <div className="text-right">
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                      tx.final_status === 'SUCCESS'
                        ? 'bg-zinc-800 text-white'
                        : tx.final_status === 'FALLBACK_RECOVERED'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-red-950 text-red-400 border border-red-800'
                    }`}
                  >
                    {tx.final_status === 'FALLBACK_RECOVERED' ? 'RECOVERED' : tx.final_status}
                  </span>
                  {tx.mdr_savings_inr > 0 && (
                    <p className="text-[9px] text-emerald-400 mt-0.5">Saved ₹{tx.mdr_savings_inr}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
