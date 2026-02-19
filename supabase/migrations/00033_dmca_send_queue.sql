-- ============================================================================
-- Migration 00033: DMCA Send Queue for Bulk Takedown Processing
-- ============================================================================

-- Main queue table
CREATE TABLE IF NOT EXISTS dmca_send_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL,

  -- What to send
  infringement_id UUID NOT NULL REFERENCES infringements(id) ON DELETE CASCADE,

  -- Where to send
  recipient_email TEXT,
  recipient_name TEXT,
  provider_name TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('platform', 'hosting', 'registrar', 'search_engine')),
  delivery_method TEXT NOT NULL DEFAULT 'email' CHECK (delivery_method IN ('email', 'web_form', 'manual')),
  form_url TEXT,

  -- Notice content (pre-generated)
  notice_subject TEXT NOT NULL,
  notice_body TEXT NOT NULL,
  cc_emails TEXT[],

  -- Processing state
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'web_form', 'failed', 'skipped')),
  priority INTEGER NOT NULL DEFAULT 0,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,

  -- Results
  takedown_id UUID REFERENCES takedowns(id),
  resend_message_id TEXT,
  error_message TEXT,

  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
  processing_started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────────────────

-- Queue processing: find pending items ready to send
CREATE INDEX IF NOT EXISTS idx_dmca_queue_pending
  ON dmca_send_queue(user_id, scheduled_for)
  WHERE status = 'pending';

-- Batch lookup
CREATE INDEX IF NOT EXISTS idx_dmca_queue_batch
  ON dmca_send_queue(batch_id);

-- User status overview
CREATE INDEX IF NOT EXISTS idx_dmca_queue_user_status
  ON dmca_send_queue(user_id, status);

-- Infringement lookup (prevent duplicates)
CREATE INDEX IF NOT EXISTS idx_dmca_queue_infringement
  ON dmca_send_queue(infringement_id);

-- ── RLS ──────────────────────────────────────────────────────────────────

ALTER TABLE dmca_send_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own queue items"
  ON dmca_send_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own queue items"
  ON dmca_send_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own queue items"
  ON dmca_send_queue FOR UPDATE
  USING (auth.uid() = user_id);

-- ── Batch Summary View ───────────────────────────────────────────────────

CREATE OR REPLACE VIEW dmca_batch_summary AS
SELECT
  batch_id,
  user_id,
  COUNT(*)::int AS total_items,
  COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
  COUNT(*) FILTER (WHERE status = 'processing')::int AS processing_count,
  COUNT(*) FILTER (WHERE status = 'sent')::int AS sent_count,
  COUNT(*) FILTER (WHERE status = 'web_form')::int AS web_form_count,
  COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_count,
  COUNT(*) FILTER (WHERE status = 'skipped')::int AS skipped_count,
  MIN(created_at) AS batch_created_at,
  MAX(completed_at) AS last_completed_at,
  MIN(scheduled_for) FILTER (WHERE status = 'pending') AS next_scheduled
FROM dmca_send_queue
GROUP BY batch_id, user_id;

-- ── Updated_at Trigger ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_dmca_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_dmca_queue_updated_at ON dmca_send_queue;
CREATE TRIGGER trigger_dmca_queue_updated_at
  BEFORE UPDATE ON dmca_send_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_dmca_queue_updated_at();
