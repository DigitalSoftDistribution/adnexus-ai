#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  AdNexus Backend — Rich Seed Data                                       ║
 * ║  Generates realistic demo data for development & staging environments   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Usage:
 *   npx tsx scripts/seed-rich.ts           # Full seed with progress
 *   npx tsx scripts/seed-rich.ts --reset   # Reset DB then seed
 *   npx tsx scripts/seed-rich.ts --dry-run # Preview counts only
 */

import { PrismaClient, Prisma, Platform, UserRole, CampaignStatus, AdStatus, DraftStatus, RuleStatus, NotificationType, AuditAction } from '@prisma/client';
import { randomInt, randomUUID } from 'crypto';

const prisma = new PrismaClient({
  log: process.env.DEBUG === 'true' ? ['query', 'info', 'warn'] : ['warn'],
});

// ── Configuration ───────────────────────────────────────────────────────────
const CONFIG = {
  WORKSPACES: 5,
  USERS: 24,
  CAMPAIGNS: 52,
  ADS: 120,
  METRICS_DAYS: 30,
  DRAFTS: 24,
  AI_RULES: 12,
  NOTIFICATIONS: 55,
  AUDIT_LOGS: 36,
  AUDIENCES: 16,
};

// ── Deterministic pseudo-random (for consistent demo data) ──────────────────
let _seed = 42;
function seededRandom(): number {
  _seed = (_seed * 16807 + 0) % 2147483647;
  return (_seed - 1) / 2147483646;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(seededRandom() * arr.length)];
}

function pickMany<T>(arr: T[], min: number, max: number): T[] {
  const count = randInt(min, max);
  const shuffled = [...arr].sort(() => seededRandom() - 0.5);
  return shuffled.slice(0, count);
}

function randInt(min: number, max: number): number {
  return min + Math.floor(seededRandom() * (max - min + 1));
}

function randFloat(min: number, max: number, decimals = 2): number {
  return parseFloat((min + seededRandom() * (max - min)).toFixed(decimals));
}

function randBool(probability = 0.5): boolean {
  return seededRandom() < probability;
}

function dateDaysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(randInt(0, 23), randInt(0, 59), 0, 0);
  return d;
}

// ── Realistic Data Pools ───────────────────────────────────────────────────
const WORKSPACE_DATA = [
  { name: 'Acme Industries', slug: 'acme-industries', plan: 'enterprise', description: 'Full-service digital marketing for Acme product lines' },
  { name: 'BrightWave Media', slug: 'brightwave-media', plan: 'pro', description: 'Performance marketing agency specializing in B2B SaaS' },
  { name: 'Crestline E-commerce', slug: 'crestline-shop', plan: 'business', description: 'Multi-channel retail with seasonal campaign focus' },
  { name: 'Delta Finance Group', slug: 'delta-finance', plan: 'enterprise', description: 'Financial services lead generation across APAC' },
  { name: 'Evergreen Wellness', slug: 'evergreen-wellness', plan: 'starter', description: 'Health and wellness brand building' },
];

const USER_FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery',
  'Sam', 'Dakota', 'Reese', 'Skyler', 'Rowan', 'Emerson', 'Sage', 'Hayden',
  'Charlie', 'Parker', 'Sawyer', 'Kai', 'Elara', 'Nolan', 'Mila', 'Zane',
];

const USER_LAST_NAMES = [
  'Chen', 'Patel', 'Rodriguez', 'Kim', 'Singh', 'Müller', 'Watanabe', 'Silva',
  'Anderson', 'Thompson', 'Nakamura', 'Osei', 'Ivanov', 'Tanaka', 'Gupta', 'Kowalski',
  'Rossi', 'Svensson', 'O\'Brien', 'Dubois', 'Jensen', 'Popov', 'Ali', 'Zhang',
];

const CAMPAIGN_TEMPLATES = [
  // Google Ads
  { platform: 'GOOGLE' as Platform, prefix: 'Search' },
  { platform: 'GOOGLE' as Platform, prefix: 'Display' },
  { platform: 'GOOGLE' as Platform, prefix: 'Performance Max' },
  { platform: 'GOOGLE' as Platform, prefix: 'YouTube Video' },
  // Meta
  { platform: 'META' as Platform, prefix: 'Facebook Feed' },
  { platform: 'META' as Platform, prefix: 'Instagram Stories' },
  { platform: 'META' as Platform, prefix: 'Meta Advantage+' },
  { platform: 'META' as Platform, prefix: 'Facebook Video' },
  // LinkedIn
  { platform: 'LINKEDIN' as Platform, prefix: 'Sponsored Content' },
  { platform: 'LINKEDIN' as Platform, prefix: 'Lead Gen' },
  { platform: 'LINKEDIN' as Platform, prefix: 'Dynamic Ads' },
  // TikTok
  { platform: 'TIKTOK' as Platform, prefix: 'In-Feed' },
  { platform: 'TIKTOK' as Platform, prefix: 'Spark Ads' },
  { platform: 'TIKTOK' as Platform, prefix: 'Collection' },
];

const CAMPAIGN_NOUNS = [
  'Product Launch', 'Brand Awareness', 'Holiday Sale', 'Retargeting', 'Prospecting',
  'App Install', 'Lead Generation', 'Conversion', 'Seasonal Push', 'Lookalike',
  'Re-engagement', 'Flash Sale', 'Competitor Conquest', 'Cart Recovery',
  'Awareness Lift', 'Launch Promo', 'VIP Early Access', 'Spring Collection',
  'Summer Blast', 'Back to School', 'Black Friday', 'Year-End Clearance',
  'New Customer', 'Loyalty Rewards', 'Cross-sell', 'Upsell Campaign',
  'Webinar Promo', 'Demo Request', 'Free Trial', 'Case Study',
  'Thought Leadership', 'Event Registration', 'Newsletter Signup',
  'Whitepaper Download', 'Consultation Booking', 'Membership Drive',
];

const AD_HEADLINES = [
  'Unlock Your Potential Today',
  'Limited Time: 50% Off Everything',
  'The Smart Choice for Professionals',
  'Join 10,000+ Happy Customers',
  'Revolutionize Your Workflow',
  'Exclusive Deal Inside',
  'See Results in Just 7 Days',
  'Your Success Story Starts Here',
  'Why Top Brands Choose Us',
  'Upgrade Your Experience Now',
  'Free Shipping on All Orders',
  'Discover What You\'ve Been Missing',
  'Rated #1 by Industry Experts',
  'Last Chance: Sale Ends Tonight',
  'The Future of [Product] Is Here',
  'Transform Your Business Today',
  'Get Started in Under 5 Minutes',
  'Trusted by Fortune 500 Companies',
  'Save Time. Save Money. Win More.',
  'Your Competitive Edge Awaits',
];

const AD_DESCRIPTIONS = [
  'Experience the difference with our award-winning platform. Start your free trial today—no credit card required.',
  'Join thousands of professionals who trust our solution. 30-day money-back guarantee.',
  'Streamline your workflow, boost productivity, and achieve more with less effort. Learn how.',
  'Discover why we\'re rated 4.9/5 stars. Exclusive offer for new customers only.',
  'Stop struggling with outdated tools. Upgrade to the modern solution designed for growth.',
  'Real results from real customers. See case studies and ROI data from similar businesses.',
  'Everything you need in one powerful platform. Integrations, analytics, and support included.',
  'Limited spots available for our pilot program. Apply now and get premium features free.',
];

const AD_CTAS = ['Shop Now', 'Learn More', 'Sign Up', 'Get Started', 'Book Demo', 'Claim Offer', 'Download Now', 'Subscribe'];

const DRAFT_TITLES = [
  'Q4 Budget Reallocation Plan',
  'New Creative Variant — Video A',
  'Audience Expansion Proposal',
  'Pixel Migration Checklist',
  'Attribution Model Update',
  'Campaign Naming Convention Refresh',
  'UTM Parameter Audit',
  'Competitor Ad Intelligence Report',
  'Landing Page A/B Test Plan',
  'Creative Refresh Strategy',
  'Budget Pacing Optimization',
  'Multi-touch Attribution Setup',
  'Conversion API Integration',
  'Dynamic Creative Brief',
  'Seasonal Calendar 2024',
  'ROAS Target Adjustment',
  'Frequency Cap Analysis',
  'Custom Audience Sync Script',
  'Ad Copy Localization Plan',
  'Performance Reporting Template',
  'CBO vs ABO Test Plan',
  'Creative Fatigue Detection',
  'Bid Strategy Migration',
  'Post-iOS14 Measurement Plan',
];

const RULE_NAMES = [
  'Pause Low ROAS Campaigns',
  'Scale High Performers',
  'Auto-adjust Bids by CPA',
  'Notify on Budget Overspend',
  'Increase Budget on Weekends',
  'Pause Creatives with High Frequency',
  'Duplicate Winning Ad Sets',
  'Reduce Bids for High CPC',
  'Alert on Conversion Rate Drop',
  'Auto-generate Weekly Reports',
  'Sync Audiences Nightly',
  'Enforce Campaign Naming Rules',
];

const AUDIENCE_SEGMENTS = [
  { name: 'High-Value Customers', type: 'CUSTOM', description: 'Users with LTV > $500', size: 12500 },
  { name: 'Website Visitors 30d', type: 'WEBSITE', description: 'All website visitors last 30 days', size: 145000 },
  { name: 'Cart Abandoners', type: 'WEBSITE', description: 'Added to cart but did not purchase', size: 8700 },
  { name: 'Video Viewers 75%', type: 'ENGAGEMENT', description: 'Watched 75%+ of any video ad', size: 23400 },
  { name: 'Lookalike 1% — Purchasers', type: 'LOOKALIKE', description: '1% lookalike of purchasers', size: 2100000 },
  { name: 'Email Subscribers', type: 'CUSTOMER_LIST', description: 'Uploaded email list', size: 45600 },
  { name: 'App Installers', type: 'APP', description: 'Users who installed the app', size: 18900 },
  { name: 'Past Purchasers 90d', type: 'CUSTOM', description: 'Made a purchase in last 90 days', size: 34200 },
  { name: 'Engaged Shoppers', type: 'ENGAGEMENT', description: 'High engagement + website activity', size: 67800 },
  { name: 'B2B Decision Makers', type: 'CUSTOM', description: 'Senior title + company size 200+', size: 5600 },
  { name: 'Free Trial Users', type: 'CUSTOM', description: 'Started a free trial', size: 12300 },
  { name: 'Churned Customers', type: 'CUSTOM', description: 'No purchase in 180+ days', size: 28900 },
  { name: 'Event Attendees', type: 'CUSTOMER_LIST', description: 'Registered for webinar or event', size: 7400 },
  { name: 'Mobile App DAU', type: 'APP', description: 'Daily active mobile users', size: 45200 },
  { name: 'Cross-platform Engagers', type: 'ENGAGEMENT', description: 'Engaged on 2+ platforms', size: 31500 },
  { name: 'VIP Tier Members', type: 'CUSTOM', description: 'Gold/Platinum loyalty members', size: 2800 },
];

const NOTIFICATION_MESSAGES = [
  'Campaign "{campaign}" ROAS dropped below target (1.5x)',
  'Budget alert: "{campaign}" has spent 80% of daily budget',
  'New conversion milestone: "{campaign}" reached 100 conversions',
  'AI Rule triggered: "{rule}" executed successfully',
  'Creative "{ad}" frequency exceeds 3.0 — consider refresh',
  'Weekly report is ready for review',
  'New team member joined {workspace}',
  'Payment method on file expires in 7 days',
  '"{campaign}" is now pending approval on {platform}',
  'CPA for "{campaign}" improved by 23% WoW',
  'Attribution window change detected for {platform} account',
  'Draft "{draft}" was approved and published',
  'Audience "{audience}" sync completed with 98% match rate',
  'MCP Server connection restored',
  'New AI insight: Top 3 performing creatives this week',
];

const AUDIT_ACTIONS: AuditAction[] = [
  'CAMPAIGN_CREATED', 'CAMPAIGN_UPDATED', 'CAMPAIGN_PAUSED', 'CAMPAIGN_DELETED',
  'AD_CREATED', 'AD_UPDATED', 'AD_PAUSED', 'AD_PUBLISHED',
  'RULE_TRIGGERED', 'RULE_CREATED', 'RULE_UPDATED', 'RULE_DELETED',
  'USER_INVITED', 'USER_ROLE_CHANGED', 'WORKSPACE_UPDATED',
  'AUDIENCE_SYNCED', 'BUDGET_CHANGED', 'REPORT_EXPORTED',
];

// ── Reset Database ──────────────────────────────────────────────────────────
async function resetDatabase(): Promise<void> {
  console.log('  🗑️  Resetting database...');
  const tableNames = [
    'DailyMetrics', 'AuditLog', 'Notification', 'Ad',
    'Campaign', 'Draft', 'AiRule', 'Audience', 'ApiKey',
    'User', 'Workspace',
  ];
  for (const table of tableNames) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    } catch {
      // Table may not exist, skip
    }
  }
  console.log('  ✅ Database reset complete');
}

// ── Seed Workspaces ─────────────────────────────────────────────────────────
async function seedWorkspaces() {
  console.log(`  🏢 Creating ${CONFIG.WORKSPACES} workspaces...`);
  const workspaces: any[] = [];

  for (let i = 0; i < CONFIG.WORKSPACES; i++) {
    const data = WORKSPACE_DATA[i];
    const ws = await prisma.workspace.create({
      data: {
        id: randomUUID(),
        name: data.name,
        slug: data.slug,
        description: data.description,
        plan: data.plan as any,
        settings: {
          timezone: pick(['America/New_York', 'Europe/London', 'Asia/Singapore', 'America/Los_Angeles', 'Australia/Sydney']),
          currency: pick(['USD', 'EUR', 'GBP', 'SGD', 'AUD']),
          weeklyBudgetCap: randFloat(5000, 50000) * (data.plan === 'enterprise' ? 5 : data.plan === 'pro' ? 2 : 1),
          enableAi: data.plan !== 'starter',
          enableAdvancedReporting: data.plan === 'enterprise' || data.plan === 'pro',
        },
        createdAt: dateDaysAgo(randInt(60, 365)),
        updatedAt: dateDaysAgo(randInt(1, 30)),
      },
    });
    workspaces.push(ws);
  }

  console.log(`  ✅ ${workspaces.length} workspaces created`);
  return workspaces;
}

// ── Seed Users ──────────────────────────────────────────────────────────────
async function seedUsers(workspaces: any[]) {
  console.log(`  👤 Creating ${CONFIG.USERS} users...`);
  const users: any[] = [];
  const roles: UserRole[] = ['OWNER', 'ADMIN', 'MANAGER', 'VIEWER'];

  // Ensure at least one owner per workspace
  for (let wi = 0; wi < workspaces.length; wi++) {
    const ws = workspaces[wi];
    const owner = await prisma.user.create({
      data: {
        id: randomUUID(),
        email: `owner.${ws.slug}@example.com`.toLowerCase(),
        firstName: pick(USER_FIRST_NAMES),
        lastName: pick(USER_LAST_NAMES),
        role: 'OWNER',
        workspaceId: ws.id,
        isActive: true,
        lastLoginAt: dateDaysAgo(randInt(0, 3)),
        createdAt: dateDaysAgo(randInt(30, 90)),
      },
    });
    users.push(owner);
  }

  // Remaining users distributed across workspaces
  const remaining = CONFIG.USERS - workspaces.length;
  for (let i = 0; i < remaining; i++) {
    const ws = workspaces[i % workspaces.length];
    const role = i < 4 ? 'ADMIN' : i < 10 ? 'MANAGER' : 'VIEWER';
    const firstName = USER_FIRST_NAMES[i % USER_FIRST_NAMES.length];
    const lastName = USER_LAST_NAMES[i % USER_LAST_NAMES.length];

    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${i}@example.com`,
        firstName,
        lastName,
        role: role as UserRole,
        workspaceId: ws.id,
        isActive: randBool(0.9),
        lastLoginAt: randBool(0.8) ? dateDaysAgo(randInt(0, 14)) : null,
        createdAt: dateDaysAgo(randInt(7, 60)),
      },
    });
    users.push(user);
  }

  console.log(`  ✅ ${users.length} users created`);
  return users;
}

// ── Seed Campaigns ──────────────────────────────────────────────────────────
async function seedCampaigns(workspaces: any[]) {
  console.log(`  📢 Creating ${CONFIG.CAMPAIGNS} campaigns...`);
  const campaigns: any[] = [];
  const statuses: CampaignStatus[] = ['ACTIVE', 'PAUSED', 'ARCHIVED', 'DRAFT', 'PENDING_APPROVAL'];
  const statusWeights = [0.4, 0.2, 0.1, 0.2, 0.1];

  for (let i = 0; i < CONFIG.CAMPAIGNS; i++) {
    const ws = workspaces[i % workspaces.length];
    const template = CAMPAIGN_TEMPLATES[i % CAMPAIGN_TEMPLATES.length];
    const noun = CAMPAIGN_NOUNS[i % CAMPAIGN_NOUNS.length];
    const objective = pick(['AWARENESS', 'CONSIDERATION', 'CONVERSION', 'RETENTION', 'LEAD_GENERATION', 'APP_INSTALLS']);

    // Weighted status selection
    let status: CampaignStatus = 'ACTIVE';
    const r = seededRandom();
    let cumulative = 0;
    for (let s = 0; s < statuses.length; s++) {
      cumulative += statusWeights[s];
      if (r <= cumulative) { status = statuses[s]; break; }
    }

    const budget = randFloat(500, 15000);
    const spent = status === 'ACTIVE' || status === 'PAUSED' ? randFloat(0, budget) : randFloat(0.5, 1) * budget;

    const campaign = await prisma.campaign.create({
      data: {
        id: randomUUID(),
        name: `${template.prefix} — ${noun} ${Math.floor(i / 4) + 1}`,
        platform: template.platform,
        objective,
        status,
        workspaceId: ws.id,
        dailyBudget: parseFloat((budget / 30).toFixed(2)),
        totalBudget: budget,
        spent: parseFloat(spent.toFixed(2)),
        impressions: randInt(10000, 5000000),
        clicks: randInt(500, 200000),
        conversions: randInt(10, 5000),
        ctr: randFloat(0.3, 5.0),
        cpc: randFloat(0.5, 15.0),
        cpm: randFloat(2, 50),
        roas: randFloat(0.5, 8.0),
        currency: ws.settings?.currency || 'USD',
        externalId: `ext_${template.platform.toLowerCase()}_${randomUUID().slice(0, 8)}`,
        targeting: {
          ageMin: pick([18, 21, 25, 30]),
          ageMax: pick([45, 55, 65]),
          genders: pick([['MALE', 'FEMALE'], ['MALE'], ['FEMALE'], ['ALL']]),
          countries: pick([['US'], ['US', 'CA', 'GB'], ['DE', 'FR', 'IT', 'ES'], ['SG', 'AU', 'JP']]),
          languages: pick([['en'], ['en', 'es'], ['en', 'de', 'fr']]),
        },
        schedule: {
          startDate: dateDaysAgo(randInt(7, 60)),
          endDate: randBool(0.3) ? dateDaysAgo(randInt(-30, -1)) : null,
          dayParting: randBool(0.4) ? { enabled: true, hours: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] } : { enabled: false },
        },
        createdAt: dateDaysAgo(randInt(7, 60)),
        updatedAt: dateDaysAgo(randInt(1, 7)),
      },
    });
    campaigns.push(campaign);
  }

  console.log(`  ✅ ${campaigns.length} campaigns created`);
  return campaigns;
}

// ── Seed Ads ────────────────────────────────────────────────────────────────
async function seedAds(campaigns: any[]) {
  console.log(`  🎨 Creating ${CONFIG.ADS} ads...`);
  const ads: any[] = [];
  const statuses: AdStatus[] = ['ACTIVE', 'PAUSED', 'ARCHIVED', 'UNDER_REVIEW', 'REJECTED'];

  for (let i = 0; i < CONFIG.ADS; i++) {
    const campaign = campaigns[i % campaigns.length];
    const status = pick(statuses);
    const isVideo = campaign.name.toLowerCase().includes('video') || campaign.platform === 'TIKTOK';

    const headline = pick(AD_HEADLINES);
    const description = pick(AD_DESCRIPTIONS);
    const cta = pick(AD_CTAS);

    const impressions = randInt(1000, 500000);
    const clicks = Math.floor(impressions * randFloat(0.001, 0.08));
    const conversions = Math.floor(clicks * randFloat(0.01, 0.15));

    const ad = await prisma.ad.create({
      data: {
        id: randomUUID(),
        name: `${campaign.platform} Ad ${i + 1} — ${headline.slice(0, 30)}`,
        campaignId: campaign.id,
        status,
        creativeType: isVideo ? 'VIDEO' : pick(['IMAGE', 'CAROUSEL', 'COLLECTION']),
        headline,
        description,
        cta,
        destinationUrl: `https://example.com/landing/${campaign.slug || 'campaign'}-${i + 1}`,
        impressions,
        clicks,
        conversions,
        ctr: parseFloat(((clicks / impressions) * 100).toFixed(2)),
        cpc: randFloat(0.3, 12.0),
        cpm: randFloat(1.5, 40.0),
        roas: randFloat(0.5, 10.0),
        frequency: randFloat(1.0, 5.0),
        qualityScore: randInt(1, 10),
        engagementRate: randFloat(0.5, 15.0),
        creativeAsset: {
          primaryText: `${headline}. ${description}`,
          mediaUrl: isVideo ? `https://cdn.example.com/videos/ad_${i + 1}.mp4` : `https://cdn.example.com/images/ad_${i + 1}.jpg`,
          thumbnailUrl: `https://cdn.example.com/thumbs/ad_${i + 1}.jpg`,
          aspectRatio: pick(['1:1', '16:9', '9:16', '4:5']),
          duration: isVideo ? randInt(5, 60) : null,
          fileSize: isVideo ? randInt(2000, 50000) : randInt(100, 5000),
        },
        createdAt: dateDaysAgo(randInt(5, 45)),
        updatedAt: dateDaysAgo(randInt(1, 5)),
      },
    });
    ads.push(ad);
  }

  console.log(`  ✅ ${ads.length} ads created`);
  return ads;
}

// ── Seed Daily Metrics ──────────────────────────────────────────────────────
async function seedDailyMetrics(campaigns: any[]) {
  const totalRecords = campaigns.length * CONFIG.METRICS_DAYS;
  console.log(`  📊 Creating ${totalRecords} daily metrics records (×${CONFIG.METRICS_DAYS} days)...`);

  const metricsData: any[] = [];

  for (const campaign of campaigns) {
    // Generate realistic trend with weekly seasonality
    let baseImpressions = randInt(1000, 100000);
    let baseClicks = Math.floor(baseImpressions * randFloat(0.005, 0.03));
    let baseSpend = randFloat(10, 500);

    for (let day = 0; day < CONFIG.METRICS_DAYS; day++) {
      const date = new Date();
      date.setDate(date.getDate() - (CONFIG.METRICS_DAYS - day));
      date.setHours(0, 0, 0, 0);

      // Weekend dip
      const dayOfWeek = date.getDay();
      const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? randFloat(0.6, 0.8) : randFloat(0.9, 1.2);

      // Gradual trend (slight improvement over time)
      const trendFactor = 1 + (day / CONFIG.METRICS_DAYS) * randFloat(0, 0.3);

      // Random daily variance
      const variance = randFloat(0.7, 1.3);

      const impressions = Math.floor(baseImpressions * weekendFactor * trendFactor * variance);
      const clicks = Math.floor(baseClicks * weekendFactor * trendFactor * variance);
      const spend = parseFloat((baseSpend * weekendFactor * trendFactor * variance).toFixed(2));
      const conversions = Math.floor(clicks * randFloat(0.02, 0.12));
      const ctr = impressions > 0 ? parseFloat(((clicks / impressions) * 100).toFixed(2)) : 0;
      const cpc = clicks > 0 ? parseFloat((spend / clicks).toFixed(2)) : 0;
      const cpm = impressions > 0 ? parseFloat(((spend / impressions) * 1000).toFixed(2)) : 0;
      const roas = conversions > 0 ? randFloat(0.8, 6.0) : 0;

      metricsData.push({
        id: randomUUID(),
        campaignId: campaign.id,
        date,
        impressions,
        clicks,
        conversions,
        spend,
        ctr,
        cpc,
        cpm,
        roas,
        reach: Math.floor(impressions * randFloat(0.3, 0.7)),
        frequency: parseFloat((impressions / Math.max(Math.floor(impressions * randFloat(0.3, 0.7)), 1)).toFixed(2)),
        engagement: Math.floor(clicks * randFloat(0.5, 2.0)),
        videoViews: campaign.name.toLowerCase().includes('video') ? Math.floor(impressions * randFloat(0.1, 0.5)) : null,
        videoViewRate: campaign.name.toLowerCase().includes('video') ? randFloat(5, 85) : null,
        createdAt: date,
      });
    }
  }

  // Batch insert in chunks
  const chunkSize = 500;
  let inserted = 0;
  for (let i = 0; i < metricsData.length; i += chunkSize) {
    const chunk = metricsData.slice(i, i + chunkSize);
    await prisma.dailyMetrics.createMany({ data: chunk, skipDuplicates: true });
    inserted += chunk.length;
  }

  console.log(`  ✅ ${inserted} daily metrics records created`);
}

// ── Seed Drafts ─────────────────────────────────────────────────────────────
async function seedDrafts(workspaces: any[], campaigns: any[], users: any[]) {
  console.log(`  📝 Creating ${CONFIG.DRAFTS} drafts...`);
  const drafts: any[] = [];
  const statuses: DraftStatus[] = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'PENDING_PUBLISH', 'PUBLISHED', 'SCHEDULED'];

  for (let i = 0; i < CONFIG.DRAFTS; i++) {
    const ws = workspaces[i % workspaces.length];
    const status = i < 4 ? 'DRAFT' : i < 8 ? 'IN_REVIEW' : i < 12 ? 'APPROVED' : i < 16 ? 'PENDING_PUBLISH' : i < 20 ? 'PUBLISHED' : 'SCHEDULED';
    const campaign = i < 8 ? null : campaigns[i % campaigns.length];
    const author = users[i % users.length];

    const draft = await prisma.draft.create({
      data: {
        id: randomUUID(),
        title: DRAFT_TITLES[i % DRAFT_TITLES.length],
        status,
        workspaceId: ws.id,
        campaignId: campaign?.id || null,
        authorId: author.id,
        content: {
          type: pick(['campaign_edit', 'new_campaign', 'creative_update', 'budget_change', 'audience_update']),
          summary: `Draft proposal for ${DRAFT_TITLES[i % DRAFT_TITLES.length].toLowerCase()}`,
          changes: {
            field: pick(['budget', 'targeting', 'creative', 'bidding', 'schedule']),
            oldValue: pick(['$1,000', 'Broad targeting', 'Static image', 'Manual CPC', 'Always on']),
            newValue: pick(['$2,500', 'Narrow segments', 'Video carousel', 'Auto-bidding', 'Day-parting enabled']),
          },
          notes: 'Please review before approving. Test budget set to 20% of total.',
        },
        submittedAt: status !== 'DRAFT' ? dateDaysAgo(randInt(1, 14)) : null,
        reviewedById: status === 'APPROVED' || status === 'REJECTED' ? users[(i + 1) % users.length].id : null,
        reviewedAt: status === 'APPROVED' || status === 'REJECTED' ? dateDaysAgo(randInt(1, 7)) : null,
        reviewNotes: status === 'APPROVED' ? 'Looks good, approved for publish.' : status === 'REJECTED' ? 'Needs revision — targeting too narrow.' : null,
        scheduledAt: status === 'SCHEDULED' ? dateDaysAgo(-randInt(1, 7)) : null,
        createdAt: dateDaysAgo(randInt(3, 30)),
        updatedAt: dateDaysAgo(randInt(1, 5)),
      },
    });
    drafts.push(draft);
  }

  console.log(`  ✅ ${drafts.length} drafts created`);
  return drafts;
}

// ── Seed AI Rules ───────────────────────────────────────────────────────────
async function seedAiRules(workspaces: any[], campaigns: any[]) {
  console.log(`  🤖 Creating ${CONFIG.AI_RULES} AI rules...`);
  const rules: any[] = [];

  for (let i = 0; i < CONFIG.AI_RULES; i++) {
    const ws = workspaces[i % workspaces.length];
    const status: RuleStatus = i < 8 ? 'ACTIVE' : 'PAUSED';

    const rule = await prisma.aiRule.create({
      data: {
        id: randomUUID(),
        name: RULE_NAMES[i % RULE_NAMES.length],
        description: `Automatically ${RULE_NAMES[i % RULE_NAMES.length].toLowerCase()} based on configured thresholds`,
        status,
        workspaceId: ws.id,
        trigger: {
          metric: pick(['roas', 'cpa', 'ctr', 'spend', 'frequency', 'conversions']),
          operator: pick(['lt', 'gt', 'eq', 'between']),
          value: pick([1.0, 1.5, 2.0, 50, 100, 3.0]),
          window: pick(['1d', '3d', '7d', '14d']),
        },
        action: {
          type: pick(['PAUSE', 'ADJUST_BUDGET', 'SEND_NOTIFICATION', 'DUPLICATE', 'CHANGE_BID']),
          params: {
            adjustBy: pick([-0.2, 0.1, 0.3, -0.5]),
            targetBudget: randInt(100, 5000),
            bidMultiplier: randFloat(0.5, 2.0),
          },
        },
        scope: {
          campaignIds: pickMany(campaigns.filter(c => c.workspaceId === ws.id).map(c => c.id), 1, 5),
          applyTo: pick(['ALL_CAMPAIGNS', 'SELECTED_CAMPAIGNS', 'NEW_CAMPAIGNS']),
        },
        schedule: {
          frequency: pick(['REALTIME', 'HOURLY', 'DAILY', 'WEEKLY']),
          runAt: pick(['00:00', '06:00', '12:00', '18:00']),
          timezone: ws.settings?.timezone || 'UTC',
        },
        executionCount: randInt(0, 250),
        lastTriggeredAt: status === 'ACTIVE' && randBool(0.7) ? dateDaysAgo(randInt(0, 7)) : null,
        createdAt: dateDaysAgo(randInt(14, 60)),
        updatedAt: dateDaysAgo(randInt(1, 14)),
      },
    });
    rules.push(rule);
  }

  console.log(`  ✅ ${rules.length} AI rules created`);
  return rules;
}

// ── Seed Notifications ──────────────────────────────────────────────────────
async function seedNotifications(users: any[], campaigns: any[], rules: any[], workspaces: any[], audiences: any[]) {
  console.log(`  🔔 Creating ${CONFIG.NOTIFICATIONS} notifications...`);
  const notifications: any[] = [];

  for (let i = 0; i < CONFIG.NOTIFICATIONS; i++) {
    const user = users[i % users.length];
    const campaign = campaigns[i % campaigns.length];
    const rule = rules[i % rules.length];
    const workspace = workspaces[i % workspaces.length];
    const audience = audiences[i % audiences.length];
    const draft = { title: DRAFT_TITLES[i % DRAFT_TITLES.length] };

    let message = NOTIFICATION_MESSAGES[i % NOTIFICATION_MESSAGES.length]
      .replace('{campaign}', campaign.name)
      .replace('{rule}', rule.name)
      .replace('{ad}', `Ad ${i + 1}`)
      .replace('{workspace}', workspace.name)
      .replace('{draft}', draft.title)
      .replace('{audience}', audience.name)
      .replace('{platform}', campaign.platform);

    const type: NotificationType = pick(['CAMPAIGN_ALERT', 'SYSTEM', 'AI_INSIGHT', 'BILLING', 'COLLABORATION', 'SECURITY']);

    const notification = await prisma.notification.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        workspaceId: workspace.id,
        type,
        title: message.length > 60 ? message.slice(0, 60) + '...' : message,
        message,
        metadata: {
          campaignId: campaign.id,
          priority: pick(['low', 'medium', 'high', 'urgent']),
          actionUrl: `/campaigns/${campaign.id}`,
          icon: type === 'CAMPAIGN_ALERT' ? 'trending-down' : type === 'AI_INSIGHT' ? 'sparkles' : type === 'BILLING' ? 'credit-card' : 'bell',
        },
        isRead: randBool(0.4),
        readAt: randBool(0.4) ? dateDaysAgo(randInt(0, 5)) : null,
        createdAt: dateDaysAgo(randInt(0, 14)),
      },
    });
    notifications.push(notification);
  }

  console.log(`  ✅ ${notifications.length} notifications created`);
  return notifications;
}

// ── Seed Audit Logs ─────────────────────────────────────────────────────────
async function seedAuditLogs(users: any[], campaigns: any[], workspaces: any[], rules: any[], audiences: any[]) {
  console.log(`  📋 Creating ${CONFIG.AUDIT_LOGS} audit log entries...`);
  const logs: any[] = [];

  for (let i = 0; i < CONFIG.AUDIT_LOGS; i++) {
    const user = users[i % users.length];
    const workspace = workspaces[i % workspaces.length];
    const campaign = campaigns[i % campaigns.length];
    const rule = rules[i % rules.length];
    const audience = audiences[i % audiences.length];

    const action = pick(AUDIT_ACTIONS);
    const entityType = action.startsWith('CAMPAIGN') ? 'CAMPAIGN' :
      action.startsWith('AD') ? 'AD' :
      action.startsWith('RULE') ? 'AI_RULE' :
      action.startsWith('USER') ? 'USER' :
      action.startsWith('WORKSPACE') ? 'WORKSPACE' :
      action.startsWith('AUDIENCE') ? 'AUDIENCE' :
      'SYSTEM';

    const entityId = entityType === 'CAMPAIGN' ? campaign.id :
      entityType === 'AI_RULE' ? rule.id :
      entityType === 'AUDIENCE' ? audience.id :
      entityType === 'WORKSPACE' ? workspace.id :
      user.id;

    const descriptions: Record<string, string> = {
      CAMPAIGN_CREATED: `Created campaign "${campaign.name}" on ${campaign.platform}`,
      CAMPAIGN_UPDATED: `Updated campaign settings for "${campaign.name}"`,
      CAMPAIGN_PAUSED: `Paused campaign "${campaign.name}" — budget threshold reached`,
      CAMPAIGN_DELETED: `Archived campaign "${campaign.name}"`,
      AD_CREATED: `Created new ad creative for "${campaign.name}"`,
      AD_UPDATED: `Modified ad targeting parameters`,
      AD_PAUSED: `Paused underperforming ad`,
      AD_PUBLISHED: `Published ad after review approval`,
      RULE_TRIGGERED: `AI rule "${rule.name}" executed automatically`,
      RULE_CREATED: `Created automation rule "${rule.name}"`,
      RULE_UPDATED: `Updated thresholds for rule "${rule.name}"`,
      RULE_DELETED: `Removed automation rule "${rule.name}"`,
      USER_INVITED: `Invited ${user.email} to workspace`,
      USER_ROLE_CHANGED: `Changed role for ${user.firstName} ${user.lastName}`,
      WORKSPACE_UPDATED: `Updated workspace billing settings`,
      AUDIENCE_SYNCED: `Synced audience "${audience.name}" — ${randInt(85, 100)}% match rate`,
      BUDGET_CHANGED: `Adjusted monthly budget to $${randInt(5000, 50000).toLocaleString()}`,
      REPORT_EXPORTED: `Exported performance report (CSV)`,
    };

    const log = await prisma.auditLog.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        workspaceId: workspace.id,
        action,
        entityType,
        entityId,
        description: descriptions[action] || `${action} on ${entityType}`,
        details: {
          ipAddress: `192.168.${randInt(1, 255)}.${randInt(1, 255)}`,
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0',
          changes: action.includes('UPDATED') || action.includes('CHANGED') ? {
            before: { value: 'old_value' },
            after: { value: 'new_value' },
          } : undefined,
        },
        createdAt: dateDaysAgo(randInt(0, 30)),
      },
    });
    logs.push(log);
  }

  console.log(`  ✅ ${logs.length} audit log entries created`);
  return logs;
}

// ── Seed Audiences ──────────────────────────────────────────────────────────
async function seedAudiences(workspaces: any[]) {
  console.log(`  🎯 Creating ${CONFIG.AUDIENCES} audiences...`);
  const audiences: any[] = [];

  for (let i = 0; i < CONFIG.AUDIENCES; i++) {
    const ws = workspaces[i % workspaces.length];
    const segment = AUDIENCE_SEGMENTS[i % AUDIENCE_SEGMENTS.length];

    const audience = await prisma.audience.create({
      data: {
        id: randomUUID(),
        name: segment.name,
        description: segment.description,
        type: segment.type as any,
        workspaceId: ws.id,
        size: segment.size,
        matchRate: randFloat(60, 99),
        source: pick(['PLATFORM', 'UPLOAD', 'WEBSITE', 'APP', 'ENGAGEMENT', 'LOOKALIKE']),
        platformIds: {
          google: randBool(0.6) ? `GAUD_${randomUUID().slice(0, 12)}` : null,
          meta: randBool(0.7) ? `MAUD_${randomUUID().slice(0, 12)}` : null,
          linkedin: randBool(0.4) ? `LAUD_${randomUUID().slice(0, 12)}` : null,
          tiktok: randBool(0.3) ? `TAUD_${randomUUID().slice(0, 12)}` : null,
        },
        targeting: {
          demographics: {
            age: { min: pick([18, 21, 25, 30]), max: pick([45, 55, 65]) },
            gender: pick(['ALL', 'MALE', 'FEMALE']),
            income: pick([null, 'TOP_10', 'TOP_25', 'TOP_50']),
          },
          interests: pick([
            ['Technology', 'Business'],
            ['Shopping', 'Fashion'],
            ['Finance', 'Investing'],
            ['Health', 'Fitness', 'Wellness'],
            ['Travel', 'Luxury'],
          ]),
          behaviors: pick([
            [' Frequent Travelers'],
            ['Online Shoppers'],
            ['Engaged Shoppers'],
            ['Mobile Device Users'],
          ]),
        },
        syncStatus: pick(['SYNCED', 'SYNCING', 'ERROR', 'STALE']),
        lastSyncedAt: dateDaysAgo(randInt(0, 3)),
        createdAt: dateDaysAgo(randInt(10, 90)),
        updatedAt: dateDaysAgo(randInt(1, 10)),
      },
    });
    audiences.push(audience);
  }

  console.log(`  ✅ ${audiences.length} audiences created`);
  return audiences;
}

// ── Print Statistics ────────────────────────────────────────────────────────
function printStats(
  workspaces: any[],
  users: any[],
  campaigns: any[],
  ads: any[],
  drafts: any[],
  rules: any[],
  notifications: any[],
  auditLogs: any[],
  audiences: any[],
) {
  console.log('\n  ──────────────────────────────────────────────────────────');
  console.log('  📊 SEED DATA SUMMARY');
  console.log('  ──────────────────────────────────────────────────────────');
  console.log(`  🏢 Workspaces       ${workspaces.length.toString().padStart(4)}`);
  console.log(`  👤 Users            ${users.length.toString().padStart(4)}`);
  console.log(`  📢 Campaigns        ${campaigns.length.toString().padStart(4)}`);
  console.log(`  🎨 Ads              ${ads.length.toString().padStart(4)}`);
  console.log(`  📊 Daily Metrics    ${(campaigns.length * CONFIG.METRICS_DAYS).toString().padStart(4)} (${CONFIG.METRICS_DAYS} days × ${campaigns.length} campaigns)`);
  console.log(`  📝 Drafts           ${drafts.length.toString().padStart(4)}`);
  console.log(`  🤖 AI Rules         ${rules.length.toString().padStart(4)}`);
  console.log(`  🔔 Notifications    ${notifications.length.toString().padStart(4)}`);
  console.log(`  📋 Audit Logs       ${auditLogs.length.toString().padStart(4)}`);
  console.log(`  🎯 Audiences        ${audiences.length.toString().padStart(4)}`);
  console.log('  ──────────────────────────────────────────────────────────');

  // Workspace breakdown
  console.log('\n  📁 WORKSPACE BREAKDOWN');
  console.log('  ──────────────────────────────────────────────────────────');
  for (const ws of workspaces) {
    const wsUsers = users.filter(u => u.workspaceId === ws.id).length;
    const wsCampaigns = campaigns.filter(c => c.workspaceId === ws.id).length;
    const wsAds = ads.filter(a => {
      const camp = campaigns.find(c => c.id === a.campaignId);
      return camp?.workspaceId === ws.id;
    }).length;
    console.log(`  ${ws.name.padEnd(24)} │ Users: ${wsUsers.toString().padStart(2)} │ Campaigns: ${wsCampaigns.toString().padStart(2)} │ Ads: ${wsAds.toString().padStart(3)} │ Plan: ${ws.plan}`);
  }

  // Platform breakdown
  console.log('\n  🌐 PLATFORM BREAKDOWN');
  console.log('  ──────────────────────────────────────────────────────────');
  const platforms = ['GOOGLE', 'META', 'LINKEDIN', 'TIKTOK'] as const;
  for (const p of platforms) {
    const pCampaigns = campaigns.filter(c => c.platform === p).length;
    const pAds = ads.filter(a => {
      const camp = campaigns.find(c => c.id === a.campaignId);
      return camp?.platform === p;
    }).length;
    const pSpend = campaigns
      .filter(c => c.platform === p)
      .reduce((sum, c) => sum + (c.spent || 0), 0);
    console.log(`  ${p.padEnd(10)} │ Campaigns: ${pCampaigns.toString().padStart(2)} │ Ads: ${pAds.toString().padStart(3)} │ Total Spend: $${pSpend.toLocaleString()}`);
  }

  console.log('\n');
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const shouldReset = args.includes('--reset');
  const dryRun = args.includes('--dry-run');

  console.log('\n  ╔══════════════════════════════════════════════════════════╗');
  console.log('  ║     AdNexus Backend — Rich Seed Data                    ║');
  console.log('  ╚══════════════════════════════════════════════════════════╝');
  console.log('');

  if (dryRun) {
    console.log('  📋 DRY RUN MODE — Data counts that would be created:');
    console.log(`     Workspaces:    ${CONFIG.WORKSPACES}`);
    console.log(`     Users:         ${CONFIG.USERS}`);
    console.log(`     Campaigns:     ${CONFIG.CAMPAIGNS}`);
    console.log(`     Ads:           ${CONFIG.ADS}`);
    console.log(`     Daily Metrics: ${CONFIG.CAMPAIGNS * CONFIG.METRICS_DAYS}`);
    console.log(`     Drafts:        ${CONFIG.DRAFTS}`);
    console.log(`     AI Rules:      ${CONFIG.AI_RULES}`);
    console.log(`     Notifications: ${CONFIG.NOTIFICATIONS}`);
    console.log(`     Audit Logs:    ${CONFIG.AUDIT_LOGS}`);
    console.log(`     Audiences:     ${CONFIG.AUDIENCES}`);
    console.log(`     ─────────────────────────`);
    console.log(`     TOTAL:         ${CONFIG.WORKSPACES + CONFIG.USERS + CONFIG.CAMPAIGNS + CONFIG.ADS + (CONFIG.CAMPAIGNS * CONFIG.METRICS_DAYS) + CONFIG.DRAFTS + CONFIG.AI_RULES + CONFIG.NOTIFICATIONS + CONFIG.AUDIT_LOGS + CONFIG.AUDIENCES} records`);
    console.log('');
    return;
  }

  const startTime = Date.now();

  try {
    // Reset if requested
    if (shouldReset) {
      await resetDatabase();
    }

    // ── Seed in dependency order ──
    console.log('  🌱 Seeding database with realistic demo data...\n');

    const workspaces = await seedWorkspaces();
    const users = await seedUsers(workspaces);
    const campaigns = await seedCampaigns(workspaces);
    const ads = await seedAds(campaigns);
    await seedDailyMetrics(campaigns);
    const drafts = await seedDrafts(workspaces, campaigns, users);
    const rules = await seedAiRules(workspaces, campaigns);
    const audiences = await seedAudiences(workspaces);
    const notifications = await seedNotifications(users, campaigns, rules, workspaces, audiences);
    const auditLogs = await seedAuditLogs(users, campaigns, workspaces, rules, audiences);

    // ── Stats ──
    printStats(workspaces, users, campaigns, ads, drafts, rules, notifications, auditLogs, audiences);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  ⏱️  Seeded in ${elapsed}s`);
    console.log('  ✅ All done! Your development environment is ready.\n');

  } catch (error) {
    console.error('\n  ❌ Seeding failed:', error instanceof Error ? error.message : error);
    console.error('');
    process.exit(1);

  } finally {
    await prisma.$disconnect();
  }
}

main();
