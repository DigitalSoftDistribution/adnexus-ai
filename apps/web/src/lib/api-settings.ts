import { api } from './api-base';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ═════════════════════════════════════════════════════════════════════ */
/*  SETTINGS API                                                       */
/* ═════════════════════════════════════════════════════════════════════ */

export interface ConnectedAccount {
  id: string;
  platform: 'Meta' | 'Google' | 'TikTok' | 'Snap';
  name: string;
  accountId: string;
  status: 'active' | 'disconnected' | 'error';
  lastSynced: string;
  brandColor: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Analyst' | 'Viewer';
  status: 'Active' | 'Pending';
  avatar?: string;
  initials: string;
  joinedAt: string;
  platforms: string[];
}

let MOCK_ACCOUNTS: ConnectedAccount[] = [
  { id: 'acc_1', platform: 'Meta', name: 'Acme Corp', accountId: 'act_123456789', status: 'active', lastSynced: new Date(Date.now() - 5 * 60 * 1000).toISOString(), brandColor: '#1877F2' },
  { id: 'acc_2', platform: 'Meta', name: 'Client B', accountId: 'act_987654321', status: 'active', lastSynced: new Date(Date.now() - 15 * 60 * 1000).toISOString(), brandColor: '#1877F2' },
  { id: 'acc_3', platform: 'Google', name: 'Main Account', accountId: '123-456-7890', status: 'active', lastSynced: new Date(Date.now() - 10 * 60 * 1000).toISOString(), brandColor: '#DB4437' },
  { id: 'acc_4', platform: 'Google', name: 'Client Account', accountId: '098-765-4321', status: 'error', lastSynced: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), brandColor: '#DB4437' },
  { id: 'acc_5', platform: 'TikTok', name: 'Brand Account', accountId: 'tiktok_12345', status: 'active', lastSynced: new Date(Date.now() - 30 * 60 * 1000).toISOString(), brandColor: '#00F2EA' },
];

let MOCK_TEAM: TeamMember[] = [
  { id: 'tm_1', name: 'John Doe', email: 'john@company.com', role: 'Owner', status: 'Active', initials: 'JD', joinedAt: '2026-01-15T10:00:00Z', platforms: ['All'] },
  { id: 'tm_2', name: 'Jane Smith', email: 'jane@company.com', role: 'Admin', status: 'Active', initials: 'JS', joinedAt: '2026-02-01T14:30:00Z', platforms: ['Meta', 'Google'] },
  { id: 'tm_3', name: 'Bob Wilson', email: 'bob@company.com', role: 'Analyst', status: 'Active', initials: 'BW', joinedAt: '2026-03-10T09:00:00Z', platforms: ['View only'] },
  { id: 'tm_4', name: 'Sarah Lee', email: 'sarah@company.com', role: 'Viewer', status: 'Pending', initials: 'SL', joinedAt: '2026-06-18T11:00:00Z', platforms: [] },
];

export const settingsApi = {
  async integrations(): Promise<ConnectedAccount[]> {
    const { data } = await api.get('/settings/accounts');
    return data;
  },
  async connectAccount(platform: string, workspaceId: string): Promise<{ redirectUrl: string } | ConnectedAccount> {
    const oauthPlatform = platform.toLowerCase();
    if (['meta', 'google', 'tiktok', 'snap'].includes(oauthPlatform)) {
      const { data } = await api.get(`/auth/${oauthPlatform}/connect`, {
        params: { workspace_id: workspaceId },
        headers: { Accept: 'application/json' },
      });
      const redirectUrl = data?.data?.redirectUrl;
      if (typeof redirectUrl !== 'string' || !redirectUrl) {
        throw new Error('OAuth provider URL was not returned');
      }
      return { redirectUrl };
    }
    const { data } = await api.post('/settings/accounts', { platform, workspace_id: workspaceId });
    return data;
  },
  async disconnectAccount(id: string, workspaceId: string): Promise<void> {
    await api.post(`/api/v1/auth/meta/disconnect`, { account_id: id, workspace_id: workspaceId });
  },
  async refreshAccount(id: string): Promise<ConnectedAccount> {
    const { data } = await api.post(`/settings/accounts/${id}/refresh`);
    return data;
  },
  async team(): Promise<TeamMember[]> {
    await delay(300 + Math.random() * 200);
    return [...MOCK_TEAM];
  },
  async invite(email: string, role: string): Promise<TeamMember> {
    await delay(500);
    const name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
    const member: TeamMember = {
      id: `tm_${Date.now()}`,
      name,
      email,
      role: role as 'Owner' | 'Admin' | 'Analyst' | 'Viewer',
      status: 'Pending',
      initials,
      joinedAt: new Date().toISOString(),
      platforms: [],
    };
    MOCK_TEAM.push(member);
    return member;
  },
  async removeMember(id: string): Promise<void> {
    await delay(300);
    MOCK_TEAM = MOCK_TEAM.filter((m) => m.id !== id);
  },
  async updateRole(id: string, role: string): Promise<TeamMember> {
    await delay(300);
    const idx = MOCK_TEAM.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error('Member not found');
    MOCK_TEAM[idx] = { ...MOCK_TEAM[idx], role: role as 'Owner' | 'Admin' | 'Analyst' | 'Viewer' };
    return MOCK_TEAM[idx];
  },
};
