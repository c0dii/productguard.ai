-- Migration 00009 Part 2: Verification Workflow & Deduplication System
-- Run AFTER Part 1 has been committed

-- ============================================
-- 1. Add URL deduplication and verification fields
-- ============================================
ALTER TABLE infringements
ADD COLUMN IF NOT EXISTS url_hash TEXT,
ADD COLUMN IF NOT EXISTS url_normalized TEXT,
ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS seen_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS verified_by_user_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verified_by_user_id UUID REFERENCES profiles(id);

-- ============================================
-- 2. Create indexes for performance
-- ============================================

-- Unique constraint: one URL hash per product (prevents duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS idx_infringements_url_hash_product
ON infringements(product_id, url_hash)
WHERE url_hash IS NOT NULL;

-- Index for pending verifications queries
CREATE INDEX IF NOT EXISTS idx_infringements_pending_verification
ON infringements(product_id, status)
WHERE status = 'pending_verification';

-- Index for verified infringements (used in chart queries)
CREATE INDEX IF NOT EXISTS idx_infringements_verified_at
ON infringements(product_id, verified_by_user_at)
WHERE verified_by_user_at IS NOT NULL;

-- ============================================
-- 3. URL normalization functions
-- ============================================

-- Normalize URL for consistent deduplication
CREATE OR REPLACE FUNCTION normalize_url(url TEXT)
RETURNS TEXT AS $$
DECLARE
  normalized TEXT;
BEGIN
  IF url IS NULL THEN
    RETURN NULL;
  END IF;

  -- Convert to lowercase
  normalized := LOWER(url);

  -- Remove protocol (http://, https://)
  normalized := REGEXP_REPLACE(normalized, '^https?://', '');

  -- Remove www prefix
  normalized := REGEXP_REPLACE(normalized, '^www\.', '');

  -- Remove query parameters and anchors
  normalized := REGEXP_REPLACE(normalized, '[?#].*$', '');

  -- Remove trailing slashes
  normalized := REGEXP_REPLACE(normalized, '/+$', '');

  RETURN normalized;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Generate SHA256 hash of normalized URL
CREATE OR REPLACE FUNCTION generate_url_hash(url TEXT)
RETURNS TEXT AS $$
BEGIN
  IF url IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN encode(digest(normalize_url(url), 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 4. Handle existing duplicates and backfill
-- ============================================

-- First, identify and delete duplicate URLs (keeping the most recent one)
WITH duplicates AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY product_id, generate_url_hash(source_url)
      ORDER BY created_at DESC
    ) as rn
  FROM infringements
  WHERE source_url IS NOT NULL
)
DELETE FROM infringements
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Now backfill url_hash for remaining unique records
UPDATE infringements
SET
  url_hash = generate_url_hash(source_url),
  url_normalized = normalize_url(source_url),
  first_seen_at = COALESCE(first_seen_at, detected_at, created_at),
  last_seen_at = COALESCE(last_seen_at, detected_at, created_at),
  seen_count = COALESCE(seen_count, 1)
WHERE url_hash IS NULL AND source_url IS NOT NULL;

-- ============================================
-- 5. Create materialized view for timeline chart
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS product_infringement_timeline AS
SELECT
  product_id,
  DATE(verified_by_user_at) as date,
  COUNT(DISTINCT url_hash) as unique_count,
  COUNT(*) as total_count,
  SUM(est_revenue_loss) as total_loss
FROM infringements
WHERE verified_by_user_at IS NOT NULL
  AND status NOT IN ('false_positive')
GROUP BY product_id, DATE(verified_by_user_at)
ORDER BY product_id, date;

-- Create unique index on the materialized view for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_timeline_product_date
ON product_infringement_timeline(product_id, date);

-- ============================================
-- 6. Auto-refresh materialized view trigger
-- ============================================

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_product_timeline()
RETURNS TRIGGER AS $$
BEGIN
  -- Refresh materialized view concurrently (doesn't lock reads)
  REFRESH MATERIALIZED VIEW CONCURRENTLY product_infringement_timeline;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on verification updates
DROP TRIGGER IF EXISTS trg_refresh_timeline_on_verify ON infringements;
CREATE TRIGGER trg_refresh_timeline_on_verify
AFTER UPDATE OF verified_by_user_at ON infringements
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_product_timeline();

-- ============================================
-- 7. Comments for documentation
-- ============================================

COMMENT ON COLUMN infringements.url_hash IS 'SHA256 hash of normalized URL for deduplication across scans';
COMMENT ON COLUMN infringements.url_normalized IS 'Normalized URL (lowercased, no protocol/www/trailing slashes) for display';
COMMENT ON COLUMN infringements.first_seen_at IS 'Timestamp when this URL was first detected (initial scan)';
COMMENT ON COLUMN infringements.last_seen_at IS 'Timestamp of most recent scan that detected this URL';
COMMENT ON COLUMN infringements.seen_count IS 'Number of scans that have detected this URL (incremented on rescans)';
COMMENT ON COLUMN infringements.verified_by_user_at IS 'Timestamp when user manually verified this is a real infringement';
COMMENT ON COLUMN infringements.verified_by_user_id IS 'User ID who verified this infringement';

COMMENT ON MATERIALIZED VIEW product_infringement_timeline IS 'Daily unique verified infringement counts per product (used for trending charts)';
COMMENT ON FUNCTION normalize_url(TEXT) IS 'Normalizes URL by removing protocol, www, query params, and trailing slashes for consistent deduplication';
COMMENT ON FUNCTION generate_url_hash(TEXT) IS 'Generates SHA256 hash of normalized URL for efficient deduplication lookups';

-- ============================================
-- 8. Grant permissions
-- ============================================

-- Allow authenticated users to read the timeline view
GRANT SELECT ON product_infringement_timeline TO authenticated;

-- ============================================
-- Migration Complete
-- ============================================

-- Note: Existing infringements remain as 'active' status
-- New scans will create infringements with 'pending_verification' status
