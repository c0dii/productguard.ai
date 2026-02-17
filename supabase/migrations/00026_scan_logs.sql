-- ============================================================================
-- Scan Logs: Persistent logging for scan engine visibility and debugging
-- ============================================================================

CREATE TABLE scan_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  log_level TEXT NOT NULL DEFAULT 'info',       -- info, warn, error, fatal
  stage TEXT NOT NULL,                           -- initialization, keyword_search, trademark_search, marketplace_scan, platform_scan, phrase_matching, finalization, notification, cleanup
  message TEXT NOT NULL,

  error_code TEXT,                               -- TIMEOUT, API_LIMIT, SERP_ERROR, SERP_429, AI_FILTER_FAIL, DB_INSERT_FAIL, DB_BATCH_FAIL, TELEGRAM_FAIL, EVIDENCE_FAIL, GHL_FAIL, EMAIL_FAIL, UNKNOWN
  error_details JSONB,                           -- { stack, response_status, original_error }
  scan_params JSONB,                             -- full config snapshot (only on error/fatal)
  metrics JSONB,                                 -- { elapsed_ms, api_calls_used, api_calls_remaining, results_count, ... }

  self_healed BOOLEAN NOT NULL DEFAULT false,
  heal_action TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for admin queries
CREATE INDEX idx_scan_logs_scan_id ON scan_logs(scan_id);
CREATE INDEX idx_scan_logs_created_at ON scan_logs(created_at DESC);
CREATE INDEX idx_scan_logs_level_errors ON scan_logs(log_level) WHERE log_level IN ('error', 'fatal');
CREATE INDEX idx_scan_logs_self_healed ON scan_logs(self_healed) WHERE self_healed = true;

-- RLS: admin-only read (scan engine uses createAdminClient which bypasses RLS for inserts)
ALTER TABLE scan_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all scan logs"
ON scan_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
);

CREATE POLICY "Service role can insert scan logs"
ON scan_logs FOR INSERT WITH CHECK (true);
