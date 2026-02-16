-- ============================================================================
-- ENHANCED DMCA TAKEDOWN TRACKING & MONITORING
-- ============================================================================
-- This migration adds comprehensive case tracking and automated monitoring
-- for DMCA takedown requests to measure effectiveness

-- Add new columns to takedowns table (using IF NOT EXISTS to avoid errors)
DO $$
BEGIN
  -- Email tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'takedowns' AND column_name = 'recipient_email') THEN
    ALTER TABLE takedowns ADD COLUMN recipient_email TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'takedowns' AND column_name = 'cc_emails') THEN
    ALTER TABLE takedowns ADD COLUMN cc_emails TEXT[];
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'takedowns' AND column_name = 'infringing_url') THEN
    ALTER TABLE takedowns ADD COLUMN infringing_url TEXT;
  END IF;

  -- Timeline tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'takedowns' AND column_name = 'discovered_at') THEN
    ALTER TABLE takedowns ADD COLUMN discovered_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'takedowns' AND column_name = 'verified_at') THEN
    ALTER TABLE takedowns ADD COLUMN verified_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'takedowns' AND column_name = 'verified_by') THEN
    ALTER TABLE takedowns ADD COLUMN verified_by UUID REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'takedowns' AND column_name = 'submitted_at') THEN
    ALTER TABLE takedowns ADD COLUMN submitted_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- Monitoring and effectiveness tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'takedowns' AND column_name = 'last_checked_at') THEN
    ALTER TABLE takedowns ADD COLUMN last_checked_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'takedowns' AND column_name = 'next_check_at') THEN
    ALTER TABLE takedowns ADD COLUMN next_check_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'takedowns' AND column_name = 'url_status') THEN
    ALTER TABLE takedowns ADD COLUMN url_status TEXT DEFAULT 'pending_check';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'takedowns' AND column_name = 'check_count') THEN
    ALTER TABLE takedowns ADD COLUMN check_count INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'takedowns' AND column_name = 'effectiveness_notes') THEN
    ALTER TABLE takedowns ADD COLUMN effectiveness_notes TEXT;
  END IF;
END $$;

-- Create enum for URL status (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'url_check_status') THEN
    CREATE TYPE url_check_status AS ENUM (
      'pending_check',    -- Not yet checked
      'active',           -- URL still active (DMCA not effective yet)
      'removed',          -- URL removed or returns 404 (DMCA successful!)
      'redirected',       -- URL redirects elsewhere (partial success)
      'error',            -- Error checking URL
      'timeout'           -- Request timed out
    );
  END IF;
END $$;

-- Update url_status column to use enum (if not already using it)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'takedowns'
    AND column_name = 'url_status'
    AND data_type = 'text'
  ) THEN
    -- Step 1: Drop the default
    ALTER TABLE takedowns ALTER COLUMN url_status DROP DEFAULT;

    -- Step 2: Convert column type
    ALTER TABLE takedowns
      ALTER COLUMN url_status TYPE url_check_status
      USING url_status::url_check_status;

    -- Step 3: Re-add the default with enum type
    ALTER TABLE takedowns ALTER COLUMN url_status SET DEFAULT 'pending_check'::url_check_status;
  END IF;
END $$;

-- Add indexes for monitoring queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_takedowns_next_check ON takedowns(next_check_at)
  WHERE next_check_at IS NOT NULL AND url_status != 'removed';

CREATE INDEX IF NOT EXISTS idx_takedowns_url_status ON takedowns(url_status);
CREATE INDEX IF NOT EXISTS idx_takedowns_recipient_email ON takedowns(recipient_email);

-- Create view for takedown effectiveness
CREATE OR REPLACE VIEW takedown_effectiveness AS
SELECT
  t.id,
  t.user_id,
  t.infringement_id,
  t.infringing_url,
  t.recipient_email,
  t.submitted_at,
  t.url_status,
  t.check_count,
  t.last_checked_at,
  i.platform,
  i.severity_score,
  p.name as product_name,
  -- Calculate days since submission
  EXTRACT(DAY FROM NOW() - t.submitted_at) as days_since_submission,
  -- Determine effectiveness
  CASE
    WHEN t.url_status = 'removed' THEN 'successful'
    WHEN t.url_status = 'redirected' THEN 'partial'
    WHEN t.url_status = 'active' AND EXTRACT(DAY FROM NOW() - t.submitted_at) > 14 THEN 'needs_escalation'
    WHEN t.url_status = 'active' THEN 'pending'
    ELSE 'unknown'
  END as effectiveness_status
FROM takedowns t
LEFT JOIN infringements i ON t.infringement_id = i.id
LEFT JOIN products p ON i.product_id = p.id
WHERE t.submitted_at IS NOT NULL;

-- Create function to schedule next URL check (7 days from now)
CREATE OR REPLACE FUNCTION schedule_next_url_check()
RETURNS TRIGGER AS $$
BEGIN
  -- Only schedule if URL is not yet removed
  IF NEW.url_status != 'removed' THEN
    NEW.next_check_at := NOW() + INTERVAL '7 days';
  ELSE
    NEW.next_check_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-schedule next check (drop if exists first)
DROP TRIGGER IF EXISTS trigger_schedule_next_check ON takedowns;
CREATE TRIGGER trigger_schedule_next_check
  BEFORE INSERT OR UPDATE ON takedowns
  FOR EACH ROW
  EXECUTE FUNCTION schedule_next_url_check();

-- Add comment explaining the monitoring system
COMMENT ON COLUMN takedowns.next_check_at IS 'When to next check if the infringing URL is still active. Automatically set to 7 days from last check.';
COMMENT ON COLUMN takedowns.url_status IS 'Current status of the infringing URL. Updated by automated weekly checks.';
COMMENT ON VIEW takedown_effectiveness IS 'Analytics view showing DMCA effectiveness - which platforms respond best, how long takedowns take, which cases need escalation.';
