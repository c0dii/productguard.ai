-- ============================================================
-- Piracy Discovery Engine Schema
-- Migration: 00028_discovery_engine.sql
--
-- 2 tables powering the automated piracy discovery pipeline:
--   discovery_runs        → tracks each crawl run (stats, costs, errors)
--   discovery_candidates  → individual candidates through the pipeline
-- ============================================================

-- ── TABLE: discovery_runs ────────────────────────────────────
-- One row per discovery engine execution (cron or admin-triggered)

CREATE TABLE IF NOT EXISTS discovery_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'running',  -- running | completed | failed
  categories TEXT[] NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',

  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Pipeline stats
  raw_listings_found INTEGER NOT NULL DEFAULT 0,
  products_extracted INTEGER NOT NULL DEFAULT 0,
  owners_identified INTEGER NOT NULL DEFAULT 0,
  candidates_scored INTEGER NOT NULL DEFAULT 0,
  prospects_qualified INTEGER NOT NULL DEFAULT 0,
  prospects_inserted INTEGER NOT NULL DEFAULT 0,

  -- Cost tracking
  serp_calls_used INTEGER NOT NULL DEFAULT 0,
  ai_calls_used INTEGER NOT NULL DEFAULT 0,
  whois_calls_used INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd DECIMAL(8,4) NOT NULL DEFAULT 0,

  -- Errors
  errors JSONB NOT NULL DEFAULT '[]',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discovery_runs_status ON discovery_runs (status);
CREATE INDEX IF NOT EXISTS idx_discovery_runs_created ON discovery_runs (created_at DESC);


-- ── TABLE: discovery_candidates ──────────────────────────────
-- Individual candidates flowing through the discovery pipeline.
-- One row per piracy listing found. Tracks progression through stages.

CREATE TABLE IF NOT EXISTS discovery_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES discovery_runs(id) ON DELETE CASCADE,

  -- Raw listing data (from SerpAPI crawl)
  source_url TEXT NOT NULL,
  listing_title TEXT,
  listing_snippet TEXT,
  category TEXT NOT NULL,

  -- Extracted product data (from AI extraction)
  extracted_product_name TEXT,
  extracted_product_type TEXT,
  suspected_platform TEXT,
  extraction_confidence DECIMAL(3,2),

  -- Owner identification data
  product_url TEXT,
  product_price TEXT,
  company_name TEXT,
  owner_name TEXT,
  owner_email TEXT,
  company_domain TEXT,
  contact_source TEXT,
  identification_confidence DECIMAL(3,2),

  -- Scoring
  confidence_score DECIMAL(5,2),
  score_breakdown JSONB,

  -- Pipeline outcome
  status TEXT NOT NULL DEFAULT 'raw',  -- raw | extracted | identified | scored | qualified | inserted | skipped
  skip_reason TEXT,

  -- Link to created prospect (if qualified + inserted)
  prospect_id UUID REFERENCES marketing_prospects(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidates_run ON discovery_candidates (run_id);
CREATE INDEX IF NOT EXISTS idx_candidates_source_url ON discovery_candidates (source_url);
CREATE INDEX IF NOT EXISTS idx_candidates_product_name ON discovery_candidates (LOWER(extracted_product_name))
  WHERE extracted_product_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_candidates_status ON discovery_candidates (status);


-- ── ROW LEVEL SECURITY ──────────────────────────────────────
-- Discovery tables are admin-only (same pattern as marketing tables).
-- Service role bypasses RLS by default — no policies needed.

ALTER TABLE discovery_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovery_candidates ENABLE ROW LEVEL SECURITY;
