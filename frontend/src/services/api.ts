import axios from 'axios';
import {
  TransactionRequest,
  TransactionRecord,
  SystemHealthOverview,
  ChaosSettings
} from '../types';

const API_BASE = '/api';

export const api = {
  processCheckout: async (payload: TransactionRequest): Promise<TransactionRecord> => {
    const res = await axios.post(`${API_BASE}/checkout`, payload);
    return res.data;
  },

  getHealthOverview: async (): Promise<SystemHealthOverview> => {
    const res = await axios.get(`${API_BASE}/health/overview`);
    return res.data;
  },

  applyAlertRecommendation: async (alertId: string, actionDesc: string) => {
    const res = await axios.post(`${API_BASE}/alerts/${alertId}/apply`, {
      recommended_action: actionDesc
    });
    return res.data;
  },

  getTransactions: async (params?: { limit?: number; status?: string; gateway?: string; bank?: string }): Promise<TransactionRecord[]> => {
    const res = await axios.get(`${API_BASE}/transactions`, { params });
    return res.data;
  },

  getTransactionDetail: async (txId: string): Promise<TransactionRecord> => {
    const res = await axios.get(`${API_BASE}/transactions/${txId}`);
    return res.data;
  },

  getChaosSettings: async (): Promise<ChaosSettings> => {
    const res = await axios.get(`${API_BASE}/chaos/settings`);
    return res.data;
  },

  updateChaosSettings: async (settings: ChaosSettings): Promise<{ status: string }> => {
    const res = await axios.post(`${API_BASE}/chaos/settings`, settings);
    return res.data;
  },

  toggleTraffic: async (enabled: boolean): Promise<{ traffic_active: boolean }> => {
    const res = await axios.post(`${API_BASE}/chaos/traffic/toggle`, { enabled });
    return res.data;
  },

  getRules: async () => {
    const res = await axios.get(`${API_BASE}/chaos/rules`);
    return res.data;
  },

  clearRules: async () => {
    const res = await axios.delete(`${API_BASE}/chaos/rules`);
    return res.data;
  }
};

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Array<(data: any) => void>> = new Map();

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const { event_type, data } = message;
        const callbacks = this.listeners.get(event_type);
        if (callbacks) {
          callbacks.forEach((cb) => cb(data));
        }
      } catch (err) {
        console.error('Error parsing WS message', err);
      }
    };

    this.ws.onclose = () => {
      setTimeout(() => this.connect(), 3000);
    };
  }

  on(eventType: string, callback: (data: any) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);
  }

  off(eventType: string, callback: (data: any) => void) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      this.listeners.set(eventType, callbacks.filter((cb) => cb !== callback));
    }
  }
}

export const wsClient = new WebSocketClient();
