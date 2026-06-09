import { api } from './api-base';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ═══════════════════════════════════════════════════════════════════ */
/*  CLIENTS API                                                       */
/* ═══════════════════════════════════════════════════════════════════ */

export interface AgencyClient {
  id: string;
  name: string;
  initials: string;
  color: string;
  status: 'active' | 'paused';
  plan: string;
  spend: number;
  roas: number;
  campaigns: number;
  drafts: number;
  teamMembers: number;
  platforms: ('meta' | 'google' | 'tiktok' | 'snap')[];
  sparkline: number[];
  createdAt: string;
}

export interface ClientActivity {
  id: string;
  action: string;
  target: string;
  time: string;
  type: 'ai' | 'budget' | 'draft' | 'alert' | 'success' | 'platform' | 'team';
}

export let MOCK_AGENCY_CLIENTS: AgencyClient[] = [
  { id: '1', name: 'Acme Corp', initials: 'AC', color: '#2563EB', status: 'active', plan: 'growth', spend: 48293, roas: 3.8, campaigns: 8, drafts: 2, teamMembers: 4, platforms: ['meta', 'google', 'tiktok'], sparkline: [42, 45, 43, 48, 50, 47, 52], createdAt: '2026-01-15' },
  { id: '2', name: 'BrightShop', initials: 'BS', color: '#10B981', status: 'active', plan: 'starter', spend: 32100, roas: 4.1, campaigns: 6, drafts: 0, teamMembers: 2, platforms: ['meta', 'google'], sparkline: [38, 40, 39, 42, 41, 44, 43], createdAt: '2026-02-01' },
  { id: '3', name: 'TechStart', initials: 'TS', color: '#F59E0B', status: 'active', plan: 'scale', spend: 28500, roas: 2.1, campaigns: 5, drafts: 4, teamMembers: 6, platforms: ['meta', 'google', 'tiktok', 'snap'], sparkline: [35, 32, 30, 28, 29, 27, 26], createdAt: '2026-01-20' },
  { id: '4', name: 'GreenLife', initials: 'GL', color: '#059669', status: 'active', plan: 'starter', spend: 19800, roas: 3.5, campaigns: 4, drafts: 1, teamMembers: 2, platforms: ['meta', 'tiktok'], sparkline: [22, 24, 23, 25, 26, 25, 27], createdAt: '2026-03-01' },
  { id: '5', name: 'FitBrand', initials: 'FB', color: '#EF4444', status: 'paused', plan: 'growth', spend: 15200, roas: 1.4, campaigns: 6, drafts: 7, teamMembers: 3, platforms: ['google', 'snap'], sparkline: [20, 18, 16, 15, 14, 13, 12], createdAt: '2026-02-10' },
  { id: '6', name: 'LuxeGoods', initials: 'LG', color: '#8B5CF6', status: 'active', plan: 'enterprise', spend: 42000, roas: 5.2, campaigns: 7, drafts: 0, teamMembers: 5, platforms: ['meta', 'google', 'tiktok'], sparkline: [45, 48, 50, 52, 51, 54, 55], createdAt: '2026-01-08' },
  { id: '7', name: 'PlayGames', initials: 'PG', color: '#EC4899', status: 'active', plan: 'growth', spend: 35600, roas: 3.9, campaigns: 5, drafts: 1, teamMembers: 3, platforms: ['meta', 'google', 'snap'], sparkline: [40, 42, 41, 43, 44, 43, 45], createdAt: '2026-02-15' },
  { id: '8', name: 'EduPlus', initials: 'EP', color: '#06B6D4', status: 'active', plan: 'scale', spend: 62900, roas: 2.3, campaigns: 6, drafts: 3, teamMembers: 8, platforms: ['meta', 'google', 'tiktok', 'snap'], sparkline: [70, 68, 65, 63, 64, 62, 60], createdAt: '2026-01-25' },
];

const MOCK_ACTIVITIES: ClientActivity[] = [
  { id: '1', action: 'AI paused 3 underperforming ad sets in', target: 'FitBrand', time: '2 min ago', type: 'ai' },
  { id: '2', action: 'Budget increased by 25% for', target: 'LuxeGoods \u2014 Summer Sale', time: '15 min ago', type: 'budget' },
  { id: '3', action: 'New campaign draft created for', target: 'Acme Corp', time: '32 min ago', type: 'draft' },
  { id: '4', action: 'Creative fatigue alert:', target: 'TechStart \u2014 Hook Challenge', time: '1 hr ago', type: 'alert' },
  { id: '5', action: 'ROAS target exceeded for', target: 'BrightShop', time: '2 hr ago', type: 'success' },
  { id: '6', action: 'Platform connected:', target: 'Snap Ads \u2014 EduPlus', time: '3 hr ago', type: 'platform' },
  { id: '7', action: 'Team member added to', target: 'GreenLife', time: '4 hr ago', type: 'team' },
  { id: '8', action: 'AI auto-adjusted bids for', target: 'PlayGames', time: '5 hr ago', type: 'ai' },
];

export interface CreateClientInput {
  name: string;
  plan: string;
}

export const clientsApi = {
  async list(): Promise<AgencyClient[]> {
    await delay(400);
    return [...MOCK_AGENCY_CLIENTS];
  },
  async create(input: CreateClientInput): Promise<AgencyClient> {
    await delay(500);
    const words = input.name.split(/\s+/).filter(Boolean);
    const initials = words.length > 1
      ? words[0][0] + words[words.length - 1][0]
      : input.name.slice(0, 2);
    const colors = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#059669'];
    const client: AgencyClient = {
      id: `c_${Date.now()}`,
      name: input.name,
      initials: initials.toUpperCase(),
      color: colors[Math.floor(Math.random() * colors.length)],
      status: 'active',
      plan: input.plan || 'starter',
      spend: 0,
      roas: 0,
      campaigns: 0,
      drafts: 0,
      teamMembers: 1,
      platforms: ['meta'],
      sparkline: [0, 0, 0, 0, 0, 0, 0],
      createdAt: new Date().toISOString(),
    };
    MOCK_AGENCY_CLIENTS.push(client);
    return client;
  },
  async delete(id: string): Promise<void> {
    await delay(300);
    MOCK_AGENCY_CLIENTS = MOCK_AGENCY_CLIENTS.filter((c) => c.id !== id);
  },
  async toggleStatus(id: string): Promise<AgencyClient> {
    await delay(300);
    const client = MOCK_AGENCY_CLIENTS.find((c) => c.id === id);
    if (!client) throw new Error('Client not found');
    client.status = client.status === 'active' ? 'paused' : 'active';
    return { ...client };
  },
  async activities(): Promise<ClientActivity[]> {
    await delay(300);
    return [...MOCK_ACTIVITIES];
  },
};
