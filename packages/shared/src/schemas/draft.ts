import { z } from 'zod';

export const draftStatusSchema = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'AUTO_APPLIED',
  'SCHEDULED',
  'EXECUTED',
  'ERROR',
  'CANCELLED',
]);

export const draftTypeSchema = z.enum([
  'BUDGET_CHANGE',
  'STATUS_CHANGE',
  'BID_ADJUSTMENT',
  'TARGETING_EDIT',
  'CREATIVE_UPLOAD',
  'CAMPAIGN_CREATE',
  'CAMPAIGN_UPDATE',
  'CAMPAIGN_DELETE',
  'CAMPAIGN_DUPLICATE',
  'AB_TEST_CREATE',
  'BUDGET_REALLOCATE',
  'RULE_BASED',
  'AUDIENCE_EDIT',
  'SCHEDULE_CHANGE',
  'NAME_CHANGE',
]);

export const draftSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  platform: z.string(),
  campaignId: z.string().uuid().optional(),
  campaignName: z.string().optional(),
  adsetId: z.string().uuid().optional(),
  adId: z.string().uuid().optional(),
  draftType: draftTypeSchema,
  changeSummary: z.string(),
  changeDetail: z.record(z.unknown()).optional(),
  aiReasoning: z.string().optional(),
  impactEstimate: z.record(z.unknown()).optional(),
  status: draftStatusSchema,
  scheduledAt: z.string().datetime().optional(),
  executedAt: z.string().datetime().optional(),
  errorMessage: z.string().optional(),
  createdBy: z.string().uuid(),
  createdByName: z.string().optional(),
  approvedBy: z.string().uuid().optional(),
  approvedAt: z.string().datetime().optional(),
  rejectedBy: z.string().uuid().optional(),
  rejectedAt: z.string().datetime().optional(),
  rejectionReason: z.string().optional(),
  ruleId: z.string().uuid().optional(),
  createdAt: z.string().datetime(),
  resolvedAt: z.string().datetime().optional(),
});

export const createDraftSchema = draftSchema.omit({
  id: true,
  workspaceId: true,
  status: true,
  scheduledAt: true,
  executedAt: true,
  errorMessage: true,
  approvedBy: true,
  approvedAt: true,
  rejectedBy: true,
  rejectedAt: true,
  rejectionReason: true,
  createdAt: true,
  resolvedAt: true,
}).strict();

export type Draft = z.infer<typeof draftSchema>;
export type DraftStatus = z.infer<typeof draftStatusSchema>;
export type DraftType = z.infer<typeof draftTypeSchema>;
export type CreateDraftInput = z.infer<typeof createDraftSchema>;
