import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler';
import { getModuleLogger } from '../lib/logger';

const router = Router();
const log = getModuleLogger('public-audit');

// ─── Request validation ──────────────────────────────────────

const AuditRequestSchema = z.object({
  ad_account_id: z.string().min(1, 'ad_account_id is required'),
  platform: z.enum(['meta', 'google'], {
    errorMap: () => ({ message: 'platform must be "meta" or "google"' }),
  }),
});

type AuditRequest = z.infer<typeof AuditRequestSchema>;

// ─── Response types ──────────────────────────────────────────

interface SimulatedCampaign {
  name: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roas: number;
}

interface WastedSpendEstimate {
  amount: number;
  currency: string;
  percentage: number;
}

interface CreativeFatigueAlert {
  campaign_name: string;
  days_running: number;
  ctr_drop: number;
  recommendation: string;
}

interface BudgetPacing {
  status: 'on_track' | 'underspending' | 'overspending';
  days_remaining: number;
  spend_rate: number;
  daily_budget: number;
}

interface PublicAuditResponse {
  ad_account_id: string;
  platform: 'meta' | 'google';
  audit_id: string;
  generated_at: string;
  top_campaigns: SimulatedCampaign[];
  wasted_spend_estimate: WastedSpendEstimate;
  creative_fatigue_alerts: CreativeFatigueAlert[];
  budget_pacing: BudgetPacing;
  opportunities_found: number;
  cta: {
    message: string;
    link: string;
  };
}

// ─── Simulated data generators ───────────────────────────────

function generateAuditId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = 'aud_';
  for (let i = 0; i < 24; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

function generateCampaigns(platform: 'meta' | 'google'): SimulatedCampaign[] {
  const metaNames = [
    'Brand Awareness - Q2 Push',
    'Retargeting - Cart Abandoners',
    'Lookalike - Top Purchasers',
    'Lead Gen - Free Trial Signup',
    'Dynamic Product Retargeting',
  ];
  const googleNames = [
    'Search - Brand Terms',
    'Performance Max - eCommerce',
    'Display - Remarketing List',
    'Shopping - Best Sellers',
    'YouTube - Product Demo',
  ];
  const names = platform === 'meta' ? metaNames : googleNames;

  return names.map((name) => ({
    name,
    spend: Math.round((Math.random() * 4500 + 500) * 100) / 100,
    impressions: Math.round(Math.random() * 500000 + 50000),
    clicks: Math.round(Math.random() * 8000 + 500),
    conversions: Math.round(Math.random() * 200 + 10),
    roas: Math.round((Math.random() * 5 + 0.5) * 100) / 100,
  }));
}

function generateWastedSpend(): WastedSpendEstimate {
  const percentage = Math.round((Math.random() * 18 + 8) * 10) / 10;
  return {
    amount: Math.round((Math.random() * 2800 + 400) * 100) / 100,
    currency: 'USD',
    percentage,
  };
}

function generateFatigueAlerts(): CreativeFatigueAlert[] {
  const alerts: CreativeFatigueAlert[] = [
    {
      campaign_name: 'Retargeting - Cart Abandoners',
      days_running: Math.round(Math.random() * 30 + 30),
      ctr_drop: Math.round((Math.random() * 40 + 15) * 10) / 10,
      recommendation: 'Refresh creative assets — CTR has declined significantly over the last 2 weeks.',
    },
    {
      campaign_name: 'Lookalike - Top Purchasers',
      days_running: Math.round(Math.random() * 20 + 20),
      ctr_drop: Math.round((Math.random() * 25 + 10) * 10) / 10,
      recommendation: 'A/B test new headline variants to reverse engagement decline.',
    },
    {
      campaign_name: 'Display - Remarketing List',
      days_running: Math.round(Math.random() * 40 + 25),
      ctr_drop: Math.round((Math.random() * 35 + 12) * 10) / 10,
      recommendation: 'Frequency capping is too loose — users are seeing the same ad 8+ times.',
    },
  ];
  return alerts.slice(0, Math.random() > 0.5 ? 3 : 2);
}

function generateBudgetPacing(): BudgetPacing {
  const statuses: BudgetPacing['status'][] = ['on_track', 'underspending', 'overspending'];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  return {
    status,
    days_remaining: Math.round(Math.random() * 20 + 5),
    spend_rate: Math.round((Math.random() * 150 + 50) * 100) / 100,
    daily_budget: Math.round((Math.random() * 200 + 100) * 100) / 100,
  };
}

// ─── Route handler ───────────────────────────────────────────

router.post(
  '/audit',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = AuditRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { ad_account_id, platform }: AuditRequest = parsed.data;

    log.info({ ad_account_id, platform }, 'Public audit requested');

    const response: PublicAuditResponse = {
      ad_account_id,
      platform,
      audit_id: generateAuditId(),
      generated_at: new Date().toISOString(),
      top_campaigns: generateCampaigns(platform),
      wasted_spend_estimate: generateWastedSpend(),
      creative_fatigue_alerts: generateFatigueAlerts(),
      budget_pacing: generateBudgetPacing(),
      opportunities_found: Math.floor(Math.random() * 8) + 8,
      cta: {
        message:
          'We found actionable opportunities to optimize your ad spend. Sign up for a free trial to unlock the full audit with real platform data.',
        link: '/signup?ref=free-audit',
      },
    };

    res.status(200).json(response);
  }),
);

export default router;
