-- ============================================================================
-- COST SNAPSHOTS: Time-based cost aggregation (replaces per-call tracking)
-- ============================================================================
-- Instead of logging cost_usd on every API call, a cron job aggregates
-- token usage from system_logs every 8 hours and writes a single snapshot.
-- This dramatically reduces DB writes and scales better.
-- ============================================================================

CREATE TABLE IF NOT EXISTS cost_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  provider TEXT NOT NULL DEFAULT 'openai',
  model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  total_input_tokens BIGINT NOT NULL DEFAULT 0,
  total_output_tokens BIGINT NOT NULL DEFAULT 0,
  total_cost_usd DECIMAL(10, 4) NOT NULL DEFAULT 0,
  call_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for dashboard queries: get recent snapshots by time
CREATE INDEX idx_cost_snapshots_period ON cost_snapshots (period_end DESC);

-- Index for preventing duplicate periods
CREATE UNIQUE INDEX idx_cost_snapshots_unique_period ON cost_snapshots (provider, model, period_start, period_end);

-- Helper view: 24h cost summary for admin dashboard
CREATE OR REPLACE VIEW cost_summary_24h AS
SELECT
  provider,
  SUM(total_input_tokens) AS total_input_tokens,
  SUM(total_output_tokens) AS total_output_tokens,
  SUM(total_cost_usd) AS total_cost_usd,
  SUM(call_count) AS total_calls
FROM cost_snapshots
WHERE period_end >= now() - interval '24 hours'
GROUP BY provider;

-- RLS: Admin-only read
ALTER TABLE cost_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read cost_snapshots"
  ON cost_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Service role can insert (cron job)
CREATE POLICY "Service insert cost_snapshots"
  ON cost_snapshots FOR INSERT
  WITH CHECK (true);
