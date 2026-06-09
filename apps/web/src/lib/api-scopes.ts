import { api } from './api-base';
import { MOCK_AGENCY_CLIENTS } from './api-clients';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ═══════════════════════════════════════════════════════════════════ */
/*  SCOPES API                                                        */
/* ═══════════════════════════════════════════════════════════════════ */

export type ScopeLevel = 'none' | 'read' | 'draft-only' | 'full';

export interface ApiEndpoint {
  key: string;
  name: string;
  category: string;
}

export interface ClientScope {
  clientId: string;
  clientName: string;
  scopes: Record<string, ScopeLevel>;
}

const API_ENDPOINTS: ApiEndpoint[] = [
  { key: 'campaigns_read', name: 'Campaigns Read', category: 'Campaigns' },
  { key: 'campaigns_write', name: 'Campaigns Write', category: 'Campaigns' },
  { key: 'campaigns_delete', name: 'Campaigns Delete', category: 'Campaigns' },
  { key: 'drafts_read', name: 'Drafts Read', category: 'Drafts' },
  { key: 'drafts_write', name: 'Drafts Write', category: 'Drafts' },
  { key: 'drafts_approve', name: 'Drafts Approve', category: 'Drafts' },
  { key: 'audiences_read', name: 'Audiences Read', category: 'Audiences' },
  { key: 'audiences_write', name: 'Audiences Write', category: 'Audiences' },
  { key: 'creatives_read', name: 'Creatives Read', category: 'Creatives' },
  { key: 'creatives_write', name: 'Creatives Write', category: 'Creatives' },
  { key: 'reports_read', name: 'Reports Read', category: 'Reports' },
  { key: 'reports_export', name: 'Reports Export', category: 'Reports' },
  { key: 'billing_read', name: 'Billing Read', category: 'Billing' },
  { key: 'team_read', name: 'Team Read', category: 'Team' },
  { key: 'team_manage', name: 'Team Manage', category: 'Team' },
  { key: 'settings_read', name: 'Settings Read', category: 'Settings' },
  { key: 'settings_write', name: 'Settings Write', category: 'Settings' },
];

let MOCK_SCOPES: ClientScope[] = [
  { clientId: '1', clientName: 'Acme Corp', scopes: {
    campaigns_read: 'full', campaigns_write: 'full', campaigns_delete: 'draft-only',
    drafts_read: 'full', drafts_write: 'full', drafts_approve: 'full',
    audiences_read: 'full', audiences_write: 'full',
    creatives_read: 'full', creatives_write: 'full',
    reports_read: 'full', reports_export: 'full',
    billing_read: 'read', team_read: 'full', team_manage: 'draft-only',
    settings_read: 'read', settings_write: 'draft-only',
  }},
  { clientId: '2', clientName: 'BrightShop', scopes: {
    campaigns_read: 'full', campaigns_write: 'full', campaigns_delete: 'none',
    drafts_read: 'full', drafts_write: 'full', drafts_approve: 'read',
    audiences_read: 'full', audiences_write: 'draft-only',
    creatives_read: 'full', creatives_write: 'full',
    reports_read: 'full', reports_export: 'read',
    billing_read: 'read', team_read: 'read', team_manage: 'none',
    settings_read: 'read', settings_write: 'none',
  }},
  { clientId: '3', clientName: 'TechStart', scopes: {
    campaigns_read: 'full', campaigns_write: 'full', campaigns_delete: 'full',
    drafts_read: 'full', drafts_write: 'full', drafts_approve: 'full',
    audiences_read: 'full', audiences_write: 'full',
    creatives_read: 'full', creatives_write: 'full',
    reports_read: 'full', reports_export: 'full',
    billing_read: 'full', team_read: 'full', team_manage: 'full',
    settings_read: 'full', settings_write: 'full',
  }},
  { clientId: '4', clientName: 'GreenLife', scopes: {
    campaigns_read: 'full', campaigns_write: 'draft-only', campaigns_delete: 'none',
    drafts_read: 'full', drafts_write: 'draft-only', drafts_approve: 'none',
    audiences_read: 'read', audiences_write: 'none',
    creatives_read: 'full', creatives_write: 'draft-only',
    reports_read: 'read', reports_export: 'none',
    billing_read: 'read', team_read: 'read', team_manage: 'none',
    settings_read: 'read', settings_write: 'none',
  }},
  { clientId: '5', clientName: 'FitBrand', scopes: {
    campaigns_read: 'full', campaigns_write: 'full', campaigns_delete: 'draft-only',
    drafts_read: 'full', drafts_write: 'full', drafts_approve: 'draft-only',
    audiences_read: 'full', audiences_write: 'read',
    creatives_read: 'full', creatives_write: 'full',
    reports_read: 'full', reports_export: 'draft-only',
    billing_read: 'read', team_read: 'full', team_manage: 'none',
    settings_read: 'read', settings_write: 'draft-only',
  }},
];

export const scopesApi = {
  async endpoints(): Promise<ApiEndpoint[]> {
    await delay(200);
    return [...API_ENDPOINTS];
  },
  async list(): Promise<ClientScope[]> {
    await delay(400);
    return [...MOCK_SCOPES];
  },
  async update(clientId: string, scopes: Record<string, ScopeLevel>): Promise<ClientScope> {
    await delay(400);
    const idx = MOCK_SCOPES.findIndex((s) => s.clientId === clientId);
    if (idx === -1) {
      const client = MOCK_AGENCY_CLIENTS.find((c) => c.id === clientId);
      const newScope: ClientScope = { clientId, clientName: client?.name || 'Unknown', scopes };
      MOCK_SCOPES.push(newScope);
      return { ...newScope };
    }
    MOCK_SCOPES[idx] = { ...MOCK_SCOPES[idx], scopes };
    return { ...MOCK_SCOPES[idx] };
  },
  async applyTemplate(clientId: string, template: 'standard' | 'read-only' | 'full'): Promise<ClientScope> {
    await delay(400);
    const endpoints = API_ENDPOINTS.map((e) => e.key);
    let scopes: Record<string, ScopeLevel> = {};
    if (template === 'read-only') {
      endpoints.forEach((k) => { scopes[k] = 'read'; });
    } else if (template === 'full') {
      endpoints.forEach((k) => { scopes[k] = 'full'; });
    } else {
      endpoints.forEach((k) => {
        if (k.includes('_delete') || k.includes('_manage') || k.includes('_approve')) scopes[k] = 'draft-only';
        else if (k.includes('_write')) scopes[k] = 'full';
        else scopes[k] = 'full';
      });
    }
    return scopesApi.update(clientId, scopes);
  },
};
