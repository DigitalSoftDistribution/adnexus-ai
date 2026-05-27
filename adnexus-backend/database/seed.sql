-- AdNexus AI — Seed Data
-- Run this after schema.sql to populate realistic mock data
-- All UUIDs are fixed for cross-table consistency

-- ============================================
-- FIXED UUIDS (for cross-table consistency)
-- ============================================

-- Users
\set alex_id            'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
\set sam_id             'b2c3d4e5-f6a7-8901-bcde-f23456789012'

-- Workspace
\set workspace_id       'c3d4e5f6-a7b8-9012-cdef-345678901234'

-- Workspace Members
\set member_alex        'd4e5f6a7-b8c9-0123-defa-456789012345'
\set member_sam         'e5f6a7b8-c9d0-1234-efab-567890123456'

-- Ad Accounts
\set meta_account_id    'f6a7b8c9-d0e1-2345-fabc-678901234567'
\set google_account_id  'a7b8c9d0-e1f2-3456-abcd-789012345678'
\set tiktok_account_id  'b8c9d0e1-f2a3-4567-bcde-890123456789'

-- Campaigns (8)
\set camp_meta_1        'c9d0e1f2-a3b4-5678-cdef-901234567890'
\set camp_meta_2        'd0e1f2a3-b4c5-6789-defa-012345678901'
\set camp_meta_3        'e1f2a3b4-c5d6-7890-efab-123456789012'
\set camp_google_1      'f2a3b4c5-d6e7-8901-fabc-234567890123'
\set camp_google_2      'a3b4c5d6-e7f8-9012-abcd-345678901234'
\set camp_tiktok_1      'b4c5d6e7-f8a9-0123-bcde-456789012345'
\set camp_tiktok_2      'c5d6e7f8-a9b0-1234-cdef-567890123456'
\set camp_snap_1        'd6e7f8a9-b0c1-2345-defa-678901234567'

-- ============================================
-- USERS
-- ============================================

INSERT INTO users (id, email, name, avatar_url, created_at, updated_at) VALUES
  (:alex_id, 'alex@adnexus.ai', 'Alex Morgan', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex', NOW() - INTERVAL '90 days', NOW() - INTERVAL '1 day'),
  (:sam_id, 'sam@adnexus.ai', 'Sam Chen', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sam', NOW() - INTERVAL '85 days', NOW() - INTERVAL '3 days');

-- ============================================
-- WORKSPACE
-- ============================================

INSERT INTO workspaces (id, name, slug, plan, owner_id, branding, settings, created_at, updated_at) VALUES
  (:workspace_id, 'Acme Marketing', 'acme-marketing', 'pro', :alex_id,
   '{"logo_url": "", "primary_color": "#6366F1", "favicon": ""}'::jsonb,
   '{"timezone": "America/New_York", "currency": "USD", "date_format": "MM/DD/YYYY", "notifications": {"email_alerts": true, "slack_webhook": false, "morning_brief": true}}'::jsonb,
   NOW() - INTERVAL '90 days', NOW() - INTERVAL '2 days');

-- ============================================
-- WORKSPACE MEMBERS
-- ============================================

INSERT INTO workspace_members (id, workspace_id, user_id, role, created_at) VALUES
  (:member_alex, :workspace_id, :alex_id, 'owner', NOW() - INTERVAL '90 days'),
  (:member_sam, :workspace_id, :sam_id, 'admin', NOW() - INTERVAL '85 days');

-- ============================================
-- AD ACCOUNTS (3 platforms)
-- ============================================

INSERT INTO ad_accounts (id, workspace_id, platform, account_id, name, status, oauth_token, refresh_token, token_expires_at, scopes, metadata, created_at, updated_at) VALUES
  (:meta_account_id, :workspace_id, 'meta', 'act_1234567890', 'Meta Ads - Acme', 'active',
   'EAABsbCS1iHgBA...', 'REFRESH_TOKEN_META...', NOW() + INTERVAL '55 days',
   '["ads_read", "ads_management", "business_management"]'::jsonb,
   '{"business_manager_id": "123456789", "currency": "USD", "timezone": "America/New_York"}'::jsonb,
   NOW() - INTERVAL '88 days', NOW() - INTERVAL '5 days'),

  (:google_account_id, :workspace_id, 'google', '123-456-7890', 'Google Ads - Acme', 'active',
   'ya29.a0AfB_byC...', 'REFRESH_TOKEN_GOOGLE...', NOW() + INTERVAL '42 days',
   '["https://www.googleapis.com/auth/adwords"]'::jsonb,
   '{"developer_token": "ABcdEfGhIjKlMnOp", "customer_id": "1234567890", "manager_account": false}'::jsonb,
   NOW() - INTERVAL '80 days', NOW() - INTERVAL '3 days'),

  (:tiktok_account_id, :workspace_id, 'tiktok', 'tiktok_9876543210', 'TikTok Ads - Acme', 'active',
   'act.example12345...', 'REFRESH_TOKEN_TIKTOK...', NOW() + INTERVAL '38 days',
   '["ad.read", "ad.write"]'::jsonb,
   '{"app_id": "tiktok_app_123", "advertiser_id": "9876543210"}'::jsonb,
   NOW() - INTERVAL '72 days', NOW() - INTERVAL '7 days');

-- ============================================
-- CAMPAIGNS (8 campaigns across 4 platforms)
-- ============================================

INSERT INTO campaigns (id, ad_account_id, platform_campaign_id, name, status, objective, daily_budget, lifetime_budget, budget_type, spend, impressions, clicks, ctr, conversions, cpa, roas, frequency, reach, cpm, cpc, video_views, video_p25, video_p50, video_p75, video_p100, start_date, end_date, platform_data, created_at, updated_at) VALUES
  -- Meta: Summer Sale 2024
  (:camp_meta_1, :meta_account_id, '1202068234567890', 'Summer Sale 2024', 'active', 'CONVERSIONS', 500.00, NULL, 'daily', 12400.00, 485000, 8200, 1.6907, 340, 36.47, 3.20, 2.40, 202083, 25.57, 1.51, 12400, 78.50, 62.30, 45.80, 28.60, '2024-05-15', '2024-08-31', '{"buying_type": "AUCTION", "bid_strategy": "LOWEST_COST_WITHOUT_CAP", "special_ad_categories": [], "attribution_setting": "7d_click"}'::jsonb, NOW() - INTERVAL '68 days', NOW() - INTERVAL '1 day'),

  -- Meta: Brand Awareness Q3
  (:camp_meta_2, :meta_account_id, '1202068234567891', 'Brand Awareness Q3', 'active', 'BRAND_AWARENESS', 300.00, NULL, 'daily', 8200.00, 625000, 4200, 0.6720, 165, 49.70, 2.10, 3.20, 195312, 13.12, 1.95, 28500, 85.20, 70.10, 52.40, 31.80, '2024-06-01', '2024-09-30', '{"buying_type": "AUCTION", "bid_strategy": "REACH", "special_ad_categories": [], "reach_and_frequency": true}'::jsonb, NOW() - INTERVAL '52 days', NOW() - INTERVAL '2 days'),

  -- Meta: Retargeting - Cart Abandoners
  (:camp_meta_3, :meta_account_id, '1202068234567892', 'Retargeting - Cart Abandoners', 'active', 'CONVERSIONS', 200.00, NULL, 'daily', 5600.00, 45000, 3100, 6.8889, 400, 14.00, 4.80, 4.10, 10976, 124.44, 1.81, 8200, 92.10, 85.40, 76.20, 58.90, '2024-04-20', '2024-12-31', '{"buying_type": "AUCTION", "bid_strategy": "COST_CAP", "bid_amount": 18.00, "custom_audiences": ["cart_abandoners_30d"]}'::jsonb, NOW() - INTERVAL '93 days', NOW() - INTERVAL '1 day'),

  -- Google: Search - High Intent
  (:camp_google_1, :google_account_id, '12345678901', 'Search - High Intent', 'active', 'SALES', 400.00, NULL, 'daily', 9800.00, 125000, 5600, 4.4800, 280, 35.00, 2.90, 1.80, 69444, 78.40, 1.75, NULL, NULL, NULL, NULL, NULL, '2024-05-01', '2024-12-31', '{"network_setting": {"target_google_search": true, "target_search_network": false, "target_content_network": false}, "bidding_strategy": "TARGET_ROAS", "target_roas": 3.0}'::jsonb, NOW() - INTERVAL '82 days', NOW() - INTERVAL '1 day'),

  -- Google: Display - Remarketing
  (:camp_google_2, :google_account_id, '12345678902', 'Display - Remarketing', 'paused', 'SALES', 150.00, NULL, 'daily', 3200.00, 420000, 850, 0.2024, 55, 58.18, 1.80, 2.60, 161538, 7.62, 3.76, NULL, NULL, NULL, NULL, NULL, '2024-06-10', '2024-08-15', '{"network_setting": {"target_content_network": true}, "bidding_strategy": "MANUAL_CPC", "cpc_bid": 2.50}'::jsonb, NOW() - INTERVAL '42 days', NOW() - INTERVAL '5 days'),

  -- TikTok: Spark Ads
  (:camp_tiktok_1, :tiktok_account_id, 'tiktok_camp_1111', 'TikTok Spark Ads', 'active', 'CONVERSIONS', 250.00, NULL, 'daily', 6100.00, 280000, 4100, 1.4643, 195, 31.28, 2.40, 2.10, 133333, 21.79, 1.49, 15600, 72.30, 58.60, 41.20, 22.80, '2024-05-20', '2024-09-15', '{"budget_mode": "BUDGET_MODE_DAY", "bid_type": "BID_TYPE_NO_BID", "optimization_goal": "CONVERT", "spark_ads": true}'::jsonb, NOW() - INTERVAL '63 days', NOW() - INTERVAL '1 day'),

  -- TikTok: Influencer Amplification
  (:camp_tiktok_2, :tiktok_account_id, 'tiktok_camp_2222', 'Influencer Amplification', 'active', 'CONVERSIONS', 180.00, NULL, 'daily', 4300.00, 195000, 2900, 1.4872, 138, 31.16, 3.10, 1.90, 102632, 22.05, 1.48, 9800, 68.40, 55.20, 38.60, 19.40, '2024-06-05', '2024-08-30', '{"budget_mode": "BUDGET_MODE_DAY", "bid_type": "BID_TYPE_NO_BID", "optimization_goal": "CONVERT", "postbid_partner": "influencer_co"}'::jsonb, NOW() - INTERVAL '47 days', NOW() - INTERVAL '2 days'),

  -- Snap: Story Ads (no snap account, use meta as placeholder - will be a snap account seeded below)
  (:camp_snap_1, :meta_account_id, 'snap_camp_3333', 'Snap Story Ads', 'active', 'AWARENESS', 100.00, NULL, 'daily', 2100.00, 85000, 650, 0.7647, 25, 84.00, 1.60, 1.50, 56667, 24.71, 3.23, 4200, 55.80, 42.30, 28.10, 15.60, '2024-06-15', '2024-08-15', '{"objective": "AWARENESS", "placement": "SNAPCHAT_STORY", "auto_bid": true}'::jsonb, NOW() - INTERVAL '37 days', NOW() - INTERVAL '1 day');


-- ============================================
-- ADSETS (12 adsets — 2-3 per campaign)
-- ============================================

INSERT INTO adsets (id, campaign_id, platform_adset_id, name, status, daily_budget, bid_strategy, bid_amount, targeting, platform_data, created_at, updated_at) VALUES
  -- Summer Sale 2024: 3 adsets
  ('adset-001-aaaa-1111-000000000001', :camp_meta_1, 'as_120001', 'US Women 25-44 - Purchase', 'active', 200.00, 'LOWEST_COST_WITHOUT_CAP', NULL,
   '{"age_min": 25, "age_max": 44, "genders": [2], "geo_locations": {"countries": ["US"]}, "interests": [{"id": "6003139266461", "name": "Online shopping"}, {"id": "6003343442821", "name": "Fashion accessories"}], "custom_audiences": [], "exclusions": []}'::jsonb,
   '{"optimization_goal": "OFFSITE_CONVERSIONS", "attribution_spec": {"event_type": "CLICK_THROUGH", "window_days": 7}}'::jsonb,
   NOW() - INTERVAL '68 days', NOW() - INTERVAL '1 day'),

  ('adset-002-aaaa-1111-000000000002', :camp_meta_1, 'as_120002', 'US Men 25-54 - Purchase', 'active', 180.00, 'LOWEST_COST_WITHOUT_CAP', NULL,
   '{"age_min": 25, "age_max": 54, "genders": [1], "geo_locations": {"countries": ["US"]}, "interests": [{"id": "6003139266461", "name": "Online shopping"}, {"id": "6003384242835", "name": "Electronics"}], "custom_audiences": [], "exclusions": []}'::jsonb,
   '{"optimization_goal": "OFFSITE_CONVERSIONS", "attribution_spec": {"event_type": "CLICK_THROUGH", "window_days": 7}}'::jsonb,
   NOW() - INTERVAL '68 days', NOW() - INTERVAL '2 days'),

  ('adset-003-aaaa-1111-000000000003', :camp_meta_1, 'as_120003', 'Lookalike 1% - Top Customers', 'active', 120.00, 'COST_CAP', 25.00,
   '{"age_min": 21, "age_max": 65, "genders": [], "geo_locations": {"countries": ["US"]}, "custom_audiences": [{"id": "lal_1pct_purchasers", "name": "Lookalike (1%) Top Customers"}], "interests": [], "exclusions": []}'::jsonb,
   '{"optimization_goal": "OFFSITE_CONVERSIONS", "attribution_spec": {"event_type": "CLICK_THROUGH", "window_days": 7}}'::jsonb,
   NOW() - INTERVAL '65 days', NOW() - INTERVAL '1 day'),

  -- Brand Awareness Q3: 2 adsets
  ('adset-004-aaaa-1111-000000000004', :camp_meta_2, 'as_120004', 'Broad - US 18-45', 'active', 180.00, 'REACH', NULL,
   '{"age_min": 18, "age_max": 45, "genders": [], "geo_locations": {"countries": ["US"], "regions": [{"key": "3847"}]}, "interests": [{"id": "6003342515651", "name": "Fitness and wellness"}, {"id": "6003406998598", "name": "Healthy lifestyle"}], "custom_audiences": []}'::jsonb,
   '{"frequency_cap": 3, "optimization_goal": "AD_RECALL_LIFT"}'::jsonb,
   NOW() - INTERVAL '52 days', NOW() - INTERVAL '2 days'),

  ('adset-005-aaaa-1111-000000000005', :camp_meta_2, 'as_120005', 'Narrow - Interest Stacking', 'active', 120.00, 'REACH', NULL,
   '{"age_min": 25, "age_max": 40, "genders": [2], "geo_locations": {"countries": ["US"], "cities": [{"key": "2418956"}, {"key": "2421836"}]}, "interests": [{"id": "6003342515651", "name": "Fitness"}, {"id": "6002962607297", "name": "Yoga"}, {"id": "6003412318780", "name": "Organic food"}], "behavior": [{"id": "6071631541183", "name": "Engaged Shoppers"}]}'::jsonb,
   '{"frequency_cap": 2, "optimization_goal": "AD_RECALL_LIFT"}'::jsonb,
   NOW() - INTERVAL '50 days', NOW() - INTERVAL '1 day'),

  -- Retargeting - Cart Abandoners: 2 adsets
  ('adset-006-aaaa-1111-000000000006', :camp_meta_3, 'as_120006', 'Cart Abandoners 7D', 'active', 120.00, 'COST_CAP', 15.00,
   '{"age_min": 21, "age_max": 65, "genders": [], "geo_locations": {"countries": ["US"]}, "custom_audiences": [{"id": "ca_cart_7d", "name": "Cart Abandoners 7 Days"}], "interests": [], "exclusions": [{"id": "ca_purchasers_7d", "name": "Purchasers 7 Days"}]}'::jsonb,
   '{"optimization_goal": "OFFSITE_CONVERSIONS", "attribution_spec": {"event_type": "CLICK_THROUGH", "window_days": 1}}'::jsonb,
   NOW() - INTERVAL '93 days', NOW() - INTERVAL '1 day'),

  ('adset-007-aaaa-1111-000000000007', :camp_meta_3, 'as_120007', 'Cart Abandoners 30D - Lower Bid', 'active', 80.00, 'COST_CAP', 22.00,
   '{"age_min": 21, "age_max": 65, "genders": [], "geo_locations": {"countries": ["US"]}, "custom_audiences": [{"id": "ca_cart_30d", "name": "Cart Abandoners 30 Days"}], "exclusions": [{"id": "ca_cart_7d", "name": "Cart Abandoners 7 Days"}]}'::jsonb,
   '{"optimization_goal": "OFFSITE_CONVERSIONS", "attribution_spec": {"event_type": "CLICK_THROUGH", "window_days": 7}}'::jsonb,
   NOW() - INTERVAL '91 days', NOW() - INTERVAL '3 days'),

  -- Google Search - High Intent: 2 adsets
  ('adset-008-aaaa-1111-000000000008', :camp_google_1, 'as_123001', 'Brand Keywords', 'active', 200.00, 'TARGET_ROAS', NULL,
   '{"keywords": [{"text": "acme marketing", "match_type": "EXACT"}, {"text": "acme digital", "match_type": "PHRASE"}, {"text": "acme agency", "match_type": "BROAD"}], "negative_keywords": ["free", "jobs", "careers"]}'::jsonb,
   '{"target_cpa": 30.00, "target_roas": 3.0}'::jsonb,
   NOW() - INTERVAL '82 days', NOW() - INTERVAL '1 day'),

  ('adset-009-aaaa-1111-000000000009', :camp_google_1, 'as_123002', 'High-Intent Non-Brand', 'active', 200.00, 'TARGET_ROAS', NULL,
   '{"keywords": [{"text": "digital marketing agency", "match_type": "EXACT"}, {"text": "performance marketing", "match_type": "PHRASE"}, {"text": "ppc management services", "match_type": "EXACT"}, {"text": "facebook ads agency", "match_type": "PHRASE"}], "negative_keywords": ["free", "diy", "template"]}'::jsonb,
   '{"target_cpa": 40.00, "target_roas": 2.5}'::jsonb,
   NOW() - INTERVAL '80 days', NOW() - INTERVAL '2 days'),

  -- Google Display - Remarketing: 1 adset
  ('adset-010-aaaa-1111-000000000010', :camp_google_2, 'as_123003', 'Remarketing - All Visitors', 'paused', 150.00, 'MANUAL_CPC', 2.50,
   '{"audiences": [{"id": "aud_all_visitors_30d", "name": "All Website Visitors 30D"}], "placements": [{"type": "WEBSITE", "url": ""}], "exclusions": [{"id": "aud_converters_30d", "name": "Recent Converters 30D"}]}'::jsonb,
   '{"target_cpm": 5.00}'::jsonb,
   NOW() - INTERVAL '42 days', NOW() - INTERVAL '5 days'),

  -- TikTok Spark Ads: 2 adsets
  ('adset-011-aaaa-1111-000000000011', :camp_tiktok_1, 'as_tik001', 'Spark Ads - Creator Content', 'active', 150.00, 'LOWEST_COST', NULL,
   '{"age": ["25-34", "35-44"], "gender": "ALL", "location": [{"code": "US", "name": "United States"}], "interests": [{"id": "1234567890", "name": "Business & Productivity"}, {"id": "2345678901", "name": "Technology"}], "behaviors": []}'::jsonb,
   '{"optimization_goal": "CONVERT", "conversion_event": "CompletePayment"}'::jsonb,
   NOW() - INTERVAL '63 days', NOW() - INTERVAL '1 day'),

  ('adset-012-aaaa-1111-000000000012', :camp_tiktok_1, 'as_tik002', 'Spark Ads - UGC Collection', 'active', 100.00, 'LOWEST_COST', NULL,
   '{"age": ["18-24", "25-34"], "gender": "ALL", "location": [{"code": "US", "name": "United States"}], "interests": [{"id": "3456789012", "name": "Lifestyle"}, {"id": "4567890123", "name": "Shopping & Retail"}], "custom_audiences": []}'::jsonb,
   '{"optimization_goal": "CONVERT", "conversion_event": "CompletePayment"}'::jsonb,
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '2 days');

-- ============================================
-- ADS (16 ads — 1-2 per adset)
-- ============================================

INSERT INTO ads (id, adset_id, platform_ad_id, name, status, creative_type, creative_url, creative_text, spend, impressions, clicks, ctr, conversions, cpa, roas, frequency, fatigue_score, fatigue_status, platform_data, created_at, updated_at) VALUES
  -- Summer Sale 2024 → Adset 1: 2 ads
  ('ad-001-bbbb-2222-000000000001', 'adset-001-aaaa-1111-000000000001', 'ad_120001', 'Carousel - Summer Collection', 'active', 'carousel', 'https://cdn.adnexus.ai/creatives/carousel_summer_1.jpg', 'Shop our biggest summer sale! Up to 50% off. Limited time only.', 4200.00, 165000, 3100, 1.8788, 128, 32.81, 3.45, 2.35, 18.50, 'healthy', '{"carousel_cards": 5, "call_to_action": "SHOP_NOW"}'::jsonb, NOW() - INTERVAL '68 days', NOW() - INTERVAL '1 day'),
  ('ad-002-bbbb-2222-000000000002', 'adset-001-aaaa-1111-000000000001', 'ad_120002', 'Video - Flash Sale 24h', 'active', 'video', 'https://cdn.adnexus.ai/creatives/video_flash.mp4', '24-HOUR FLASH SALE! Prices you will not believe. Shop before midnight!', 3800.00, 145000, 2800, 1.9310, 115, 33.04, 3.28, 2.42, 35.20, 'warning', '{"video_length": 15, "call_to_action": "SHOP_NOW"}'::jsonb, NOW() - INTERVAL '65 days', NOW() - INTERVAL '1 day'),

  -- Summer Sale 2024 → Adset 2: 1 ad
  ('ad-003-bbbb-2222-000000000003', 'adset-002-aaaa-1111-000000000002', 'ad_120003', 'Single Image - Free Shipping', 'active', 'image', 'https://cdn.adnexus.ai/creatives/image_freeship.jpg', 'Free shipping on orders over $50. Summer essentials inside.', 3600.00, 98000, 1900, 1.9388, 82, 43.90, 2.85, 1.95, 12.80, 'healthy', '{"image_ratio": "1.91:1", "call_to_action": "SHOP_NOW"}'::jsonb, NOW() - INTERVAL '68 days', NOW() - INTERVAL '2 days'),

  -- Summer Sale 2024 → Adset 3: 1 ad
  ('ad-004-bbbb-2222-000000000004', 'adset-003-aaaa-1111-000000000003', 'ad_120004', 'Lookalike - VIP Offer', 'active', 'image', 'https://cdn.adnexus.ai/creatives/image_vip.jpg', 'An exclusive offer for valued customers. Early access to new arrivals.', 1800.00, 77000, 400, 0.5195, 15, 120.00, 2.10, 1.85, 8.60, 'healthy', '{"image_ratio": "1:1", "call_to_action": "LEARN_MORE"}'::jsonb, NOW() - INTERVAL '65 days', NOW() - INTERVAL '1 day'),

  -- Brand Awareness Q3 → Adset 4: 2 ads
  ('ad-005-bbbb-2222-000000000005', 'adset-004-aaaa-1111-000000000004', 'ad_120005', 'Video - Brand Story 30s', 'active', 'video', 'https://cdn.adnexus.ai/creatives/video_brand.mp4', 'We believe every brand deserves to shine. Discover the Acme difference.', 4800.00, 385000, 2600, 0.6753, 105, 45.71, 1.95, 3.15, 42.80, 'critical', '{"video_length": 30, "call_to_action": "LEARN_MORE", "thruplay_optimization": true}'::jsonb, NOW() - INTERVAL '52 days', NOW() - INTERVAL '2 days'),
  ('ad-006-bbbb-2222-000000000006', 'adset-004-aaaa-1111-000000000004', 'ad_120006', 'Image - Testimonial Quote', 'active', 'image', 'https://cdn.adnexus.ai/creatives/image_quote.jpg', '"Acme transformed our marketing." - Jane D., CEO', 2200.00, 185000, 1100, 0.5946, 42, 52.38, 1.78, 2.85, 28.40, 'warning', '{"image_ratio": "4:5", "call_to_action": "LEARN_MORE"}'::jsonb, NOW() - INTERVAL '50 days', NOW() - INTERVAL '1 day'),

  -- Brand Awareness Q3 → Adset 5: 1 ad
  ('ad-007-bbbb-2222-000000000007', 'adset-005-aaaa-1111-000000000005', 'ad_120007', 'Reels - Behind the Scenes', 'active', 'video', 'https://cdn.adnexus.ai/creatives/reels_bts.mp4', 'Behind every campaign is a story. See how we work.', 1200.00, 55000, 500, 0.9091, 18, 66.67, 1.65, 1.72, 22.10, 'warning', '{"video_length": 15, "placement": "REELS", "call_to_action": "LEARN_MORE"}'::jsonb, NOW() - INTERVAL '50 days', NOW() - INTERVAL '2 days'),

  -- Retargeting → Adset 6: 2 ads
  ('ad-008-bbbb-2222-000000000008', 'adset-006-aaaa-1111-000000000006', 'ad_120008', 'DPA - Abandoned Cart', 'active', 'dynamic', 'https://cdn.adnexus.ai/creatives/dpa_cart.jpg', 'You left something behind! Complete your order with 10% off.', 2800.00, 25000, 1800, 7.2000, 255, 10.98, 5.20, 3.85, 15.30, 'healthy', '{"product_set_id": "ps_all_products", "discount_overlay": "10%"}'::jsonb, NOW() - INTERVAL '93 days', NOW() - INTERVAL '1 day'),
  ('ad-009-bbbb-2222-000000000009', 'adset-006-aaaa-1111-000000000006', 'ad_120009', 'Collection - Trending Now', 'active', 'collection', 'https://cdn.adnexus.ai/creatives/collection_trending.jpg', 'Trending now: items that other shoppers love. Free returns.', 1400.00, 12000, 850, 7.0833, 95, 14.74, 4.60, 4.10, 18.70, 'healthy', '{"product_set_id": "ps_trending", "layout": "grid"}'::jsonb, NOW() - INTERVAL '90 days', NOW() - INTERVAL '1 day'),

  -- Retargeting → Adset 7: 1 ad
  ('ad-010-bbbb-2222-000000000010', 'adset-007-aaaa-1111-000000000007', 'ad_120010', 'Image - Last Chance 30D', 'active', 'image', 'https://cdn.adnexus.ai/creatives/image_lastchance.jpg', 'Your cart is waiting. This is your last chance - items sell out fast!', 1400.00, 8000, 450, 5.6250, 50, 28.00, 3.80, 3.95, 25.40, 'warning', '{"image_ratio": "1:1", "call_to_action": "SHOP_NOW"}'::jsonb, NOW() - INTERVAL '91 days', NOW() - INTERVAL '3 days'),

  -- Google Search → Adset 8: 2 ads
  ('ad-011-bbbb-2222-000000000011', 'adset-008-aaaa-1111-000000000008', 'ad_123001', 'Responsive SA - Brand', 'active', 'responsive_search', '', 'Acme Marketing | Award-Winning Agency | Get a Free Audit Today | Proven Results | 500+ Happy Clients', 5200.00, 62000, 3100, 5.0000, 162, 32.10, 3.05, 1.65, 8.20, 'healthy', '{"headlines": ["Acme Marketing", "Award-Winning Agency", "Get a Free Audit", "Proven Results"], "descriptions": ["Full-service digital marketing. Drive ROI with data-driven strategies.", "500+ brands trust Acme. Book your free consultation today."], "final_url": "https://acmemarketing.com/audit"}'::jsonb, NOW() - INTERVAL '82 days', NOW() - INTERVAL '1 day'),
  ('ad-012-bbbb-2222-000000000012', 'adset-008-aaaa-1111-000000000008', 'ad_123002', 'Responsive SA - Promo', 'active', 'responsive_search', '', 'Limited Offer: Free Marketing Audit ($500 Value) | Results in 48h | No Obligation | Book Now', 3100.00, 38000, 1850, 4.8684, 95, 32.63, 2.95, 1.72, 12.50, 'healthy', '{"headlines": ["Free Marketing Audit", "$500 Value - Free", "Results in 48 Hours"], "descriptions": ["Limited spots available. Get actionable insights to scale your ads.", "Used by top DTC brands. Claim your complimentary audit."], "final_url": "https://acmemarketing.com/free-audit"}'::jsonb, NOW() - INTERVAL '80 days', NOW() - INTERVAL '2 days'),

  -- Google Search → Adset 9: 1 ad
  ('ad-013-bbbb-2222-000000000013', 'adset-009-aaaa-1111-000000000009', 'ad_123003', 'RSA - High Intent Keywords', 'active', 'responsive_search', '', 'Best Performance Marketing Agency | 4.9/5 Rating | Data-Driven | Scale Your Revenue Today', 1500.00, 25000, 650, 2.6000, 23, 65.22, 2.55, 1.95, 6.80, 'healthy', '{"headlines": ["Best Performance Agency", "4.9/5 Client Rating", "Scale Revenue Now"], "descriptions": ["Data-driven strategies for Meta, Google, and TikTok ads.", "Average 3.5x ROAS. See results in your first month."], "final_url": "https://acmemarketing.com/services"}'::jsonb, NOW() - INTERVAL '78 days', NOW() - INTERVAL '1 day'),

  -- TikTok Spark Ads → Adset 11: 1 ad
  ('ad-014-bbbb-2222-000000000014', 'adset-011-aaaa-1111-000000000011', 'ad_tik001', 'Spark Ad - Creator A', 'active', 'spark_ad', 'https://cdn.adnexus.ai/creatives/spark_creator_a.mp4', 'I have been using Acme for 6 months and my ROAS doubled. Here is exactly how. #ad #marketingtips', 3100.00, 142000, 2200, 1.5493, 108, 28.70, 2.55, 2.05, 32.60, 'warning', '{"creator_handle": "@sarahmarketing", "spark_authorized": true, "music_id": "tiktok_music_12345"}'::jsonb, NOW() - INTERVAL '63 days', NOW() - INTERVAL '1 day'),

  -- TikTok Spark Ads → Adset 12: 1 ad
  ('ad-015-bbbb-2222-000000000015', 'adset-012-aaaa-1111-000000000012', 'ad_tik002', 'Spark Ad - UGC Style B', 'active', 'spark_ad', 'https://cdn.adnexus.ai/creatives/spark_ugc_b.mp4', 'POV: You finally found a marketing agency that actually delivers results. @acmemarketing', 1900.00, 86000, 1250, 1.4535, 62, 30.65, 2.35, 1.95, 38.40, 'warning', '{"creator_handle": "@mikedropsmarketing", "spark_authorized": true, "music_id": "tiktok_music_67890"}'::jsonb, NOW() - INTERVAL '60 days', NOW() - INTERVAL '2 days'),

  -- Google Display → Adset 10: 1 ad
  ('ad-016-bbbb-2222-000000000016', 'adset-010-aaaa-1111-000000000010', 'ad_123004', 'Display Banner 300x250', 'paused', 'display', 'https://cdn.adnexus.ai/creatives/display_300x250.gif', 'Still thinking it over? Come back and complete your purchase.', 3200.00, 420000, 850, 0.2024, 55, 58.18, 1.80, 2.60, 45.60, 'critical', '{"ad_size": "300x250", "animated": true, "color_scheme": "brand_primary"}'::jsonb, NOW() - INTERVAL '42 days', NOW() - INTERVAL '5 days');


-- ============================================
-- DRAFTS (8 drafts — various types and statuses)
-- ============================================

INSERT INTO drafts (id, workspace_id, platform, campaign_id, adset_id, ad_id, draft_type, change_summary, change_detail, ai_reasoning, impact_estimate, status, scheduled_at, executed_at, error_message, actor_type, actor_id, actor_name, rule_id, approver_id, approval_note, created_at, resolved_at) VALUES
  -- 3 PENDING drafts
  ('draft-001-cccc-3333-000000000001', :workspace_id, 'meta', :camp_meta_1, NULL, NULL, 'budget_change',
   'Increase "Summer Sale 2024" daily budget from $500 to $650 (+30%)',
   '{"field": "daily_budget", "platform_campaign_id": "1202068234567890", "old_value": 500, "new_value": 650}'::jsonb,
   'ROAS of 3.2x is above the 3.0x target with consistent conversion volume over the past 14 days. Increasing budget by 30% should capture more converting users while maintaining efficiency. CPA at $36.47 is well below the $50 threshold.',
   'Estimated +25-30% increase in conversions, maintaining ROAS above 3.0x. Projected additional spend of $4,200 over 30 days.',
   'pending', NULL, NULL, NULL, 'ai', :alex_id, 'AI Agent', NULL, NULL, NULL,
   NOW() - INTERVAL '2 days', NULL),

  ('draft-002-cccc-3333-000000000002', :workspace_id, 'google', :camp_google_1, NULL, NULL, 'status_change',
   'Pause "Search - High Intent" campaign due to CPA exceeding target',
   '{"field": "status", "platform_campaign_id": "12345678901", "old_status": "active", "new_status": "paused", "reason": "cpa_threshold"}'::jsonb,
   'CPA at $35.00 has exceeded the $30 target for 5 consecutive days. Conversion rate has dropped 18% since July 1. Pausing to preserve budget while creative team refreshes landing pages.',
   'Preserving approximately $12,000/month in underperforming spend. Recommend resuming once landing page updates are live.',
   'pending', NULL, NULL, NULL, 'ai', :alex_id, 'AI Agent', NULL, NULL, NULL,
   NOW() - INTERVAL '1 day', NULL),

  ('draft-003-cccc-3333-000000000003', :workspace_id, 'meta', :camp_meta_3, 'adset-006-aaaa-1111-000000000006', NULL, 'bid_adjustment',
   'Increase bid cap for "Cart Abandoners 7D" from $15 to $20 (+33%)',
   '{"field": "bid_amount", "platform_adset_id": "as_120006", "old_value": 15, "new_value": 20}'::jsonb,
   'Adset is delivering below daily budget ($120 of $150). Auction competition has increased 22% this week. Current win rate at 68% - raising bid cap should improve delivery without significantly impacting CPA (projected $15.80).',
   'Expected +20% increase in impressions and clicks. CPA may rise slightly from $14.00 to ~$15.80, still well below target.',
   'pending', NULL, NULL, NULL, 'ai', :sam_id, 'AI Agent', NULL, NULL, NULL,
   NOW() - INTERVAL '12 hours', NULL),

  -- 2 APPROVED drafts
  ('draft-004-cccc-3333-000000000004', :workspace_id, 'meta', NULL, NULL, NULL, 'campaign_create',
   'Create new Meta campaign "Fall Collection Launch 2024"',
   '{"name": "Fall Collection Launch 2024", "objective": "CONVERSIONS", "daily_budget": 350, "status": "paused", "targeting": {"age_min": 22, "age_max": 55, "countries": ["US", "CA"]}}'::jsonb,
   'Seasonal opportunity detected. Fall collection launches in 3 weeks. Historical data shows 40% higher conversion rates for pre-launch campaigns starting 2-3 weeks before product availability.',
   'Expected ROAS of 2.8-3.5x based on similar past campaigns. Budget request: $350/day for 45 days = $15,750.',
   'approved', NULL, NOW() - INTERVAL '3 days', NULL, 'user', :alex_id, 'Alex Morgan', NULL, :alex_id, 'Approved - aligns with our fall strategy. Set start date for Aug 15.',
   NOW() - INTERVAL '5 days', NOW() - INTERVAL '3 days'),

  ('draft-005-cccc-3333-000000000005', :workspace_id, 'tiktok', :camp_tiktok_1, 'adset-011-aaaa-1111-000000000011', NULL, 'targeting_edit',
   'Expand TikTok Spark Ads targeting to include Canada',
   '{"field": "targeting", "platform_adset_id": "as_tik001", "old_value": ["US"], "new_value": ["US", "CA"], "change_type": "geo_expansion"}'::jsonb,
   'Canadian market analysis shows similar audience profiles with 15% lower CPMs. Competitive research indicates minimal competitor presence on TikTok in Canada for our category.',
   'Projected +18% reach increase at 15% lower CPM. Estimated additional conversions: 35/month with CPA of $22.',
   'approved', NULL, NOW() - INTERVAL '2 days', NULL, 'user', :sam_id, 'Sam Chen', NULL, :sam_id, 'Good expansion opportunity. Monitor Canadian CPA closely.',
   NOW() - INTERVAL '4 days', NOW() - INTERVAL '2 days'),

  -- 1 REJECTED draft
  ('draft-006-cccc-3333-000000000006', :workspace_id, 'meta', :camp_meta_2, 'adset-004-aaaa-1111-000000000004', NULL, 'audience_edit',
   'Replace "Broad - US 18-45" audience with 3% lookalike of purchasers',
   '{"field": "targeting", "platform_adset_id": "as_120004", "old_audience": "broad_interest", "new_audience": "lookalike_3pct_purchasers"}'::jsonb,
   'Broad targeting is generating high frequency (3.15) but low CTR (0.68%). Switching to a lookalike audience should improve relevance score and reduce CPM by an estimated 20%.',
   'Estimated +15% CTR improvement and -20% CPM reduction. Reach may decrease 35% but quality should improve.',
   'rejected', NULL, NULL, NULL, 'ai', :alex_id, 'AI Agent', NULL, :sam_id, 'We need broad reach for brand awareness. Lookalike would narrow too much. Keep broad but reduce frequency cap to 2.',
   NOW() - INTERVAL '6 days', NOW() - INTERVAL '5 days'),

  -- 1 SCHEDULED draft
  ('draft-007-cccc-3333-000000000007', :workspace_id, 'all', NULL, NULL, NULL, 'budget_reallocation',
   'Monthly budget reallocation: Shift $200/day from Display to Search and TikTok',
   '{"allocations": [{"campaign": "Search - High Intent", "change": "+100"}, {"campaign": "TikTok Spark Ads", "change": "+80"}, {"campaign": "TikTok Influencer", "change": "+20"}, {"campaign": "Display - Remarketing", "change": "-200"}], "effective_date": "2024-08-01", "rationale": "Display ROAS at 1.8x is below portfolio target of 3.0x"}'::jsonb,
   'Display Remarketing ROAS at 1.8x has been below target for 21 consecutive days. Reallocating budget to Search (2.9x ROAS) and TikTok (2.4-3.1x ROAS) should improve blended portfolio ROAS from 2.7x to 3.1x.',
   'Portfolio ROAS projected to improve from 2.7x to 3.1x (+15%). No significant volume loss expected as Search and TikTok have headroom.',
   'scheduled', NOW() + INTERVAL '5 days', NULL, NULL, 'ai', :alex_id, 'AI Agent', NULL, NULL, NULL,
   NOW() - INTERVAL '1 day', NULL),

  -- 1 ERROR draft
  ('draft-008-cccc-3333-000000000008', :workspace_id, 'meta', :camp_meta_1, 'adset-001-aaaa-1111-000000000001', 'ad-002-bbbb-2222-000000000002', 'creative_upload',
   'Upload refreshed video creative for Flash Sale ad (fatigue score 35.2%)',
   '{"ad_id": "ad_120002", "new_creative_url": "https://cdn.adnexus.ai/creatives/video_flash_v2.mp4", "new_text": "72-HOUR MEGA SALE! Prices slashed up to 60%. Free returns.", "fatigue_threshold": 30}'::jsonb,
   'Ad "Video - Flash Sale 24h" has fatigue score of 35.2% (above 30% threshold). CTR has declined 28% over the past 14 days. Creative refresh with new messaging and extended offer window should reset fatigue.',
   'Expected CTR recovery to 1.8-2.0% range. CPA should decrease 12-15% with fresh creative.',
   'error', NULL, NULL, 'Failed to upload video: File size exceeds 4GB limit for Meta video ads. Compress to under 250MB and retry. Video dimensions 1080x1920 are valid.', 'system', NULL, 'System', NULL, NULL, NULL,
   NOW() - INTERVAL '8 hours', NULL);

-- ============================================
-- AUTOMATION RULES (3 rules)
-- ============================================

INSERT INTO automation_rules (id, workspace_id, name, description, conditions, actions, platforms, status, applied_count, last_applied_at, created_at, updated_at) VALUES
  ('rule-001-dddd-4444-000000000001', :workspace_id, 'Pause High CPA Campaigns',
   'Automatically pause any campaign where CPA exceeds $50 for 3+ consecutive days and create a draft for review. Prevents budget waste on underperforming campaigns.',
   '[{"metric": "cpa", "operator": "gt", "value": 50, "timeWindow": "3d"}, {"metric": "spend", "operator": "gt", "value": 500}]'::jsonb,
   '[{"type": "pause_campaign", "params": {"reason": "cpa_above_threshold", "create_draft": true}}, {"type": "notify", "params": {"channel": "email", "recipients": ["admin"], "message": "Campaign paused due to high CPA"}}]'::jsonb,
   '["meta", "google", "tiktok", "snap"]'::jsonb,
   'active', 3, NOW() - INTERVAL '2 days',
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '2 days'),

  ('rule-002-dddd-4444-000000000002', :workspace_id, 'Scale High ROAS Campaigns',
   'Auto-scale campaigns with ROAS above 3.0x and significant spend history by increasing daily budget 20%. Only applies to campaigns spending >$1000 to ensure statistical significance.',
   '[{"metric": "roas", "operator": "gt", "value": 3.0, "timeWindow": "14d"}, {"metric": "spend", "operator": "gt", "value": 1000}]'::jsonb,
   '[{"type": "increase_budget", "params": {"percentage": 20, "max_budget": 2000, "create_draft": true}}, {"type": "notify", "params": {"channel": "slack", "message": "Budget increased for high-ROAS campaign"}}]'::jsonb,
   '["meta", "google", "tiktok"]'::jsonb,
   'active', 5, NOW() - INTERVAL '5 days',
   NOW() - INTERVAL '45 days', NOW() - INTERVAL '5 days'),

  ('rule-003-dddd-4444-000000000003', :workspace_id, 'Low CTR Alert',
   'Detect ads with CTR below 0.5% and high impressions (statistical significance) then create a draft for creative refresh review. Prevents ad fatigue from draining budget.',
   '[{"metric": "ctr", "operator": "lt", "value": 0.5, "timeWindow": "7d"}, {"metric": "impressions", "operator": "gt", "value": 10000}]'::jsonb,
   '[{"type": "create_draft", "params": {"draft_type": "creative_upload", "priority": "high", "auto_assign": "creative_team"}}, {"type": "notify", "params": {"channel": "email", "recipients": ["alex@adnexus.ai"], "message": "Low CTR detected - creative refresh draft created"}}]'::jsonb,
   '["meta", "google", "tiktok", "snap"]'::jsonb,
   'active', 2, NOW() - INTERVAL '1 day',
   NOW() - INTERVAL '30 days', NOW() - INTERVAL '1 day');

-- ============================================
-- GOALS (3 goals)
-- ============================================

INSERT INTO goals (id, workspace_id, name, goal_type, platform, target_value, current_value, baseline_value, unit, start_date, end_date, status, campaign_ids, alert_when, created_at, updated_at) VALUES
  ('goal-001-eeee-5555-000000000001', :workspace_id, 'Meta Portfolio ROAS Target', 'roas', 'meta', 3.5000, 3.2000, 2.8000, 'x', '2024-04-01', '2024-12-31', 'active',
   '["c9d0e1f2-a3b4-5678-cdef-901234567890", "d0e1f2a3-b4c5-6789-defa-012345678901", "e1f2a3b4-c5d6-7890-efab-123456789012"]'::jsonb,
   'at_risk', NOW() - INTERVAL '90 days', NOW() - INTERVAL '1 day'),

  ('goal-002-eeee-5555-000000000002', :workspace_id, 'Google Search CPA Target', 'cpa', 'google', 25.0000, 28.0000, 35.0000, '$', '2024-05-01', '2024-09-30', 'at_risk',
   '["f2a3b4c5-d6e7-8901-fabc-234567890123"]'::jsonb,
   'at_risk', NOW() - INTERVAL '60 days', NOW() - INTERVAL '1 day'),

  ('goal-003-eeee-5555-000000000003', :workspace_id, 'TikTok Spark CTR Target', 'ctr', 'tiktok', 2.0000, 1.8000, 1.4000, '%', '2024-05-15', '2024-10-15', 'active',
   '["b4c5d6e7-f8a9-0123-bcde-456789012345"]'::jsonb,
   'at_risk', NOW() - INTERVAL '65 days', NOW() - INTERVAL '2 days');


-- ============================================
-- SCHEDULED REPORTS (2 reports)
-- ============================================

INSERT INTO scheduled_reports (id, workspace_id, name, type, config, schedule_cron, status, last_run_at, next_run_at, created_at, updated_at) VALUES
  ('report-001-ffff-6666-000000000001', :workspace_id, 'Weekly Performance Summary', 'email',
   '{"recipients": ["alex@adnexus.ai", "sam@adnexus.ai"], "format": "html", "sections": ["executive_summary", "platform_breakdown", "top_campaigns", "alerts", "recommendations"], "include_charts": true, "brand_header": true}'::jsonb,
   '0 8 * * MON', 'active', NOW() - INTERVAL '3 days', NOW() + INTERVAL '4 days',
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '3 days'),

  ('report-002-ffff-6666-000000000002', :workspace_id, 'Daily Budget Alert', 'email',
   '{"recipients": ["alex@adnexus.ai"], "format": "html", "sections": ["budget_status", "pacing_alerts", "overspend_warnings"], "thresholds": {"overspend_pct": 110, "underspend_pct": 70}, "include_charts": false}'::jsonb,
   '0 9 * * *', 'active', NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 day',
   NOW() - INTERVAL '45 days', NOW() - INTERVAL '1 day');

-- ============================================
-- AUDIT LOG (10 entries)
-- ============================================

INSERT INTO audit_log (id, workspace_id, actor_type, actor_id, actor_name, action, action_category, platform, campaign_id, adset_id, ad_id, details, source, ip_address, user_agent, created_at) VALUES
  ('audit-001-gggg-7777-000000000001', :workspace_id, 'user', :alex_id, 'Alex Morgan', 'User signed in', 'user_login', NULL, NULL, NULL, NULL,
   '{"device": "desktop", "browser": "Chrome 126", "os": "macOS 14.5"}'::jsonb, 'api', '192.168.1.100/32', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
   NOW() - INTERVAL '30 minutes'),

  ('audit-002-gggg-7777-000000000002', :workspace_id, 'user', :sam_id, 'Sam Chen', 'User signed in', 'user_login', NULL, NULL, NULL, NULL,
   '{"device": "desktop", "browser": "Firefox 127", "os": "Windows 11"}'::jsonb, 'api', '192.168.1.101/32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0)',
   NOW() - INTERVAL '2 hours'),

  ('audit-003-gggg-7777-000000000003', :workspace_id, 'user', :alex_id, 'Alex Morgan', 'Approved draft: Create new Meta campaign "Fall Collection Launch 2024"', 'draft_approved', 'meta', NULL, NULL, NULL,
   '{"draft_id": "draft-004-cccc-3333-000000000004", "draft_type": "campaign_create", "campaign_name": "Fall Collection Launch 2024", "daily_budget": 350}'::jsonb, 'dashboard', '192.168.1.100/32', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
   NOW() - INTERVAL '3 days'),

  ('audit-004-gggg-7777-000000000004', :workspace_id, 'user', :sam_id, 'Sam Chen', 'Approved draft: Expand TikTok Spark Ads targeting to include Canada', 'draft_approved', 'tiktok', :camp_tiktok_1, 'adset-011-aaaa-1111-000000000011', NULL,
   '{"draft_id": "draft-005-cccc-3333-000000000005", "draft_type": "targeting_edit", "geo_expansion": ["US", "CA"]}'::jsonb, 'dashboard', '192.168.1.101/32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
   NOW() - INTERVAL '2 days'),

  ('audit-005-gggg-7777-000000000005', :workspace_id, 'ai', NULL, 'AI Agent', 'Rule triggered: Scale High ROAS Campaigns — Increased "Summer Sale 2024" budget by 20%', 'rule_triggered', 'meta', :camp_meta_1, NULL, NULL,
   '{"rule_id": "rule-002-dddd-4444-000000000002", "rule_name": "Scale High ROAS Campaigns", "old_budget": 500, "new_budget": 600, "trigger_condition": "roas > 3.0 AND spend > 1000"}'::jsonb, 'ai_agent', NULL, NULL,
   NOW() - INTERVAL '5 days'),

  ('audit-006-gggg-7777-000000000006', :workspace_id, 'ai', NULL, 'AI Agent', 'Rule triggered: Pause High CPA Campaigns — "Display - Remarketing" paused', 'rule_triggered', 'google', :camp_google_2, NULL, NULL,
   '{"rule_id": "rule-001-dddd-4444-000000000001", "rule_name": "Pause High CPA Campaigns", "cpa": 58.18, "threshold": 50, "days_above": 5}'::jsonb, 'ai_agent', NULL, NULL,
   NOW() - INTERVAL '7 days'),

  ('audit-007-gggg-7777-000000000007', :workspace_id, 'user', :alex_id, 'Alex Morgan', 'Changed daily budget for "Search - High Intent" from $300 to $400', 'budget_changed', 'google', :camp_google_1, NULL, NULL,
   '{"old_budget": 300, "new_budget": 400, "reason": "Scaling based on positive ROAS trend", "change_pct": 33.3}'::jsonb, 'dashboard', '192.168.1.100/32', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
   NOW() - INTERVAL '10 days'),

  ('audit-008-gggg-7777-000000000008', :workspace_id, 'user', :sam_id, 'Sam Chen', 'Changed status of "Display - Remarketing" from active to paused', 'status_changed', 'google', :camp_google_2, NULL, NULL,
   '{"old_status": "active", "new_status": "paused", "reason": "CPA above target, pausing for landing page refresh"}'::jsonb, 'dashboard', '192.168.1.101/32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
   NOW() - INTERVAL '5 days'),

  ('audit-009-gggg-7777-000000000009', :workspace_id, 'ai', NULL, 'AI Agent', 'Rule triggered: Low CTR Alert — Creative refresh draft created for "Video - Flash Sale 24h"', 'rule_triggered', 'meta', :camp_meta_1, 'adset-001-aaaa-1111-000000000001', 'ad-002-bbbb-2222-000000000002',
   '{"rule_id": "rule-003-dddd-4444-000000000003", "rule_name": "Low CTR Alert", "ctr": 1.93, "impressions": 145000, "fatigue_score": 35.2}'::jsonb, 'ai_agent', NULL, NULL,
   NOW() - INTERVAL '1 day'),

  ('audit-010-gggg-7777-000000000010', :workspace_id, 'user', :alex_id, 'Alex Morgan', 'Rejected draft: Replace audience with lookalike for Brand Awareness Q3', 'draft_rejected', 'meta', :camp_meta_2, 'adset-004-aaaa-1111-000000000004', NULL,
   '{"draft_id": "draft-006-cccc-3333-000000000006", "draft_type": "audience_edit", "reason": "Need broad reach for brand awareness. Lookalike would narrow too much. Keep broad but reduce frequency cap to 2."}'::jsonb, 'dashboard', '192.168.1.100/32', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
   NOW() - INTERVAL '5 days');

-- ============================================
-- AI CREDITS (1 record for July 2024)
-- ============================================

INSERT INTO ai_credits (id, workspace_id, month, credits_used, credits_limit, top_up_credits, created_at, updated_at) VALUES
  ('credit-001-hhhh-8888-000000000001', :workspace_id, '2024-07', 847, 2000, 0,
   NOW() - INTERVAL '20 days', NOW() - INTERVAL '2 hours');

-- ============================================
-- CREDIT USAGE LOG (6 entries)
-- ============================================

INSERT INTO credit_usage_log (id, workspace_id, feature, action, platform, credits_used, cost_estimate, month, created_at) VALUES
  ('cul-001-iiii-9999-000000000001', :workspace_id, 'insight_generation', 'Analyzed campaign performance across Meta, Google, TikTok platforms and generated optimization recommendations', 'all', 10, 0.0900, '2024-07', NOW() - INTERVAL '2 days'),

  ('cul-002-iiii-9999-000000000002', :workspace_id, 'draft_creation', 'AI generated 3 optimization drafts: budget increase for Summer Sale, bid adjustment for Cart Abandoners, geo expansion for TikTok', 'meta', 8, 0.0720, '2024-07', NOW() - INTERVAL '2 days'),

  ('cul-003-iiii-9999-000000000003', :workspace_id, 'rule_evaluation', 'Evaluated 3 automation rules against 8 active campaigns: 2 rules triggered, 2 drafts created, 1 campaign auto-paused', 'all', 15, 0.1350, '2024-07', NOW() - INTERVAL '5 days'),

  ('cul-004-iiii-9999-000000000004', :workspace_id, 'report_generation', 'Generated Weekly Performance Summary report with cross-platform metrics, goal progress, and creative fatigue analysis', 'all', 10, 0.0900, '2024-07', NOW() - INTERVAL '3 days'),

  ('cul-005-iiii-9999-000000000005', :workspace_id, 'morning_brief', 'Generated morning brief with executive summary, performance trends, 3 alerts, and 2 recommendations for Acme Marketing workspace', 'all', 8, 0.0720, '2024-07', NOW() - INTERVAL '1 day'),

  ('cul-006-iiii-9999-000000000006', :workspace_id, 'ab_test_analysis', 'Analyzed A/B test results for Meta carousel vs video creatives: video ad won with 15% higher CTR, 8% lower CPA', 'meta', 10, 0.0900, '2024-07', NOW() - INTERVAL '4 days');
