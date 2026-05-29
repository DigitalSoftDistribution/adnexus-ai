import { z } from 'zod';

export const planTierSchema = z.enum(['FREE', 'GROWTH', 'TEAM', 'AGENCY']);

export const workspaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  plan: planTierSchema,
  stripeCustomerId: z.string().optional(),
  stripeSubscriptionId: z.string().optional(),
  subscriptionStatus: z.enum(['ACTIVE', 'PAST_DUE', 'CANCELED', 'TRIALING']).optional(),
  currentPeriodStart: z.string().datetime().optional(),
  currentPeriodEnd: z.string().datetime().optional(),
  cancelAtPeriodEnd: z.boolean().default(false),
  ownerId: z.string().uuid(),
  branding: z.record(z.unknown()).optional(),
  settings: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Workspace = z.infer<typeof workspaceSchema>;
export type PlanTier = z.infer<typeof planTierSchema>;
