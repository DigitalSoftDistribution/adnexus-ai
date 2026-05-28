import { z } from 'zod';

export const campaignObjectiveSchema = z.enum([
  'AWARENESS',
  'TRAFFIC',
  'ENGAGEMENT',
  'LEADS',
  'SALES',
  'APP_PROMOTION',
  'RETENTION',
]);

export const campaignStatusSchema = z.enum([
  'ACTIVE',
  'PAUSED',
  'ARCHIVED',
  'DRAFT',
  'PENDING_REVIEW',
  'REJECTED',
]);

export const campaignBudgetTypeSchema = z.enum(['DAILY', 'LIFETIME']);

export const campaignPlatformSchema = z.enum([
  'META',
  'GOOGLE',
  'TIKTOK',
  'SNAP',
  'LINKEDIN',
]);

export const campaignSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  adAccountId: z.string().uuid(),
  platform: campaignPlatformSchema,
  platformCampaignId: z.string().optional(),
  name: z.string().min(1).max(255),
  status: campaignStatusSchema,
  objective: campaignObjectiveSchema,
  budget: z.number().min(0).optional(),
  budgetType: campaignBudgetTypeSchema.optional(),
  dailyBudget: z.number().min(0).optional(),
  lifetimeBudget: z.number().min(0).optional(),
  spend: z.number().min(0).default(0),
  impressions: z.number().min(0).default(0),
  clicks: z.number().min(0).default(0),
  ctr: z.number().min(0).default(0),
  conversions: z.number().min(0).default(0),
  cpa: z.number().min(0).optional(),
  roas: z.number().min(0).optional(),
  frequency: z.number().min(0).optional(),
  cpm: z.number().min(0).optional(),
  cpc: z.number().min(0).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createCampaignSchema = campaignSchema
  .omit({
    id: true,
    workspaceId: true,
    spend: true,
    impressions: true,
    clicks: true,
    ctr: true,
    conversions: true,
    cpa: true,
    roas: true,
    frequency: true,
    cpm: true,
    cpc: true,
    createdAt: true,
    updatedAt: true,
  })
  .strict();

export const updateCampaignSchema = createCampaignSchema.partial().strict();

export type Campaign = z.infer<typeof campaignSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
