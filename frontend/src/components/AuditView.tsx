import React, { useState } from 'react';
import { TransactionRecord } from '../types';
import { Search, ChevronRight, X, Cpu, ShieldCheck } from 'lucide-react';

interface AuditViewProps {
  transactions: TransactionRecord[];
  selectedTx: TransactionRecord | null;
  onSelectTx: (tx: TransactionRecord | null) => void;
}

export const AuditView: React.FC<AuditViewProps> = ({
  transactions,
  selectedTx,
  onSelectTx,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filteredTxs = transactions.filter((tx) => {
    const matchesSearch =
      tx.transaction_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.bank.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.customer_id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !statusFilter || tx.final_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Search Header */}
      <div className="p-5 rounded-xl shadcn-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-extrabold text-white">Transaction Audit Trail</h2>
          <p className="text-xs text-zinc-400">Complete record of ML decision scores, NPCI MDR savings, and attempt cascades</p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search Tx ID, Bank, Cust..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FALLBACK_RECOVERED">FALLBACK_RECOVERED</option>
            <option value="FAILED">FAILED</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl shadcn-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-900 text-zinc-400 uppercase font-bold text-[10px] tracking-wider border-b border-zinc-800">
              <tr>
                <th className="p-3.5">Transaction ID</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Amount</th>
                <th className="p-3.5">Bank & Method</th>
                <th className="p-3.5">Gateway</th>
                <th className="p-3.5">MDR Saved</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80 font-medium">
              {filteredTxs.length > 0 ? (
                filteredTxs.map((tx) => (
                  <tr
                    key={tx.transaction_id}
                    onClick={() => onSelectTx(tx)}
                    className="hover:bg-zinc-900/60 cursor-pointer transition-all"
                  >
                    <td className="p-3.5 font-mono font-bold text-white">{tx.transaction_id}</td>
                    <td className="p-3.5 text-zinc-300">{tx.customer_id}</td>
                    <td className="p-3.5 font-bold text-white">₹{tx.amount.toLocaleString()}</td>
                    <td className="p-3.5">
                      <span className="font-semibold text-white">{tx.bank}</span>
                      <span className="text-[10px] text-zinc-400 block">{tx.payment_method}</span>
                    </td>
                    <td className="p-3.5 font-bold text-zinc-300">{tx.chosen_gateway}</td>
                    <td className="p-3.5 text-emerald-400 font-bold">
                      {tx.mdr_savings_inr > 0 ? `+₹${tx.mdr_savings_inr}` : '-'}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                          tx.final_status === 'SUCCESS'
                            ? 'bg-zinc-800 text-white'
                            : tx.final_status === 'FALLBACK_RECOVERED'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-red-950 text-red-400 border border-red-800'
                        }`}
                      >
                        {tx.final_status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <ChevronRight className="w-4 h-4 text-zinc-500 inline-block" />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-zinc-500">
                    No transactions matching filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Drawer */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-xl w-full p-6 space-y-5 relative shadow-2xl">
            
            <button
              onClick={() => onSelectTx(null)}
              className="absolute top-4 right-4 p-1.5 rounded-md bg-zinc-800 text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-xs font-mono text-zinc-400">{selectedTx.transaction_id}</span>
              <h3 className="text-2xl font-black text-white mt-0.5">₹{selectedTx.amount.toLocaleString()}</h3>
              <p className="text-xs text-zinc-400">{selectedTx.bank} • {selectedTx.payment_method}</p>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-zinc-400" />
                <span>Gateway Scores & MDR Rates</span>
              </h4>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {selectedTx.routing_decision.ranked_scores.map((s) => (
                  <div key={s.gateway_id} className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-0.5">
                    <p className="font-semibold text-zinc-300">{s.gateway_name.split(' ')[0]}</p>
                    <p className="text-base font-bold text-white">{(s.success_probability * 100).toFixed(1)}%</p>
                    <p className="text-[10px] text-emerald-400">MDR {s.mdr_fee_percent}%</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1 font-mono text-xs text-zinc-400">
              <p className="text-[10px] text-zinc-300 font-bold uppercase font-sans">Decision Logs:</p>
              {selectedTx.routing_decision.eligibility_logs.map((log, idx) => (
                <p key={idx} className="text-[11px]">› {log}</p>
              ))}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
