-- ============================================================================
-- Migration 00020: Profile DMCA Fields + Communications Table
-- ============================================================================
-- Adds DMCA-required contact fields to profiles (phone, address, reply email)
-- Creates communications table for logging outbound DMCA correspondence
-- ============================================================================

-- ── Profile columns ─────────────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS dmca_reply_email TEXT,
  ADD COLUMN IF NOT EXISTS is_copyright_owner BOOLEAN DEFAULT true;

-- ── Communications table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  infringement_id UUID REFERENCES infringements(id) ON DELETE SET NULL,
  takedown_id UUID REFERENCES takedowns(id) ON DELETE SET NULL,
  direction TEXT NOT NULL DEFAULT 'outbound',   -- 'outbound' | 'inbound'
  channel TEXT NOT NULL DEFAULT 'email',        -- 'email' | 'web_form' | 'manual'
  from_email TEXT,
  to_email TEXT,
  reply_to_email TEXT,
  subject TEXT,
  body_preview TEXT,              -- first ~500 chars for display
  status TEXT NOT NULL DEFAULT 'pending',  -- pending/sent/delivered/bounced/failed/replied
  external_message_id TEXT,       -- Resend message ID
  provider_name TEXT,             -- "Cloudflare", "GoDaddy", etc.
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_communications_user_id ON communications(user_id);
CREATE INDEX IF NOT EXISTS idx_communications_infringement_id ON communications(infringement_id);
CREATE INDEX IF NOT EXISTS idx_communications_status ON communications(status);
CREATE INDEX IF NOT EXISTS idx_communications_created_at ON communications(created_at DESC);

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own communications"
  ON communications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own communications"
  ON communications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own communications"
  ON communications FOR UPDATE
  USING (auth.uid() = user_id);
