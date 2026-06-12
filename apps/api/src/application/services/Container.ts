/**
 * Dependency Injection Container
 *
 * Simple manual DI container for wiring together Clean Architecture layers.
 * No reflection, no decorators — just explicit constructor injection.
 */

import type { ICampaignRepository } from '../../domain/repositories/ICampaignRepository';
import type { IDraftRepository } from '../../domain/repositories/IDraftRepository';
import type { IWorkspaceRepository } from '../../domain/repositories/IWorkspaceRepository';
import type { IUserRepository } from '../../domain/repositories/IUserRepository';
import type { IBillingRepository } from '../../domain/repositories/IBillingRepository';
import type { IAdRepository } from '../../domain/repositories/IAdRepository';
import type { ISettingsRepository } from '../../domain/repositories/ISettingsRepository';
import type { IAudienceRepository } from '../../domain/repositories/IAudienceRepository';
import type { IReportRepository } from '../../domain/repositories/IReportRepository';
import type { IAlertRepository } from '../../domain/repositories/IAlertRepository';
import type { ISearchRepository } from '../../domain/repositories/ISearchRepository';
import type { INotificationRepository } from '../../domain/repositories/INotificationRepository';
import type { IWebhookRepository } from '../../domain/repositories/IWebhookRepository';
import type { IDraftCommentRepository } from '../../domain/repositories/IDraftCommentRepository';
import type { ICampaignInsightRepository } from '../../domain/repositories/ICampaignInsightRepository';
import type { ICampaignHistoryRepository } from '../../domain/repositories/ICampaignHistoryRepository';
import type { IAdSetRepository } from '../../domain/repositories/IAdSetRepository';
import type { IGoalRepository } from '../../domain/repositories/IGoalRepository';
import type { IAutomationRuleRepository } from '../../domain/repositories/IAutomationRuleRepository';
import type { IAuditLogRepository } from '../../domain/repositories/IAuditLogRepository';
import type { IExportRepository } from '../../domain/repositories/IExportRepository';
import type { IAssetRepository } from '../../domain/repositories/IAssetRepository';
import type { ICommentRepository } from '../../domain/repositories/ICommentRepository';
import type { IAdminOpsRepository } from '../../domain/repositories/IAdminOpsRepository';
import type { IAdAccountRepository } from '../../domain/repositories/IAdAccountRepository';
import type { IScheduledReportRepository } from '../../domain/repositories/IScheduledReportRepository';
import type { ISyncJobRepository } from '../../domain/repositories/ISyncJobRepository';
import type { IEventBus } from '../../domain/events/EventBus';
import type { IAuditLogger } from '../ports/IAuditLogger';
import type { INotificationService } from '../ports/INotificationService';
import type { IAgentAdvisor } from '../ports/IAgentAdvisor';
import type { IPlatformSyncService } from '../ports/IPlatformSyncService';
import type { IPlatformWriteService } from '../ports/IPlatformWriteService';
import type { IMockTrafficSeeder } from '../ports/IMockTrafficSeeder';
import type { Platform } from '../../domain/entities/Campaign';

import { CreateCampaignUseCase } from '../use-cases/campaign/CreateCampaignUseCase';
import { ListCampaignsUseCase } from '../use-cases/campaign/ListCampaignsUseCase';
import { GetCampaignSummaryUseCase } from '../use-cases/campaign/GetCampaignSummaryUseCase';
import { GetCampaignByIdUseCase } from '../use-cases/campaign/GetCampaignByIdUseCase';
import { UpdateCampaignUseCase } from '../use-cases/campaign/UpdateCampaignUseCase';
import { DeleteCampaignUseCase } from '../use-cases/campaign/DeleteCampaignUseCase';
import { PauseCampaignUseCase } from '../use-cases/campaign/PauseCampaignUseCase';
import { ActivateCampaignUseCase } from '../use-cases/campaign/ActivateCampaignUseCase';
import { DuplicateCampaignUseCase } from '../use-cases/campaign/DuplicateCampaignUseCase';
import { CreateDraftUseCase } from '../use-cases/draft/CreateDraftUseCase';
import { ListDraftsUseCase } from '../use-cases/draft/ListDraftsUseCase';
import { GetDraftStatsUseCase } from '../use-cases/draft/GetDraftStatsUseCase';
import { GetDraftByIdUseCase } from '../use-cases/draft/GetDraftByIdUseCase';
import { ApproveDraftUseCase } from '../use-cases/draft/ApproveDraftUseCase';
import { RejectDraftUseCase } from '../use-cases/draft/RejectDraftUseCase';
import { ExecuteDraftUseCase } from '../use-cases/draft/ExecuteDraftUseCase';
import { GetWorkspaceUseCase } from '../use-cases/workspace/GetWorkspaceUseCase';
import { InviteMemberUseCase } from '../use-cases/workspace/InviteMemberUseCase';
import { GetBillingInfoUseCase } from '../use-cases/billing/GetBillingInfoUseCase';
import { GetBillingUsageUseCase } from '../use-cases/billing/GetBillingUsageUseCase';
import { CreateCheckoutSessionUseCase } from '../use-cases/billing/CreateCheckoutSessionUseCase';
import { CreatePortalSessionUseCase } from '../use-cases/billing/CreatePortalSessionUseCase';
import { ListInvoicesUseCase } from '../use-cases/billing/ListInvoicesUseCase';
import { CancelSubscriptionUseCase } from '../use-cases/billing/CancelSubscriptionUseCase';
import { UpgradePlanUseCase } from '../use-cases/billing/UpgradePlanUseCase';
import { DowngradePlanUseCase } from '../use-cases/billing/DowngradePlanUseCase';
import { ListAdsUseCase } from '../use-cases/ad/ListAdsUseCase';
import { GetAdByIdUseCase } from '../use-cases/ad/GetAdByIdUseCase';
import { GetAdPerformanceUseCase } from '../use-cases/ad/GetAdPerformanceUseCase';
import { GetAdCreativePerformanceUseCase } from '../use-cases/ad/GetAdCreativePerformanceUseCase';
import { UpdateAdUseCase } from '../use-cases/ad/UpdateAdUseCase';
import { DuplicateAdUseCase } from '../use-cases/ad/DuplicateAdUseCase';
import { GetWorkspaceSettingsUseCase } from '../use-cases/settings/GetWorkspaceSettingsUseCase';
import { UpdateWorkspaceSettingsUseCase } from '../use-cases/settings/UpdateWorkspaceSettingsUseCase';
import { GetTeamMembersUseCase } from '../use-cases/settings/GetTeamMembersUseCase';
import { InviteTeamMemberUseCase } from '../use-cases/settings/InviteTeamMemberUseCase';
import { UpdateTeamMemberRoleUseCase } from '../use-cases/settings/UpdateTeamMemberRoleUseCase';
import { RemoveTeamMemberUseCase } from '../use-cases/settings/RemoveTeamMemberUseCase';
import { GetIntegrationsUseCase } from '../use-cases/settings/GetIntegrationsUseCase';
import { GetNotificationPreferencesUseCase } from '../use-cases/settings/GetNotificationPreferencesUseCase';
import { UpdateNotificationPreferencesUseCase } from '../use-cases/settings/UpdateNotificationPreferencesUseCase';
import { GetProfileUseCase } from '../use-cases/settings/GetProfileUseCase';
import { UpdateProfileUseCase } from '../use-cases/settings/UpdateProfileUseCase';
import { GetApiKeysUseCase } from '../use-cases/settings/GetApiKeysUseCase';
import { CreateApiKeyUseCase } from '../use-cases/settings/CreateApiKeyUseCase';
import { RevokeApiKeyUseCase } from '../use-cases/settings/RevokeApiKeyUseCase';
import { ListAudiencesUseCase } from '../use-cases/audience/ListAudiencesUseCase';
import { GetAudienceByIdUseCase } from '../use-cases/audience/GetAudienceByIdUseCase';
import { CreateAudienceUseCase } from '../use-cases/audience/CreateAudienceUseCase';
import { UpdateAudienceUseCase } from '../use-cases/audience/UpdateAudienceUseCase';
import { DeleteAudienceUseCase } from '../use-cases/audience/DeleteAudienceUseCase';
import { GetAudienceInsightsUseCase } from '../use-cases/audience/GetAudienceInsightsUseCase';
import { ListReportsUseCase } from '../use-cases/report/ListReportsUseCase';
import { GetReportByIdUseCase } from '../use-cases/report/GetReportByIdUseCase';
import { CreateReportUseCase } from '../use-cases/report/CreateReportUseCase';
import { UpdateReportUseCase } from '../use-cases/report/UpdateReportUseCase';
import { DeleteReportUseCase } from '../use-cases/report/DeleteReportUseCase';
import { RunReportUseCase } from '../use-cases/report/RunReportUseCase';
import { GetReportResultsUseCase } from '../use-cases/report/GetReportResultsUseCase';
import {
  ListScheduledReportsUseCase,
  CreateScheduledReportUseCase,
  DeleteScheduledReportUseCase,
} from '../use-cases/report/ScheduledReportUseCases';
import { ListAlertsUseCase } from '../use-cases/alert/ListAlertsUseCase';
import { GetAlertByIdUseCase } from '../use-cases/alert/GetAlertByIdUseCase';
import { CreateAlertUseCase } from '../use-cases/alert/CreateAlertUseCase';
import { UpdateAlertUseCase } from '../use-cases/alert/UpdateAlertUseCase';
import { DeleteAlertUseCase } from '../use-cases/alert/DeleteAlertUseCase';
import { ToggleAlertUseCase } from '../use-cases/alert/ToggleAlertUseCase';
import { GetAlertHistoryUseCase } from '../use-cases/alert/GetAlertHistoryUseCase';
import { TestAlertUseCase } from '../use-cases/alert/TestAlertUseCase';
import { GetAlertStatsUseCase } from '../use-cases/alert/GetAlertStatsUseCase';
import { SearchUseCase } from '../use-cases/search/SearchUseCase';
import { GetSuggestionsUseCase } from '../use-cases/search/GetSuggestionsUseCase';
import { ListNotificationsUseCase } from '../use-cases/notification/ListNotificationsUseCase';
import { MarkNotificationReadUseCase } from '../use-cases/notification/MarkNotificationReadUseCase';
import { MarkAllNotificationsReadUseCase } from '../use-cases/notification/MarkAllNotificationsReadUseCase';
import { ListWebhookConfigsUseCase } from '../use-cases/webhook/ListWebhookConfigsUseCase';
import { CreateWebhookConfigUseCase } from '../use-cases/webhook/CreateWebhookConfigUseCase';
import { UpdateWebhookConfigUseCase } from '../use-cases/webhook/UpdateWebhookConfigUseCase';
import { DeleteWebhookConfigUseCase } from '../use-cases/webhook/DeleteWebhookConfigUseCase';
import { TestWebhookConfigUseCase } from '../use-cases/webhook/TestWebhookConfigUseCase';
import { ListWebhookDeliveriesUseCase } from '../use-cases/webhook/ListWebhookDeliveriesUseCase';
import { ListDraftCommentsUseCase } from '../use-cases/draft/ListDraftCommentsUseCase';
import { AddDraftCommentUseCase } from '../use-cases/draft/AddDraftCommentUseCase';
import { DeleteDraftCommentUseCase } from '../use-cases/draft/DeleteDraftCommentUseCase';
import { GetCampaignInsightsUseCase } from '../use-cases/campaign/GetCampaignInsightsUseCase';
import { GetCampaignHistoryUseCase } from '../use-cases/campaign/GetCampaignHistoryUseCase';
import { SyncCampaignUseCase } from '../use-cases/campaign/SyncCampaignUseCase';
import { SyncAccountUseCase } from '../use-cases/integration/SyncAccountUseCase';
import { ListSyncJobsUseCase } from '../use-cases/integration/ListSyncJobsUseCase';
import { SeedMockTrafficUseCase } from '../use-cases/integration/SeedMockTrafficUseCase';
import { ListAdSetsUseCase } from '../use-cases/ad-set/ListAdSetsUseCase';
import { GetAdSetByIdUseCase } from '../use-cases/ad-set/GetAdSetByIdUseCase';
import { CreateAdSetUseCase } from '../use-cases/ad-set/CreateAdSetUseCase';
import { UpdateAdSetUseCase } from '../use-cases/ad-set/UpdateAdSetUseCase';
import { DeleteAdSetUseCase } from '../use-cases/ad-set/DeleteAdSetUseCase';
import { ListGoalsUseCase } from '../use-cases/goal/ListGoalsUseCase';
import { GetGoalByIdUseCase } from '../use-cases/goal/GetGoalByIdUseCase';
import { CreateGoalUseCase } from '../use-cases/goal/CreateGoalUseCase';
import { UpdateGoalUseCase } from '../use-cases/goal/UpdateGoalUseCase';
import { DeleteGoalUseCase } from '../use-cases/goal/DeleteGoalUseCase';
import { GetGoalProgressUseCase } from '../use-cases/goal/GetGoalProgressUseCase';
import { GetAgentStatusUseCase } from '../use-cases/agent/GetAgentStatusUseCase';
import {
  ListRecommendationsUseCase,
  ApplyRecommendationUseCase,
  DismissRecommendationUseCase,
  ListInsightsUseCase,
  ListConversationsUseCase,
  CreateConversationUseCase,
  GetConversationUseCase,
  SendMessageUseCase,
} from '../use-cases/agent/AgentAdvisoryUseCases';
import {
  ListIntegrationsUseCase,
  GetIntegrationUseCase,
  DisconnectIntegrationUseCase,
  GetIntegrationHealthUseCase,
} from '../use-cases/integration/IntegrationUseCases';
import { ConnectPlatformUseCase } from '../use-cases/integration/ConnectPlatformUseCase';
import { ListIntegrationAccountsUseCase } from '../use-cases/integration/ListIntegrationAccountsUseCase';
import { SelectIntegrationAccountUseCase } from '../use-cases/integration/SelectIntegrationAccountUseCase';
import {
  GetOnboardingStatusUseCase,
  SetOnboardingStepUseCase,
  CompleteOnboardingUseCase,
} from '../use-cases/onboarding/OnboardingUseCases';
import { ListAuditLogUseCase } from '../use-cases/audit-log/ListAuditLogUseCase';
import { GetAuditLogSummaryUseCase } from '../use-cases/audit-log/GetAuditLogSummaryUseCase';
import { GetAuditLogByIdUseCase } from '../use-cases/audit-log/GetAuditLogByIdUseCase';
import { ExportAuditLogUseCase } from '../use-cases/audit-log/ExportAuditLogUseCase';
import { ListExportsUseCase } from '../use-cases/export/ListExportsUseCase';
import { GetExportByIdUseCase } from '../use-cases/export/GetExportByIdUseCase';
import { CreateExportUseCase } from '../use-cases/export/CreateExportUseCase';
import { DeleteExportUseCase } from '../use-cases/export/DeleteExportUseCase';
import { DownloadExportUseCase } from '../use-cases/export/DownloadExportUseCase';
import { ListAssetsUseCase } from '../use-cases/asset/ListAssetsUseCase';
import { GetAssetByIdUseCase } from '../use-cases/asset/GetAssetByIdUseCase';
import { CreateAssetUseCase } from '../use-cases/asset/CreateAssetUseCase';
import { UpdateAssetUseCase } from '../use-cases/asset/UpdateAssetUseCase';
import { DeleteAssetUseCase } from '../use-cases/asset/DeleteAssetUseCase';
import { GetAdminStatsUseCase } from '../use-cases/admin/GetAdminStatsUseCase';
import { ListAllWorkspacesUseCase } from '../use-cases/admin/ListAllWorkspacesUseCase';
import { ListAllUsersUseCase } from '../use-cases/admin/ListAllUsersUseCase';
import { ImpersonateUserUseCase } from '../use-cases/admin/ImpersonateUserUseCase';
import { ListAdminErrorsUseCase } from '../use-cases/admin/ListAdminErrorsUseCase';
import { GetAdminApiUsageUseCase } from '../use-cases/admin/GetAdminApiUsageUseCase';
import { GetFeatureFlagsUseCase } from '../use-cases/admin/GetFeatureFlagsUseCase';
import { UpdateFeatureFlagUseCase } from '../use-cases/admin/UpdateFeatureFlagUseCase';
import { ListCommentsUseCase } from '../use-cases/comment/ListCommentsUseCase';
import { CreateCommentUseCase } from '../use-cases/comment/CreateCommentUseCase';
import { GetCommentByIdUseCase, DeleteCommentUseCase } from '../use-cases/comment/CommentUseCases';
import { ListAutomationRulesUseCase } from '../use-cases/agent/ListAutomationRulesUseCase';
import { GetAutomationRuleByIdUseCase } from '../use-cases/agent/GetAutomationRuleByIdUseCase';
import { CreateAutomationRuleUseCase } from '../use-cases/agent/CreateAutomationRuleUseCase';
import { UpdateAutomationRuleUseCase } from '../use-cases/agent/UpdateAutomationRuleUseCase';
import { DeleteAutomationRuleUseCase } from '../use-cases/agent/DeleteAutomationRuleUseCase';
import { ToggleAutomationRuleUseCase } from '../use-cases/agent/ToggleAutomationRuleUseCase';

export interface ContainerConfig {
  campaignRepository: ICampaignRepository;
  draftRepository: IDraftRepository;
  workspaceRepository: IWorkspaceRepository;
  userRepository: IUserRepository;
  billingRepository: IBillingRepository;
  adRepository: IAdRepository;
  settingsRepository: ISettingsRepository;
  audienceRepository: IAudienceRepository;
  reportRepository: IReportRepository;
  alertRepository: IAlertRepository;
  searchRepository: ISearchRepository;
  notificationRepository: INotificationRepository;
  webhookRepository: IWebhookRepository;
  draftCommentRepository: IDraftCommentRepository;
  campaignInsightRepository: ICampaignInsightRepository;
  campaignHistoryRepository: ICampaignHistoryRepository;
  adSetRepository: IAdSetRepository;
  goalRepository: IGoalRepository;
  automationRuleRepository: IAutomationRuleRepository;
  auditLogRepository: IAuditLogRepository;
  exportRepository: IExportRepository;
  assetRepository: IAssetRepository;
  commentRepository: ICommentRepository;
  adminOpsRepository: IAdminOpsRepository;
  eventBus: IEventBus;
  auditLogger: IAuditLogger;
  notificationService: INotificationService;
  agentAdvisor: IAgentAdvisor;
  /** Optional live ad-platform sync service (e.g. Meta). */
  platformSyncService?: IPlatformSyncService;
  /** Optional ad-platform write service for pause/resume (e.g. Meta). */
  platformWriteService?: IPlatformWriteService;
  /** Optional preview/dev-only mock traffic seeder. */
  mockTrafficSeeder?: IMockTrafficSeeder;
  /** Optional account-sync deps; required to expose the account sync use-case. */
  adAccountRepository?: IAdAccountRepository;
  syncJobRepository?: ISyncJobRepository;
  /** Optional scheduled-report CRUD deps. */
  scheduledReportRepository?: IScheduledReportRepository;
  /** Writes a per-day campaign_metrics row (infra-supplied). */
  writeCampaignMetrics?: (
    campaignId: string,
    date: string,
    m: { spend: number; impressions: number; clicks: number; ctr: number; conversions: number; cpa: number; roas: number; frequency: number; cpm: number; cpc: number },
  ) => Promise<void>;
  /** Stamps ad_accounts.last_synced_at (infra-supplied). */
  stampAccountSynced?: (adAccountId: string) => Promise<void>;
  /** Optional: persists ad sets + ads for a campaign during account sync. */
  writeAdSets?: (
    workspaceId: string,
    campaignId: string,
    platform: Platform,
    adSets: NonNullable<import('../ports/IPlatformSyncService').SyncedCampaign['adSets']>,
  ) => Promise<{ adSets: number; ads: number }>;
}

export class Container {
  // Use cases
  readonly createCampaign: CreateCampaignUseCase;
  readonly listCampaigns: ListCampaignsUseCase;
  readonly getCampaignSummary: GetCampaignSummaryUseCase;
  readonly getCampaignById: GetCampaignByIdUseCase;
  readonly updateCampaign: UpdateCampaignUseCase;
  readonly deleteCampaign: DeleteCampaignUseCase;
  readonly pauseCampaign: PauseCampaignUseCase;
  readonly activateCampaign: ActivateCampaignUseCase;
  readonly duplicateCampaign: DuplicateCampaignUseCase;
  readonly createDraft: CreateDraftUseCase;
  readonly listDrafts: ListDraftsUseCase;
  readonly getDraftStats: GetDraftStatsUseCase;
  readonly getDraftById: GetDraftByIdUseCase;
  readonly approveDraft: ApproveDraftUseCase;
  readonly rejectDraft: RejectDraftUseCase;
  readonly executeDraft: ExecuteDraftUseCase;
  readonly getWorkspace: GetWorkspaceUseCase;
  readonly inviteMember: InviteMemberUseCase;
  readonly getBillingInfo: GetBillingInfoUseCase;
  readonly getBillingUsage: GetBillingUsageUseCase;
  readonly createCheckoutSession: CreateCheckoutSessionUseCase;
  readonly createPortalSession: CreatePortalSessionUseCase;
  readonly listInvoices: ListInvoicesUseCase;
  readonly cancelSubscription: CancelSubscriptionUseCase;
  readonly upgradePlan: UpgradePlanUseCase;
  readonly downgradePlan: DowngradePlanUseCase;
  readonly listAds: ListAdsUseCase;
  readonly getAdById: GetAdByIdUseCase;
  readonly getAdPerformance: GetAdPerformanceUseCase;
  readonly getAdCreativePerformance: GetAdCreativePerformanceUseCase;
  readonly updateAd: UpdateAdUseCase;
  readonly duplicateAd: DuplicateAdUseCase;
  readonly getWorkspaceSettings: GetWorkspaceSettingsUseCase;
  readonly updateWorkspaceSettings: UpdateWorkspaceSettingsUseCase;
  readonly getProfile: GetProfileUseCase;
  readonly updateProfile: UpdateProfileUseCase;
  readonly getTeamMembers: GetTeamMembersUseCase;
  readonly inviteTeamMember: InviteTeamMemberUseCase;
  readonly updateTeamMemberRole: UpdateTeamMemberRoleUseCase;
  readonly removeTeamMember: RemoveTeamMemberUseCase;
  readonly getIntegrations: GetIntegrationsUseCase;
  readonly getNotificationPreferences: GetNotificationPreferencesUseCase;
  readonly updateNotificationPreferences: UpdateNotificationPreferencesUseCase;
  readonly getApiKeys: GetApiKeysUseCase;
  readonly createApiKey: CreateApiKeyUseCase;
  readonly revokeApiKey: RevokeApiKeyUseCase;
  readonly listAudiences: ListAudiencesUseCase;
  readonly getAudienceById: GetAudienceByIdUseCase;
  readonly createAudience: CreateAudienceUseCase;
  readonly updateAudience: UpdateAudienceUseCase;
  readonly deleteAudience: DeleteAudienceUseCase;
  readonly getAudienceInsights: GetAudienceInsightsUseCase;
  readonly listReports: ListReportsUseCase;
  readonly getReportById: GetReportByIdUseCase;
  readonly createReport: CreateReportUseCase;
  readonly updateReport: UpdateReportUseCase;
  readonly deleteReport: DeleteReportUseCase;
  readonly runReport: RunReportUseCase;
  readonly getReportResults: GetReportResultsUseCase;
  readonly listScheduledReports?: ListScheduledReportsUseCase;
  readonly createScheduledReport?: CreateScheduledReportUseCase;
  readonly deleteScheduledReport?: DeleteScheduledReportUseCase;
  readonly listAlerts: ListAlertsUseCase;
  readonly getAlertById: GetAlertByIdUseCase;
  readonly createAlert: CreateAlertUseCase;
  readonly updateAlert: UpdateAlertUseCase;
  readonly deleteAlert: DeleteAlertUseCase;
  readonly toggleAlert: ToggleAlertUseCase;
  readonly getAlertHistory: GetAlertHistoryUseCase;
  readonly testAlert: TestAlertUseCase;
  readonly getAlertStats: GetAlertStatsUseCase;
  readonly search: SearchUseCase;
  readonly searchSuggestions: GetSuggestionsUseCase;
  readonly listNotifications: ListNotificationsUseCase;
  readonly markNotificationRead: MarkNotificationReadUseCase;
  readonly markAllNotificationsRead: MarkAllNotificationsReadUseCase;
  readonly listWebhookConfigs: ListWebhookConfigsUseCase;
  readonly createWebhookConfig: CreateWebhookConfigUseCase;
  readonly updateWebhookConfig: UpdateWebhookConfigUseCase;
  readonly deleteWebhookConfig: DeleteWebhookConfigUseCase;
  readonly testWebhookConfig: TestWebhookConfigUseCase;
  readonly listWebhookDeliveries: ListWebhookDeliveriesUseCase;
  readonly listDraftComments: ListDraftCommentsUseCase;
  readonly addDraftComment: AddDraftCommentUseCase;
  readonly deleteDraftComment: DeleteDraftCommentUseCase;
  readonly getCampaignInsights: GetCampaignInsightsUseCase;
  readonly getCampaignHistory: GetCampaignHistoryUseCase;
  readonly syncCampaign: SyncCampaignUseCase;
  /** Present only when account-sync deps are configured. */
  readonly syncAccount?: SyncAccountUseCase;
  /** Present only when sync-job deps are configured. */
  readonly listSyncJobs?: ListSyncJobsUseCase;
  /** Present only when the preview/dev-only mock traffic seeder is configured. */
  readonly seedMockTraffic?: SeedMockTrafficUseCase;
  readonly listAdSets: ListAdSetsUseCase;
  readonly getAdSetById: GetAdSetByIdUseCase;
  readonly createAdSet: CreateAdSetUseCase;
  readonly updateAdSet: UpdateAdSetUseCase;
  readonly deleteAdSet: DeleteAdSetUseCase;
  readonly listGoals: ListGoalsUseCase;
  readonly getGoalById: GetGoalByIdUseCase;
  readonly createGoal: CreateGoalUseCase;
  readonly updateGoal: UpdateGoalUseCase;
  readonly deleteGoal: DeleteGoalUseCase;
  readonly getGoalProgress: GetGoalProgressUseCase;
  readonly getAgentStatus: GetAgentStatusUseCase;
  readonly listRecommendations: ListRecommendationsUseCase;
  readonly applyRecommendation: ApplyRecommendationUseCase;
  readonly dismissRecommendation: DismissRecommendationUseCase;
  readonly listInsights: ListInsightsUseCase;
  readonly listConversations: ListConversationsUseCase;
  readonly createConversation: CreateConversationUseCase;
  readonly getConversation: GetConversationUseCase;
  readonly sendAgentMessage: SendMessageUseCase;
  readonly listIntegrations: ListIntegrationsUseCase;
  readonly getIntegration: GetIntegrationUseCase;
  readonly disconnectIntegration: DisconnectIntegrationUseCase;
  readonly getIntegrationHealth: GetIntegrationHealthUseCase;
  readonly connectPlatform: ConnectPlatformUseCase;
  readonly listIntegrationAccounts?: ListIntegrationAccountsUseCase;
  readonly selectIntegrationAccount?: SelectIntegrationAccountUseCase;
  readonly getOnboardingStatus: GetOnboardingStatusUseCase;
  readonly setOnboardingStep: SetOnboardingStepUseCase;
  readonly completeOnboarding: CompleteOnboardingUseCase;
  readonly listAutomationRules: ListAutomationRulesUseCase;
  readonly getAutomationRuleById: GetAutomationRuleByIdUseCase;
  readonly createAutomationRule: CreateAutomationRuleUseCase;
  readonly updateAutomationRule: UpdateAutomationRuleUseCase;
  readonly deleteAutomationRule: DeleteAutomationRuleUseCase;
  readonly toggleAutomationRule: ToggleAutomationRuleUseCase;
  readonly listAuditLog: ListAuditLogUseCase;
  readonly getAuditLogSummary: GetAuditLogSummaryUseCase;
  readonly getAuditLogById: GetAuditLogByIdUseCase;
  readonly exportAuditLog: ExportAuditLogUseCase;
  readonly listExports: ListExportsUseCase;
  readonly getExportById: GetExportByIdUseCase;
  readonly createExport: CreateExportUseCase;
  readonly deleteExport: DeleteExportUseCase;
  readonly downloadExport: DownloadExportUseCase;
  readonly listAssets: ListAssetsUseCase;
  readonly getAssetById: GetAssetByIdUseCase;
  readonly createAsset: CreateAssetUseCase;
  readonly updateAsset: UpdateAssetUseCase;
  readonly deleteAsset: DeleteAssetUseCase;
  readonly getAdminStats: GetAdminStatsUseCase;
  readonly listAllWorkspaces: ListAllWorkspacesUseCase;
  readonly listAllUsers: ListAllUsersUseCase;
  readonly impersonateUser: ImpersonateUserUseCase;
  readonly listAdminErrors: ListAdminErrorsUseCase;
  readonly getAdminApiUsage: GetAdminApiUsageUseCase;
  readonly getFeatureFlags: GetFeatureFlagsUseCase;
  readonly updateFeatureFlag: UpdateFeatureFlagUseCase;
  readonly listComments: ListCommentsUseCase;
  readonly createComment: CreateCommentUseCase;
  readonly getCommentById: GetCommentByIdUseCase;
  readonly deleteComment: DeleteCommentUseCase;

  constructor(config: ContainerConfig) {
    this.createCampaign = new CreateCampaignUseCase(
      config.campaignRepository,
      config.workspaceRepository,
      config.eventBus,
      config.auditLogger,
    );

    this.listCampaigns = new ListCampaignsUseCase(config.campaignRepository);

    this.getCampaignSummary = new GetCampaignSummaryUseCase(config.campaignRepository);

    this.getCampaignById = new GetCampaignByIdUseCase(config.campaignRepository);
    this.updateCampaign = new UpdateCampaignUseCase(config.campaignRepository);
    this.deleteCampaign = new DeleteCampaignUseCase(config.campaignRepository);
    this.pauseCampaign = new PauseCampaignUseCase(config.campaignRepository, config.platformWriteService, config.auditLogger);
    this.activateCampaign = new ActivateCampaignUseCase(config.campaignRepository, config.platformWriteService, config.auditLogger);
    this.duplicateCampaign = new DuplicateCampaignUseCase(config.campaignRepository);

    this.createDraft = new CreateDraftUseCase(
      config.draftRepository,
      config.eventBus,
      config.auditLogger,
    );
    this.listDrafts = new ListDraftsUseCase(config.draftRepository);
    this.getDraftStats = new GetDraftStatsUseCase(config.draftRepository);
    this.getDraftById = new GetDraftByIdUseCase(config.draftRepository);

    this.approveDraft = new ApproveDraftUseCase(
      config.draftRepository,
      config.eventBus,
      config.auditLogger,
    );
    this.rejectDraft = new RejectDraftUseCase(config.draftRepository);
    this.executeDraft = new ExecuteDraftUseCase(config.draftRepository, config.auditLogger);

    this.getWorkspace = new GetWorkspaceUseCase(config.workspaceRepository);

    this.inviteMember = new InviteMemberUseCase(
      config.workspaceRepository,
      config.userRepository,
      config.eventBus,
      config.auditLogger,
    );

    this.getBillingInfo = new GetBillingInfoUseCase(config.billingRepository);
    this.getBillingUsage = new GetBillingUsageUseCase(config.billingRepository);
    this.createCheckoutSession = new CreateCheckoutSessionUseCase(config.billingRepository);
    this.createPortalSession = new CreatePortalSessionUseCase(config.billingRepository);
    this.listInvoices = new ListInvoicesUseCase(config.billingRepository);
    this.cancelSubscription = new CancelSubscriptionUseCase(config.billingRepository);
    this.upgradePlan = new UpgradePlanUseCase(config.billingRepository);
    this.downgradePlan = new DowngradePlanUseCase(config.billingRepository);

    this.listAds = new ListAdsUseCase(config.adRepository);
    this.getAdById = new GetAdByIdUseCase(config.adRepository);
    this.getAdPerformance = new GetAdPerformanceUseCase(config.adRepository);
    this.getAdCreativePerformance = new GetAdCreativePerformanceUseCase(config.adRepository);
    this.updateAd = new UpdateAdUseCase(config.adRepository);
    this.duplicateAd = new DuplicateAdUseCase(config.adRepository);

    this.getWorkspaceSettings = new GetWorkspaceSettingsUseCase(config.settingsRepository);
    this.updateWorkspaceSettings = new UpdateWorkspaceSettingsUseCase(config.settingsRepository);
    this.getProfile = new GetProfileUseCase(config.settingsRepository);
    this.updateProfile = new UpdateProfileUseCase(config.settingsRepository);
    this.getTeamMembers = new GetTeamMembersUseCase(config.settingsRepository);
    this.inviteTeamMember = new InviteTeamMemberUseCase(config.settingsRepository);
    this.updateTeamMemberRole = new UpdateTeamMemberRoleUseCase(config.settingsRepository);
    this.removeTeamMember = new RemoveTeamMemberUseCase(config.settingsRepository);
    this.getIntegrations = new GetIntegrationsUseCase(config.settingsRepository);
    this.getNotificationPreferences = new GetNotificationPreferencesUseCase(config.settingsRepository);
    this.updateNotificationPreferences = new UpdateNotificationPreferencesUseCase(config.settingsRepository);
    this.getApiKeys = new GetApiKeysUseCase(config.settingsRepository);
    this.createApiKey = new CreateApiKeyUseCase(config.settingsRepository);
    this.revokeApiKey = new RevokeApiKeyUseCase(config.settingsRepository);

    this.listAudiences = new ListAudiencesUseCase(config.audienceRepository);
    this.getAudienceById = new GetAudienceByIdUseCase(config.audienceRepository);
    this.createAudience = new CreateAudienceUseCase(config.audienceRepository);
    this.updateAudience = new UpdateAudienceUseCase(config.audienceRepository);
    this.deleteAudience = new DeleteAudienceUseCase(config.audienceRepository);
    this.getAudienceInsights = new GetAudienceInsightsUseCase(config.audienceRepository);

    this.listReports = new ListReportsUseCase(config.reportRepository);
    this.getReportById = new GetReportByIdUseCase(config.reportRepository);
    this.createReport = new CreateReportUseCase(config.reportRepository);
    this.updateReport = new UpdateReportUseCase(config.reportRepository);
    this.deleteReport = new DeleteReportUseCase(config.reportRepository);
    this.runReport = new RunReportUseCase(config.reportRepository);
    this.getReportResults = new GetReportResultsUseCase(config.reportRepository);

    if (config.scheduledReportRepository) {
      this.listScheduledReports = new ListScheduledReportsUseCase(config.scheduledReportRepository);
      this.createScheduledReport = new CreateScheduledReportUseCase(config.scheduledReportRepository);
      this.deleteScheduledReport = new DeleteScheduledReportUseCase(config.scheduledReportRepository);
    }

    this.listAlerts = new ListAlertsUseCase(config.alertRepository);
    this.getAlertById = new GetAlertByIdUseCase(config.alertRepository);
    this.createAlert = new CreateAlertUseCase(config.alertRepository);
    this.updateAlert = new UpdateAlertUseCase(config.alertRepository);
    this.deleteAlert = new DeleteAlertUseCase(config.alertRepository);
    this.toggleAlert = new ToggleAlertUseCase(config.alertRepository);
    this.getAlertHistory = new GetAlertHistoryUseCase(config.alertRepository);
    this.testAlert = new TestAlertUseCase(config.alertRepository, config.notificationService);
    this.getAlertStats = new GetAlertStatsUseCase(config.alertRepository);

    this.search = new SearchUseCase(config.searchRepository);
    this.searchSuggestions = new GetSuggestionsUseCase(config.searchRepository);
    this.listNotifications = new ListNotificationsUseCase(config.notificationRepository);
    this.markNotificationRead = new MarkNotificationReadUseCase(config.notificationRepository);
    this.markAllNotificationsRead = new MarkAllNotificationsReadUseCase(config.notificationRepository);
    this.listWebhookConfigs = new ListWebhookConfigsUseCase(config.webhookRepository);
    this.createWebhookConfig = new CreateWebhookConfigUseCase(config.webhookRepository);
    this.updateWebhookConfig = new UpdateWebhookConfigUseCase(config.webhookRepository);
    this.deleteWebhookConfig = new DeleteWebhookConfigUseCase(config.webhookRepository);
    this.testWebhookConfig = new TestWebhookConfigUseCase(config.webhookRepository);
    this.listWebhookDeliveries = new ListWebhookDeliveriesUseCase(config.webhookRepository);

    this.listDraftComments = new ListDraftCommentsUseCase(
      config.draftRepository,
      config.draftCommentRepository,
    );
    this.addDraftComment = new AddDraftCommentUseCase(
      config.draftRepository,
      config.draftCommentRepository,
    );
    this.deleteDraftComment = new DeleteDraftCommentUseCase(config.draftCommentRepository);

    this.getCampaignInsights = new GetCampaignInsightsUseCase(
      config.campaignRepository,
      config.campaignInsightRepository,
    );
    this.getCampaignHistory = new GetCampaignHistoryUseCase(
      config.campaignRepository,
      config.campaignHistoryRepository,
    );
    this.syncCampaign = new SyncCampaignUseCase(
      config.campaignRepository,
      config.campaignHistoryRepository,
      config.eventBus,
      config.platformSyncService,
    );

    // Account-level sync is only wired when all of its collaborators are
    // supplied (platform sync service + ad-account/sync-job repos + metric/stamp
    // writers). Keeps the container valid for lightweight/test configs.
    if (
      config.platformSyncService &&
      config.adAccountRepository &&
      config.syncJobRepository &&
      config.writeCampaignMetrics &&
      config.stampAccountSynced
    ) {
      this.syncAccount = new SyncAccountUseCase(
        config.campaignRepository,
        config.adAccountRepository,
        config.syncJobRepository,
        config.eventBus,
        config.platformSyncService,
        config.writeCampaignMetrics,
        config.stampAccountSynced,
        config.writeAdSets,
      );
    }

    if (config.adAccountRepository && config.syncJobRepository) {
      this.listSyncJobs = new ListSyncJobsUseCase(
        config.adAccountRepository,
        config.syncJobRepository,
      );
    }

    if (config.mockTrafficSeeder) {
      this.seedMockTraffic = new SeedMockTrafficUseCase(config.mockTrafficSeeder);
    }

    this.listAdSets = new ListAdSetsUseCase(config.adSetRepository);
    this.getAdSetById = new GetAdSetByIdUseCase(config.adSetRepository);
    this.createAdSet = new CreateAdSetUseCase(
      config.adSetRepository,
      config.eventBus,
      config.auditLogger,
    );
    this.updateAdSet = new UpdateAdSetUseCase(config.adSetRepository);
    this.deleteAdSet = new DeleteAdSetUseCase(config.adSetRepository);

    this.listGoals = new ListGoalsUseCase(config.goalRepository);
    this.getGoalById = new GetGoalByIdUseCase(config.goalRepository);
    this.createGoal = new CreateGoalUseCase(config.goalRepository);
    this.updateGoal = new UpdateGoalUseCase(config.goalRepository);
    this.deleteGoal = new DeleteGoalUseCase(config.goalRepository);
    this.getGoalProgress = new GetGoalProgressUseCase(config.goalRepository);

    this.getAgentStatus = new GetAgentStatusUseCase(config.automationRuleRepository);
    this.listRecommendations = new ListRecommendationsUseCase(config.agentAdvisor);
    this.applyRecommendation = new ApplyRecommendationUseCase(config.agentAdvisor);
    this.dismissRecommendation = new DismissRecommendationUseCase(config.agentAdvisor);
    this.listInsights = new ListInsightsUseCase(config.agentAdvisor);
    this.listConversations = new ListConversationsUseCase(config.agentAdvisor);
    this.createConversation = new CreateConversationUseCase(config.agentAdvisor);
    this.getConversation = new GetConversationUseCase(config.agentAdvisor);
    this.sendAgentMessage = new SendMessageUseCase(config.agentAdvisor);
    this.listIntegrations = new ListIntegrationsUseCase(config.settingsRepository);
    this.getIntegration = new GetIntegrationUseCase(config.settingsRepository);
    this.disconnectIntegration = new DisconnectIntegrationUseCase(config.settingsRepository);
    this.getIntegrationHealth = new GetIntegrationHealthUseCase(config.settingsRepository);
    this.connectPlatform = new ConnectPlatformUseCase();

    if (config.adAccountRepository) {
      this.listIntegrationAccounts = new ListIntegrationAccountsUseCase(config.adAccountRepository);
      this.selectIntegrationAccount = new SelectIntegrationAccountUseCase(config.adAccountRepository);
    }
    this.getOnboardingStatus = new GetOnboardingStatusUseCase(
      config.workspaceRepository,
      config.settingsRepository,
      config.campaignRepository,
    );
    this.setOnboardingStep = new SetOnboardingStepUseCase(config.workspaceRepository);
    this.completeOnboarding = new CompleteOnboardingUseCase(
      config.workspaceRepository,
      config.settingsRepository,
      config.campaignRepository,
    );
    this.listAutomationRules = new ListAutomationRulesUseCase(config.automationRuleRepository);
    this.getAutomationRuleById = new GetAutomationRuleByIdUseCase(config.automationRuleRepository);
    this.createAutomationRule = new CreateAutomationRuleUseCase(
      config.automationRuleRepository,
      config.eventBus,
      config.auditLogger,
    );
    this.updateAutomationRule = new UpdateAutomationRuleUseCase(config.automationRuleRepository);
    this.deleteAutomationRule = new DeleteAutomationRuleUseCase(config.automationRuleRepository);
    this.toggleAutomationRule = new ToggleAutomationRuleUseCase(config.automationRuleRepository);

    this.listAuditLog = new ListAuditLogUseCase(config.auditLogRepository);
    this.getAuditLogSummary = new GetAuditLogSummaryUseCase(config.auditLogRepository);
    this.getAuditLogById = new GetAuditLogByIdUseCase(config.auditLogRepository);
    this.exportAuditLog = new ExportAuditLogUseCase(config.auditLogRepository);

    this.listExports = new ListExportsUseCase(config.exportRepository);
    this.getExportById = new GetExportByIdUseCase(config.exportRepository);
    this.createExport = new CreateExportUseCase(config.exportRepository);
    this.deleteExport = new DeleteExportUseCase(config.exportRepository);
    this.downloadExport = new DownloadExportUseCase(config.exportRepository);

    this.listAssets = new ListAssetsUseCase(config.assetRepository);
    this.getAssetById = new GetAssetByIdUseCase(config.assetRepository);
    this.createAsset = new CreateAssetUseCase(config.assetRepository);
    this.updateAsset = new UpdateAssetUseCase(config.assetRepository);
    this.deleteAsset = new DeleteAssetUseCase(config.assetRepository);

    this.getAdminStats = new GetAdminStatsUseCase(
      config.workspaceRepository,
      config.userRepository,
      config.campaignRepository,
    );
    this.listAllWorkspaces = new ListAllWorkspacesUseCase(config.workspaceRepository);
    this.listAllUsers = new ListAllUsersUseCase(config.userRepository);
    this.impersonateUser = new ImpersonateUserUseCase(config.userRepository);
    this.listAdminErrors = new ListAdminErrorsUseCase(config.adminOpsRepository);
    this.getAdminApiUsage = new GetAdminApiUsageUseCase(config.adminOpsRepository);
    this.getFeatureFlags = new GetFeatureFlagsUseCase(config.adminOpsRepository);
    this.updateFeatureFlag = new UpdateFeatureFlagUseCase(config.adminOpsRepository);

    this.listComments = new ListCommentsUseCase(config.commentRepository, config.draftRepository);
    this.createComment = new CreateCommentUseCase(config.commentRepository, config.draftRepository);
    this.getCommentById = new GetCommentByIdUseCase(config.commentRepository, config.draftRepository);
    this.deleteComment = new DeleteCommentUseCase(config.commentRepository, config.draftRepository);
  }
}
