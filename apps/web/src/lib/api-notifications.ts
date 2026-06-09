import { api } from './api-base';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface NotificationPreferences {
  email: {
    draftApproved: boolean;
    draftRejected: boolean;
    ruleTriggered: boolean;
    goalAlert: boolean;
    budgetAlert: boolean;
    dailyDigest: boolean;
    weeklySummary: boolean;
  };
  inApp: {
    draftApproved: boolean;
    draftRejected: boolean;
    ruleTriggered: boolean;
    goalAlert: boolean;
    budgetAlert: boolean;
    dailyDigest: boolean;
    weeklySummary: boolean;
  };
  slack: {
    enabled: boolean;
    webhookUrl: string;
    channel: string;
  };
}

let MOCK_NOTIFICATION_PREFS: NotificationPreferences = {
  email: { draftApproved: true, draftRejected: true, ruleTriggered: true, goalAlert: true, budgetAlert: true, dailyDigest: true, weeklySummary: false },
  inApp: { draftApproved: true, draftRejected: false, ruleTriggered: true, goalAlert: true, budgetAlert: true, dailyDigest: false, weeklySummary: true },
  slack: { enabled: true, webhookUrl: 'https://hooks.slack.com/services/YOUR_WORKSPACE/YOUR_CHANNEL/YOUR_TOKEN', channel: '#ad-alerts' },
};

export const notificationsApi = {
  async preferences(): Promise<NotificationPreferences> {
    await delay(300);
    return { ...MOCK_NOTIFICATION_PREFS };
  },
  async updatePreferences(prefs: NotificationPreferences): Promise<NotificationPreferences> {
    await delay(400);
    MOCK_NOTIFICATION_PREFS = { ...prefs };
    return MOCK_NOTIFICATION_PREFS;
  },
  async testSlack(_webhookUrl: string): Promise<{ success: boolean }> {
    await delay(800);
    return { success: true };
  },
};
