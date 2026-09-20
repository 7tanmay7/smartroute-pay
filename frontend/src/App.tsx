import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { CheckoutView } from './components/CheckoutView';
import { AuditView } from './components/AuditView';
import { ChaosView } from './components/ChaosView';
import { SystemHealthOverview, TransactionRecord } from './types';
import { api, wsClient } from './services/api';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'checkout' | 'audit' | 'chaos'>('dashboard');
  const [overview, setOverview] = useState<SystemHealthOverview | null>(null);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [selectedAuditTx, setSelectedAuditTx] = useState<TransactionRecord | null>(null);
  const [trafficActive, setTrafficActive] = useState<boolean>(true);

  useEffect(() => {
    fetchInitialData();

    wsClient.connect();

    wsClient.on('TRANSACTION_PROCESSED', (tx: TransactionRecord) => {
      setTransactions((prev) => [tx, ...prev.slice(0, 99)]);
    });

    wsClient.on('HEALTH_UPDATE', (health: SystemHealthOverview) => {
      setOverview(health);
    });

    const interval = setInterval(() => {
      api.getHealthOverview().then(setOverview).catch(() => {});
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchInitialData = async () => {
    try {
      const health = await api.getHealthOverview();
      setOverview(health);
      const txs = await api.getTransactions({ limit: 50 });
      setTransactions(txs);
    } catch (err) {
      console.error('Failed fetching initial data', err);
    }
  };

  const handleApplyRecommendation = async (alertId: string, actionDesc: string) => {
    try {
      await api.applyAlertRecommendation(alertId, actionDesc);
      const updatedHealth = await api.getHealthOverview();
      setOverview(updatedHealth);
    } catch (err) {
      console.error('Error applying alert recommendation', err);
    }
  };

  const handleToggleTraffic = async () => {
    try {
      const res = await api.toggleTraffic(!trafficActive);
      setTrafficActive(res.traffic_active);
    } catch (err) {
      console.error('Error toggling traffic', err);
    }
  };

  const handleOpenAuditDetail = (tx: TransactionRecord) => {
    setSelectedAuditTx(tx);
    setActiveTab('audit');
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-[#f8fafc] flex flex-col font-sans">
      
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        trafficActive={trafficActive}
        onToggleTraffic={handleToggleTraffic}
        mdrSavingsToday={overview?.total_mdr_savings_today ?? 14280.50}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            overview={overview}
            recentTransactions={transactions}
            onApplyRecommendation={handleApplyRecommendation}
            onOpenAuditDetail={handleOpenAuditDetail}
          />
        )}

        {activeTab === 'checkout' && (
          <CheckoutView
            onTransactionComplete={(tx) => {
              setTransactions((prev) => [tx, ...prev]);
            }}
          />
        )}

        {activeTab === 'audit' && (
          <AuditView
            transactions={transactions}
            selectedTx={selectedAuditTx}
            onSelectTx={setSelectedAuditTx}
          />
        )}

        {activeTab === 'chaos' && <ChaosView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 SmartRoute Pay. NPCI &gt;₹2,000 UPI Interchange & Payment Orchestration Engine.</p>
          <div className="flex items-center space-x-4">
            <a href="/docs" target="_blank" className="hover:text-white transition-colors">FastAPI Docs</a>
            <a href="/metrics" target="_blank" className="hover:text-white transition-colors">Prometheus Metrics</a>
          </div>
        </div>
      </footer>

    </div>
  );
};
