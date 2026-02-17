-- ============================================================
-- ProductGuard Marketing Engine Schema
-- Migration: 00027_marketing_engine.sql
--
-- 6 tables powering the outbound growth pipeline:
--   marketing_prospects      → discovered piracy victims
--   marketing_outreach       → one-per-company email lifecycle
--   marketing_social_actions → DMs, posts, tags
--   marketing_responses      → inbound replies
--   marketing_exclusions     → registered PG customers (never contact)
--   marketing_suppression    → opted-out non-customers (never contact)
-- ============================================================

-- ── ENUMS ───────────────────────────────────────────────────

CREATE TYPE prospect_status AS ENUM (
  'new',              -- just discovered
  'qualified',        -- passed 95% gate + exclusion check
  'pushed_to_ghl',    -- contact created in GHL
  'email_sent',       -- GHL triggered the email
  'engaged',          -- opened, clicked, DM'd, or replied
  'account_created',  -- signed up on alerts subdomain
  'converted',        -- paid subscriber
  'suppressed'        -- archived / opted out / expired
);

CREATE TYPE social_action_type AS ENUM (
  'dm_sent',
  'post_created',
  'post_reply'
);

CREATE TYPE social_platform AS ENUM (
  'twitter',
  'instagram',
  'facebook',
  'linkedin'
);

CREATE TYPE response_channel AS ENUM (
  'email',
  'twitter_dm',
  'instagram_dm',
  'facebook_dm',
  'post_comment'
);

CREATE TYPE exclusion_match_type AS ENUM (
  'product',
  'brand',
  'domain',
  'email'
);

CREATE TYPE suppression_reason AS ENUM (
  'unsubscribed',
  'bounced',
  'complained',
  'manual',
  'expired'
);

CREATE TYPE infringing_platform AS ENUM (
  'telegram',
  'cyberlocker',
  'torrent',
  'discord',
  'forum',
  'social_media',
  'google_indexed',
  'other'
);


-- ── TABLE: marketing_prospects ──────────────────────────────

CREATE TABLE marketing_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What was found
  product_name TEXT NOT NULL,
  product_url TEXT,
  product_price TEXT,
  infringing_url TEXT NOT NULL,
  infringing_platform infringing_platform NOT NULL,
  audience_size TEXT,
  confidence_score DECIMAL(5,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  screenshot_url TEXT,
  est_revenue_loss TEXT,

  -- Who owns it
  company_name TEXT NOT NULL,
  owner_name TEXT,
  owner_email TEXT,
  company_domain TEXT,
  social_twitter TEXT,
  social_instagram TEXT,
  social_facebook TEXT,
  social_linkedin TEXT,
  contact_source TEXT,  -- website_about | whois | social_bio | platform_profile

  -- Pipeline state
  status prospect_status NOT NULL DEFAULT 'new',
  ghl_contact_id TEXT,
  alert_page_url TEXT,  -- pre-built URL: alerts.productguard.com/r/{id}

  -- Timestamps
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  qualified_at TIMESTAMPTZ,
  pushed_to_ghl_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-generate alert_page_url on insert
CREATE OR REPLACE FUNCTION set_alert_page_url()
RETURNS TRIGGER AS $$
BEGIN
  NEW.alert_page_url := CONCAT(
    COALESCE(current_setting('app.alerts_base_url', true), 'https://alerts.productguard.com'),
    '/r/', NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_alert_page_url
  BEFORE INSERT ON marketing_prospects
  FOR EACH ROW
  EXECUTE FUNCTION set_alert_page_url();

-- Reuse existing update_updated_at_column() from 00001_initial_schema.sql
CREATE TRIGGER trg_prospects_updated_at
  BEFORE UPDATE ON marketing_prospects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ── TABLE: marketing_outreach ───────────────────────────────
-- One row per company, ever. Full lifecycle tracking.

CREATE TABLE marketing_outreach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES marketing_prospects(id) ON DELETE CASCADE,
  ghl_contact_id TEXT,
  email_sent_to TEXT NOT NULL,

  -- Email tracking (updated via GHL webhooks)
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,

  -- Alerts page tracking (updated via alerts subdomain events)
  page_visited_at TIMESTAMPTZ,
  signed_up_at TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id),  -- linked after signup
  dmca_sent_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  converted_plan TEXT,  -- starter | pro | business

  -- Outcome flags
  unsubscribed BOOLEAN NOT NULL DEFAULT FALSE,
  complained BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One email per company domain, enforced
  UNIQUE (email_sent_to)
);


-- ── TABLE: marketing_social_actions ─────────────────────────
-- Every social touchpoint. One prospect can have multiple rows.

CREATE TABLE marketing_social_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES marketing_prospects(id) ON DELETE CASCADE,
  action social_action_type NOT NULL,
  platform social_platform NOT NULL,
  content TEXT,             -- the message or post text
  post_url TEXT,            -- if public post, the URL
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  engagement TEXT,          -- read | replied | liked | ignored
  engagement_at TIMESTAMPTZ
);


-- ── TABLE: marketing_responses ──────────────────────────────
-- Inbound replies to emails, DMs, or post comments.

CREATE TABLE marketing_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES marketing_prospects(id) ON DELETE CASCADE,
  outreach_id UUID REFERENCES marketing_outreach(id) ON DELETE SET NULL,
  channel response_channel NOT NULL,
  from_contact TEXT,
  subject TEXT,
  body TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_by_admin BOOLEAN NOT NULL DEFAULT FALSE,
  admin_notes TEXT
);


-- ── TABLE: marketing_exclusions ─────────────────────────────
-- Registered ProductGuard customers. Checked BEFORE any prospect
-- enters the pipeline. Auto-populated when users register products.

CREATE TABLE marketing_exclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_type exclusion_match_type NOT NULL,
  match_value TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint for upsert support
  CONSTRAINT unique_exclusion UNIQUE (match_type, match_value)
);

-- Fast lookups during exclusion check
CREATE INDEX idx_exclusions_lookup
  ON marketing_exclusions (match_type, LOWER(match_value));


-- ── TABLE: marketing_suppression ────────────────────────────
-- Non-customers who should never be contacted.
-- Separate from exclusions (those are active customers).

CREATE TABLE marketing_suppression (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT,
  email TEXT,
  reason suppression_reason NOT NULL,
  source TEXT,  -- ghl_webhook | manual | auto_archive
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suppression_domain ON marketing_suppression (LOWER(domain));
CREATE INDEX idx_suppression_email ON marketing_suppression (LOWER(email));


-- ── INDEXES ─────────────────────────────────────────────────

CREATE INDEX idx_prospects_status ON marketing_prospects (status);
CREATE INDEX idx_prospects_confidence ON marketing_prospects (confidence_score DESC);
CREATE INDEX idx_prospects_domain ON marketing_prospects (LOWER(company_domain));
CREATE INDEX idx_outreach_prospect ON marketing_outreach (prospect_id);
CREATE INDEX idx_outreach_email ON marketing_outreach (LOWER(email_sent_to));
CREATE INDEX idx_social_prospect ON marketing_social_actions (prospect_id);
CREATE INDEX idx_responses_prospect ON marketing_responses (prospect_id);
CREATE INDEX idx_responses_unread ON marketing_responses (read_by_admin) WHERE read_by_admin = FALSE;


-- ── AUTO-POPULATE EXCLUSIONS ────────────────────────────────
-- When a user registers a product, auto-add exclusion entries
-- so the marketing engine never contacts them.

CREATE OR REPLACE FUNCTION auto_add_exclusions()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  user_domain TEXT;
BEGIN
  -- Get user email from auth.users
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.user_id;

  -- Add product name exclusion
  INSERT INTO marketing_exclusions (match_type, match_value, user_id)
  VALUES ('product', NEW.name, NEW.user_id)
  ON CONFLICT ON CONSTRAINT unique_exclusion DO NOTHING;

  -- Add domain exclusion from product URL
  IF NEW.url IS NOT NULL AND NEW.url != '' THEN
    user_domain := regexp_replace(NEW.url, '^https?://(www\.)?', '');
    user_domain := split_part(user_domain, '/', 1);
    INSERT INTO marketing_exclusions (match_type, match_value, user_id)
    VALUES ('domain', user_domain, NEW.user_id)
    ON CONFLICT ON CONSTRAINT unique_exclusion DO NOTHING;
  END IF;

  -- Add email exclusion
  IF user_email IS NOT NULL THEN
    INSERT INTO marketing_exclusions (match_type, match_value, user_id)
    VALUES ('email', user_email, NEW.user_id)
    ON CONFLICT ON CONSTRAINT unique_exclusion DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auto_add_exclusions
  AFTER INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_exclusions();


-- ── ROW LEVEL SECURITY ──────────────────────────────────────
-- Marketing tables are admin-only. No user-facing access.

ALTER TABLE marketing_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_outreach ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_social_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_exclusions ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_suppression ENABLE ROW LEVEL SECURITY;

-- Service role (used by API routes and cron jobs) gets full access
-- No policies needed — service role bypasses RLS by default

-- Users can read their own exclusion entries (optional, for transparency)
CREATE POLICY "Users can view own exclusions"
  ON marketing_exclusions FOR SELECT
  USING (user_id = auth.uid());
