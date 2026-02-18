-- ============================================================================
-- Migration 00031: System Monitoring & Diagnostics
--
-- Creates the system_logs and admin_alerts tables for enterprise-grade
-- monitoring across all services (scans, API calls, cron, webhooks, email).
-- Uses a polymorphic log_source pattern with JSONB context for extensibility.
-- ============================================================================

-- ============================================================================
-- TABLE: system_logs
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Classification
  log_source TEXT NOT NULL,          -- 'api_call', 'scrape', 'cron', 'webhook', 'email', 'dmca', 'user_action', 'system', 'scan'
  log_level TEXT NOT NULL,           -- 'debug', 'info', 'warn', 'error', 'fatal'
  operation TEXT NOT NULL,           -- e.g., 'openai.chat', 'cron.daily-workflows', 'webhook.stripe.invoice.paid'
  status TEXT NOT NULL,              -- 'success', 'failure', 'partial', 'timeout', 'skipped'
  message TEXT NOT NULL,             -- Human-readable description

  -- Timing
  duration_ms INTEGER,               -- Operation duration in milliseconds
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Correlation
  trace_id TEXT,                     -- Groups related logs (e.g., scan ID, cron run ID)
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,

  -- Flexible context (tokens, cost, model, status_code, request/response data, etc.)
  context JSONB DEFAULT '{}'::jsonb,

  -- Error details
  error_code TEXT,
  error_message TEXT,
  error_stack TEXT,

  -- Resolution workflow (for error/fatal entries)
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolution_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add check constraints for valid enum values
ALTER TABLE system_logs ADD CONSTRAINT system_logs_log_source_check
  CHECK (log_source IN ('api_call', 'scrape', 'cron', 'webhook', 'email', 'dmca', 'user_action', 'system', 'scan'));

ALTER TABLE system_logs ADD CONSTRAINT system_logs_log_level_check
  CHECK (log_level IN ('debug', 'info', 'warn', 'error', 'fatal'));

ALTER TABLE system_logs ADD CONSTRAINT system_logs_status_check
  CHECK (status IN ('success', 'failure', 'partial', 'timeout', 'skipped'));

-- Performance indexes
CREATE INDEX idx_system_logs_source ON system_logs (log_source);
CREATE INDEX idx_system_logs_created_at ON system_logs (created_at DESC);
CREATE INDEX idx_system_logs_errors ON system_logs (log_level) WHERE log_level IN ('error', 'fatal');
CREATE INDEX idx_system_logs_failures ON system_logs (status) WHERE status IN ('failure', 'timeout');
CREATE INDEX idx_system_logs_trace_id ON system_logs (trace_id) WHERE trace_id IS NOT NULL;
CREATE INDEX idx_system_logs_operation ON system_logs (operation);
CREATE INDEX idx_system_logs_source_status ON system_logs (log_source, status, created_at DESC);
CREATE INDEX idx_system_logs_unresolved ON system_logs (resolved_at)
  WHERE log_level IN ('error', 'fatal') AND resolved_at IS NULL;

-- RLS: admin-only SELECT/UPDATE, service role INSERT
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view system logs"
  ON system_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update system logs (resolve errors)"
  ON system_logs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Service role can insert system logs"
  ON system_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================================
-- TABLE: admin_alerts
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Classification
  severity TEXT NOT NULL,            -- 'info', 'warning', 'critical'
  category TEXT NOT NULL,            -- 'scan_failure', 'api_error', 'cron_failure', 'webhook_failure', 'rate_limit', 'system'

  -- Content
  title TEXT NOT NULL,               -- Short alert title
  message TEXT NOT NULL,             -- Detail message

  -- Links
  log_id UUID REFERENCES system_logs(id) ON DELETE SET NULL,
  trace_id TEXT,                     -- Correlation ID
  context JSONB DEFAULT '{}'::jsonb, -- Quick-display data

  -- Acknowledgement workflow
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Resolution workflow
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolution_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add check constraints
ALTER TABLE admin_alerts ADD CONSTRAINT admin_alerts_severity_check
  CHECK (severity IN ('info', 'warning', 'critical'));

ALTER TABLE admin_alerts ADD CONSTRAINT admin_alerts_category_check
  CHECK (category IN ('scan_failure', 'api_error', 'cron_failure', 'webhook_failure', 'rate_limit', 'system'));

-- Performance indexes
CREATE INDEX idx_admin_alerts_severity ON admin_alerts (severity);
CREATE INDEX idx_admin_alerts_created_at ON admin_alerts (created_at DESC);
CREATE INDEX idx_admin_alerts_unresolved ON admin_alerts (resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX idx_admin_alerts_category ON admin_alerts (category);

-- RLS: admin-only SELECT/UPDATE, service role INSERT
ALTER TABLE admin_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view alerts"
  ON admin_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update alerts (acknowledge/resolve)"
  ON admin_alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Service role can insert alerts"
  ON admin_alerts FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================================
-- VIEW: admin_system_health (24h aggregated stats)
-- ============================================================================

CREATE OR REPLACE VIEW admin_system_health AS
WITH time_window AS (
  SELECT now() - interval '24 hours' AS since
),
log_stats AS (
  SELECT
    log_source,
    COUNT(*) AS total_count,
    COUNT(*) FILTER (WHERE status = 'success') AS success_count,
    COUNT(*) FILTER (WHERE status = 'failure') AS failure_count,
    COUNT(*) FILTER (WHERE status = 'timeout') AS timeout_count,
    COUNT(*) FILTER (WHERE log_level = 'error') AS error_count,
    COUNT(*) FILTER (WHERE log_level = 'fatal') AS fatal_count,
    AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL) AS avg_duration_ms,
    SUM((context->>'cost_usd')::numeric) FILTER (WHERE context->>'cost_usd' IS NOT NULL) AS total_cost_usd
  FROM system_logs, time_window
  WHERE created_at >= time_window.since
  GROUP BY log_source
),
unresolved AS (
  SELECT COUNT(*) AS unresolved_error_count
  FROM system_logs
  WHERE log_level IN ('error', 'fatal') AND resolved_at IS NULL
),
unresolved_alerts AS (
  SELECT COUNT(*) AS unresolved_alert_count
  FROM admin_alerts
  WHERE resolved_at IS NULL
)
SELECT
  ls.*,
  u.unresolved_error_count,
  ua.unresolved_alert_count
FROM log_stats ls
CROSS JOIN unresolved u
CROSS JOIN unresolved_alerts ua;

-- ============================================================================
-- VIEW: admin_alert_counts (for sidebar badge)
-- ============================================================================

CREATE OR REPLACE VIEW admin_alert_counts AS
SELECT
  COUNT(*) FILTER (WHERE severity = 'critical' AND resolved_at IS NULL) AS critical_count,
  COUNT(*) FILTER (WHERE severity = 'warning' AND resolved_at IS NULL) AS warning_count,
  COUNT(*) FILTER (WHERE severity = 'info' AND resolved_at IS NULL) AS info_count,
  COUNT(*) FILTER (WHERE resolved_at IS NULL) AS total_unresolved
FROM admin_alerts;

-- ============================================================================
-- FUNCTION: cleanup_old_system_logs (data retention)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_system_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete info/debug logs older than 90 days
  DELETE FROM system_logs
  WHERE log_level IN ('debug', 'info')
    AND created_at < now() - interval '90 days';

  -- Delete warn logs older than 90 days
  DELETE FROM system_logs
  WHERE log_level = 'warn'
    AND created_at < now() - interval '90 days';

  -- Delete resolved error/fatal logs older than 180 days
  DELETE FROM system_logs
  WHERE log_level IN ('error', 'fatal')
    AND resolved_at IS NOT NULL
    AND created_at < now() - interval '180 days';

  -- Delete resolved alerts older than 30 days
  DELETE FROM admin_alerts
  WHERE resolved_at IS NOT NULL
    AND created_at < now() - interval '30 days';

  -- Delete acknowledged (but unresolved) alerts older than 90 days
  DELETE FROM admin_alerts
  WHERE acknowledged_at IS NOT NULL
    AND resolved_at IS NULL
    AND created_at < now() - interval '90 days';
END;
$$;
