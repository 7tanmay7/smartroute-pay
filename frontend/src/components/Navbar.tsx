import React from 'react';
import { ShieldCheck, Activity, ShoppingCart, ListOrdered, Zap, Play, Square, TrendingDown } from 'lucide-react';

interface NavbarProps {
  activeTab: 'dashboard' | 'checkout' | 'audit' | 'chaos';
  setActiveTab: (tab: 'dashboard' | 'checkout' | 'audit' | 'chaos') => void;
  trafficActive: boolean;
  onToggleTraffic: () => void;
  mdrSavingsToday: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  trafficActive,
  onToggleTraffic,
  mdrSavingsToday,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-9 h-9 rounded-lg bg-zinc-100 text-zinc-950 flex items-center justify-center font-black text-lg shadow-sm">
              ⚡
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight text-white">
                  SmartRoute<span className="text-zinc-400 font-normal">Pay</span>
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border border-zinc-800 bg-zinc-900 text-zinc-300">
                  NPCI &gt;₹2k MDR Engine
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('checkout')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'checkout'
                  ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Checkout Simulator</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'audit'
                  ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Audit Trail</span>
            </button>

            <button
              onClick={() => setActiveTab('chaos')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'chaos'
                  ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Chaos Sandbox</span>
            </button>
          </nav>

          {/* Right Section: NPCI MDR Savings Ticker & Traffic Toggle */}
          <div className="flex items-center space-x-3">
            
            {/* Merchant MDR Savings Badge */}
            <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-md bg-emerald-950/30 border border-emerald-800/50 text-xs font-semibold text-emerald-400">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Saved <strong className="text-white">₹{mdrSavingsToday.toLocaleString()}</strong> Merchant MDR</span>
            </div>

            <button
              onClick={onToggleTraffic}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
                trafficActive
                  ? 'bg-zinc-100 text-zinc-950 border-zinc-100'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              {trafficActive ? (
                <>
                  <Square className="w-3 h-3 fill-current text-zinc-950" />
                  <span>Traffic: ON</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-current" />
                  <span>Simulate Traffic</span>
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
