-- Migration: Add product_ai_data to evidence_snapshots
-- Description: Store the product's AI-extracted data (keywords, phrases, brand identifiers)
-- at time of verification so content comparisons remain accurate even if the product changes later.
-- Created: 2026-02-16

-- Add product_ai_data column to evidence_snapshots
ALTER TABLE evidence_snapshots
ADD COLUMN IF NOT EXISTS product_ai_data JSONB DEFAULT NULL;

COMMENT ON COLUMN evidence_snapshots.product_ai_data IS 'Frozen copy of product AI-extracted data at verification time: keywords, unique phrases, brand identifiers, copyrighted terms — used for Original vs Infringing content comparisons';
