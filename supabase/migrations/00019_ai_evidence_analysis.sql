-- Migration: Add AI evidence analysis to evidence_snapshots
-- Description: Store AI-analyzed evidence matches ranked by legal significance.
-- The AI analyzer compares captured page content against product data to produce
-- high-quality, DMCA-ready evidence items.
-- Created: 2026-02-16

-- Add ai_evidence_analysis column to evidence_snapshots
ALTER TABLE evidence_snapshots
ADD COLUMN IF NOT EXISTS ai_evidence_analysis JSONB DEFAULT NULL;

COMMENT ON COLUMN evidence_snapshots.ai_evidence_analysis IS 'AI-powered evidence analysis results: ranked matches with legal significance, DMCA language, confidence scores, and overall strength assessment';
