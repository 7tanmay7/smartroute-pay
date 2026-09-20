import React, { useState, useEffect } from 'react';
import { ChaosSettings } from '../types';
import { api } from '../services/api';
import { Zap, AlertOctagon, RotateCcw, ShieldAlert, Trash2 } from 'lucide-react';

export const ChaosView: React.FC = () => {
  const [chaos, setChaos] = useState<ChaosSettings | null>(null);
  const [rules, setRules] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const c = await api.getChaosSettings();
      setChaos(c);
      const r = await api.getRules();
      setRules(r);
    } catch (err) {
      console.error('Error loading chaos data', err);
    }
  };

  const handleUpdateChaos = async (updated: ChaosSettings) => {
    setChaos(updated);
    await api.updateChaosSettings(updated);
  };

  const handleTriggerBankXOutage = async () => {
    if (!chaos) return;
    const updated: ChaosSettings = {
      ...chaos,
      simulated_bank_outage: 'HDFC Bank',
      simulated_method_outage: 'UPI',
      gateways: {
        ...chaos.gateways,
        gateway_c: {
          ...chaos.gateways.gateway_c,
          forced_failure_rate: 0.85
        }
      }
    };
    await handleUpdateChaos(updated);
  };

  const handleResetChaos = async () => {
    const defaultSettings: ChaosSettings = {
      gateways: {
        gateway_a: { gateway_id: 'gateway_a', forced_failure_rate: 0.0, added_latency_ms: 0.0, maintenance_mode: false },
        gateway_b: { gateway_id: 'gateway_b', forced_failure_rate: 0.0, added_latency_ms: 0.0, maintenance_mode: false },
        gateway_c: { gateway_id: 'gateway_c', forced_failure_rate: 0.0, added_latency_ms: 0.0, maintenance_mode: false },
      },
      simulated_bank_outage: null,
      simulated_method_outage: null
    };
    await handleUpdateChaos(defaultSettings);
    await api.clearRules();
    setRules([]);
  };

  if (!chaos) return <div className="p-8 text-center text-zinc-400">Loading Chaos Sandbox...</div>;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="p-6 rounded-xl shadcn-card space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Gateway Chaos Sandbox</h2>
              <p className="text-xs text-zinc-400">Simulate gateway outages & NPCI fee routing overrides</p>
            </div>
          </div>

          <button
            onClick={handleResetChaos}
            className="px-3.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold flex items-center space-x-2 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
            <span>Reset All Chaos & Rules</span>
          </button>
        </div>

        {/* Presets */}
        <div className="pt-3 border-t border-zinc-800 grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={handleTriggerBankXOutage}
            className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-left hover:border-zinc-700 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs">Simulate Bank X + UPI Outage (Gateway C)</span>
              <AlertOctagon className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-[10px] text-zinc-400 mt-1">Forces 85% failure on Gateway C for HDFC + UPI.</p>
          </button>

          <button
            onClick={async () => {
              const updated = { ...chaos };
              updated.gateways.gateway_a.added_latency_ms = 350.0;
              await handleUpdateChaos(updated);
            }}
            className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-left hover:border-zinc-700 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs">Inject Gateway A Latency (+350ms)</span>
              <Zap className="w-4 h-4 text-zinc-400" />
            </div>
            <p className="text-[10px] text-zinc-400 mt-1">Simulates network latency degradation on Gateway A.</p>
          </button>

          <button
            onClick={async () => {
              const updated = { ...chaos };
              updated.gateways.gateway_b.maintenance_mode = !updated.gateways.gateway_b.maintenance_mode;
              await handleUpdateChaos(updated);
            }}
            className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-left hover:border-zinc-700 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs">Toggle Gateway B Maintenance ({chaos.gateways.gateway_b.maintenance_mode ? 'OFF' : 'ON'})</span>
              <ShieldAlert className="w-4 h-4 text-zinc-400" />
            </div>
            <p className="text-[10px] text-zinc-400 mt-1">Opens circuit breaker for Gateway B.</p>
          </button>
        </div>
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(['gateway_a', 'gateway_b', 'gateway_c'] as const).map((gwId) => {
          const gw = chaos.gateways[gwId];
          const name = gwId === 'gateway_a' ? 'Gateway A (ApexPay)' : gwId === 'gateway_b' ? 'Gateway B (JusRoute Zero-MDR)' : 'Gateway C (GlobalPay Wallet)';
          
          return (
            <div key={gwId} className="p-5 rounded-xl shadcn-card space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-white">{name}</h3>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${gw.maintenance_mode ? 'bg-red-950 text-red-400 border-red-800' : 'bg-zinc-900 text-zinc-300 border-zinc-800'}`}>
                  {gw.maintenance_mode ? 'MAINTENANCE' : 'ACTIVE'}
                </span>
              </div>

              {/* Forced Failure */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-zinc-400">Failure Rate</span>
                  <span className="text-white">{(gw.forced_failure_rate * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={gw.forced_failure_rate}
                  onChange={async (e) => {
                    const val = parseFloat(e.target.value);
                    const updated = { ...chaos };
                    updated.gateways[gwId].forced_failure_rate = val;
                    await handleUpdateChaos(updated);
                  }}
                  className="w-full accent-white bg-zinc-800 rounded cursor-pointer"
                />
              </div>

              {/* Added Latency */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-zinc-400">Added Latency</span>
                  <span className="text-white">{gw.added_latency_ms}ms</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="500"
                  step="25"
                  value={gw.added_latency_ms}
                  onChange={async (e) => {
                    const val = parseFloat(e.target.value);
                    const updated = { ...chaos };
                    updated.gateways[gwId].added_latency_ms = val;
                    await handleUpdateChaos(updated);
                  }}
                  className="w-full accent-white bg-zinc-800 rounded cursor-pointer"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Rules */}
      <div className="p-5 rounded-xl shadcn-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Active Routing Override Rules</h3>
            <p className="text-xs text-zinc-400">Manual rules bypassing default multi-objective scoring</p>
          </div>

          <button
            onClick={async () => {
              await api.clearRules();
              setRules([]);
            }}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white text-xs font-bold flex items-center space-x-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Rules</span>
          </button>
        </div>

        <div className="space-y-2">
          {rules.length > 0 ? (
            rules.map((r, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-white">{r.description}</span>
                  <p className="text-[10px] text-zinc-400">Target: {r.target_gateway} • Bank: {r.bank || 'ALL'} • Method: {r.payment_method || 'ALL'}</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-white text-[10px] font-mono">ACTIVE</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-zinc-500 text-center py-3">No active manual override rules. Router operating in full NPCI Multi-Objective ML Auto mode.</p>
          )}
        </div>
      </div>

    </div>
  );
};
