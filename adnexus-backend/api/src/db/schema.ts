/** Drizzle schema compatibility — re-exports table names as objects. */

const table = (name: string) => name;

export const workspaces = table('workspaces');
export const workspaceCredits = table('ai_credits');
export const auditLogs = table('audit_log');
export const users = table('users');
export const campaigns = table('campaigns');
export const adsets = table('adsets');
export const ads = table('ads');
export const drafts = table('drafts');
export const ad_accounts = table('ad_accounts');
export const automation_rules = table('automation_rules');
export const goals = table('goals');
export const scheduled_reports = table('scheduled_reports');
export const credit_usage_log = table('credit_usage_log');
