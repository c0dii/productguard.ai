-- ============================================================================
-- Phase 1: Core Enforcement System
-- Adds evidence collection, enforcement actions, and priority scoring
-- ============================================================================

-- ============================================================================
-- 1. ENHANCE INFRINGEMENTS TABLE
-- Add evidence packet, infrastructure profile, and priority fields
-- ============================================================================

-- Add user_id for RLS (if not already exists)
ALTER TABLE infringements
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Add priority and severity scoring
ALTER TABLE infringements
ADD COLUMN IF NOT EXISTS severity_score INTEGER DEFAULT 0 CHECK (severity_score >= 0 AND severity_score <= 100),
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'P2' CHECK (priority IN ('P0', 'P1', 'P2'));

-- Add match quality fields
ALTER TABLE infringements
ADD COLUMN IF NOT EXISTS match_type TEXT DEFAULT 'keyword' CHECK (match_type IN ('exact_hash', 'near_hash', 'keyword', 'phrase', 'partial', 'manual')),
ADD COLUMN IF NOT EXISTS match_confidence NUMERIC(3,2) DEFAULT 0.00 CHECK (match_confidence >= 0 AND match_confidence <= 1),
ADD COLUMN IF NOT EXISTS match_evidence TEXT[] DEFAULT '{}';

-- Add audience/impact fields
ALTER TABLE infringements
ADD COLUMN IF NOT EXISTS audience_size TEXT,
ADD COLUMN IF NOT EXISTS audience_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS monetization_detected BOOLEAN DEFAULT false;

-- Add evidence packet (JSONB for screenshots, excerpts, URL chain, etc.)
ALTER TABLE infringements
ADD COLUMN IF NOT EXISTS evidence JSONB DEFAULT '{
  "screenshots": [],
  "matched_excerpts": [],
  "hash_matches": [],
  "url_chain": [],
  "detection_metadata": {}
}'::jsonb;

-- Add infrastructure profile (WHOIS, hosting, CDN data for smart routing)
ALTER TABLE infringements
ADD COLUMN IF NOT EXISTS infrastructure JSONB DEFAULT '{
  "hosting_provider": null,
  "registrar": null,
  "cdn": null,
  "nameservers": [],
  "abuse_contact": null
}'::jsonb;

-- Add status transition tracking
ALTER TABLE infringements
ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS previous_status TEXT,
ADD COLUMN IF NOT EXISTS next_check_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create indexes for priority-based queries
CREATE INDEX IF NOT EXISTS idx_infringements_user ON infringements(user_id);
CREATE INDEX IF NOT EXISTS idx_infringements_priority ON infringements(priority);
CREATE INDEX IF NOT EXISTS idx_infringements_severity ON infringements(severity_score DESC);
CREATE INDEX IF NOT EXISTS idx_infringements_next_check ON infringements(next_check_at) WHERE next_check_at IS NOT NULL;

-- ============================================================================
-- 2. ENFORCEMENT ACTIONS TABLE
-- Tracks DMCA notices, takedown requests, escalations
-- Replaces the old single-action "takedowns" pattern
-- ============================================================================

CREATE TABLE IF NOT EXISTS enforcement_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  infringement_id UUID NOT NULL REFERENCES infringements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Action type & escalation step
  action_type TEXT NOT NULL CHECK (action_type IN (
    'dmca_platform',      -- DMCA to the platform hosting content
    'dmca_host',          -- DMCA to hosting provider
    'dmca_cdn',           -- Notice to CDN (Cloudflare, etc.)
    'google_deindex',     -- Google Search removal request
    'bing_deindex',       -- Bing Search removal request
    'cease_desist',       -- Cease & desist letter
    'payment_complaint',  -- Report to payment processor (Pro+ only)
    'marketplace_report', -- Report to marketplace (Etsy, Gumroad, etc.)
    'manual_other'        -- Creator-initiated custom action
  )),
  escalation_step INTEGER DEFAULT 1,  -- 1 = first attempt, 2+ = escalation

  -- Target entity & contact
  target_entity TEXT,       -- "Cloudflare", "Namecheap", "Google", etc.
  target_contact TEXT,      -- abuse email or form URL

  -- Notice content
  notice_content TEXT,      -- the actual notice/letter text
  notice_tone TEXT DEFAULT 'firm' CHECK (notice_tone IN ('friendly', 'firm', 'nuclear')),

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',           -- Created but not sent yet
    'sent',            -- Notice has been sent
    'acknowledged',    -- Recipient acknowledged receipt
    'action_taken',    -- Recipient took action (investigating, removing, etc.)
    'removed',         -- Content successfully removed
    'refused',         -- Recipient refused to take action
    'no_response',     -- Deadline passed with no response
    'failed'           -- Sending failed (bad email, etc.)
  )),

  -- Timestamps
  sent_at TIMESTAMPTZ,
  response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  deadline_at TIMESTAMPTZ,  -- when to escalate if no response

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_enforcement_infringement ON enforcement_actions(infringement_id);
CREATE INDEX idx_enforcement_user ON enforcement_actions(user_id);
CREATE INDEX idx_enforcement_status ON enforcement_actions(status);
CREATE INDEX idx_enforcement_deadline ON enforcement_actions(deadline_at) WHERE status = 'sent';

-- RLS
ALTER TABLE enforcement_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own enforcement actions" ON enforcement_actions
  FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================================
-- 3. STATUS TRANSITIONS LOG (optional audit trail)
-- Tracks state changes on infringements for debugging/analytics
-- ============================================================================

CREATE TABLE IF NOT EXISTS status_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  infringement_id UUID NOT NULL REFERENCES infringements(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  reason TEXT,
  triggered_by TEXT CHECK (triggered_by IN ('system', 'user', 'cron', 'webhook')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_transitions_infringement ON status_transitions(infringement_id);
CREATE INDEX idx_transitions_created ON status_transitions(created_at DESC);

-- RLS
ALTER TABLE status_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see transitions for own infringements" ON status_transitions
  FOR ALL
  USING (
    infringement_id IN (SELECT id FROM infringements WHERE user_id = auth.uid())
  );

-- ============================================================================
-- 4. AUTO-LOG STATUS TRANSITIONS (trigger)
-- Automatically creates audit log entry when infringement status changes
-- ============================================================================

CREATE OR REPLACE FUNCTION log_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO status_transitions (infringement_id, from_status, to_status, triggered_by)
    VALUES (NEW.id, OLD.status, NEW.status, 'system');

    NEW.status_changed_at := now();
    NEW.previous_status := OLD.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_infringement_status
  AFTER UPDATE OF status ON infringements
  FOR EACH ROW
  EXECUTE FUNCTION log_status_transition();

-- ============================================================================
-- 5. AUTO-UPDATE TIMESTAMP TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_infringements_updated_at
  BEFORE UPDATE ON infringements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enforcement_actions_updated_at
  BEFORE UPDATE ON enforcement_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. COMMENTS (documentation)
-- ============================================================================

COMMENT ON COLUMN infringements.evidence IS 'JSONB evidence packet: screenshots, excerpts, URL chains, detection metadata';
COMMENT ON COLUMN infringements.infrastructure IS 'JSONB infrastructure profile: hosting provider, registrar, CDN, abuse contacts';
COMMENT ON COLUMN infringements.severity_score IS 'Severity score 0-100 based on monetization, audience, visibility';
COMMENT ON COLUMN infringements.priority IS 'P0 (urgent), P1 (standard), P2 (watchlist)';
COMMENT ON COLUMN infringements.match_confidence IS 'Match confidence 0.00-1.00 from scoring algorithm';

COMMENT ON TABLE enforcement_actions IS 'Multi-step enforcement tracking (DMCA → escalation chain)';
COMMENT ON COLUMN enforcement_actions.escalation_step IS 'Escalation step number (1 = first attempt, 2+ = escalations)';
COMMENT ON COLUMN enforcement_actions.deadline_at IS 'Deadline for response before auto-escalating';

COMMENT ON TABLE status_transitions IS 'Audit trail of infringement status changes';
