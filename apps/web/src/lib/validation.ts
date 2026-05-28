import { z } from 'zod';

/* ─── Auth Schemas ─── */
export const signInSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required').min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

export const signUpSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Confirm password is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email'),
});

/* ─── Campaign Schemas ─── */
export const createCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').min(2, 'Campaign name must be at least 2 characters'),
  platform: z.enum(['Meta', 'Google', 'TikTok', 'Snap']),
  objective: z.string().min(1, 'Objective is required'),
  budgetType: z.enum(['Daily', 'Lifetime']),
  budget: z.string().or(z.number()).transform((v) => Number(v)).refine((v) => v > 0, { message: 'Budget must be positive' }),
  bidStrategy: z.string().optional(),
  ageRange: z.string().optional(),
  gender: z.string().optional(),
  locations: z.array(z.string()).optional(),
  interests: z.array(z.string()).optional(),
});

export const updateCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').optional(),
  status: z.enum(['Active', 'Paused', 'Draft', 'Ended']).optional(),
  budget: z.number().positive().optional(),
});

/* ─── Rule Schemas ─── */
export const createRuleSchema = z.object({
  name: z.string().min(1, 'Rule name is required').min(2, 'Rule name must be at least 2 characters'),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  conditions: z.array(z.object({
    metric: z.string().min(1, 'Metric is required'),
    operator: z.enum(['gt', 'gte', 'lt', 'lte', 'eq', 'neq']),
    value: z.string().or(z.number()),
  })).min(1, 'At least one condition is required'),
  actions: z.array(z.object({
    type: z.enum(['pause_campaign', 'increase_budget', 'decrease_budget', 'notify', 'adjust_bid']),
    parameters: z.record(z.string(), z.any()),
  })).min(1, 'At least one action is required'),
});

/* ─── Goal Schemas ─── */
export const createGoalSchema = z.object({
  name: z.string().min(1, 'Goal name is required').min(2, 'Goal name must be at least 2 characters'),
  goalType: z.enum(['roas', 'cpa', 'ctr', 'spend', 'conversions', 'custom']),
  targetValue: z.string().or(z.number()).transform((v) => Number(v)).refine((v) => v > 0, { message: 'Target must be positive' }),
  unit: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
}).refine((data) => {
  if (!data.startDate || !data.endDate) return true;
  return new Date(data.endDate) > new Date(data.startDate);
}, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

/* ─── Draft Schemas ─── */
export const createDraftSchema = z.object({
  title: z.string().min(1, 'Draft title is required').min(2, 'Title must be at least 2 characters'),
  content: z.string().min(1, 'Content is required'),
  type: z.enum(['campaign', 'creative', 'audience', 'rule']),
  tags: z.array(z.string()).optional(),
});

/* ─── Settings Schemas ─── */
export const profileSettingsSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  company: z.string().optional(),
  role: z.string().optional(),
});

export const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean().default(true),
  pushNotifications: z.boolean().default(true),
  weeklyDigest: z.boolean().default(true),
  campaignAlerts: z.boolean().default(true),
  budgetAlerts: z.boolean().default(true),
  alertThreshold: z.string().or(z.number()).transform((v) => Number(v)).optional(),
});

/* ─── Export inferred types ─── */
export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type CreateRuleInput = z.infer<typeof createRuleSchema>;
export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type CreateDraftInput = z.infer<typeof createDraftSchema>;
export type ProfileSettingsInput = z.infer<typeof profileSettingsSchema>;
export type NotificationSettingsInput = z.infer<typeof notificationSettingsSchema>;
