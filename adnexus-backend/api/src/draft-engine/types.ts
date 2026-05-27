/**
 * Core type definitions for the Draft Execution Engine
 * All platform-agnostic types, enums, and interfaces live here.
 */

// ────────────────────────────────────────────────
// Enums
// ────────────────────────────────────────────────

export enum AdPlatform {
  META = 'meta',
  GOOGLE = 'google',
  TIKTOK = 'tiktok',
  SNAP = 'snap',
}

export enum ChangeType {
  BUDGET = 'budget',
  STATUS = 'status',
  BID = 'bid',
  TARGETING = 'targeting',
  CREATIVE = 'creative',
}

export enum DraftStatus {
  PENDING = 'pending',
  VALIDATING = 'validating',
  READY = 'ready',
  APPLYING = 'applying',
  APPLIED = 'applied',
  FAILED = 'failed',
  ROLLING_BACK = 'rolling_back',
  ROLLED_BACK = 'rolled_back',
  CANCELLED = 'cancelled',
}

export enum CampaignStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  DELETED = 'deleted',
  ARCHIVED = 'archived',
  DRAFT = 'draft',
}

export enum ExecutionStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
  PARTIAL = 'partial',
  ROLLED_BACK = 'rolled_back',
  TIMEOUT = 'timeout',
}

export enum RiskLevel {
  LOW = 'low',       // 0-33
  MEDIUM = 'medium', // 34-66
  HIGH = 'high',     // 67-100
}

export enum NotificationChannel {
  EMAIL = 'email',
  SLACK = 'slack',
  IN_APP = 'in_app',
  WEBHOOK = 'webhook',
}

export enum NotificationSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

// ────────────────────────────────────────────────
// Core Data Models
// ────────────────────────────────────────────────

export interface Campaign {
  id: string;
  externalId: string;
  platform: AdPlatform;
  name: string;
  status: CampaignStatus;
  budget: CampaignBudget;
  bidStrategy: BidStrategy;
  targeting: TargetingConfig;
  creatives: Creative[];
  accountId: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignBudget {
  dailyBudget: number;
  lifetimeBudget: number;
  budgetType: 'daily' | 'lifetime';
  currency: string;
}

export interface BidStrategy {
  type: 'cpc' | 'cpm' | 'cpa' | 'roas' | 'cpv';
  amount?: number;
  targetRoas?: number;
  cap?: number;
}

export interface TargetingConfig {
  audiences: string[];
  demographics?: DemographicTargeting;
  geo?: GeoTargeting;
  interests?: string[];
  placements?: string[];
  exclusions?: string[];
}

export interface DemographicTargeting {
  ageMin?: number;
  ageMax?: number;
  genders?: ('male' | 'female' | 'all')[];
  languages?: string[];
}

export interface GeoTargeting {
  countries: string[];
  regions?: string[];
  cities?: string[];
  radius?: number;
}

export interface Creative {
  id: string;
  externalId: string;
  name: string;
  type: 'image' | 'video' | 'carousel' | 'collection';
  status: CampaignStatus;
  url: string;
  headline?: string;
  body?: string;
  callToAction?: string;
}

export interface Draft {
  id: string;
  campaignId: string;
  campaign: Campaign;
  platform: AdPlatform;
  changeType: ChangeType;
  status: DraftStatus;
  proposedChanges: ProposedChanges;
  snapshot: CampaignSnapshot;
  requestedBy: User;
  approvedBy?: User;
  approvedAt?: Date;
  riskScore?: number;
  riskLevel?: RiskLevel;
  executionLog?: ExecutionLogEntry[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface ProposedChanges {
  budget?: Partial<CampaignBudget>;
  status?: CampaignStatus;
  bidStrategy?: Partial<BidStrategy>;
  targeting?: Partial<TargetingConfig>;
  creatives?: Partial<Creative>[];
  [key: string]: unknown;
}

export interface CampaignSnapshot {
  campaignId: string;
  capturedAt: Date;
  fullState: Campaign;
  hash: string; // sha256 hash for integrity verification
}

export interface User {
  id: string;
  email: string;
  name: string;
  notificationPreferences: NotificationPreference[];
}

export interface NotificationPreference {
  channel: NotificationChannel;
  enabled: boolean;
  events: ('execution_success' | 'execution_failure' | 'rollback' | 'risk_alert')[];
}

// ────────────────────────────────────────────────
// Validation Types
// ────────────────────────────────────────────────

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  riskScore: number;
  riskLevel: RiskLevel;
  checks: {
    campaignExists: boolean;
    stateMatch: boolean;
    policyCompliant: boolean;
  };
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  severity: 'error';
}

export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
  severity: 'warning';
}

export interface PolicyCheck {
  policyId: string;
  policyName: string;
  compliant: boolean;
  violationDetails?: string;
  severity: 'error' | 'warning';
}

// ────────────────────────────────────────────────
// Execution Types
// ────────────────────────────────────────────────

export interface ExecutionResult {
  draftId: string;
  status: ExecutionStatus;
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
  steps: ExecutionStep[];
  appliedChanges?: AppliedChange[];
  error?: ExecutionError;
  requiresRollback: boolean;
  rollbackResult?: RollbackResult;
}

export interface ExecutionStep {
  name: string;
  status: 'pending' | 'running' | 'success' | 'failure' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  error?: ExecutionError;
  metadata?: Record<string, unknown>;
}

export interface AppliedChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  platform: AdPlatform;
  externalId?: string;
  appliedAt: Date;
}

export interface ExecutionError {
  code: string;
  message: string;
  platformError?: PlatformError;
  stackTrace?: string;
  recoverable: boolean;
}

export interface PlatformError {
  code: string;
  message: string;
  platform: AdPlatform;
  rawResponse?: unknown;
  retryable: boolean;
}

// ────────────────────────────────────────────────
// Snapshot & Rollback Types
// ────────────────────────────────────────────────

export interface Snapshot {
  id: string;
  draftId: string;
  campaignId: string;
  createdAt: Date;
  fullState: Campaign;
  stateHash: string;
  changeType: ChangeType;
}

export interface RollbackResult {
  success: boolean;
  snapshotId: string;
  startedAt: Date;
  completedAt: Date;
  stepsRestored: RollbackStep[];
  failedSteps: RollbackStep[];
  error?: ExecutionError;
  verified: boolean;
}

export interface RollbackStep {
  field: string;
  previousValue: unknown;
  currentValue: unknown;
  restored: boolean;
  error?: string;
}

// ────────────────────────────────────────────────
// Logging Types
// ────────────────────────────────────────────────

export interface ExecutionLogEntry {
  id: string;
  draftId: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  message: string;
  step: string;
  metadata?: Record<string, unknown>;
  error?: ExecutionError;
}

export interface ExecutionLogFilter {
  draftId?: string;
  campaignId?: string;
  status?: ExecutionStatus;
  startDate?: Date;
  endDate?: Date;
  platform?: AdPlatform;
}

// ────────────────────────────────────────────────
// Notification Types
// ────────────────────────────────────────────────

export interface Notification {
  id: string;
  draftId: string;
  type: 'execution_success' | 'execution_failure' | 'rollback_triggered' | 'rollback_failed' | 'risk_alert';
  severity: NotificationSeverity;
  title: string;
  message: string;
  recipients: string[];
  channels: NotificationChannel[];
  metadata: {
    draftId: string;
    campaignName: string;
    platform: AdPlatform;
    changeType: ChangeType;
    errorCode?: string;
    durationMs?: number;
  };
  sentAt: Date;
}

// ────────────────────────────────────────────────
// Platform API Types
// ────────────────────────────────────────────────

export interface PlatformApiConfig {
  baseUrl: string;
  apiVersion: string;
  timeoutMs: number;
  maxRetries: number;
  retryBackoffMs: number;
  credentials: PlatformCredentials;
}

export interface PlatformCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  accountId: string;
}

export interface PlatformApiResponse<T> {
  success: boolean;
  data?: T;
  error?: PlatformError;
  requestId: string;
  timestamp: Date;
}

// ────────────────────────────────────────────────
// Retry Configuration
// ────────────────────────────────────────────────

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableStatusCodes: number[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

// ────────────────────────────────────────────────
// Engine Configuration
// ────────────────────────────────────────────────

export interface EngineConfig {
  retryConfig: RetryConfig;
  autoRollback: boolean;
  requireApproval: boolean;
  maxConcurrentExecutions: number;
  notificationChannels: NotificationChannel[];
  riskThresholds: {
    low: number;
    medium: number;
    high: number;
  };
  platformConfigs: Record<AdPlatform, PlatformApiConfig>;
}

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  retryConfig: DEFAULT_RETRY_CONFIG,
  autoRollback: true,
  requireApproval: true,
  maxConcurrentExecutions: 5,
  notificationChannels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
  riskThresholds: {
    low: 33,
    medium: 66,
    high: 100,
  },
  platformConfigs: {} as Record<AdPlatform, PlatformApiConfig>,
};
