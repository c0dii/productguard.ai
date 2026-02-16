-- ============================================================================
-- Admin Support
-- Adds admin flag and related functionality for admin dashboard
-- ============================================================================

-- Add is_admin flag to profiles
ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT false NOT NULL;

-- Create index for quick admin lookup
CREATE INDEX idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = true;

-- Grant yourself admin access (replace with your email)
-- UPDATE profiles SET is_admin = true WHERE email = 'your-email@example.com';

-- ============================================================================
-- Admin Views for Business Intelligence
-- ============================================================================

-- View: User statistics
CREATE OR REPLACE VIEW admin_user_stats AS
SELECT
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_users_30d,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as new_users_7d,
  COUNT(*) FILTER (WHERE plan_tier = 'free') as free_users,
  COUNT(*) FILTER (WHERE plan_tier = 'starter') as starter_users,
  COUNT(*) FILTER (WHERE plan_tier = 'pro') as pro_users,
  COUNT(*) FILTER (WHERE plan_tier = 'business') as business_users
FROM profiles;

-- View: Revenue statistics (based on plan pricing)
CREATE OR REPLACE VIEW admin_revenue_stats AS
SELECT
  -- Monthly Recurring Revenue
  (COUNT(*) FILTER (WHERE plan_tier = 'starter') * 29) +
  (COUNT(*) FILTER (WHERE plan_tier = 'pro') * 99) +
  (COUNT(*) FILTER (WHERE plan_tier = 'business') * 299) as mrr_usd,
  -- Annual Recurring Revenue
  ((COUNT(*) FILTER (WHERE plan_tier = 'starter') * 29) +
   (COUNT(*) FILTER (WHERE plan_tier = 'pro') * 99) +
   (COUNT(*) FILTER (WHERE plan_tier = 'business') * 299)) * 12 as arr_usd
FROM profiles
WHERE plan_tier != 'free';

-- View: Scan statistics
CREATE OR REPLACE VIEW admin_scan_stats AS
SELECT
  COUNT(*) as total_scans,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_scans,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_scans,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_scans,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as scans_30d,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as scans_7d,
  AVG(CASE WHEN status = 'completed' THEN results_count ELSE NULL END) as avg_infringements_per_scan
FROM scans;

-- View: Infringement statistics
CREATE OR REPLACE VIEW admin_infringement_stats AS
SELECT
  COUNT(*) as total_infringements,
  COUNT(*) FILTER (WHERE status = 'active') as active_infringements,
  COUNT(*) FILTER (WHERE status = 'removed') as removed_infringements,
  COUNT(*) FILTER (WHERE risk_level = 'critical') as critical_infringements,
  COUNT(*) FILTER (WHERE risk_level = 'high') as high_infringements,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as infringements_30d,
  SUM(estimated_revenue_loss) as total_estimated_loss
FROM infringements;

-- View: Takedown statistics
CREATE OR REPLACE VIEW admin_takedown_stats AS
SELECT
  COUNT(*) as total_takedowns,
  COUNT(*) FILTER (WHERE status = 'draft') as draft_takedowns,
  COUNT(*) FILTER (WHERE status = 'sent') as sent_takedowns,
  COUNT(*) FILTER (WHERE status = 'removed') as successful_takedowns,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as takedowns_30d,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as takedowns_7d
FROM takedowns;

-- View: Subscription statistics
CREATE OR REPLACE VIEW admin_subscription_stats AS
SELECT
  COUNT(*) as total_subscriptions,
  COUNT(*) FILTER (WHERE status = 'active') as active_subscriptions,
  COUNT(*) FILTER (WHERE status = 'canceled') as canceled_subscriptions,
  COUNT(*) FILTER (WHERE status = 'past_due') as past_due_subscriptions,
  AVG(CASE WHEN status = 'active' THEN
    EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400
  ELSE NULL END) as avg_subscription_age_days
FROM subscriptions;

-- ============================================================================
-- RLS Policies for Admin Views
-- ============================================================================

-- Only admins can access these views
GRANT SELECT ON admin_user_stats TO authenticated;
GRANT SELECT ON admin_revenue_stats TO authenticated;
GRANT SELECT ON admin_scan_stats TO authenticated;
GRANT SELECT ON admin_infringement_stats TO authenticated;
GRANT SELECT ON admin_takedown_stats TO authenticated;
GRANT SELECT ON admin_subscription_stats TO authenticated;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN profiles.is_admin IS 'Whether this user has admin access to the admin dashboard';
COMMENT ON VIEW admin_user_stats IS 'Aggregated user statistics for admin dashboard';
COMMENT ON VIEW admin_revenue_stats IS 'Revenue metrics (MRR, ARR) based on plan pricing';
COMMENT ON VIEW admin_scan_stats IS 'Scan activity and success metrics';
COMMENT ON VIEW admin_infringement_stats IS 'Infringement detection and resolution metrics';
COMMENT ON VIEW admin_takedown_stats IS 'DMCA takedown activity metrics';
COMMENT ON VIEW admin_subscription_stats IS 'Subscription health metrics';
