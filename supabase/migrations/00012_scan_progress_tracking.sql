-- ============================================================================
-- Migration 00012: Scan Progress Tracking
-- ============================================================================
-- Adds real-time progress tracking for scans with fancy stage names
-- ============================================================================

-- Add scan_progress column to scans table
ALTER TABLE scans
ADD COLUMN IF NOT EXISTS scan_progress JSONB DEFAULT '{
  "current_stage": null,
  "stages": []
}'::jsonb;

-- Add index for faster progress queries
CREATE INDEX IF NOT EXISTS idx_scans_progress
ON scans USING gin(scan_progress);

-- Add completed_at timestamp
ALTER TABLE scans
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Add last_updated_at for real-time updates
ALTER TABLE scans
ADD COLUMN IF NOT EXISTS last_updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create function to update scan progress
CREATE OR REPLACE FUNCTION update_scan_progress(
  scan_id UUID,
  stage_name TEXT,
  stage_status TEXT
) RETURNS void AS $$
BEGIN
  UPDATE scans
  SET
    scan_progress = jsonb_set(
      scan_progress,
      '{current_stage}',
      to_jsonb(stage_name)
    ),
    last_updated_at = NOW()
  WHERE id = scan_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update last_updated_at
CREATE OR REPLACE FUNCTION update_scan_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scans_update_last_updated
BEFORE UPDATE ON scans
FOR EACH ROW
EXECUTE FUNCTION update_scan_last_updated();

-- Add comments
COMMENT ON COLUMN scans.scan_progress IS 'Real-time progress tracking with stage completion status';
COMMENT ON COLUMN scans.completed_at IS 'Timestamp when scan fully completed';
COMMENT ON COLUMN scans.last_updated_at IS 'Last time scan was updated (for polling)';
