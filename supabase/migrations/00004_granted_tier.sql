-- ============================================================================
-- Granted Tier System
-- Allows admins to manually grant higher tier access without payment
-- Useful for comped accounts, partners, beta testers, support cases
-- ============================================================================

-- Add granted_tier column (overrides plan_tier when set)
ALTER TABLE profiles ADD COLUMN granted_tier plan_tier;

-- Add granted_by column to track which admin granted access
ALTER TABLE profiles ADD COLUMN granted_by UUID REFERENCES profiles(id);

-- Add granted_at timestamp
ALTER TABLE profiles ADD COLUMN granted_at TIMESTAMPTZ;

-- Add granted_reason for documentation
ALTER TABLE profiles ADD COLUMN granted_reason TEXT;

-- Create index for quick lookup of granted accounts
CREATE INDEX idx_profiles_granted_tier ON profiles(granted_tier) WHERE granted_tier IS NOT NULL;

-- ============================================================================
-- Helper Function: Get Effective Tier
-- Returns granted_tier if set, otherwise plan_tier
-- ============================================================================

CREATE OR REPLACE FUNCTION get_effective_tier(user_id UUID)
RETURNS plan_tier
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(granted_tier, plan_tier)
  FROM profiles
  WHERE id = user_id;
$$;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN profiles.granted_tier IS 'Manually granted tier that overrides plan_tier (for comped accounts, partners, etc.)';
COMMENT ON COLUMN profiles.granted_by IS 'Admin user who granted the tier';
COMMENT ON COLUMN profiles.granted_at IS 'When the tier was granted';
COMMENT ON COLUMN profiles.granted_reason IS 'Reason for granting access (partner, beta, support, etc.)';
COMMENT ON FUNCTION get_effective_tier IS 'Returns the effective tier for a user (granted_tier if set, otherwise plan_tier)';
