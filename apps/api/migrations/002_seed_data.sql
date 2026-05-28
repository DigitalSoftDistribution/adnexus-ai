-- migrate:up
-- =============================================================================
-- AdNexus AI — Demo Seed Data
-- =============================================================================
-- 1 workspace, 1 user, 4 ad accounts, 18 campaigns, 25 ads, 10 drafts,
-- 8 AI rules, 15 notifications, 20 audit log entries, 30 days of metrics

-- Use a single workspace ID and user ID for all seed data
-- workspace_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
-- user_id:      'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'

-- =============================================================================
-- 1. Users
-- =============================================================================
INSERT INTO users (id, email, password_hash, name, role, status, email_verified, last_login_at)
VALUES
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
   'demo@adnexus.ai',
   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', -- bcrypt hash of 'demo123!'
   'Alex Rivera',
   'admin',
   'active',
   true,
   NOW() - INTERVAL '2 hours');

-- =============================================================================
-- 2. Workspaces
-- =============================================================================
INSERT INTO workspaces (id, name, slug, owner_id, plan, status, settings)
VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
   'Demo Workspace',
   'demo-workspace',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
   'scale',
   'active',
   '{"timezone": "America/New_York", "currency": "USD", "default_budget": 5000, "notifications_email": true, "ai_auto_execute": false, "brand_safety_score": 95}'::jsonb);

-- =============================================================================
-- 3. Workspace Members
-- =============================================================================
INSERT INTO workspace_members (workspace_id, user_id, role)
VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
   'admin');

-- =============================================================================
-- 4. Connected Ad Accounts (Meta, Google, TikTok, Snap)
-- =============================================================================
INSERT INTO ad_accounts (id, workspace_id, platform, platform_account_id, account_name, access_token, refresh_token, token_expires_at, status, metadata)
VALUES
  ('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
   'meta',
   'act_1234567890',
   'Meta Ads - Main Account',
   'EAAxxxx...',
   'EAAyyyy...',
   NOW() + INTERVAL '55 days',
   'active',
   '{"currency": "USD", "timezone": "America/New_York", "spend_cap": 100000}'::jsonb),

  ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a14',
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
   'google',
   '789-123-4567',
   'Google Ads - Search & Display',
   'ya29.a0Af...',
   '1//09z...',
   NOW() + INTERVAL '50 days',
   'active',
   '{"customer_id": "789-123-4567", "manager_account": false}'::jsonb),

  ('c3eebc99-9c0b-4ef8-bb6d-6bb9bd380a15',
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
   'tiktok',
   'tiktok_987654321',
   'TikTok Ads - US Region',
   'act TikTok...',
   'refresh TikTok...',
   NOW() + INTERVAL '45 days',
   'active',
   '{"app_id": "tiktok_987654321", "advertiser_id": "12345"}'::jsonb),

  ('c4eebc99-9c0b-4ef8-bb6d-6bb9bd380a16',
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
   'snap',
   'snap_1122334455',
   'Snap Ads - Lifestyle',
   'snap_token...',
   'snap_refresh...',
   NOW() + INTERVAL '30 days',
   'active',
   '{"organization_id": "snap_org_001", "ad_account_id": "snap_1122334455"}'::jsonb);

-- =============================================================================
-- 5. Campaigns (18 campaigns across 4 platforms)
-- =============================================================================
INSERT INTO campaigns (id, workspace_id, ad_account_id, platform, platform_campaign_id, name, status, objective, budget_type, budget, bid_strategy, target_cpa, target_roas, targeting, schedule, created_by)
VALUES
  -- Meta Campaigns (5)
  ('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'meta', '2384321567890', 'Summer Sale 2024', 'active', 'CONVERSIONS', 'daily', 500.00, 'LOWEST_COST_WITH_BID_CAP', 25.00, 3.50,
   '{"age_min": 25, "age_max": 45, "genders": ["female"], "locations": ["US", "CA"], "interests": ["fashion", "beauty", "lifestyle"]}'::jsonb,
   '{"start_date": "2024-06-01", "end_date": "2024-08-31"}'::jsonb, 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),

  ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'meta', '2384321567891', 'Brand Awareness Q3', 'active', 'AWARENESS', 'daily', 300.00, 'REACH_WITH_FREQUENCY_CAP', null, null,
   '{"age_min": 18, "age_max": 65, "genders": ["all"], "locations": ["US"], "interests": ["technology", "innovation"]}'::jsonb,
   '{"start_date": "2024-07-01"}'::jsonb, 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),

  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'meta', '2384321567892', 'Retargeting - Cart Abandoners', 'active', 'SALES', 'daily', 200.00, 'COST_CAP', 15.00, 4.00,
   '{"custom_audiences": ["cart_abandoners_30d", "website_visitors_7d"], "age_min": 21, "age_max": 55}'::jsonb,
   '{"start_date": "2024-05-15"}'::jsonb, 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),

  ('d4eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'meta', '2384321567893', 'Lookalike - Top Customers', 'paused', 'CONVERSIONS', 'daily', 150.00, 'LOWEST_COST_WITHOUT_CAP', 30.00, 3.00,
   '{"lookalike_source": "top_customers_1pct", "age_min": 25, "age_max": 55}'::jsonb,
   '{"start_date": "2024-06-15"}'::jsonb, 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),

  ('d5eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'meta', '2384321567894', 'Video Views - Product Launch', 'draft', 'VIDEO_VIEWS', 'daily', 400.00, 'LOWEST_COST', null, null,
   '{"age_min": 18, "age_max": 45, "platform_positions": ["feed", "reels"]}'::jsonb,
   '{"start_date": "2024-08-01"}'::jsonb, 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),

  -- Google Campaigns (5)
  ('d6eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'google', '1987654321', 'Search - Generic Keywords', 'active', 'SALES', 'daily', 800.00, 'TARGET_CPA', 35.00, 3.20,
   '{"keywords": ["buy shoes online", "best running shoes", "discount sneakers"], "match_type": "broad", "locations": ["US"]}'::jsonb,
   '{"start_date": "2024-01-01"}'::jsonb, 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),

  ('d7eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'google', '1987654322', 'Display - Remarketing', 'active', 'SALES', 'daily', 350.00, 'TARGET_ROAS', null, 4.00,
   '{"audiences": ["remarketing_all_visitors", "similar_converters"], "placements": ["display"]}'::jsonb,
   '{"start_date": "2024-03-01"}'::jsonb, 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),

  ('d8eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'google', '1987654323', 'Shopping - Product Feed', 'active', 'SALES', 'daily', 600.00, 'MAXIMIZE_CONVERSION_VALUE', null, 3.50,
   '{"feed_label": "US", "product_types": ["shoes", "accessories"], "priority": "high"}'::jsonb,
   '{"start_date": "2024-02-15"}'::jsonb, 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),

  ('d9eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'google', '1987654324', 'YouTube - TrueView In-Stream', 'paused', 'VIDEO_VIEWS', 'daily', 450.00, 'MAXIMIZE_CONVERSIONS', 40.00, 2.50,
   '{"audiences": ["in-market", "affinity"], "topics": ["sports", "fashion"]}'::jsonb,
   '{"start_date": "2024-04-01"}'::jsonb, 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),

  ('d10eebc99-9c0b-4ef8-bb6d-6bb9bd380a26', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'google', '1987654325', 'PMAX - Performance Max', 'active', 'SALES', 'daily', 1200.00, 'MAXIMIZE_CONVERSION_VALUE', null, 3.80,
   '{"audience_signals": ["customer_list", "website_visitors"], "asset_groups": 3}'::jsonb,
   '{"start_date": "2024-05-01"}'::jsonb, 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),

  -- TikTok Campaigns (4)
  ('d11eebc99-9c0b-4ef8-bb6d-6bb9bd380a27', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c3eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'tiktok', 'tiktok_111111', 'In-Feed - Product Showcase', 'active', 'CONVERSIONS', 'daily', 300.00, 'LOWEST_COST', 20.00, 2.80,
   '{"age_min": 18, "age_max": 34, "interests": ["fashion", "beauty", "lifestyle"], "behavior": ["engaged_shoppers"]}'::jsonb,
   '{"start_date": "2024-06-01"}'::jsonb, 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),

  ('d12eebc99-9c0b-4ef8-bb6d-6bb9bd380a28', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c3eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'tiktok', 'tiktok_222222', 'Spark Ads - Creator Collab', 'active', 'CONVERSIONS', 'daily', 250.00, 'COST_CAP', 18.00, 3.50,
   '{"spark_ads": true, "creator_accounts": ["@creator1", "@creator2"], "age_min": 16, "age_max": 30}'::jsonb,
   '{"start_date": "2024-06-15"}'::jsonb, 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),

  ('d13eebc99-9c0b-4ef8-bb6d-6bb9bd380a29', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c3eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'tiktok', 'tiktok_333333', 'TopView - Brand Takeover', 'ended', 'REACH', 'lifetime', 5000.00, 'CPM', null, null,
   '{"age_min": 13, "age_max": 65, "locations": ["US", "UK", "CA"]}'::jsonb,
   '{"start_date": "2024-05-01", "end_date": "2024-05-07"}'::jsonb, 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),

  ('d14eebc99-9c0b-4ef8-bb6d-6bb9bd380a30', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c3eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'tiktok', 'tiktok_444444', 'Collection Ads - Mobile App', 'draft', 'APP_PROMOTION', 'daily', 150.00, 'LOWEST_COST', 12.00, 2.00,
   '{"app_id": "com.example.app", "os": ["iOS", "Android"], "optimization_event": "purchase"}'::jsonb,
   '{"start_date": "2024-08-15"}'::jsonb, 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),

  -- Snap Campaigns (4)
  ('d15eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c4eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'snap', 'snap_555555', 'Snap Ads - Awareness', 'active', 'AWARENESS', 'daily', 200.00, 'AUTO_BID', null, null,
   '{"age_min": 13, "age_max": 34, "os": ["iOS"], "interests": ["gaming", "entertainment"]}'::jsonb,
   '{"start_date": "2024-04-01"}'::jsonb, 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),

  ('d16eebc99-9c0b-4ef8-bb6d-6bb9bd380a32', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c4eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'snap', 'snap_666666', 'Story Ads - Conversions', 'active', 'CONVERSIONS', 'daily', 180.00, 'GOAL_BASED', 22.00, 2.50,
   '{"pixel_id": "snap_pixel_001", "custom_audiences": ["engaged_users"], "age_min": 18, "age_max": 45}'::jsonb,
   '{"start_date": "2024-05-15"}'::jsonb, 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),

  ('d17eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c4eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'snap', 'snap_777777', 'AR Lens - Engagement', 'paused', 'ENGAGEMENT', 'lifetime', 3000.00, 'AUTO_BID', null, null,
   '{"placement": "camera", "lens_id": "lens_001", "targeting": ["gen_z", "millennials"]}'::jsonb,
   '{"start_date": "2024-06-01", "end_date": "2024-06-30"}'::jsonb, 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),

  ('d18eebc99-9c0b-4ef8-bb6d-6bb9bd380a34', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c4eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'snap', 'snap_888888', 'Collection Ads - Ecommerce', 'draft', 'SALES', 'daily', 220.00, 'GOAL_BASED', 28.00, 3.00,
   '{"product_catalog": "snap_catalog_001", "categories": ["shoes", "apparel"], "age_min": 21, "age_max": 45}'::jsonb,
   '{"start_date": "2024-09-01"}'::jsonb, 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12');

-- =============================================================================
-- 6. Ad Sets (one per campaign for simplicity)
-- =============================================================================
INSERT INTO ad_sets (id, campaign_id, platform_ad_set_id, name, status, budget, targeting)
VALUES
  ('e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a35', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'as_meta_001', 'Summer Sale - Female 25-45', 'active', 500.00, '{"gender": "female", "age": "25-45", "placements": ["feed", "stories"]}'::jsonb),
  ('e2eebc99-9c0b-4ef8-bb6d-6bb9bd380a36', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 'as_meta_002', 'Brand Awareness - Broad', 'active', 300.00, '{"gender": "all", "age": "18-65", "reach_estimate": 5000000}'::jsonb),
  ('e3eebc99-9c0b-4ef8-bb6d-6bb9bd380a37', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', 'as_meta_003', 'Retargeting 30D Visitors', 'active', 200.00, '{"audiences": ["website_visitors_30d", "cart_abandoners"]}'::jsonb),
  ('e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a38', 'd4eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', 'as_meta_004', 'Lookalike 1% Top Customers', 'paused', 150.00, '{"lookalike": "top_1pct", "seed_size": 5000}'::jsonb),
  ('e5eebc99-9c0b-4ef8-bb6d-6bb9bd380a39', 'd5eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'as_meta_005', 'Video Views - Reels', 'draft', 400.00, '{"placements": ["reels"], "video_view_target": 100000}'::jsonb),
  ('e6eebc99-9c0b-4ef8-bb6d-6bb9bd380a40', 'd6eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'as_google_001', 'Search - Broad Match', 'active', 800.00, '{"keywords": ["running shoes", "athletic footwear"], "match_type": "broad"}'::jsonb),
  ('e7eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', 'd7eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'as_google_002', 'Display Remarketing', 'active', 350.00, '{"audiences": ["all_visitors"], "placements": ["display_network"]}'::jsonb),
  ('e8eebc99-9c0b-4ef8-bb6d-6bb9bd380a42', 'd8eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'as_google_003', 'Shopping - All Products', 'active', 600.00, '{"feed_type": "primary", "product_filters": []}'::jsonb),
  ('e9eebc99-9c0b-4ef8-bb6d-6bb9bd380a43', 'd9eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', 'as_google_004', 'YouTube TrueView', 'paused', 450.00, '{"video_format": "in_stream", "skip": true}'::jsonb),
  ('e10eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'd10eebc99-9c0b-4ef8-bb6d-6bb9bd380a26', 'as_google_005', 'PMAX - Asset Group 1', 'active', 1200.00, '{"signals": ["customer_list"], "listing_groups": "all"}'::jsonb),
  ('e11eebc99-9c0b-4ef8-bb6d-6bb9bd380a45', 'd11eebc99-9c0b-4ef8-bb6d-6bb9bd380a27', 'as_tiktok_001', 'In-Feed - Fashion', 'active', 300.00, '{"interests": ["fashion"], "behavior": "video_completion"}'::jsonb),
  ('e12eebc99-9c0b-4ef8-bb6d-6bb9bd380a46', 'd12eebc99-9c0b-4ef8-bb6d-6bb9bd380a28', 'as_tiktok_002', 'Spark - Creator Series', 'active', 250.00, '{"spark_ads": true, "creators": ["@fashionista", "@styleguru"]}'::jsonb),
  ('e13eebc99-9c0b-4ef8-bb6d-6bb9bd380a47', 'd13eebc99-9c0b-4ef8-bb6d-6bb9bd380a29', 'as_tiktok_003', 'TopView - Launch Week', 'ended', 5000.00, '{"placement": "topview", "frequency_cap": 1}'::jsonb),
  ('e14eebc99-9c0b-4ef8-bb6d-6bb9bd380a48', 'd14eebc99-9c0b-4ef8-bb6d-6bb9bd380a30', 'as_tiktok_004', 'Collection - App Installs', 'draft', 150.00, '{"app_events": ["purchase", "add_to_cart"], "os": "iOS"}'::jsonb),
  ('e15eebc99-9c0b-4ef8-bb6d-6bb9bd380a49', 'd15eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', 'as_snap_001', 'Snap Ads - Gen Z', 'active', 200.00, '{"age": "13-24", "os": "iOS", "interests": ["gaming", "music"]}'::jsonb),
  ('e16eebc99-9c0b-4ef8-bb6d-6bb9bd380a50', 'd16eebc99-9c0b-4ef8-bb6d-6bb9bd380a32', 'as_snap_002', 'Story Ads - Purchasers', 'active', 180.00, '{"pixel_events": ["purchase"], "lookback": "30d"}'::jsonb),
  ('e17eebc99-9c0b-4ef8-bb6d-6bb9bd380a51', 'd17eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'as_snap_003', 'AR Lens - Camera', 'paused', 3000.00, '{"placement": "camera", "lens_trigger": "front_camera"}'::jsonb),
  ('e18eebc99-9c0b-4ef8-bb6d-6bb9bd380a52', 'd18eebc99-9c0b-4ef8-bb6d-6bb9bd380a34', 'as_snap_004', 'Collection - Shoes', 'draft', 220.00, '{"catalog_id": "snap_shoes_001", "category": "footwear"}'::jsonb);

-- =============================================================================
-- 7. Ads / Creatives (25 ads across campaigns)
-- =============================================================================
INSERT INTO ads (id, ad_set_id, campaign_id, platform_ad_id, name, status, creative_type, creative_url, headline, body, call_to_action, landing_page_url)
VALUES
  -- Meta ads (7)
  ('f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a53', 'e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a35', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'meta_ad_001', 'Summer Sale Hero', 'active', 'image', 'https://cdn.adnexus.ai/creatives/summer_sale_hero.jpg', 'Up to 50% Off Summer Styles', 'Refresh your wardrobe with our biggest summer sale. Limited time only! Shop the latest trends in fashion and accessories at unbeatable prices.', 'SHOP_NOW', 'https://demo-shop.com/summer-sale'),
  ('f2eebc99-9c0b-4ef8-bb6d-6bb9bd380a54', 'e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a35', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'meta_ad_002', 'Summer Collection Video', 'active', 'video', 'https://cdn.adnexus.ai/creatives/summer_collection.mp4', 'New Summer Collection', 'Discover the hottest summer styles. Watch our new collection come to life in this exclusive preview video.', 'LEARN_MORE', 'https://demo-shop.com/new-arrivals'),
  ('f3eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a35', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'meta_ad_003', 'Flash Sale Carousel', 'active', 'carousel', 'https://cdn.adnexus.ai/creatives/flash_sale_carousel.jpg', 'Flash Sale: 24 Hours Only', 'Swipe through our flash sale picks. 24 hours only, get up to 60% off selected items!', 'SHOP_NOW', 'https://demo-shop.com/flash-sale'),
  ('f4eebc99-9c0b-4ef8-bb6d-6bb9bd380a56', 'e2eebc99-9c0b-4ef8-bb6d-6bb9bd380a36', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 'meta_ad_004', 'Brand Story Video', 'active', 'video', 'https://cdn.adnexus.ai/creatives/brand_story.mp4', 'Our Story', 'From a small garage to millions of happy customers. Watch how we built a brand people love.', 'WATCH_MORE', 'https://demo-shop.com/about'),
  ('f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a57', 'e3eebc99-9c0b-4ef8-bb6d-6bb9bd380a37', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', 'meta_ad_005', 'Cart Reminder - Free Shipping', 'active', 'image', 'https://cdn.adnexus.ai/creatives/cart_reminder.jpg', 'Still thinking about it?', 'Your cart misses you. Complete your order now and enjoy free shipping on all items!', 'SHOP_NOW', 'https://demo-shop.com/cart'),
  ('f6eebc99-9c0b-4ef8-bb6d-6bb9bd380a58', 'e3eebc99-9c0b-4ef8-bb6d-6bb9bd380a37', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', 'meta_ad_006', 'Exclusive 10% Off', 'active', 'image', 'https://cdn.adnexus.ai/creatives/exclusive_10off.jpg', 'Here is 10% Off, Just For You', 'Come back and save! Use code COMEBACK10 for an exclusive 10% discount on your next order.', 'GET_OFFER', 'https://demo-shop.com/redeem'),
  ('f7eebc99-9c0b-4ef8-bb6d-6bb9bd380a59', 'e5eebc99-9c0b-4ef8-bb6d-6bb9bd380a39', 'd5eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'meta_ad_007', 'Product Launch Teaser', 'draft', 'video', 'https://cdn.adnexus.ai/creatives/product_launch_teaser.mp4', 'Something Big is Coming', 'Get ready. Our most innovative product yet launches August 1st. Sign up for early access.', 'SIGN_UP', 'https://demo-shop.com/early-access'),

  -- Google ads (6)
  ('f8eebc99-9c0b-4ef8-bb6d-6bb9bd380a60', 'e6eebc99-9c0b-4ef8-bb6d-6bb9bd380a40', 'd6eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'g_ad_001', 'Running Shoes Ad', 'active', 'image', 'https://cdn.adnexus.ai/creatives/running_shoes.jpg', 'Premium Running Shoes | Free Returns', 'Shop top-rated running shoes. Free shipping & 30-day returns. Over 10,000 5-star reviews.', 'SHOP_NOW', 'https://demo-shop.com/running-shoes'),
  ('f9eebc99-9c0b-4ef8-bb6d-6bb9bd380a61', 'e6eebc99-9c0b-4ef8-bb6d-6bb9bd380a40', 'd6eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'g_ad_002', 'Sneakers Sale Ad', 'active', 'image', 'https://cdn.adnexus.ai/creatives/sneakers_sale.jpg', 'Sneakers Up to 40% Off', 'Find your perfect pair. Hundreds of styles on sale now. Limited stock — shop before it is gone!', 'SHOP_NOW', 'https://demo-shop.com/sale/sneakers'),
  ('f10eebc99-9c0b-4ef8-bb6d-6bb9bd380a62', 'e7eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', 'd7eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'g_ad_003', 'Remarketing Banner', 'active', 'image', 'https://cdn.adnexus.ai/creatives/remarketing_banner.jpg', 'You Left Something Behind', 'The items in your cart are selling fast. Complete your purchase now and get free express shipping!', 'SHOP_NOW', 'https://demo-shop.com/cart'),
  ('f11eebc99-9c0b-4ef8-bb6d-6bb9bd380a63', 'e8eebc99-9c0b-4ef8-bb6d-6bb9bd380a42', 'd8eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'g_ad_004', 'Shopping PLA - Shoes', 'active', 'image', 'https://cdn.adnexus.ai/creatives/pla_shoes.jpg', 'Nike Air Max 270 - $129.99', 'Free Shipping | In Stock | 4.8 Stars (2,300+ reviews). Shop the latest Nike Air Max collection.', 'SHOP_NOW', 'https://demo-shop.com/product/nike-air-max-270'),
  ('f12eebc99-9c0b-4ef8-bb6d-6bb9bd380a64', 'e9eebc99-9c0b-4ef8-bb6d-6bb9bd380a43', 'd9eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', 'g_ad_005', 'YouTube Product Review', 'paused', 'video', 'https://cdn.adnexus.ai/creatives/youtube_review.mp4', 'Honest Review: Best Shoes 2024', 'Watch our in-depth review of the top 10 running shoes this year. Find your perfect fit!', 'WATCH_NOW', 'https://demo-shop.com/reviews'),
  ('f13eebc99-9c0b-4ef8-bb6d-6bb9bd380a65', 'e10eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'd10eebc99-9c0b-4ef8-bb6d-6bb9bd380a26', 'g_ad_006', 'PMAX - Dynamic Creative', 'active', 'image', 'https://cdn.adnexus.ai/creatives/pmax_dynamic.jpg', 'Find Your Perfect Style', 'AI-powered recommendations tailored just for you. Discover styles you will love.', 'SHOP_NOW', 'https://demo-shop.com/personalized'),

  -- TikTok ads (6)
  ('f14eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'e11eebc99-9c0b-4ef8-bb6d-6bb9bd380a45', 'd11eebc99-9c0b-4ef8-bb6d-6bb9bd380a27', 'tt_ad_001', 'OOTD Transition', 'active', 'video', 'https://cdn.adnexus.ai/creatives/tt_ootd.mp4', 'POV: Your summer outfit just got upgraded', 'This transition had to be perfect. Which look is your fave? Shop the link in bio! #OOTD #SummerVibes #Fashion', 'SHOP_NOW', 'https://demo-shop.com/tiktok/ootd'),
  ('f15eebc99-9c0b-4ef8-bb6d-6bb9bd380a67', 'e11eebc99-9c0b-4ef8-bb6d-6bb9bd380a45', 'd11eebc99-9c0b-4ef8-bb6d-6bb9bd380a27', 'tt_ad_002', 'Get Ready With Me', 'active', 'video', 'https://cdn.adnexus.ai/creatives/tt_grwm.mp4', 'GRWM for a summer brunch date', 'From skincare to outfit — here is my full routine. All products linked below! #GRWM #SummerStyle', 'LEARN_MORE', 'https://demo-shop.com/tiktok/grwm'),
  ('f16eebc99-9c0b-4ef8-bb6d-6bb9bd380a68', 'e12eebc99-9c0b-4ef8-bb6d-6bb9bd380a46', 'd12eebc99-9c0b-4ef8-bb6d-6bb9bd380a28', 'tt_ad_003', 'Creator Try-On Haul', 'active', 'video', 'https://cdn.adnexus.ai/creatives/tt_tryon.mp4', 'Haul: $500 worth of summer fits', 'Partnered with my faves to bring you this try-on haul! Use code CREATOR20 for 20% off. #Haul #TryOn', 'SHOP_NOW', 'https://demo-shop.com/tiktok/haul'),
  ('f17eebc99-9c0b-4ef8-bb6d-6bb9bd380a69', 'e12eebc99-9c0b-4ef8-bb6d-6bb9bd380a46', 'd12eebc99-9c0b-4ef8-bb6d-6bb9bd380a28', 'tt_ad_004', 'Styling Challenge', 'active', 'video', 'https://cdn.adnexus.ai/creatives/tt_styling.mp4', '3 ways to style one dress', 'Minimalist to glam — one dress, three vibes. Which one are you? #StylingChallenge #VersatileFashion', 'SHOP_NOW', 'https://demo-shop.com/tiktok/styling'),
  ('f18eebc99-9c0b-4ef8-bb6d-6bb9bd380a70', 'e13eebc99-9c0b-4ef8-bb6d-6bb9bd380a47', 'd13eebc99-9c0b-4ef8-bb6d-6bb9bd380a29', 'tt_ad_005', 'TopView - Brand Launch', 'ended', 'video', 'https://cdn.adnexus.ai/creatives/tt_topview.mp4', 'The future of fashion is here', 'Introducing our revolutionary sustainable collection. Watch the full story. #SustainableFashion', 'LEARN_MORE', 'https://demo-shop.com/sustainable'),
  ('f19eebc99-9c0b-4ef8-bb6d-6bb9bd380a71', 'e14eebc99-9c0b-4ef8-bb6d-6bb9bd380a48', 'd14eebc99-9c0b-4ef8-bb6d-6bb9bd380a30', 'tt_ad_006', 'App Install - Collection', 'draft', 'video', 'https://cdn.adnexus.ai/creatives/tt_app_install.mp4', 'Shop faster with our app', 'Exclusive app-only deals, personalized feeds, and early access to drops. Download now!', 'INSTALL_NOW', 'https://demo-shop.com/app'),

  -- Snap ads (6)
  ('f20eebc99-9c0b-4ef8-bb6d-6bb9bd380a72', 'e15eebc99-9c0b-4ef8-bb6d-6bb9bd380a49', 'd15eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', 'snap_ad_001', 'Snap Ad - Gaming Collab', 'active', 'video', 'https://cdn.adnexus.ai/creatives/snap_gaming.mp4', 'Level up your style', 'Gamer style is the new street style. Shop our gaming-inspired collection now! #GamerStyle #LevelUp', 'SHOP_NOW', 'https://demo-shop.com/gaming'),
  ('f21eebc99-9c0b-4ef8-bb6d-6bb9bd380a73', 'e15eebc99-9c0b-4ef8-bb6d-6bb9bd380a49', 'd15eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', 'snap_ad_002', 'Story Ad - Limited Drop', 'active', 'image', 'https://cdn.adnexus.ai/creatives/snap_limited_drop.jpg', 'Dropping tomorrow at 9am', 'Limited to 500 pieces. Set your alarm, this will sell out in minutes.', 'SHOP_NOW', 'https://demo-shop.com/limited-drop'),
  ('f22eebc99-9c0b-4ef8-bb6d-6bb9bd380a74', 'e16eebc99-9c0b-4ef8-bb6d-6bb9bd380a50', 'd16eebc99-9c0b-4ef8-bb6d-6bb9bd380a32', 'snap_ad_003', 'Story Ad - Flash Sale', 'active', 'image', 'https://cdn.adnexus.ai/creatives/snap_flash.jpg', '48hr Flash Sale: 30% OFF', 'Flash sale starts NOW! 30% off everything for 48 hours only. Do not miss out.', 'SHOP_NOW', 'https://demo-shop.com/flash'),
  ('f23eebc99-9c0b-4ef8-bb6d-6bb9bd380a75', 'e16eebc99-9c0b-4ef8-bb6d-6bb9bd380a50', 'd16eebc99-9c0b-4ef8-bb6d-6bb9bd380a32', 'snap_ad_004', 'AR Try-On Experience', 'active', 'video', 'https://cdn.adnexus.ai/creatives/snap_ar_tryon.mp4', 'Try before you buy — in AR!', 'Use our new AR lens to try on sunglasses virtually. Swipe up to shop your faves!', 'SHOP_NOW', 'https://demo-shop.com/ar-tryon'),
  ('f24eebc99-9c0b-4ef8-bb6d-6bb9bd380a76', 'e17eebc99-9c0b-4ef8-bb6d-6bb9bd380a51', 'd17eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'snap_ad_005', 'AR Lens - Seasonal Filter', 'paused', 'image', 'https://cdn.adnexus.ai/creatives/snap_ar_lens.jpg', 'Try our new summer filter', 'New AR lens just dropped! Share your look and tag us for a chance to win $500 store credit.', 'USE_LENS', 'https://demo-shop.com/ar-lens'),
  ('f25eebc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'e18eebc99-9c0b-4ef8-bb6d-6bb9bd380a52', 'd18eebc99-9c0b-4ef8-bb6d-6bb9bd380a34', 'snap_ad_006', 'Collection - Shoe Showcase', 'draft', 'image', 'https://cdn.adnexus.ai/creatives/snap_shoes.jpg', 'The Perfect Pair Awaits', 'Browse our complete shoe collection. From running to street style, find your perfect pair.', 'SHOP_NOW', 'https://demo-shop.com/shoes');

-- =============================================================================
-- 8. Drafts (10 drafts in various statuses)
-- =============================================================================
INSERT INTO drafts (id, workspace_id, campaign_id, ad_id, draft_type, title, description, proposed_changes, current_state, status, confidence_score, created_by, approved_by, approved_at, applied_at, fail_reason, expires_at)
VALUES
  ('g1eebc99-9c0b-4ef8-bb6d-6bb9bd380a78', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', null, 'budget_change', 'Increase Summer Sale budget by 25%', 'AI detected strong ROAS of 4.2x on the Summer Sale campaign. Increasing daily budget from $500 to $625 will capture more high-intent traffic during peak hours.', '{"budget": {"old": 500.00, "new": 625.00, "reason": "ROAS above target"}, "bid_cap_adjustment": 1.15}'::jsonb, '{"current_roas": 4.2, "current_cpa": 18.5, "impressions_7d": 425000, "clicks_7d": 12500}'::jsonb, 'pending', 87.50, null, null, null, null, null, NOW() + INTERVAL '7 days'),

  ('g2eebc99-9c0b-4ef8-bb6d-6bb9bd380a79', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd6eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', null, 'bid_change', 'Lower Google Search CPA target to $30', 'The Search campaign has been consistently outperforming with a CPA of $28 over the past 14 days. Reducing the target CPA from $35 to $30 will allow the algorithm to optimize more aggressively while maintaining efficiency.', '{"target_cpa": {"old": 35.00, "new": 30.00}, "expected_savings": 750.00}'::jsonb, '{"avg_cpa_14d": 28.3, "conversion_rate": 3.8, "quality_score_avg": 8.2}'::jsonb, 'pending', 92.00, null, null, null, null, null, NOW() + INTERVAL '5 days'),

  ('g3eebc99-9c0b-4ef8-bb6d-6bb9bd380a80', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd11eebc99-9c0b-4ef8-bb6d-6bb9bd380a27', null, 'status_change', 'Pause underperforming TikTok In-Feed campaign', 'The TikTok In-Feed campaign has seen a 40% decline in CTR over the past 7 days and CPA has risen to $38 (target: $20). Pausing will prevent further budget wastage.', '{"status": {"old": "active", "new": "paused"}, "reason": "CPA 90% above target"}'::jsonb, '{"ctr_7d": 0.85, "ctr_14d": 1.42, "cpa_7d": 38.2, "target_cpa": 20.0}'::jsonb, 'approved', 94.00, null, 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', NOW() - INTERVAL '2 hours', null, null, NOW() + INTERVAL '3 days'),

  ('g4eebc99-9c0b-4ef8-bb6d-6bb9bd380a81', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd4eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', null, 'status_change', 'Reactivate Lookalike campaign', 'The Lookalike campaign has been paused for 2 weeks. Performance data from the past month suggests the seed audience has refreshed. Reactivating with a slightly reduced budget to test.', '{"status": {"old": "paused", "new": "active"}, "budget": {"old": 150.00, "new": 100.00}}'::jsonb, '{"last_active": "2024-06-15", "seed_audience_size": 5200, "lookalike_quality": "good"}'::jsonb, 'applied', 78.00, null, 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', NOW() - INTERVAL '1 day', NOW() - INTERVAL '12 hours', null, NOW() + INTERVAL '7 days'),

  ('g5eebc99-9c0b-4ef8-bb6d-6bb9bd380a82', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', null, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a53', 'new_ad', 'New creative: UGC testimonial video for Summer Sale', 'Create a new UGC-style testimonial ad featuring real customer reviews. Expected to improve CTR by 15-20% based on historical creative performance data.', '{"creative_type": "video", "format": "ugc_testimonial", "duration": 15, "hook": "I was skeptical but..."}'::jsonb, '{"current_best_ctr": 2.8, "ugc_avg_ctr": 3.4, "estimated_improvement": 18}'::jsonb, 'pending', 82.00, null, null, null, null, null, NOW() + INTERVAL '10 days'),

  ('g6eebc99-9c0b-4ef8-bb6d-6bb9bd380a83', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd8eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', null, 'budget_change', 'Scale Shopping campaign by 50%', 'Google Shopping campaign ROAS has been consistently above 5x for 21 days. Scaling budget from $600 to $900 will capture more bottom-funnel shoppers.', '{"budget": {"old": 600.00, "new": 900.00}, "expected_roas": 4.8, "safe_scale_factor": 1.5}'::jsonb, '{"roas_7d": 5.3, "roas_14d": 5.1, "roas_21d": 4.9, "conversion_value_30d": 45600}'::jsonb, 'rejected', 85.00, null, 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', NOW() - INTERVAL '3 days', null, 'Budget allocation already committed to Q4 planning; revisit in October.', NOW() + INTERVAL '1 day'),

  ('g7eebc99-9c0b-4ef8-bb6d-6bb9bd380a84', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd15eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', null, 'targeting_change', 'Expand Snap audience to include Android users', 'Current iOS-only targeting limits reach by 45%. Testing Android inclusion with a 20% budget carve-out for a 7-day test period.', '{"targeting_change": {"add_os": ["Android"], "budget_split": {"iOS": 80, "Android": 20}, "test_duration": 7}}'::jsonb, '{"ios_performance": {"ctr": 1.2, "cpa": 18}, "android_estimated_cpa": 22, "reach_increase": 45}'::jsonb, 'failed', 71.00, null, 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days', 'API error: Snap audience expansion failed due to invalid app event configuration. Please update pixel settings and retry.', NOW() + INTERVAL '2 days'),

  ('g8eebc99-9c0b-4ef8-bb6d-6bb9bd380a85', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd10eebc99-9c0b-4ef8-bb6d-6bb9bd380a26', null, 'bid_change', 'Switch PMAX to Target ROAS 4.0', 'PMAX campaign has been on Maximize Conversion Value for 60 days. Switching to Target ROAS 4.0 will provide more predictable returns while maintaining volume.', '{"bid_strategy": {"old": "MAXIMIZE_CONVERSION_VALUE", "new": "TARGET_ROAS"}, "target_roas": 4.0}'::jsonb, '{"current_roas": 3.8, "conversion_value_60d": 156000, "avg_order_value": 85}'::jsonb, 'pending', 88.00, null, null, null, null, null, NOW() + INTERVAL '5 days'),

  ('g9eebc99-9c0b-4ef8-bb6d-6bb9bd380a86', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd12eebc99-9c0b-4ef8-bb6d-6bb9bd380a28', null, 'budget_change', 'Reduce Spark Ads budget by 20%', 'Creator partnership CPMs have risen 35% this month. Reducing budget from $250 to $200 and reallocating to higher-performing In-Feed ads.', '{"budget": {"old": 250.00, "new": 200.00}, "reallocation_target": "d11eebc99-9c0b-4ef8-bb6d-6bb9bd380a27", "reason": "rising_cpm"}'::jsonb, '{"cpm_30d": 8.5, "cpm_current": 11.5, "cpm_increase_pct": 35}'::jsonb, 'expired', 76.00, null, null, null, null, null, NOW() - INTERVAL '1 day'),

  ('g10eebc99-9c0b-4ef8-bb6d-6bb9bd380a87', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', null, null, 'new_campaign', 'Launch Back-to-School campaign on Meta', 'Seasonal opportunity: back-to-school search volume up 200% week-over-week. Recommend new Meta campaign targeting parents and students with dedicated creatives.', '{"platform": "meta", "objective": "CONVERSIONS", "budget": 400.00, "targeting": {"parents": true, "students": true, "age_range": "25-55"}, "creatives": 3, "test_budget_pct": 20}'::jsonb, '{"search_trend": {"volume_change_pct": 200, "category": "back_to_school"}, "estimated_opportunity": 45000}'::jsonb, 'pending', 91.00, null, null, null, null, null, NOW() + INTERVAL '14 days');

-- =============================================================================
-- 9. AI Rules (8 automation rules)
-- =============================================================================
INSERT INTO ai_rules (id, workspace_id, name, description, platform, rule_type, conditions, actions, status, confidence_threshold, auto_execute, notification_channels, created_by)
VALUES
  ('h1eebc99-9c0b-4ef8-bb6d-6bb9bd380a88', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Auto-Pause High CPA Campaigns', 'Automatically pause any campaign where CPA exceeds target by more than 50% for 3 consecutive days. Prevents budget wastage on underperforming campaigns.', 'all', 'pause',
   '[{"metric": "cpa", "operator": "gt", "value": "target_cpa * 1.5", "duration_days": 3}]'::jsonb,
   '[{"action": "pause_campaign", "params": {"notify_team": true}}, {"action": "create_draft", "params": {"type": "diagnostic_review"}}]'::jsonb,
   'active', 85.0, false, '["in_app", "email", "slack"]'::jsonb, 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),

  ('h2eebc99-9c0b-4ef8-bb6d-6bb9bd380a89', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Scale High ROAS Campaigns', 'When a campaign achieves ROAS above 3.5x for 7 consecutive days, propose a 30% budget increase. Captures momentum on winning campaigns.', 'all', 'scale',
   '[{"metric": "roas", "operator": "gt", "value": 3.5, "duration_days": 7}]'::jsonb,
   '[{"action": "create_budget_draft", "params": {"increase_pct": 30, "max_budget": 5000}}, {"action": "notify", "params": {"message": "High ROAS detected — scaling opportunity"}}]'::jsonb,
   'active', 80.0, false, '["in_app", "email"]'::jsonb, 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),

  ('h3eebc99-9c0b-4ef8-bb6d-6bb9bd380a90', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Creative Fatigue Alert', 'Detect when an ad creative shows fatigue signals (CTR decline >30% over 14 days) and flag for creative refresh. Includes fatigue score in notification.', 'all', 'alert',
   '[{"metric": "ctr_decline_pct", "operator": "gt", "value": 30, "duration_days": 14}, {"metric": "fatigue_score", "operator": "gt", "value": 70}]'::jsonb,
   '[{"action": "create_notification", "params": {"priority": "high", "type": "creative_fatigue"}}, {"action": "create_draft", "params": {"type": "new_creative", "template": "refresh_existing"}}]'::jsonb,
   'active', 75.0, false, '["in_app", "slack"]'::jsonb, 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),

  ('h4eebc99-9c0b-4ef8-bb6d-6bb9bd380a91', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Budget Reallocation - Weekend Boost', 'Automatically shift 15% of weekday budget to Friday-Sunday for campaigns in the fashion/lifestyle vertical where weekend CPA is historically 20% lower.', 'meta', 'budget_adjust',
   '[{"metric": "weekend_vs_weekday_cpa", "operator": "lt", "value": 0.8, "duration_days": 21}, {"metric": "vertical", "operator": "in", "value": ["fashion", "lifestyle", "beauty"]}]'::jsonb,
   '[{"action": "adjust_budget_schedule", "params": {"weekend_boost_pct": 15, "weekday_reduction_pct": 5}}]'::jsonb,
   'active', 82.0, true, '["in_app"]'::jsonb, 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),

  ('h5eebc99-9c0b-4ef8-bb6d-6bb9bd380a92', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Frequency Cap Breach Warning', 'Alert when campaign frequency exceeds 3.0 over a 7-day period, indicating potential audience saturation and diminishing returns.', 'all', 'alert',
   '[{"metric": "frequency", "operator": "gt", "value": 3.0, "duration_days": 7}]'::jsonb,
   '[{"action": "create_notification", "params": {"priority": "medium", "type": "frequency_cap"}}, {"action": "suggest_audience_expansion", "params": {"lookalike_pct": 1}}]'::jsonb,
   'active', 78.0, false, '["in_app", "email"]'::jsonb, 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),

  ('h6eebc99-9c0b-4ef8-bb6d-6bb9bd380a93', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Auto-Scale Google Shopping Winners', 'For Google Shopping campaigns with ROAS > 4.5x for 5+ days, automatically create a draft to increase budget by 25%. Excludes campaigns already at max budget.', 'google', 'scale',
   '[{"metric": "roas", "operator": "gt", "value": 4.5, "duration_days": 5}, {"metric": "campaign_type", "operator": "eq", "value": "shopping"}, {"metric": "at_max_budget", "operator": "eq", "value": false}]'::jsonb,
   '[{"action": "create_budget_draft", "params": {"increase_pct": 25, "requires_approval": true}}, {"action": "notify", "params": {"message": "Shopping winner detected — scale ready for approval"}}]'::jsonb,
   'active', 88.0, false, '["in_app", "email", "slack"]'::jsonb, 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),

  ('h7eebc99-9c0b-4ef8-bb6d-6bb9bd380a94', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'TikTok Underperformer Alert', 'Flag TikTok campaigns with spend > $200 and 0 conversions after 48 hours. Early detection prevents budget burn on non-converting TikTok traffic.', 'tiktok', 'alert',
   '[{"metric": "spend", "operator": "gt", "value": 200}, {"metric": "conversions", "operator": "eq", "value": 0, "duration_hours": 48}]'::jsonb,
   '[{"action": "create_notification", "params": {"priority": "high", "type": "underperformer"}}, {"action": "create_draft", "params": {"type": "pause_or_optimize", "suggestions": ["refresh_creative", "tighten_targeting"]}}]'::jsonb,
   'active', 72.0, false, '["in_app", "email"]'::jsonb, 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),

  ('h8eebc99-9c0b-4ef8-bb6d-6bb9bd380a95', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Weekly Performance Report', 'Generate a comprehensive weekly performance summary every Monday at 9 AM, including cross-platform metrics, top movers, and AI-generated insights.', 'all', 'alert',
   '[{"metric": "schedule", "operator": "eq", "value": "weekly_monday_9am"}]'::jsonb,
   '[{"action": "generate_report", "params": {"type": "weekly_summary", "include_insights": true, "include_recommendations": true}}, {"action": "send_email", "params": {"recipients": ["team"], "format": "pdf_and_dashboard"}}]'::jsonb,
   'active', 95.0, true, '["in_app", "email"]'::jsonb, 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12');

-- =============================================================================
-- 10. Notifications (15 notifications)
-- =============================================================================
INSERT INTO notifications (id, workspace_id, user_id, type, title, message, priority, read, read_at, action_url, metadata)
VALUES
  ('i1eebc99-9c0b-4ef8-bb6d-6bb9bd380a96', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'draft', 'New draft: Increase Summer Sale budget', 'AI has drafted a 25% budget increase for the Summer Sale campaign based on strong ROAS performance.', 'high', false, null, '/drafts/g1eebc99-9c0b-4ef8-bb6d-6bb9bd380a78', '{"draft_id": "g1eebc99-9c0b-4ef8-bb6d-6bb9bd380a78", "confidence": 87.5}'::jsonb),

  ('i2eebc99-9c0b-4ef8-bb6d-6bb9bd380a97', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'draft', 'New draft: Lower Google Search CPA', 'AI recommends reducing the Google Search target CPA from $35 to $30. Campaign has been outperforming consistently.', 'high', false, null, '/drafts/g2eebc99-9c0b-4ef8-bb6d-6bb9bd380a79', '{"draft_id": "g2eebc99-9c0b-4ef8-bb6d-6bb9bd380a79", "confidence": 92}'::jsonb),

  ('i3eebc99-9c0b-4ef8-bb6d-6bb9bd380a98', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'alert', 'Campaign paused: TikTok In-Feed underperforming', 'The TikTok In-Feed campaign was automatically flagged due to CPA exceeding target by 90%. A draft has been created for your review.', 'critical', true, NOW() - INTERVAL '4 hours', '/campaigns/d11eebc99-9c0b-4ef8-bb6d-6bb9bd380a27', '{"campaign_id": "d11eebc99-9c0b-4ef8-bb6d-6bb9bd380a27", "cpa": 38.2, "target": 20}'::jsonb),

  ('i4eebc99-9c0b-4ef8-bb6d-6bb9bd380a99', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'draft', 'Draft approved: Reactivate Lookalike', 'You approved the reactivation of the Lookalike campaign. The change has been applied successfully.', 'medium', true, NOW() - INTERVAL '1 day', '/campaigns/d4eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', '{"campaign_id": "d4eebc99-9c0b-4ef8-bb6d-6bb9bd380a20", "status_change": "paused_to_active"}'::jsonb),

  ('i5eebc99-9c0b-4ef8-bb6d-6bb9bd380a9a', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'alert', 'Creative fatigue detected: Summer Sale Hero', 'The Summer Sale Hero ad (meta_ad_001) shows a 35% CTR decline over 14 days. Consider refreshing the creative.', 'high', false, null, '/creatives/f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a53', '{"ad_id": "f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a53", "fatigue_score": 78, "ctr_decline_pct": 35}'::jsonb),

  ('i6eebc99-9c0b-4ef8-bb6d-6bb9bd380a9b', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'draft', 'Draft rejected: Scale Shopping by 50%', 'The Shopping budget increase draft was rejected. Reason: Budget allocation already committed to Q4 planning.', 'medium', true, NOW() - INTERVAL '2 days', '/drafts/g6eebc99-9c0b-4ef8-bb6d-6bb9bd380a83', '{"draft_id": "g6eebc99-9c0b-4ef8-bb6d-6bb9bd380a83", "rejection_reason": "Q4 budget locked"}'::jsonb),

  ('i7eebc99-9c0b-4ef8-bb6d-6bb9bd380a9c', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'ai_action', 'Auto-execute: Weekend budget boost applied', 'The Weekend Boost rule automatically shifted 15% of weekday budget to the weekend for Meta campaigns.', 'low', true, NOW() - INTERVAL '12 hours', '/rules/h4eebc99-9c0b-4ef8-bb6d-6bb9bd380a93', '{"rule_id": "h4eebc99-9c0b-4ef8-bb6d-6bb9bd380a93", "affected_campaigns": 3, "budget_shift": 450}'::jsonb),

  ('i8eebc99-9c0b-4ef8-bb6d-6bb9bd380a9d', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'alert', 'Frequency alert: Brand Awareness Q3', 'The Brand Awareness Q3 campaign has reached a frequency of 3.2 over the past 7 days. Consider audience expansion.', 'medium', false, null, '/campaigns/d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', '{"campaign_id": "d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a18", "frequency_7d": 3.2}'::jsonb),

  ('i9eebc99-9c0b-4ef8-bb6d-6bb9bd380a9e', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'report', 'Weekly Performance Report - July Week 4', 'Your weekly report is ready. Highlights: Total spend $12,450, ROAS 3.8x (up 12%), 2 campaigns recommended for scaling.', 'low', true, NOW() - INTERVAL '2 days', '/reports/weekly/2024-w30', '{"total_spend": 12450, "roas": 3.8, "recommendations": 2, "new_drafts": 4}'::jsonb),

  ('i10eebc99-9c0b-4ef8-bb6d-6bb9bd380a9f', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'system', 'Google Ads token expiring in 5 days', 'Your Google Ads access token expires on August 5th. Please re-authenticate to avoid data sync interruptions.', 'high', false, null, '/settings/accounts/c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', '{"account_id": "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a14", "expires_at": "2024-08-05T00:00:00Z", "platform": "google"}'::jsonb),

  ('i11eebc99-9c0b-4ef8-bb6d-6bb9bd380aa0', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'alert', 'Snap API error: Audience expansion failed', 'The Snap Ads audience expansion draft failed due to a pixel configuration error. Please update your Snap pixel settings.', 'critical', true, NOW() - INTERVAL '3 days', '/drafts/g7eebc99-9c0b-4ef8-bb6d-6bb9bd380a84', '{"draft_id": "g7eebc99-9c0b-4ef8-bb6d-6bb9bd380a84", "error": "invalid_pixel_config"}'::jsonb),

  ('i12eebc99-9c0b-4ef8-bb6d-6bb9bd380aa1', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'ai_action', 'Draft expired: Reduce Spark Ads budget', 'The Spark Ads budget reduction draft has expired without approval. CPMs remain elevated. A new draft has been created.', 'medium', true, NOW() - INTERVAL '6 hours', '/drafts/g9eebc99-9c0b-4ef8-bb6d-6bb9bd380a86', '{"expired_draft": "g9eebc99-9c0b-4ef8-bb6d-6bb9bd380a86", "new_draft": "g11eebc99-9c0b-4ef8-bb6d-6bb9bd380a88"}'::jsonb),

  ('i13eebc99-9c0b-4ef8-bb6d-6bb9bd380aa2', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'draft', 'New draft: Back-to-School Meta campaign', 'AI detected a 200% surge in back-to-school search volume. A new campaign draft has been prepared targeting parents and students.', 'high', false, null, '/drafts/g10eebc99-9c0b-4ef8-bb6d-6bb9bd380a87', '{"draft_id": "g10eebc99-9c0b-4ef8-bb6d-6bb9bd380a87", "confidence": 91, "search_volume_increase": 200}'::jsonb),

  ('i14eebc99-9c0b-4ef8-bb6d-6bb9bd380aa3', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'ai_action', 'High ROAS detected: Google Shopping', 'The Google Shopping campaign has maintained a 5.3x ROAS for 21 days. A scale draft (25% budget increase) is ready for approval.', 'high', false, null, '/drafts/pending', '{"campaign_id": "d8eebc99-9c0b-4ef8-bb6d-6bb9bd380a24", "roas_21d": 5.3, "rule": "Auto-Scale Google Shopping"}'::jsonb),

  ('i15eebc99-9c0b-4ef8-bb6d-6bb9bd380aa4', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'system', 'Welcome to AdNexus AI!', 'Your workspace is set up and connected to 4 ad accounts. Here is how to get the most out of AI-powered ad management.', 'low', true, NOW() - INTERVAL '7 days', '/onboarding', '{"step": "welcome", "accounts_connected": 4, "campaigns_imported": 18}'::jsonb);

-- =============================================================================
-- 11. Audit Log (20 entries)
-- =============================================================================
INSERT INTO audit_log (id, workspace_id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
VALUES
  ('j1eebc99-9c0b-4ef8-bb6d-6bb9bd380aa5', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'create', 'workspace', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', null, '{"name": "Demo Workspace", "slug": "demo-workspace", "plan": "scale"}'::jsonb, '192.168.1.100'::inet, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'),
  ('j2eebc99-9c0b-4ef8-bb6d-6bb9bd380aa6', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'connect_account', 'ad_account', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', null, '{"platform": "meta", "account_name": "Meta Ads - Main Account"}'::jsonb, '192.168.1.100'::inet, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'),
  ('j3eebc99-9c0b-4ef8-bb6d-6bb9bd380aa7', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'connect_account', 'ad_account', 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', null, '{"platform": "google", "account_name": "Google Ads - Search & Display"}'::jsonb, '192.168.1.100'::inet, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'),
  ('j4eebc99-9c0b-4ef8-bb6d-6bb9bd380aa8', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'connect_account', 'ad_account', 'c3eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', null, '{"platform": "tiktok", "account_name": "TikTok Ads - US Region"}'::jsonb, '192.168.1.100'::inet, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'),
  ('j5eebc99-9c0b-4ef8-bb6d-6bb9bd380aa9', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'connect_account', 'ad_account', 'c4eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', null, '{"platform": "snap", "account_name": "Snap Ads - Lifestyle"}'::jsonb, '192.168.1.100'::inet, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'),
  ('j6eebc99-9c0b-4ef8-bb6d-6bb9bd380aaa', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'create_campaign', 'campaign', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', null, '{"name": "Summer Sale 2024", "platform": "meta", "budget": 500, "objective": "CONVERSIONS"}'::jsonb, '192.168.1.100'::inet, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'),
  ('j7eebc99-9c0b-4ef8-bb6d-6bb9bd380aab', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'create_campaign', 'campaign', 'd6eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', null, '{"name": "Search - Generic Keywords", "platform": "google", "budget": 800, "objective": "SALES"}'::jsonb, '192.168.1.100'::inet, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'),
  ('j8eebc99-9c0b-4ef8-bb6d-6bb9bd380aac', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'create_rule', 'rule', 'h1eebc99-9c0b-4ef8-bb6d-6bb9bd380a88', null, '{"name": "Auto-Pause High CPA Campaigns", "rule_type": "pause"}'::jsonb, '192.168.1.100'::inet, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'),
  ('j9eebc99-9c0b-4ef8-bb6d-6bb9bd380aad', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'create_rule', 'rule', 'h2eebc99-9c0b-4ef8-bb6d-6bb9bd380a89', null, '{"name": "Scale High ROAS Campaigns", "rule_type": "scale"}'::jsonb, '192.168.1.100'::inet, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'),
  ('j10eebc99-9c0b-4ef8-bb6d-6bb9bd380aae', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'create_rule', 'rule', 'h3eebc99-9c0b-4ef8-bb6d-6bb9bd380a90', null, '{"name": "Creative Fatigue Alert", "rule_type": "alert"}'::jsonb, '192.168.1.100'::inet, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'),
  ('j11eebc99-9c0b-4ef8-bb6d-6bb9bd380aaf', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'approve_draft', 'draft', 'g3eebc99-9c0b-4ef8-bb6d-6bb9bd380a80', '{"status": "pending"}'::jsonb, '{"status": "approved", "action": "pause_campaign"}'::jsonb, '192.168.1.100'::inet, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'),
  ('j12eebc99-9c0b-4ef8-bb6d-6bb9bd380ab0', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'apply_draft', 'draft', 'g4eebc99-9c0b-4ef8-bb6d-6bb9bd380a81', '{"status": "approved"}'::jsonb, '{"status": "applied", "action": "activate_campaign"}'::jsonb, '192.168.1.100'::inet, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'),
  ('j13eebc99-9c0b-4ef8-bb6d-6bb9bd380ab1', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'reject_draft', 'draft', 'g6eebc99-9c0b-4ef8-bb6d-6bb9bd380a83', '{"status": "pending"}'::jsonb, '{"status": "rejected", "reason": "Budget allocation committed to Q4"}'::jsonb, '192.168.1.100'::inet, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'),
  ('j14eebc99-9c0b-4ef8-bb6d-6bb9bd380ab2', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'pause_campaign', 'campaign', 'd4eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', '{"status": "active"}'::jsonb, '{"status": "paused", "reason": "manual_review"}'::jsonb, '192.168.1.100'::inet, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'),
  ('j15eebc99-9c0b-4ef8-bb6d-6bb9bd380ab3', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'update_settings', 'workspace', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '{"notifications_email": false}'::jsonb, '{"notifications_email": true, "ai_auto_execute": false}'::jsonb, '192.168.1.100'::inet, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'),
  ('j16eebc99-9c0b-4ef8-bb6d-6bb9bd380ab4', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'create_draft', 'draft', 'g1eebc99-9c0b-4ef8-bb6d-6bb9bd380a78', null, '{"type": "budget_change", "title": "Increase Summer Sale budget by 25%"}'::jsonb, '0.0.0.0'::inet, 'AdNexus AI Engine'),
  ('j17eebc99-9c0b-4ef8-bb6d-6bb9bd380ab5', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'auto_execute', 'rule', 'h4eebc99-9c0b-4ef8-bb6d-6bb9bd380a93', null, '{"rule": "Weekend Boost", "budget_shift": 450, "affected_campaigns": 3}'::jsonb, '0.0.0.0'::inet, 'AdNexus AI Engine'),
  ('j18eebc99-9c0b-4ef8-bb6d-6bb9bd380ab6', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'login', 'user', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', null, '{"method": "password", "success": true}'::jsonb, '203.0.113.42'::inet, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'),
  ('j19eebc99-9c0b-4ef8-bb6d-6bb9bd380ab7', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'token_refresh', 'ad_account', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', null, '{"platform": "meta", "result": "success", "next_expiry": "2024-09-25"}'::jsonb, '0.0.0.0'::inet, 'AdNexus Sync Service'),
  ('j20eebc99-9c0b-4ef8-bb6d-6bb9bd380ab8', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'api_key_create', 'api_key', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', null, '{"name": "Production API Key", "scopes": ["read", "write"], "prefix": "adnx_live"}'::jsonb, '192.168.1.100'::inet, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');

-- =============================================================================
-- 12. Campaign Metrics (30 days of daily performance data)
-- =============================================================================
-- Generate 30 days of realistic metrics for active campaigns using a PL/pgSQL block
DO $$
DECLARE
  campaign RECORD;
  day_offset INTEGER;
  daily_impressions INTEGER;
  daily_clicks INTEGER;
  daily_spend DECIMAL(12,2);
  daily_conversions INTEGER;
  daily_conv_value DECIMAL(12,2);
  daily_reach INTEGER;
  daily_ctr DECIMAL(5,4);
  daily_cpc DECIMAL(10,2);
  daily_cpm DECIMAL(10,2);
  daily_cpa DECIMAL(10,2);
  daily_roas DECIMAL(5,2);
  base_spend DECIMAL(12,2);
  base_cvr DECIMAL(5,4);
  base_ctr DECIMAL(5,4);
  random_factor DECIMAL(5,2);
  campaign_ids UUID[] := ARRAY[
    'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a17',
    'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a18',
    'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a19',
    'd6eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'd7eebc99-9c0b-4ef8-bb6d-6bb9bd380a23',
    'd8eebc99-9c0b-4ef8-bb6d-6bb9bd380a24',
    'd10eebc99-9c0b-4ef8-bb6d-6bb9bd380a26',
    'd11eebc99-9c0b-4ef8-bb6d-6bb9bd380a27',
    'd12eebc99-9c0b-4ef8-bb6d-6bb9bd380a28',
    'd15eebc99-9c0b-4ef8-bb6d-6bb9bd380a31',
    'd16eebc99-9c0b-4ef8-bb6d-6bb9bd380a32'
  ];
BEGIN
  FOREACH campaign.id IN ARRAY campaign_ids
  LOOP
    -- Set base metrics per campaign
    CASE campaign.id::text
      WHEN 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a17' THEN
        base_spend := 450; base_cvr := 0.035; base_ctr := 0.025;
      WHEN 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a18' THEN
        base_spend := 280; base_cvr := 0.008; base_ctr := 0.012;
      WHEN 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a19' THEN
        base_spend := 180; base_cvr := 0.055; base_ctr := 0.032;
      WHEN 'd6eebc99-9c0b-4ef8-bb6d-6bb9bd380a22' THEN
        base_spend := 720; base_cvr := 0.042; base_ctr := 0.045;
      WHEN 'd7eebc99-9c0b-4ef8-bb6d-6bb9bd380a23' THEN
        base_spend := 310; base_cvr := 0.028; base_ctr := 0.018;
      WHEN 'd8eebc99-9c0b-4ef8-bb6d-6bb9bd380a24' THEN
        base_spend := 540; base_cvr := 0.048; base_ctr := 0.038;
      WHEN 'd10eebc99-9c0b-4ef8-bb6d-6bb9bd380a26' THEN
        base_spend := 1080; base_cvr := 0.038; base_ctr := 0.022;
      WHEN 'd11eebc99-9c0b-4ef8-bb6d-6bb9bd380a27' THEN
        base_spend := 270; base_cvr := 0.025; base_ctr := 0.018;
      WHEN 'd12eebc99-9c0b-4ef8-bb6d-6bb9bd380a28' THEN
        base_spend := 225; base_cvr := 0.032; base_ctr := 0.028;
      WHEN 'd15eebc99-9c0b-4ef8-bb6d-6bb9bd380a31' THEN
        base_spend := 180; base_cvr := 0.015; base_ctr := 0.014;
      WHEN 'd16eebc99-9c0b-4ef8-bb6d-6bb9bd380a32' THEN
        base_spend := 160; base_cvr := 0.038; base_ctr := 0.022;
      ELSE
        base_spend := 300; base_cvr := 0.03; base_ctr := 0.025;
    END CASE;

    FOR day_offset IN 0..29 LOOP
      -- Add daily random variation (-20% to +20%)
      random_factor := 0.8 + (random() * 0.4);

      -- Add weekend dip pattern (lower performance on weekends for B2C)
      IF EXTRACT(DOW FROM (CURRENT_DATE - day_offset)) IN (0, 6) THEN
        random_factor := random_factor * 0.85;
      END IF;

      daily_spend := ROUND(base_spend * random_factor, 2);
      daily_impressions := GREATEST(1, ROUND((daily_spend / (base_spend * 0.008)) * random_factor)::INTEGER);
      daily_clicks := GREATEST(1, ROUND(daily_impressions * base_ctr * random_factor)::INTEGER);
      daily_conversions := GREATEST(0, ROUND(daily_clicks * base_cvr * random_factor)::INTEGER);
      daily_conv_value := ROUND(daily_conversions * (65 + random() * 40), 2);
      daily_reach := GREATEST(1, ROUND(daily_impressions * 0.75)::INTEGER);
      daily_ctr := ROUND(daily_clicks::NUMERIC / NULLIF(daily_impressions, 0), 4);
      daily_cpc := ROUND(daily_spend / NULLIF(daily_clicks, 0), 2);
      daily_cpm := ROUND(daily_spend / NULLIF(daily_impressions, 0) * 1000, 2);
      daily_cpa := ROUND(daily_spend / NULLIF(daily_conversions, 0), 2);
      daily_roas := ROUND(daily_conv_value / NULLIF(daily_spend, 0), 2);

      INSERT INTO campaign_metrics (campaign_id, date, impressions, clicks, spend, conversions, conversion_value, reach, frequency, ctr, cpc, cpm, cpa, roas, platform_data)
      VALUES (
        campaign.id,
        CURRENT_DATE - day_offset,
        daily_impressions,
        daily_clicks,
        daily_spend,
        daily_conversions,
        daily_conv_value,
        daily_reach,
        ROUND(1.0 + random() * 2.5, 2),
        daily_ctr,
        daily_cpc,
        daily_cpm,
        daily_cpa,
        daily_roas,
        jsonb_build_object(
          'view_through_conversions', GREATEST(0, ROUND(daily_conversions * 0.3)::INTEGER),
          'click_through_conversions', GREATEST(0, ROUND(daily_conversions * 0.7)::INTEGER),
          'engagement_rate', ROUND(random() * 5 + 2, 2),
          'video_plays', CASE WHEN campaign.id IN ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 'd11eebc99-9c0b-4ef8-bb6d-6bb9bd380a27') THEN ROUND(daily_impressions * 0.4)::INTEGER ELSE NULL END,
          'average_watch_time', CASE WHEN campaign.id IN ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 'd11eebc99-9c0b-4ef8-bb6d-6bb9bd380a27') THEN ROUND(5 + random() * 15, 1) ELSE NULL END
        )
      );
    END LOOP;
  END LOOP;
END $$;

-- =============================================================================
-- 13. Creative Performance (30 days of data for top ads)
-- =============================================================================
DO $$
DECLARE
  ad RECORD;
  day_offset INTEGER;
  daily_impressions INTEGER;
  daily_clicks INTEGER;
  daily_ctr DECIMAL(5,4);
  daily_cpc DECIMAL(10,2);
  daily_fatigue DECIMAL(5,2);
  daily_trend VARCHAR(20);
  base_ctr DECIMAL(5,4);
  ad_ids UUID[] := ARRAY[
    'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a53',
    'f2eebc99-9c0b-4ef8-bb6d-6bb9bd380a54',
    'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a57',
    'f8eebc99-9c0b-4ef8-bb6d-6bb9bd380a60',
    'f14eebc99-9c0b-4ef8-bb6d-6bb9bd380a66',
    'f16eebc99-9c0b-4ef8-bb6d-6bb9bd380a68',
    'f20eebc99-9c0b-4ef8-bb6d-6bb9bd380a72',
    'f22eebc99-9c0b-4ef8-bb6d-6bb9bd380a74'
  ];
BEGIN
  FOREACH ad.id IN ARRAY ad_ids
  LOOP
    -- Different base CTRs per creative
    CASE ad.id::text
      WHEN 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a53' THEN base_ctr := 0.028;
      WHEN 'f2eebc99-9c0b-4ef8-bb6d-6bb9bd380a54' THEN base_ctr := 0.035;
      WHEN 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a57' THEN base_ctr := 0.042;
      WHEN 'f8eebc99-9c0b-4ef8-bb6d-6bb9bd380a60' THEN base_ctr := 0.048;
      WHEN 'f14eebc99-9c0b-4ef8-bb6d-6bb9bd380a66' THEN base_ctr := 0.032;
      WHEN 'f16eebc99-9c0b-4ef8-bb6d-6bb9bd380a68' THEN base_ctr := 0.038;
      WHEN 'f20eebc99-9c0b-4ef8-bb6d-6bb9bd380a72' THEN base_ctr := 0.022;
      WHEN 'f22eebc99-9c0b-4ef8-bb6d-6bb9bd380a74' THEN base_ctr := 0.025;
      ELSE base_ctr := 0.030;
    END CASE;

    FOR day_offset IN 0..29 LOOP
      -- Fatigue increases over time (CTR declines)
      daily_fatigue := LEAST(100, ROUND((day_offset / 30.0) * 70 + random() * 15, 2));

      -- CTR declines with fatigue
      daily_ctr := GREATEST(0.005, ROUND(base_ctr * (1 - daily_fatigue / 200) * (0.85 + random() * 0.3), 4));

      daily_impressions := GREATEST(100, ROUND((5000 + random() * 10000) * (1 - daily_fatigue / 300))::INTEGER);
      daily_clicks := GREATEST(1, ROUND(daily_impressions * daily_ctr)::INTEGER);
      daily_cpc := ROUND(0.5 + random() * 3.5, 2);

      -- Determine trend
      IF day_offset < 7 THEN
        daily_trend := 'improving';
      ELSIF daily_fatigue > 75 THEN
        daily_trend := 'fatigued';
      ELSIF daily_ctr < base_ctr * 0.7 THEN
        daily_trend := 'declining';
      ELSE
        daily_trend := 'stable';
      END IF;

      INSERT INTO creative_performance (ad_id, date, impressions, clicks, ctr, cpc, fatigue_score, performance_trend)
      VALUES (ad.id, CURRENT_DATE - day_offset, daily_impressions, daily_clicks, daily_ctr, daily_cpc, daily_fatigue, daily_trend);
    END LOOP;
  END LOOP;
END $$;

-- =============================================================================
-- 14. AI Action Logs (sample action history)
-- =============================================================================
INSERT INTO ai_action_logs (id, workspace_id, rule_id, draft_id, campaign_id, action_type, description, confidence_score, status, metadata)
VALUES
  ('k1eebc99-9c0b-4ef8-bb6d-6bb9bd380ab9', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'h1eebc99-9c0b-4ef8-bb6d-6bb9bd380a88', 'g3eebc99-9c0b-4ef8-bb6d-6bb9bd380a80', 'd11eebc99-9c0b-4ef8-bb6d-6bb9bd380a27', 'pause_campaign', 'Auto-paused TikTok In-Feed campaign due to CPA ($38.2) exceeding target ($20) by 91%', 94.0, 'success', '{"cpa": 38.2, "target_cpa": 20.0, "exceedance_pct": 91}'::jsonb),
  ('k2eebc99-9c0b-4ef8-bb6d-6bb9bd380aba', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'h2eebc99-9c0b-4ef8-bb6d-6bb9bd380a89', 'g4eebc99-9c0b-4ef8-bb6d-6bb9bd380a81', 'd4eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', 'create_budget_draft', 'Detected strong ROAS performance on Lookalike campaign — created reactivation draft', 78.0, 'success', '{"roas_14d": 3.8, "seed_audience_size": 5200}'::jsonb),
  ('k3eebc99-9c0b-4ef8-bb6d-6bb9bd380abb', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'h3eebc99-9c0b-4ef8-bb6d-6bb9bd380a90', null, null, 'creative_fatigue_alert', 'Flagged Summer Sale Hero ad for fatigue (CTR decline 35% over 14 days, fatigue score: 78)', 85.0, 'success', '{"ad_id": "f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a53", "fatigue_score": 78, "ctr_decline_pct": 35}'::jsonb),
  ('k4eebc99-9c0b-4ef8-bb6d-6bb9bd380abc', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'h4eebc99-9c0b-4ef8-bb6d-6bb9bd380a93', null, 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'adjust_budget_schedule', 'Applied weekend budget boost: shifted $150 from Mon-Thu to Fri-Sun for Summer Sale', 91.0, 'success', '{"weekend_boost": 150, "weekday_reduction": 50}'::jsonb),
  ('k5eebc99-9c0b-4ef8-bb6d-6bb9bd380abd', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'h5eebc99-9c0b-4ef8-bb6d-6bb9bd380a94', null, 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 'frequency_alert', 'Brand Awareness Q3 frequency reached 3.2 over 7 days — recommended audience expansion', 82.0, 'success', '{"frequency_7d": 3.2, "reach_7d": 1250000}'::jsonb),
  ('k6eebc99-9c0b-4ef8-bb6d-6bb9bd380abe', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'h6eebc99-9c0b-4ef8-bb6d-6bb9bd380a95', null, 'd8eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'create_budget_draft', 'Google Shopping ROAS at 5.3x for 21 days — scale draft created (25% budget increase)', 93.0, 'success', '{"roas_21d": 5.3, "current_budget": 600, "proposed_budget": 750}'::jsonb),
  ('k7eebc99-9c0b-4ef8-bb6d-6bb9bd380abf', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'h7eebc99-9c0b-4ef8-bb6d-6bb9bd380a96', 'g7eebc99-9c0b-4ef8-bb6d-6bb9bd380a84', 'd15eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', 'underperformer_alert', 'Flagged Snap campaign: $240 spent with 0 conversions in 48 hours — action needed', 76.0, 'success', '{"spend_48h": 240, "conversions_48h": 0, "suggested_actions": ["refresh_creative", "tighten_targeting"]}'::jsonb),
  ('k8eebc99-9c0b-4ef8-bb6d-6bb9bd380ac0', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'h8eebc99-9c0b-4ef8-bb6d-6bb9bd380a97', null, null, 'generate_report', 'Weekly performance report generated for July Week 4', 97.0, 'success', '{"report_type": "weekly", "campaigns_analyzed": 11, "insights_generated": 8}'::jsonb),
  ('k9eebc99-9c0b-4ef8-bb6d-6bb9bd380ac1', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', null, null, null, 'seasonal_opportunity', 'Detected 200% increase in back-to-school search volume — new campaign draft created', 91.0, 'success', '{"search_volume_change": 200, "category": "back_to_school", "estimated_opportunity": 45000}'::jsonb),
  ('k10eebc99-9c0b-4ef8-bb6d-6bb9bd380ac2', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', null, null, 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'budget_scale_executed', 'Summer Sale campaign budget increased from $500 to $625 after user approval', 87.5, 'success', '{"old_budget": 500, "new_budget": 625, "approval_time_hours": 6}'::jsonb);

-- =============================================================================
-- 15. API Keys
-- =============================================================================
INSERT INTO api_keys (id, workspace_id, user_id, name, key_hash, key_prefix, scopes, last_used_at, created_at)
VALUES
  ('l1eebc99-9c0b-4ef8-bb6d-6bb9bd380ac3', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Production API Key', '$2b$12$abc...def', 'adnx_live', '["read", "write"]'::jsonb, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '7 days'),
  ('l2eebc99-9c0b-4ef8-bb6d-6bb9bd380ac4', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Read-Only Reporting Key', '$2b$12$ghi...jkl', 'adnx_rpt', '["read"]'::jsonb, NOW() - INTERVAL '1 day', NOW() - INTERVAL '3 days');

-- =============================================================================
-- migrate:down
-- =============================================================================
-- All seed data is CASCADE-deleted with the schema
