-- ============================================================================
-- Fix admin view column mismatches
--
-- Issues found by Metrics Inspector audit:
-- 1. admin_scan_stats: references `results_count` but scans table uses `infringement_count`
-- 2. admin_infringement_stats: references `estimated_revenue_loss` but column is `est_revenue_loss`
-- 3. admin_user_stats: filters `plan_tier = 'free'` but free tier is named 'scout'
-- 4. admin_revenue_stats: WHERE clause filters `plan_tier != 'free'` (should be 'scout')
-- ============================================================================

-- Fix 1: admin_scan_stats — results_count → infringement_count
CREATE OR REPLACE VIEW admin_scan_stats AS
SELECT
  COUNT(*) as total_scans,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_scans,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_scans,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_scans,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as scans_30d,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as scans_7d,
  AVG(CASE WHEN status = 'completed' THEN infringement_count ELSE NULL END) as avg_infringements_per_scan
FROM scans;

-- Fix 2: admin_infringement_stats — estimated_revenue_loss → est_revenue_loss
CREATE OR REPLACE VIEW admin_infringement_stats AS
SELECT
  COUNT(*) as total_infringements,
  COUNT(*) FILTER (WHERE status = 'active') as active_infringements,
  COUNT(*) FILTER (WHERE status = 'removed') as removed_infringements,
  COUNT(*) FILTER (WHERE risk_level = 'critical') as critical_infringements,
  COUNT(*) FILTER (WHERE risk_level = 'high') as high_infringements,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as infringements_30d,
  COALESCE(SUM(est_revenue_loss), 0) as total_estimated_loss
FROM infringements;

-- Fix 3: admin_user_stats — 'free' → 'scout'
CREATE OR REPLACE VIEW admin_user_stats AS
SELECT
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_users_30d,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as new_users_7d,
  COUNT(*) FILTER (WHERE plan_tier = 'scout') as free_users,
  COUNT(*) FILTER (WHERE plan_tier = 'starter') as starter_users,
  COUNT(*) FILTER (WHERE plan_tier = 'pro') as pro_users,
  COUNT(*) FILTER (WHERE plan_tier = 'business') as business_users
FROM profiles;

-- Fix 4: admin_revenue_stats — 'free' → 'scout'
CREATE OR REPLACE VIEW admin_revenue_stats AS
SELECT
  (COUNT(*) FILTER (WHERE plan_tier = 'starter') * 29) +
  (COUNT(*) FILTER (WHERE plan_tier = 'pro') * 99) +
  (COUNT(*) FILTER (WHERE plan_tier = 'business') * 299) as mrr_usd,
  ((COUNT(*) FILTER (WHERE plan_tier = 'starter') * 29) +
   (COUNT(*) FILTER (WHERE plan_tier = 'pro') * 99) +
   (COUNT(*) FILTER (WHERE plan_tier = 'business') * 299)) * 12 as arr_usd
FROM profiles
WHERE plan_tier != 'scout';
