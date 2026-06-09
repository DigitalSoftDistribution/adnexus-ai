import { api } from './api-base';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface IntegrationConfig {
  slack: {
    connected: boolean;
    workspace: string;
    channel: string;
  };
  webhook: {
    url: string;
    secret: string;
    events: string[];
  };
  crm: {
    enabled: boolean;
    url: string;
  };
  zapier: {
    connected: boolean;
  };
}

let MOCK_INTEGRATIONS: IntegrationConfig = {
  slack: { connected: true, workspace: 'adnexus-team', channel: '#ad-alerts' },
  webhook: { url: 'https://api.company.com/webhooks/adnexus', secret: 'whsec_••••••••••••••••', events: ['campaign.created', 'draft.approved', 'alert.triggered'] },
  crm: { enabled: true, url: 'https://company.hubspot.com' },
  zapier: { connected: false },
};

export const integrationsApi = {
  async config(): Promise<IntegrationConfig> {
    await delay(300);
    return { ...MOCK_INTEGRATIONS };
  },
  async updateConfig(config: IntegrationConfig): Promise<IntegrationConfig> {
    await delay(400);
    MOCK_INTEGRATIONS = { ...config };
    return MOCK_INTEGRATIONS;
  },
  async toggleSlack(connected: boolean): Promise<void> {
    await delay(400);
    MOCK_INTEGRATIONS.slack.connected = connected;
  },
  async toggleCrm(enabled: boolean): Promise<void> {
    await delay(300);
    MOCK_INTEGRATIONS.crm.enabled = enabled;
  },
};
