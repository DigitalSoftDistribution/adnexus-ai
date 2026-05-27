# AdNexus AI — Complete Supabase Setup Guide

> **Estimated time:** 45-60 minutes  
> **Prerequisites:** A Supabase account (free tier works) and the AdNexus project cloned locally.

---

## Table of Contents

1. [Creating a New Supabase Project](#step-1-creating-a-new-supabase-project)
2. [Running Schema Migrations](#step-2-running-schema-migrations)
3. [Configuring Authentication](#step-3-configuring-authentication)
4. [Setting Up Row Level Security (RLS)](#step-4-setting-up-row-level-security-rls)
5. [Creating Database Functions & Triggers](#step-5-creating-database-functions--triggers)
6. [Setting Up Storage Buckets](#step-6-setting-up-storage-buckets)
7. [Configuring Real-Time Subscriptions](#step-7-configuring-real-time-subscriptions)
8. [Seeding Initial Data](#step-8-seeding-initial-data)
9. [Connecting the Frontend](#step-9-connecting-the-frontend)
10. [Security Best Practices](#step-10-security-best-practices)

---

## Step 1: Creating a New Supabase Project

### 1.1 Sign Up / Log In

1. Go to [https://supabase.com](https://supabase.com) and sign in (or create a free account).
2. Click **"New Project"** from your dashboard.

### 1.2 Configure Your Project

| Field | Recommended Value | Notes |
|-------|-------------------|-------|
| **Organization** | Your org / personal | Pick your default |
| **Project Name** | `adnexus-prod` (or `adnexus-dev`) | Use environment suffix |
| **Database Password** | Strong 20+ character password | Store in your password manager |
| **Region** | Closest to your users | `us-east-1` (N. Virginia) for US users |
| **Pricing Plan** | Free / Pro | Free = 500 MB, 2M monthly requests |

3. Click **"Create New Project"** and wait ~2 minutes for provisioning.

### 1.3 Collect Your Credentials

Once the project is live, go to **Project Settings > API** and copy these values:

| Variable | Location | Used By |
|----------|----------|---------|
| `SUPABASE_URL` | Project URL | Backend + Frontend |
| `SUPABASE_ANON_KEY` (public) | `anon` `public` role | Frontend client |
| `SUPABASE_SERVICE_KEY` (secret) | `service_role` `secret` role | Backend server only |

> **SECURITY WARNING:** The `SERVICE_KEY` bypasses all RLS policies. Never expose it in frontend code or commit it to git.

Add them to your `.env` file:

```bash
# .env (backend)
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...  # keep secret!
```

---

## Step 2: Running Schema Migrations

The AdNexus schema is defined in `database/schema.sql`. This creates all tables, indexes, RLS policies, and triggers.

### 2.1 Open the SQL Editor

1. In Supabase Dashboard, go to **SQL Editor > New Query**.
2. Name it: `001_full_schema`.

### 2.2 Run the Schema

Copy the **entire contents** of `database/schema.sql` and paste it into the SQL Editor. Then click **Run**.

> The schema includes `IF NOT EXISTS` clauses so it is safe to re-run.

### 2.3 What Gets Created

After running, verify in **Table Editor** that the following tables exist:

#### Core Tables
| Table | Purpose |
|-------|---------|
| `users` | User profiles (extends Supabase Auth) |
| `workspaces` | Multi-tenant workspaces / organizations |
| `workspace_members` | Many-to-many: users <-> workspaces with roles |

#### Ad Platform Tables
| Table | Purpose |
|-------|---------|
| `ad_accounts` | OAuth-connected ad platform accounts (Meta, Google, TikTok, Snap) |
| `campaigns` | Ad campaigns with full performance metrics |
| `adsets` | Ad sets / ad groups with targeting data |
| `ads` | Individual ads with creative URLs and fatigue scoring |

#### Operations Tables
| Table | Purpose |
|-------|---------|
| `drafts` | AI-proposed changes pending approval (core differentiator) |
| `automation_rules` | User-defined if-this-then-that rules |
| `audit_log` | Immutable audit trail of all actions |
| `api_keys` | Workspace-scoped API keys |
| `webhooks` | Outbound webhook configurations |

#### Billing & AI Tables
| Table | Purpose |
|-------|---------|
| `ai_credits` | Monthly AI credit tracking per workspace |
| `credit_usage_log` | Granular credit consumption log |
| `goals` | Performance goals (ROAS, CPA, CTR, etc.) |

#### Reporting & System Tables
| Table | Purpose |
|-------|---------|
| `scheduled_reports` | Cron-scheduled report definitions |
| `report_results` | Generated report outputs |
| `morning_briefs` | Daily AI-generated morning briefings |
| `events` | Background job event queue |

#### Auth Helper Tables
| Table | Purpose |
|-------|---------|
| `auth_passwords` | Password hash storage (if not using Supabase Auth directly) |
| `password_resets` | Password reset token management |

#### Indexes Created
```
idx_campaigns_account     ON campaigns(ad_account_id)
idx_campaigns_status      ON campaigns(status)
idx_adsets_campaign       ON adsets(campaign_id)
idx_ads_adset             ON ads(adset_id)
idx_drafts_workspace_status ON drafts(workspace_id, status)
idx_drafts_created        ON drafts(created_at DESC)
idx_audit_workspace_time  ON audit_log(workspace_id, created_at DESC)
idx_audit_action          ON audit_log(action_category)
idx_credits_workspace_month ON ai_credits(workspace_id, month)
idx_credit_usage_workspace_month ON credit_usage_log(workspace_id, month)
idx_events_workspace_processed ON events(workspace_id, processed, created_at)
idx_morning_briefs_workspace ON morning_briefs(workspace_id, generated_at DESC)
idx_report_results_scheduled ON report_results(scheduled_report_id, created_at DESC)
```

### 2.4 Verify Schema Installation

Run this diagnostic query in the SQL Editor:

```sql
SELECT schemaname, tablename, tableowner
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 'workspaces', 'workspace_members',
    'ad_accounts', 'campaigns', 'adsets', 'ads',
    'drafts', 'automation_rules', 'audit_log',
    'api_keys', 'webhooks', 'ai_credits',
    'credit_usage_log', 'goals', 'scheduled_reports',
    'report_results', 'morning_briefs', 'events',
    'auth_passwords', 'password_resets'
  )
ORDER BY tablename;
```

You should see **21 tables** owned by `supabase_admin`.

---

## Step 3: Configuring Authentication

AdNexus uses **Supabase Auth** as the primary identity provider. The schema stores additional profile data in the `users` table.

### 3.1 Enable Email Authentication

Go to **Authentication > Providers > Email** and ensure:

| Setting | Value |
|---------|-------|
| **Enable Email provider** | ON |
| **Confirm email** | ON (recommended for production) |
| **Secure email change** | ON |
| **Secure password change** | ON |
| **URL Configuration > Site URL** | `http://localhost:5173` (dev) or your production domain |
| **Redirect URLs** | Add `http://localhost:5173/auth/callback` and your prod callback URL |

### 3.2 Configure Email Templates

Go to **Authentication > Email Templates** and customize:

**Confirm Signup template:**
```html
<h2>Confirm your AdNexus account</h2>
<p>Click the link below to verify your email:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm Email</a></p>
<p>Or copy: {{ .ConfirmationURL }}</p>
```

**Magic Link template:**
```html
<h2>Log in to AdNexus</h2>
<p>Click the secure link below:</p>
<p><a href="{{ .ConfirmationURL }}">Log In</a></p>
<p>This link expires in 1 hour.</p>
```

### 3.3 Enable OAuth Providers

Go to **Authentication > Providers** and enable providers your users need:

#### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials (Web application type)
3. Add authorized redirect: `https://your-project-ref.supabase.co/auth/v1/callback`
4. Copy **Client ID** and **Client Secret** into Supabase Google provider settings

#### Other Providers (Optional)

Repeat the same pattern for:
- **Microsoft/Azure AD** — enterprise SSO
- **GitHub** — developer-friendly sign-in
- **Slack** — if integrating with Slack workspaces

### 3.4 Create the User Profile Sync Trigger

When a user signs up via Supabase Auth, we need to auto-create their profile in our `users` table. Run this in the SQL Editor:

```sql
-- ============================================
-- USER PROFILE SYNC: Supabase Auth -> users table
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users (Supabase's built-in auth table)
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 3.5 Handle User Deletion

```sql
-- Clean up user profile when auth account is deleted
CREATE OR REPLACE FUNCTION public.handle_user_deleted()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_deleted();
```

### 3.6 Disable Public Signup (Optional / Enterprise)

If you want invite-only registration:

```sql
-- Run this to disable public signups (users can only be created by admin/service_role)
-- You'd then implement an invite flow via your backend API
```

In the Supabase Dashboard: **Authentication > Policies** and enable "Disable new signups" if available on your plan, or handle it in your frontend by not exposing the signup UI.

---

## Step 4: Setting Up Row Level Security (RLS)

RLS policies are already defined in `schema.sql` (Section: "ROW LEVEL SECURITY (RLS) for Supabase"). Here is a breakdown of how they work and how to verify them.

### 4.1 RLS Status Overview

All 21 application tables have RLS enabled. The policies implement a **workspace-scoped access control** model.

### 4.2 Policy Reference

| Table | Policy Name | Access Rule |
|-------|-------------|-------------|
| `users` | `users_read_own` | Users can only read their own profile |
| `workspaces` | `workspaces_member_read` | Members can read workspaces they belong to |
| `workspace_members` | `workspace_members_read` | Members can read member lists for their workspaces |
| `ad_accounts` | `ad_accounts_workspace` | Workspace members have full access |
| `campaigns` | `campaigns_workspace` | Access via linked ad_account's workspace |
| `drafts` | `drafts_workspace` | Workspace members have full access |
| `audit_log` | `audit_workspace` | Workspace members have full access |
| `goals` | `goals_workspace` | Workspace members have full access |
| `api_keys` | `api_keys_workspace` | Workspace members have full access |
| `auth_passwords` | `auth_passwords_user` | Users can only access their own passwords |
| `password_resets` | `password_resets_user` | Users can only access their own resets |

### 4.3 The Workspace Membership Check Pattern

The core pattern used across policies:

```sql
-- A user can access rows where they are a member of the workspace
EXISTS (
  SELECT 1 FROM workspace_members wm
  WHERE wm.workspace_id = <table>.workspace_id
    AND wm.user_id = auth.uid()
)
```

### 4.4 Adding Missing RLS Policies

Some tables share workspace references implicitly. Add these additional policies for complete coverage:

```sql
-- ============================================
-- ADDITIONAL RLS POLICIES for complete coverage
-- ============================================

-- Adsets: access via campaign -> ad_account -> workspace
CREATE POLICY adsets_workspace ON adsets FOR ALL USING (
  EXISTS (
    SELECT 1 FROM campaigns c
    JOIN ad_accounts aa ON c.ad_account_id = aa.id
    JOIN workspace_members wm ON aa.workspace_id = wm.workspace_id
    WHERE adsets.campaign_id = c.id AND wm.user_id = auth.uid()
  )
);

-- Ads: access via adset -> campaign -> ad_account -> workspace
CREATE POLICY ads_workspace ON ads FOR ALL USING (
  EXISTS (
    SELECT 1 FROM adsets a
    JOIN campaigns c ON a.campaign_id = c.id
    JOIN ad_accounts aa ON c.ad_account_id = aa.id
    JOIN workspace_members wm ON aa.workspace_id = wm.workspace_id
    WHERE ads.adset_id = a.id AND wm.user_id = auth.uid()
  )
);

-- Automation rules: workspace-scoped
CREATE POLICY automation_rules_workspace ON automation_rules FOR ALL USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = automation_rules.workspace_id AND wm.user_id = auth.uid()
  )
);

-- Webhooks: workspace-scoped
CREATE POLICY webhooks_workspace ON webhooks FOR ALL USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = webhooks.workspace_id AND wm.user_id = auth.uid()
  )
);

-- AI Credits: workspace-scoped
CREATE POLICY ai_credits_workspace ON ai_credits FOR ALL USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = ai_credits.workspace_id AND wm.user_id = auth.uid()
  )
);

-- Credit usage log: workspace-scoped
CREATE POLICY credit_usage_workspace ON credit_usage_log FOR ALL USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = credit_usage_log.workspace_id AND wm.user_id = auth.uid()
  )
);

-- Scheduled reports: workspace-scoped
CREATE POLICY scheduled_reports_workspace ON scheduled_reports FOR ALL USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = scheduled_reports.workspace_id AND wm.user_id = auth.uid()
  )
);

-- Report results: workspace-scoped
CREATE POLICY report_results_workspace ON report_results FOR ALL USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = report_results.workspace_id AND wm.user_id = auth.uid()
  )
);

-- Morning briefs: workspace-scoped
CREATE POLICY morning_briefs_workspace ON morning_briefs FOR ALL USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = morning_briefs.workspace_id AND wm.user_id = auth.uid()
  )
);

-- Events: workspace-scoped
CREATE POLICY events_workspace ON events FOR ALL USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = events.workspace_id AND wm.user_id = auth.uid()
  )
);
```

### 4.5 Verify All Policies

```sql
-- List all RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

You should see policies for all 21 tables.

---

## Step 5: Creating Database Functions & Triggers

### 5.1 Already-Defined Triggers (from schema.sql)

The schema includes `update_updated_at()` triggers on all mutable tables:

| Table | Trigger Name |
|-------|-------------|
| `users` | `users_updated_at` |
| `workspaces` | `workspaces_updated_at` |
| `ad_accounts` | `ad_accounts_updated_at` |
| `campaigns` | `campaigns_updated_at` |
| `adsets` | `adsets_updated_at` |
| `ads` | `ads_updated_at` |
| `automation_rules` | `automation_rules_updated_at` |
| `webhooks` | `webhooks_updated_at` |
| `goals` | `goals_updated_at` |
| `scheduled_reports` | `scheduled_reports_updated_at` |
| `auth_passwords` | `auth_passwords_updated_at` |
| `morning_briefs` | `morning_briefs_updated_at` |

### 5.2 Additional Helper Functions

Run these in the SQL Editor to add operational functions:

```sql
-- ============================================
-- UTILITY FUNCTIONS
-- ============================================

-- Get workspace ID for a given user (their primary workspace)
CREATE OR REPLACE FUNCTION public.get_user_primary_workspace(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_workspace_id UUID;
BEGIN
  SELECT workspace_id INTO v_workspace_id
  FROM workspace_members
  WHERE user_id = p_user_id
  ORDER BY created_at ASC
  LIMIT 1;
  RETURN v_workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has role in workspace (returns boolean)
CREATE OR REPLACE FUNCTION public.user_has_workspace_role(
  p_user_id UUID,
  p_workspace_id UUID,
  p_min_role VARCHAR(20) DEFAULT 'viewer'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_role VARCHAR(20);
  role_hierarchy INTEGER;
  required_hierarchy INTEGER;
BEGIN
  SELECT role INTO v_role
  FROM workspace_members
  WHERE user_id = p_user_id AND workspace_id = p_workspace_id;

  IF v_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Role hierarchy: owner=4, admin=3, analyst=2, viewer=1
  role_hierarchy := CASE v_role
    WHEN 'owner' THEN 4
    WHEN 'admin' THEN 3
    WHEN 'analyst' THEN 2
    WHEN 'viewer' THEN 1
    ELSE 0
  END;

  required_hierarchy := CASE p_min_role
    WHEN 'owner' THEN 4
    WHEN 'admin' THEN 3
    WHEN 'analyst' THEN 2
    WHEN 'viewer' THEN 1
    ELSE 0
  END;

  RETURN role_hierarchy >= required_hierarchy;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log an audit event (used by application code)
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_workspace_id UUID,
  p_actor_type VARCHAR(20),
  p_actor_id UUID,
  p_actor_name VARCHAR(255),
  p_action VARCHAR(100),
  p_action_category VARCHAR(50),
  p_platform VARCHAR(20) DEFAULT NULL,
  p_campaign_id UUID DEFAULT NULL,
  p_adset_id UUID DEFAULT NULL,
  p_ad_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}',
  p_source VARCHAR(50) DEFAULT 'dashboard'
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_log (
    workspace_id, actor_type, actor_id, actor_name,
    action, action_category, platform,
    campaign_id, adset_id, ad_id, details, source
  ) VALUES (
    p_workspace_id, p_actor_type, p_actor_id, p_actor_name,
    p_action, p_action_category, p_platform,
    p_campaign_id, p_adset_id, p_ad_id, p_details, p_source
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-refresh campaign metrics summary (can be called periodically)
CREATE OR REPLACE FUNCTION public.refresh_campaign_metrics()
RETURNS VOID AS $$
BEGIN
  -- Recalculate CTR for all campaigns
  UPDATE campaigns
  SET ctr = CASE
    WHEN impressions > 0 THEN ROUND((clicks::NUMERIC / impressions) * 100, 4)
    ELSE 0
  END
  WHERE impressions > 0;

  -- Recalculate CPA
  UPDATE campaigns
  SET cpa = CASE
    WHEN conversions > 0 THEN ROUND(spend / conversions, 2)
    ELSE 0
  END
  WHERE conversions > 0;

  -- Recalculate CPC
  UPDATE campaigns
  SET cpc = CASE
    WHEN clicks > 0 THEN ROUND(spend / clicks, 2)
    ELSE 0
  END
  WHERE clicks > 0;

  -- Recalculate fatigue score for ads
  UPDATE ads
  SET fatigue_score = CASE
    WHEN frequency > 0 AND impressions > 0
    THEN LEAST(100, ROUND((frequency * 10) + (impressions::NUMERIC / 10000), 2))
    ELSE 0
  END;

  -- Update fatigue status based on score
  UPDATE ads
  SET fatigue_status = CASE
    WHEN fatigue_score >= 80 THEN 'exhausted'
    WHEN fatigue_score >= 60 THEN 'critical'
    WHEN fatigue_score >= 40 THEN 'warning'
    ELSE 'healthy'
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a draft with validation
CREATE OR REPLACE FUNCTION public.create_draft(
  p_workspace_id UUID,
  p_platform VARCHAR(20),
  p_draft_type VARCHAR(50),
  p_change_summary VARCHAR(500),
  p_change_detail JSONB,
  p_ai_reasoning TEXT DEFAULT NULL,
  p_impact_estimate VARCHAR(255) DEFAULT NULL,
  p_actor_type VARCHAR(20) DEFAULT 'ai',
  p_actor_id UUID DEFAULT NULL,
  p_actor_name VARCHAR(255) DEFAULT NULL,
  p_campaign_id UUID DEFAULT NULL,
  p_adset_id UUID DEFAULT NULL,
  p_ad_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_draft_id UUID;
BEGIN
  INSERT INTO drafts (
    workspace_id, platform, campaign_id, adset_id, ad_id,
    draft_type, change_summary, change_detail, ai_reasoning,
    impact_estimate, status, actor_type, actor_id, actor_name
  ) VALUES (
    p_workspace_id, p_platform, p_campaign_id, p_adset_id, p_ad_id,
    p_draft_type, p_change_summary, p_change_detail, p_ai_reasoning,
    p_impact_estimate, 'pending', p_actor_type, p_actor_id, p_actor_name
  )
  RETURNING id INTO v_draft_id;

  -- Log the draft creation in audit_log
  PERFORM log_audit_event(
    p_workspace_id, p_actor_type, p_actor_id, p_actor_name,
    'draft_created', 'draft_created', p_platform,
    p_campaign_id, p_adset_id, p_ad_id,
    jsonb_build_object('draft_id', v_draft_id, 'type', p_draft_type),
    CASE WHEN p_actor_type = 'ai' THEN 'agent' ELSE 'dashboard' END
  );

  RETURN v_draft_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 5.3 Create a Scheduled Job for Metric Refresh

Use Supabase's built-in **pg_cron** extension (available on paid plans) to auto-refresh metrics:

```sql
-- Enable pg_cron extension (if on paid plan)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule metrics refresh every 15 minutes
SELECT cron.schedule('refresh-campaign-metrics', '*/15 * * * *', $$
  SELECT refresh_campaign_metrics();
$$);

-- Verify scheduled jobs
SELECT * FROM cron.job;
```

> **Free plan alternative:** Call `refresh_campaign_metrics()` from your backend API on a setInterval or use an external cron service.

---

## Step 6: Setting Up Storage Buckets

AdNexus stores creative assets (images, videos) in Supabase Storage.

### 6.1 Create the Buckets

Go to **Storage > New Bucket** and create:

| Bucket Name | Public | Purpose |
|-------------|--------|---------|
| `creatives` | Yes | Ad creative images, videos, carousels |
| `avatars` | Yes | User profile avatars |
| `reports` | No | Generated PDF/CSV reports (private) |
| `exports` | No | Data exports and backups |

### 6.2 Set Bucket Policies

For each bucket, configure these policies by going to **Storage > [bucket] > Policies**:

#### `creatives` bucket policies:

```sql
-- Anyone can view creatives (ads are public)
CREATE POLICY "Creatives are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'creatives');

-- Authenticated workspace members can upload
CREATE POLICY "Workspace members can upload creatives"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'creatives'
  AND EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.user_id = auth.uid()
  )
);

-- Only owners/admins can delete
CREATE POLICY "Admins can delete creatives"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'creatives'
  AND EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
  )
);
```

#### `avatars` bucket policies:

```sql
-- Anyone can view avatars
CREATE POLICY "Avatars are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Users can upload their own avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

-- Users can update/delete their own avatar
CREATE POLICY "Users can manage own avatar"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
);
```

#### `reports` bucket (private):

```sql
-- Only workspace members can access their reports
CREATE POLICY "Workspace members can view reports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'reports'
  AND EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.user_id = auth.uid()
  )
);

-- Service role and workspace members can upload
CREATE POLICY "Workspace members can upload reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'reports');
```

### 6.3 Set File Size Limits

Go to **Storage > Settings** and configure:

| Setting | Value |
|---------|-------|
| **Max file size** | 50 MB (for video creatives) |
| **Allowed MIME types** | `image/*, video/*` |

---

## Step 7: Configuring Real-Time Subscriptions

Supabase Realtime enables live UI updates when database rows change.

### 7.1 Enable Realtime for Tables

Go to **Database > Replication** and enable real-time for:

| Table | Events | Why |
|-------|--------|-----|
| `drafts` | INSERT, UPDATE | Live draft status updates |
| `campaigns` | UPDATE | Live metric changes |
| `ads` | UPDATE | Live ad fatigue warnings |
| `audit_log` | INSERT | Live activity feed |
| `events` | INSERT, UPDATE | Background job progress |
| `goals` | UPDATE | Goal status changes |

Or enable via SQL:

```sql
-- Enable realtime for specific tables
ALTER PUBLICATION supabase_realtime ADD TABLE drafts;
ALTER PUBLICATION supabase_realtime ADD TABLE campaigns;
ALTER PUBLICATION supabase_realtime ADD TABLE ads;
ALTER PUBLICATION supabase_realtime ADD TABLE audit_log;
ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE goals;

-- Verify
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

### 7.2 Frontend Subscription Example

In your frontend code, subscribe to changes like this:

```typescript
// Subscribe to new drafts in a workspace
const draftSubscription = supabase
  .channel('workspace-drafts')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'drafts',
      filter: `workspace_id=eq.${workspaceId}`,
    },
    (payload) => {
      console.log('Draft changed:', payload);
      // Refresh drafts list or update UI
    }
  )
  .subscribe();

// Subscribe to campaign metric updates
const campaignSubscription = supabase
  .channel('campaign-updates')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'campaigns',
      filter: `ad_account_id=eq.${accountId}`,
    },
    (payload) => {
      console.log('Campaign updated:', payload.new);
      // Update campaign card with new metrics
    }
  )
  .subscribe();

// Subscribe to audit log for activity feed
const auditSubscription = supabase
  .channel('audit-feed')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'audit_log',
      filter: `workspace_id=eq.${workspaceId}`,
    },
    (payload) => {
      console.log('New audit entry:', payload.new);
      // Prepend to activity feed
    }
  )
  .subscribe();

// Cleanup on unmount
return () => {
  supabase.removeChannel(draftSubscription);
  supabase.removeChannel(campaignSubscription);
  supabase.removeChannel(auditSubscription);
};
```

### 7.3 Row-Level Security for Realtime

Realtime respects RLS policies automatically. A user will only receive real-time updates for rows they are authorized to see based on the RLS policies defined in Step 4.

---

## Step 8: Seeding Initial Data

The `database/seed.sql` file contains realistic mock data for development and demo purposes.

### 8.1 Seed Data Overview

| Entity | Count | Description |
|--------|-------|-------------|
| Users | 2 | Alex Morgan (owner), Sam Chen (admin) |
| Workspaces | 1 | "Acme Marketing" (Pro plan) |
| Ad Accounts | 3 | Meta, Google, TikTok |
| Campaigns | 8 | Across 4 platforms with real metrics |
| Adsets | 12 | 2-3 per campaign with targeting |
| Ads | 16 | With creative URLs and fatigue scores |

### 8.2 Running the Seed

**Option A: Via SQL Editor (Recommended for Supabase Cloud)**

1. Open **SQL Editor > New Query**
2. Paste the entire contents of `database/seed.sql`
3. Click **Run**

**Option B: Via psql CLI (for local/self-hosted)**

```bash
# Set your Supabase connection string
export DATABASE_URL="postgresql://postgres:[password]@db.your-project-ref.supabase.co:5432/postgres"

# Run the seed file
psql "$DATABASE_URL" -f database/seed.sql
```

> **Note:** The seed file uses `\set` variables (psql syntax). For the Supabase SQL Editor, you may need to replace `:variable_name` references with the actual UUIDs defined at the top of the file, or run via psql.

### 8.3 Verify Seed Data

```sql
-- Check all entities were seeded
SELECT 'users' AS entity, COUNT(*) AS count FROM users
UNION ALL SELECT 'workspaces', COUNT(*) FROM workspaces
UNION ALL SELECT 'workspace_members', COUNT(*) FROM workspace_members
UNION ALL SELECT 'ad_accounts', COUNT(*) FROM ad_accounts
UNION ALL SELECT 'campaigns', COUNT(*) FROM campaigns
UNION ALL SELECT 'adsets', COUNT(*) FROM adsets
UNION ALL SELECT 'ads', COUNT(*) FROM ads;

-- Check campaign spend totals
SELECT platform, COUNT(*) AS campaigns, SUM(spend) AS total_spend
FROM campaigns c
JOIN ad_accounts aa ON c.ad_account_id = aa.id
GROUP BY platform;
```

### 8.4 Reset Seed Data (if needed)

```sql
-- WARNING: This deletes all seeded data! Use only in development.
TRUNCATE TABLE ads, adsets, campaigns, ad_accounts,
             workspace_members, workspaces, users
CASCADE;
```

---

## Step 9: Connecting the Frontend

### 9.1 Install Supabase Client

```bash
# In your frontend directory (e.g., /frontend)
npm install @supabase/supabase-js
```

### 9.2 Create the Supabase Client

Create `frontend/src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types'; // Generated types

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Helper: Get current user
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

// Helper: Get user profile
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
};
```

### 9.3 Environment Variables

Add to `frontend/.env`:

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... # anon/public key

# Backend API (for operations that need service_role)
VITE_API_URL=http://localhost:3000
```

### 9.4 React Auth Hook Example

```typescript
// frontend/src/hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password });

  const signUp = (email: string, password: string, metadata?: object) =>
    supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });

  const signOut = () => supabase.auth.signOut();

  return { user, loading, signIn, signUp, signOut };
}
```

### 9.5 Data Fetching Hook Example

```typescript
// frontend/src/hooks/useWorkspaceData.ts
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useCampaigns(workspaceId: string) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCampaigns = async () => {
      setLoading(true);

      // Get ad accounts for this workspace first
      const { data: accounts } = await supabase
        .from('ad_accounts')
        .select('id')
        .eq('workspace_id', workspaceId);

      if (!accounts?.length) {
        setCampaigns([]);
        setLoading(false);
        return;
      }

      const accountIds = accounts.map(a => a.id);

      // Get campaigns for those accounts
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          ad_accounts!inner(workspace_id)
        `)
        .in('ad_account_id', accountIds)
        .order('created_at', { ascending: false });

      if (error) console.error('Error fetching campaigns:', error);
      else setCampaigns(data ?? []);
      setLoading(false);
    };

    fetchCampaigns();

    // Subscribe to real-time campaign updates
    const channel = supabase
      .channel(`campaigns-${workspaceId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'campaigns',
      }, (payload) => {
        fetchCampaigns();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [workspaceId]);

  return { campaigns, loading };
}
```

### 9.6 Generated TypeScript Types

Generate TypeScript types from your Supabase schema:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Generate types
supabase gen types typescript --linked > frontend/src/lib/database.types.ts
```

This gives you full type safety for all database operations:

```typescript
import type { Database } from './lib/database.types';

type Campaign = Database['public']['Tables']['campaigns']['Row'];
type DraftInsert = Database['public']['Tables']['drafts']['Insert'];
```

---

## Step 10: Security Best Practices

### 10.1 Environment Variable Security

| Environment Variable | Location | Access Level |
|----------------------|----------|-------------|
| `SUPABASE_SERVICE_KEY` | Backend `.env` only | Server-only, never expose |
| `SUPABASE_ANON_KEY` | Frontend `.env` | Public by design |
| `VITE_SUPABASE_URL` | Frontend `.env` | Public |
| `VITE_SUPABASE_ANON_KEY` | Frontend `.env` | Public |

**Rules:**
- Never commit `.env` files: `echo ".env" >> .gitignore`
- Rotate `SUPABASE_SERVICE_KEY` if accidentally exposed
- Use different Supabase projects for dev/staging/prod

### 10.2 Enable MFA (Multi-Factor Authentication)

In **Authentication > Providers > Phone** or **Auth > MFA**:
1. Enable MFA for all admin/owner accounts
2. Require MFA for destructive operations (deleting campaigns, approving drafts)

### 10.3 Rate Limiting

Supabase provides built-in rate limiting. For additional protection, add API-level rate limiting in your backend:

```typescript
// backend/src/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limits for auth endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
});
```

### 10.4 Network Security

1. **Enable SSL Enforcement:**  
   In **Project Settings > Database > SSL Configuration**, enable SSL.

2. **Restrict Database Access:**  
   Go to **Project Settings > Database > Network Restrictions** and whitelist only your backend server IPs.

3. **Use Connection Pooler (PgBouncer):**  
   For serverless deployments, use the Supabase connection pooler:
   ```
   DATABASE_URL=postgresql://postgres:[password]@db.your-project-ref.supabase.co:6543/postgres?pgbouncer=true
   ```

### 10.5 Data Retention & Privacy

```sql
-- Auto-delete old audit logs (retention: 90 days)
CREATE OR REPLACE FUNCTION purge_old_audit_logs()
RETURNS VOID AS $$
BEGIN
  DELETE FROM audit_log WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule daily cleanup (paid plans)
SELECT cron.schedule('purge-audit-logs', '0 3 * * *', $$
  SELECT purge_old_audit_logs();
$$);

-- Anonymize deleted user data
CREATE OR REPLACE FUNCTION anonymize_user_data(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET email = 'deleted@anonymous.user',
      name = 'Deleted User',
      avatar_url = NULL
  WHERE id = p_user_id;

  -- Note: workspace membership records are kept for audit integrity
  -- but user-identifying fields are cleared
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 10.6 Backup Strategy

| Method | Frequency | Recovery Point |
|--------|-----------|---------------|
| Supabase Daily Backups (Pro+) | Daily | Up to 7 days |
| Point-in-Time Recovery (PITR) | Continuous | Any point in time |
| Manual SQL Dumps | Weekly | Time of dump |

```bash
# Manual backup via pg_dump
pg_dump "postgresql://postgres:[password]@db.your-project-ref.supabase.co:5432/postgres" \
  --schema-only > backup_schema_$(date +%Y%m%d).sql

pg_dump "postgresql://postgres:[password]@db.your-project-ref.supabase.co:5432/postgres" \
  --data-only --exclude-table=auth.* --exclude-table=storage.* \
  > backup_data_$(date +%Y%m%d).sql
```

### 10.7 Security Checklist

- [ ] All tables have RLS enabled
- [ ] All RLS policies are tested with real user accounts
- [ ] `SUPABASE_SERVICE_KEY` is never in frontend code
- [ ] SSL is enforced on database connections
- [ ] MFA is enabled for admin accounts
- [ ] Rate limiting is configured
- [ ] `auth_passwords` table has RLS restricting to own user
- [ ] OAuth redirect URLs are whitelisted
- [ ] CORS is configured to only allow your frontend domain
- [ ] Database backups are enabled (daily on Pro+)
- [ ] Old audit logs are purged on a schedule
- [ ] All secrets are rotated regularly (every 90 days)

---

## Quick Reference

### Supabase Dashboard URLs

```
Project Dashboard:  https://supabase.com/dashboard/project/<project-ref>
SQL Editor:         https://supabase.com/dashboard/project/<project-ref>/sql
Auth Settings:      https://supabase.com/dashboard/project/<project-ref>/auth/providers
Storage:            https://supabase.com/dashboard/project/<project-ref>/storage/buckets
Database:           https://supabase.com/dashboard/project/<project-ref>/database/tables
RLS Policies:       https://supabase.com/dashboard/project/<project-ref>/auth/policies
Settings > API:     https://supabase.com/dashboard/project/<project-ref>/settings/api
```

### Key SQL Files

| File | Purpose | When to Run |
|------|---------|-------------|
| `database/schema.sql` | Full schema: tables, indexes, RLS, triggers | Once per new project |
| `database/seed.sql` | Mock data for development | After schema, only in dev |

### Environment Variables Summary

```bash
# Backend (.env)
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs... # service_role key

# Frontend (.env)
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs... # anon key
```

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| "RLS policy violation" | Query from anon key without proper auth | Ensure user is signed in, check policy definitions |
| "new row violates RLS" | Insert without workspace membership | User must be added to workspace_members first |
| Realtime not firing | Table not added to publication | Run `ALTER PUBLICATION supabase_realtime ADD TABLE <table>` |
| Schema "already exists" | Re-running schema.sql | Statements use `IF NOT EXISTS`, safe to re-run |
| Seed data fails | psql variables not supported in SQL Editor | Use psql CLI or replace `\set` variables with literal UUIDs |
| Auth user not in `users` table | Missing trigger | Re-run the `handle_new_user` trigger function |

---

*This guide was generated for AdNexus AI. For questions, refer to the [Supabase Documentation](https://supabase.com/docs) or the project README.*
