-- Migration: Add page capture data to evidence snapshots
-- Description: Stores captured page content (text, links, Wayback URL) alongside existing evidence

-- Add page_capture JSONB column for storing captured page data
ALTER TABLE evidence_snapshots
ADD COLUMN IF NOT EXISTS page_capture JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN evidence_snapshots.page_capture IS 'Captured page content: text, links, Wayback Machine URL, HTML storage path, HTML hash';
