-- ============================================================================
-- USAGE COST EVENTS: Per-user cost attribution via known unit rates
-- ============================================================================
-- Instead of API calls to track costs, each billable operation logs an event
-- with a pre-defined unit cost. Dashboard aggregates these for per-customer
-- profitability analysis.
--
-- Event types: scan_serper, scan_ai_filter, scan_whois, email_send
-- ============================================================================

CREATE TABLE IF NOT EXISTS usage_cost_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  unit_cost NUMERIC(10,6) NOT NULL,
  units INTEGER NOT NULL DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast per-user cost lookups (most common query pattern)
CREATE INDEX idx_usage_cost_user ON usage_cost_events (user_id, created_at DESC);

-- Fast per-type aggregation
CREATE INDEX idx_usage_cost_type ON usage_cost_events (event_type, created_at DESC);

-- Composite for time-windowed per-user queries
CREATE INDEX idx_usage_cost_user_time ON usage_cost_events (user_id, event_type, created_at);

-- ============================================================================
-- VIEW: Per-customer 30-day cost summary
-- ============================================================================

CREATE OR REPLACE VIEW customer_cost_summary AS
SELECT
  user_id,
  SUM(unit_cost * units) AS total_cost_30d,
  SUM(unit_cost * units) FILTER (WHERE event_type LIKE 'scan_%') AS scan_cost_30d,
  SUM(unit_cost * units) FILTER (WHERE event_type = 'email_send') AS email_cost_30d,
  SUM(units) FILTER (WHERE event_type = 'scan_serper') AS serper_calls_30d,
  SUM(units) FILTER (WHERE event_type = 'scan_ai_filter') AS ai_filter_units_30d,
  SUM(units) FILTER (WHERE event_type = 'scan_whois') AS whois_calls_30d,
  SUM(units) FILTER (WHERE event_type = 'email_send') AS emails_sent_30d,
  COUNT(*) AS total_events_30d
FROM usage_cost_events
WHERE created_at >= now() - interval '30 days'
GROUP BY user_id;

-- ============================================================================
-- RLS: Admin-only read, service role insert
-- ============================================================================

ALTER TABLE usage_cost_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read usage_cost_events"
  ON usage_cost_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Users can read their own cost events
CREATE POLICY "Users read own usage_cost_events"
  ON usage_cost_events FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert (server-side instrumentation)
CREATE POLICY "Service insert usage_cost_events"
  ON usage_cost_events FOR INSERT
  WITH CHECK (true);

-- Grant view access
GRANT SELECT ON customer_cost_summary TO authenticated;
