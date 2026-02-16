-- ============================================================================
-- DMCA Submission Logs Table
-- Tracks all DMCA submissions for legal compliance and liability protection
-- ============================================================================

CREATE TABLE dmca_submission_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  takedown_id UUID NOT NULL REFERENCES takedowns(id) ON DELETE CASCADE,

  -- Legal acknowledgment
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  disclaimer_version TEXT NOT NULL DEFAULT 'v1.0',

  -- User information at time of submission
  ip_address TEXT,
  user_agent TEXT,
  location_country TEXT,
  location_region TEXT,
  location_city TEXT,

  -- Submission details
  recipient_email TEXT NOT NULL,
  submission_method TEXT NOT NULL, -- 'email', 'manual_copy', 'marked_sent'

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for querying logs by user
CREATE INDEX idx_dmca_logs_user_id ON dmca_submission_logs(user_id);

-- Index for querying logs by takedown
CREATE INDEX idx_dmca_logs_takedown_id ON dmca_submission_logs(takedown_id);

-- Index for querying by date
CREATE INDEX idx_dmca_logs_created_at ON dmca_submission_logs(created_at);

-- RLS policies
ALTER TABLE dmca_submission_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own submission logs
CREATE POLICY "Users can view own submission logs" ON dmca_submission_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Only the system can insert logs (via service role)
-- Users cannot insert directly
CREATE POLICY "System can insert logs" ON dmca_submission_logs
  FOR INSERT WITH CHECK (false);

-- Grant access
GRANT SELECT ON dmca_submission_logs TO authenticated;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE dmca_submission_logs IS 'Logs all DMCA takedown submissions for legal compliance and liability protection';
COMMENT ON COLUMN dmca_submission_logs.disclaimer_version IS 'Version of legal disclaimer that user acknowledged';
COMMENT ON COLUMN dmca_submission_logs.ip_address IS 'IP address of user at time of submission';
COMMENT ON COLUMN dmca_submission_logs.location_country IS 'Country derived from IP address';
COMMENT ON COLUMN dmca_submission_logs.submission_method IS 'How the DMCA was sent: email, manual_copy, or marked_sent';
