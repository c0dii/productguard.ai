-- Add fields to subscriptions table for retention flow

-- Track cancel scheduling
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancel_reason_detail TEXT;

-- Track pause state
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS resume_at TIMESTAMPTZ;

-- Track retention offer usage (prevent re-use)
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS retention_offer_used BOOLEAN DEFAULT FALSE;
