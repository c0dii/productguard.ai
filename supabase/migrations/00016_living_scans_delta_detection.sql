-- Living Scans with Delta Detection
-- This migration transforms scans from one-time snapshots to living entities
-- that get updated with each run, processing only new URLs to save API/AI costs.

-- ============================================================================
-- Step 1: Modify scans table to support multiple runs
-- ============================================================================

ALTER TABLE scans
ADD COLUMN IF NOT EXISTS run_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS initial_run_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill initial_run_at with created_at for existing scans
UPDATE scans
SET initial_run_at = created_at
WHERE initial_run_at IS NULL;

-- Backfill last_run_at with created_at for existing scans
UPDATE scans
SET last_run_at = created_at
WHERE last_run_at IS NULL;

-- ============================================================================
-- Step 2: Create scan_history table to track each run
-- ============================================================================

CREATE TABLE IF NOT EXISTS scan_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  run_number INTEGER NOT NULL,
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Metrics for this run
  new_urls_found INTEGER DEFAULT 0,
  total_urls_scanned INTEGER DEFAULT 0,
  new_infringements_created INTEGER DEFAULT 0,

  -- Resource savings
  api_calls_saved INTEGER DEFAULT 0,
  ai_filtering_saved INTEGER DEFAULT 0,

  -- Performance
  duration_seconds INTEGER,

  -- Run details
  platforms_searched TEXT[],
  search_queries_used TEXT[],

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for scan_history
CREATE INDEX IF NOT EXISTS idx_scan_history_scan_id
ON scan_history(scan_id);

CREATE INDEX IF NOT EXISTS idx_scan_history_run_at
ON scan_history(run_at DESC);

-- ============================================================================
-- Step 3: Add index on infringements for fast delta detection
-- ============================================================================

-- Index on url_hash + product_id for quick "does this URL exist?" checks
-- (This may already exist from previous migrations, adding IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_infringements_url_hash_product
ON infringements(product_id, url_hash)
WHERE url_hash IS NOT NULL;

-- Index on product_id + created_at for fetching recent infringements
CREATE INDEX IF NOT EXISTS idx_infringements_product_created
ON infringements(product_id, created_at DESC);

-- ============================================================================
-- Step 4: Create function to get or create scan for product
-- ============================================================================

CREATE OR REPLACE FUNCTION get_or_create_product_scan(
  p_product_id UUID,
  p_user_id UUID
) RETURNS UUID AS $$
DECLARE
  v_scan_id UUID;
BEGIN
  -- Try to find existing scan for this product
  SELECT id INTO v_scan_id
  FROM scans
  WHERE product_id = p_product_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no scan exists, create one
  IF v_scan_id IS NULL THEN
    INSERT INTO scans (
      product_id,
      user_id,
      status,
      run_count,
      initial_run_at,
      last_run_at
    ) VALUES (
      p_product_id,
      p_user_id,
      'pending',
      1,
      NOW(),
      NOW()
    ) RETURNING id INTO v_scan_id;
  END IF;

  RETURN v_scan_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Step 5: Backfill scan_history for existing scans
-- ============================================================================

-- Create initial scan_history entries for all existing scans
INSERT INTO scan_history (
  scan_id,
  run_number,
  run_at,
  new_urls_found,
  total_urls_scanned,
  new_infringements_created,
  api_calls_saved,
  ai_filtering_saved
)
SELECT
  s.id as scan_id,
  1 as run_number,
  s.created_at as run_at,
  s.infringement_count as new_urls_found,
  s.infringement_count as total_urls_scanned,
  s.infringement_count as new_infringements_created,
  0 as api_calls_saved,
  0 as ai_filtering_saved
FROM scans s
WHERE NOT EXISTS (
  SELECT 1 FROM scan_history sh WHERE sh.scan_id = s.id
);

-- ============================================================================
-- Step 6: Create view for product scan status
-- ============================================================================

CREATE OR REPLACE VIEW product_scan_status AS
SELECT
  p.id as product_id,
  p.name as product_name,
  s.id as scan_id,
  s.status as scan_status,
  s.run_count,
  s.initial_run_at as first_scanned_at,
  s.last_run_at,
  s.infringement_count as total_infringements,

  -- Infringement counts by status
  COUNT(*) FILTER (WHERE i.status = 'pending_verification') as pending_verification_count,
  COUNT(*) FILTER (WHERE i.status = 'active') as active_count,
  COUNT(*) FILTER (WHERE i.status IN ('removed', 'disputed')) as resolved_count,
  COUNT(*) FILTER (WHERE i.status = 'false_positive') as false_positive_count,

  -- Recent run stats
  (SELECT sh.new_urls_found
   FROM scan_history sh
   WHERE sh.scan_id = s.id
   ORDER BY sh.run_at DESC
   LIMIT 1) as last_run_new_urls,

  (SELECT sh.api_calls_saved
   FROM scan_history sh
   WHERE sh.scan_id = s.id
   ORDER BY sh.run_at DESC
   LIMIT 1) as last_run_api_savings

FROM products p
LEFT JOIN scans s ON s.product_id = p.id AND s.id = (
  SELECT id FROM scans WHERE product_id = p.id ORDER BY created_at DESC LIMIT 1
)
LEFT JOIN infringements i ON i.product_id = p.id
GROUP BY p.id, p.name, s.id, s.status, s.run_count, s.initial_run_at, s.last_run_at, s.infringement_count;

-- ============================================================================
-- Step 7: Add RLS policies for scan_history
-- ============================================================================

ALTER TABLE scan_history ENABLE ROW LEVEL SECURITY;

-- Users can view scan history for their own scans
CREATE POLICY "Users can view their own scan history"
ON scan_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM scans s
    WHERE s.id = scan_history.scan_id
    AND s.user_id = auth.uid()
  )
);

-- System can insert scan history
CREATE POLICY "System can insert scan history"
ON scan_history FOR INSERT
WITH CHECK (true);

-- ============================================================================
-- Step 8: Add helpful comments
-- ============================================================================

COMMENT ON TABLE scan_history IS 'Tracks each run of a product scan to show delta detection savings and history';
COMMENT ON COLUMN scan_history.api_calls_saved IS 'Number of WHOIS/infrastructure API calls saved by delta detection';
COMMENT ON COLUMN scan_history.ai_filtering_saved IS 'Number of AI filtering calls saved by recognizing known URLs';
COMMENT ON VIEW product_scan_status IS 'Aggregated view of each product''s active scan status and metrics';
COMMENT ON FUNCTION get_or_create_product_scan IS 'Returns existing scan for product or creates new one if none exists';
