import { api } from './api-base';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface ApiKey {
  id: string;
  name: string;
  preview: string;
  permissions: string[];
  createdAt: string;
  lastUsed: string;
}

export interface ActiveSession {
  id: string;
  device: string;
  browser: string;
  location: string;
  ip: string;
  lastActive: string;
  current: boolean;
}

let MOCK_API_KEYS: ApiKey[] = [
  { id: 'key_1', name: 'Production', preview: 'adx_live_sk_••••••••a3f9', permissions: ['read', 'write'], createdAt: '2026-01-15T10:00:00Z', lastUsed: '2 hours ago' },
  { id: 'key_2', name: 'Staging', preview: 'adx_live_sk_••••••••b7e2', permissions: ['read'], createdAt: '2026-03-01T14:00:00Z', lastUsed: '3 days ago' },
  { id: 'key_3', name: 'Reporting', preview: 'adx_live_sk_••••••••c1d8', permissions: ['read'], createdAt: '2026-04-10T09:30:00Z', lastUsed: '1 week ago' },
];

let MOCK_SESSIONS: ActiveSession[] = [
  { id: 'sess_1', device: 'MacBook Pro', browser: 'Chrome 126', location: 'San Francisco, CA', ip: '192.168.1.1', lastActive: 'Current session', current: true },
  { id: 'sess_2', device: 'iPhone 15', browser: 'Safari iOS', location: 'San Francisco, CA', ip: '192.168.1.2', lastActive: '2 hours ago', current: false },
  { id: 'sess_3', device: 'Windows PC', browser: 'Firefox 127', location: 'New York, NY', ip: '192.168.1.3', lastActive: '3 days ago', current: false },
];

export const apiKeysApi = {
  async list(): Promise<ApiKey[]> {
    await delay(300);
    return [...MOCK_API_KEYS];
  },
  async create(name: string, permissions: string[]): Promise<ApiKey> {
    await delay(500);
    const key: ApiKey = {
      id: `key_${Date.now()}`,
      name,
      preview: `adx_live_sk_••••••••${Math.random().toString(36).slice(2, 6)}`,
      permissions,
      createdAt: new Date().toISOString(),
      lastUsed: 'Never',
    };
    MOCK_API_KEYS.push(key);
    return key;
  },
  async revoke(id: string): Promise<void> {
    await delay(300);
    MOCK_API_KEYS = MOCK_API_KEYS.filter((k) => k.id !== id);
  },
};

export const securityApi = {
  async sessions(): Promise<ActiveSession[]> {
    await delay(300);
    return [...MOCK_SESSIONS];
  },
  async revokeSession(id: string): Promise<void> {
    await delay(300);
    MOCK_SESSIONS = MOCK_SESSIONS.filter((s) => s.id !== id);
  },
  async revokeAllSessions(): Promise<void> {
    await delay(400);
    MOCK_SESSIONS = MOCK_SESSIONS.filter((s) => s.current);
  },
  async changePassword(currentPassword: string, _newPassword: string): Promise<void> {
    await delay(500);
    if (currentPassword.length < 1) throw new Error('Current password required');
  },
};
