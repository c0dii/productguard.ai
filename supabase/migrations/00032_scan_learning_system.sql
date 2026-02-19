-- ============================================================================
-- 00032: Scan Learning System
--
-- Adds query_category tracking to infringements so user verification
-- (confirm/reject) feeds back into per-category precision metrics.
-- Also scaffolds Bayesian weight tables (inactive) and health metrics.
-- ============================================================================

-- ============================================================================
-- STEP 1: Add query_category and query_tier to infringements
-- ============================================================================

ALTER TABLE infringements ADD COLUMN IF NOT EXISTS query_category TEXT;
ALTER TABLE infringements ADD COLUMN IF NOT EXISTS query_tier INTEGER;

-- Indexes for category-based analytics
CREATE INDEX IF NOT EXISTS idx_infringements_query_category
  ON infringements(query_category) WHERE query_category IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_infringements_query_tier
  ON infringements(query_tier) WHERE query_tier IS NOT NULL;

-- Composite index for the precision dashboard query
CREATE INDEX IF NOT EXISTS idx_infringements_category_status
  ON infringements(query_category, status)
  WHERE query_category IS NOT NULL;

-- ============================================================================
-- STEP 2: Admin view for category precision stats
-- Queried by the admin scan-learning dashboard page.
-- Uses service-role client (bypasses RLS).
-- ============================================================================

CREATE OR REPLACE VIEW admin_category_precision AS
SELECT
  i.query_category,
  i.query_tier,
  p.type AS product_type,
  COUNT(*) AS total_results,
  COUNT(*) FILTER (WHERE i.status = 'active') AS verified_count,
  COUNT(*) FILTER (WHERE i.status = 'false_positive') AS rejected_count,
  COUNT(*) FILTER (WHERE i.status = 'pending_verification') AS pending_count,
  CASE
    WHEN COUNT(*) FILTER (WHERE i.status IN ('active', 'false_positive')) > 0
    THEN ROUND(
      COUNT(*) FILTER (WHERE i.status = 'active')::NUMERIC /
      COUNT(*) FILTER (WHERE i.status IN ('active', 'false_positive')) * 100, 1
    )
    ELSE NULL
  END AS precision_pct
FROM infringements i
JOIN products p ON p.id = i.product_id
WHERE i.query_category IS NOT NULL
GROUP BY i.query_category, i.query_tier, p.type
ORDER BY i.query_tier, total_results DESC;

-- Tier-level aggregate view
CREATE OR REPLACE VIEW admin_tier_precision AS
SELECT
  i.query_tier,
  COUNT(*) AS total_results,
  COUNT(*) FILTER (WHERE i.status = 'active') AS verified_count,
  COUNT(*) FILTER (WHERE i.status = 'false_positive') AS rejected_count,
  COUNT(*) FILTER (WHERE i.status = 'pending_verification') AS pending_count,
  CASE
    WHEN COUNT(*) FILTER (WHERE i.status IN ('active', 'false_positive')) > 0
    THEN ROUND(
      COUNT(*) FILTER (WHERE i.status = 'active')::NUMERIC /
      COUNT(*) FILTER (WHERE i.status IN ('active', 'false_positive')) * 100, 1
    )
    ELSE NULL
  END AS precision_pct
FROM infringements i
WHERE i.query_tier IS NOT NULL
GROUP BY i.query_tier
ORDER BY i.query_tier;

-- ============================================================================
-- STEP 4 SCAFFOLD: Bayesian learning weights (INACTIVE)
--
-- This table stores computed precision weights per query category.
-- The compute function exists but is NOT called automatically.
-- Activation requires: LEARNING_ENABLED = true in app config + 200+ reviews.
-- ============================================================================

CREATE TABLE IF NOT EXISTS scan_learning_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type TEXT NOT NULL,       -- 'course', 'indicator', etc. or '_global'
  query_category TEXT NOT NULL,
  query_tier INTEGER NOT NULL DEFAULT 1,

  -- Stats
  total_results INTEGER DEFAULT 0,
  verified_count INTEGER DEFAULT 0,
  rejected_count INTEGER DEFAULT 0,

  -- Bayesian smoothed weight
  -- Formula: (verified + 5) / (reviewed + 10)
  -- With 0 data → 0.50 (neutral prior)
  -- As data grows, prior influence diminishes
  bayesian_weight NUMERIC(5,4) DEFAULT 0.5000,

  -- Raw precision for display
  raw_precision NUMERIC(5,4) DEFAULT NULL,

  -- Control
  is_active BOOLEAN DEFAULT FALSE,     -- Always false until manually enabled
  last_computed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(product_type, query_category, query_tier)
);

-- RLS: admin read-only, service role inserts/updates
ALTER TABLE scan_learning_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read scan_learning_weights"
  ON scan_learning_weights FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- ============================================================================
-- STEP 5 SCAFFOLD: Health metrics (INACTIVE)
--
-- Tracks scan quality over time. Data is collected passively.
-- Auto-revert logic is NOT built — this only stores snapshots.
-- ============================================================================

CREATE TABLE IF NOT EXISTS scan_health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES scans(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Snapshot at scan time
  total_raw_results INTEGER DEFAULT 0,
  total_ai_passed INTEGER DEFAULT 0,

  -- Filled in as users verify/reject (updated by trigger or cron)
  total_verified INTEGER DEFAULT 0,
  total_rejected INTEGER DEFAULT 0,

  -- Per-tier breakdown
  tier1_results INTEGER DEFAULT 0,
  tier2_results INTEGER DEFAULT 0,
  tier3_results INTEGER DEFAULT 0,
  platform_results INTEGER DEFAULT 0,

  -- Quality score (calculated after sufficient verification)
  precision_score NUMERIC(5,4) DEFAULT NULL,

  -- Metadata
  weights_version TEXT DEFAULT NULL,     -- Which weight snapshot was active
  learning_enabled BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scan_health_metrics_scan_id
  ON scan_health_metrics(scan_id);

CREATE INDEX IF NOT EXISTS idx_scan_health_metrics_created_at
  ON scan_health_metrics(created_at DESC);

-- RLS: admin read, service insert/update
ALTER TABLE scan_health_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read scan_health_metrics"
  ON scan_health_metrics FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- ============================================================================
-- STEP 4 SCAFFOLD: Bayesian weight computation function
--
-- Call manually: SELECT compute_category_weights();
-- NOT triggered automatically. Safe to run at any time.
-- ============================================================================

CREATE OR REPLACE FUNCTION compute_category_weights()
RETURNS void AS $$
DECLARE
  prior_successes CONSTANT NUMERIC := 5;
  prior_total CONSTANT NUMERIC := 10;
BEGIN
  -- Compute weights from verified/rejected infringements per category
  INSERT INTO scan_learning_weights (
    product_type, query_category, query_tier,
    total_results, verified_count, rejected_count,
    bayesian_weight, raw_precision, last_computed_at
  )
  SELECT
    p.type AS product_type,
    i.query_category,
    i.query_tier,
    COUNT(*) AS total_results,
    COUNT(*) FILTER (WHERE i.status = 'active') AS verified_count,
    COUNT(*) FILTER (WHERE i.status = 'false_positive') AS rejected_count,
    -- Bayesian smoothing: (verified + 5) / (reviewed + 10)
    ROUND(
      (COUNT(*) FILTER (WHERE i.status = 'active') + prior_successes) /
      (COUNT(*) FILTER (WHERE i.status IN ('active', 'false_positive')) + prior_total),
      4
    ) AS bayesian_weight,
    -- Raw precision
    CASE
      WHEN COUNT(*) FILTER (WHERE i.status IN ('active', 'false_positive')) > 0
      THEN ROUND(
        COUNT(*) FILTER (WHERE i.status = 'active')::NUMERIC /
        COUNT(*) FILTER (WHERE i.status IN ('active', 'false_positive')),
        4
      )
      ELSE NULL
    END AS raw_precision,
    now()
  FROM infringements i
  JOIN products p ON p.id = i.product_id
  WHERE i.query_category IS NOT NULL
    AND i.status IN ('active', 'false_positive')
  GROUP BY p.type, i.query_category, i.query_tier
  ON CONFLICT (product_type, query_category, query_tier)
  DO UPDATE SET
    total_results = EXCLUDED.total_results,
    verified_count = EXCLUDED.verified_count,
    rejected_count = EXCLUDED.rejected_count,
    bayesian_weight = EXCLUDED.bayesian_weight,
    raw_precision = EXCLUDED.raw_precision,
    last_computed_at = now();

  -- Also compute global aggregates (across all product types)
  INSERT INTO scan_learning_weights (
    product_type, query_category, query_tier,
    total_results, verified_count, rejected_count,
    bayesian_weight, raw_precision, last_computed_at
  )
  SELECT
    '_global' AS product_type,
    i.query_category,
    i.query_tier,
    COUNT(*) AS total_results,
    COUNT(*) FILTER (WHERE i.status = 'active') AS verified_count,
    COUNT(*) FILTER (WHERE i.status = 'false_positive') AS rejected_count,
    ROUND(
      (COUNT(*) FILTER (WHERE i.status = 'active') + prior_successes) /
      (COUNT(*) FILTER (WHERE i.status IN ('active', 'false_positive')) + prior_total),
      4
    ) AS bayesian_weight,
    CASE
      WHEN COUNT(*) FILTER (WHERE i.status IN ('active', 'false_positive')) > 0
      THEN ROUND(
        COUNT(*) FILTER (WHERE i.status = 'active')::NUMERIC /
        COUNT(*) FILTER (WHERE i.status IN ('active', 'false_positive')),
        4
      )
      ELSE NULL
    END AS raw_precision,
    now()
  FROM infringements i
  WHERE i.query_category IS NOT NULL
    AND i.status IN ('active', 'false_positive')
  GROUP BY i.query_category, i.query_tier
  ON CONFLICT (product_type, query_category, query_tier)
  DO UPDATE SET
    total_results = EXCLUDED.total_results,
    verified_count = EXCLUDED.verified_count,
    rejected_count = EXCLUDED.rejected_count,
    bayesian_weight = EXCLUDED.bayesian_weight,
    raw_precision = EXCLUDED.raw_precision,
    last_computed_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
