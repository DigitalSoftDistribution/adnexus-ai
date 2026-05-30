# Entity Completion Matrix

**Last Updated:** 2026-05-30

## Database Tables vs Architecture Layers

| DB Table | Migration | Domain Entity | Repo Interface | Repo Impl | Use Cases | V2 Routes | Tests |
|----------|-----------|---------------|----------------|-----------|-----------|-----------|-------|
| `users` | 002 | `User.ts` | `IUserRepository.ts` | `UserRepository.ts` | (via Auth) | v1 auth only | partial |
| `workspaces` | 003 | `Workspace.ts` | `IWorkspaceRepository.ts` | `WorkspaceRepository.ts` | GetWorkspace, InviteMember | v2 settings | no |
| `workspace_members` | 004 | -- | -- | -- | (via SettingsRepo) | v2 settings | no |
| `ad_accounts` | 005 | `AdAccount.ts` **NEW** | `IAdAccountRepository.ts` **NEW** | `AdAccountRepository.ts` **NEW** | Connect, List, Sync, Disconnect **NEW** | v2 ad-accounts **NEW** | no |
| `campaigns` | 006 | `Campaign.ts` | `ICampaignRepository.ts` | `CampaignRepository.ts` | 9 use cases | v2 campaigns | yes |
| `adsets` | 007 | `AdSet.ts` **NEW** | `IAdSetRepository.ts` **NEW** | `AdSetRepository.ts` **NEW** | -- | -- | no |
| `ads` | 008 | `Ad.ts` | `IAdRepository.ts` | `AdRepository.ts` | 4 use cases | v2 ads | yes |
| `drafts` | 009 | `Draft.ts` | `IDraftRepository.ts` | `DraftRepository.ts` | 6 use cases | v2 drafts | yes |
| `draft_snapshots` | 010 | -- | -- | -- | (via DraftRepo) | v2 drafts | no |
| `execution_logs` | 011 | -- | -- | -- | (via DraftRepo) | v2 drafts | no |
| `automation_rules` | 012 | `AutomationRule.ts` **NEW** | `IAutomationRuleRepository.ts` **NEW** | `AutomationRuleRepository.ts` **NEW** | -- | -- | no |
| `audit_log` | 013 | `AuditLog.ts` **NEW** | `IAuditLogRepository.ts` **NEW** | `AuditLogRepository.ts` **NEW** | (via IAuditLogger) | v1 audit-log | no |
| `ai_credits` | 014 | `AiCredit.ts` **NEW** | `IAiCreditRepository.ts` **NEW** | `AiCreditRepository.ts` **NEW** | -- | -- | no |
| `comments` | 015 | `Comment.ts` **NEW** | `ICommentRepository.ts` **NEW** | `CommentRepository.ts` **NEW** | -- | -- | no |
| `api_keys` | 016 | `ApiKey.ts` **NEW** | `IApiKeyRepository.ts` **NEW** | `ApiKeyRepository.ts` **NEW** | (via SettingsRepo) | v2 settings | no |
| `goals` | 017 | `Goal.ts` **NEW** | `IGoalRepository.ts` **NEW** | `GoalRepository.ts` **NEW** | -- | -- | no |
| `scheduled_reports` | 018 | `ScheduledReport.ts` **NEW** | `IScheduledReportRepository.ts` **NEW** | `ScheduledReportRepository.ts` **NEW** | -- | -- | no |
| `webhook_configs` | 019 | `WebhookConfig.ts` **NEW** | `IWebhookRepository.ts` | `WebhookRepository.ts` | ListWebhookConfigs, CreateWebhookConfig | v2 webhooks | no |
| `webhook_payloads` | 020 | -- | -- | -- | (via WebhookRepo) | -- | no |
| `collaboration_sessions` | 021 | -- | -- | -- | -- | -- | no |
| `activity_log` | 022 | -- | -- | -- | -- | -- | no |
| `refresh_tokens` | 023 | -- | -- | -- | (via Auth) | v1 auth only | no |

## Summary

| Metric | Before | After |
|--------|--------|-------|
| Domain entities | 5 | 16 |
| Repository interfaces | 13 | 21 |
| Repository implementations | 13 | 21 |
| Use cases | 63 | 67+ |
| V2 route groups | 12 | 13+ |
| Tables without domain model | 11 | 5 (utility/junction tables) |

## Tables Without Domain Entities (by design)

- `workspace_members` - Managed through ISettingsRepository
- `draft_snapshots` - Managed through IDraftRepository
- `execution_logs` - Managed through IDraftRepository
- `webhook_payloads` - Managed through IWebhookRepository
- `collaboration_sessions` - Future feature
- `activity_log` - Future feature, overlaps with audit_log
- `refresh_tokens` - Managed through Supabase Auth
