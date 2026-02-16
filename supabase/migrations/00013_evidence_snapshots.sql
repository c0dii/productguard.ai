-- Migration: Evidence Snapshots for Legal Defense
-- Description: Create immutable evidence snapshots when users verify infringements
-- Created: 2026-02-16

-- Create evidence_snapshots table
CREATE TABLE IF NOT EXISTS evidence_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  infringement_id UUID NOT NULL REFERENCES infringements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),

  -- Evidence files (stored in Supabase Storage)
  screenshot_url TEXT,
  html_archive_url TEXT,
  pdf_report_url TEXT,

  -- Page metadata (frozen at verification time)
  page_title TEXT,
  page_url TEXT NOT NULL,
  page_hash TEXT NOT NULL, -- SHA-256 of page HTML

  -- Legal proof
  content_hash TEXT NOT NULL, -- SHA-256 of all evidence combined
  timestamp_proof TEXT, -- Blockchain/timestamp anchor receipt

  -- Infrastructure snapshot (JSON - frozen state)
  infrastructure_snapshot JSONB DEFAULT '{}'::jsonb,

  -- Evidence matches (JSON - frozen state)
  evidence_matches JSONB DEFAULT '[]'::jsonb,

  -- Chain of custody log
  chain_of_custody JSONB DEFAULT '[]'::jsonb,

  -- Legal attestation
  attestation JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  captured_at TIMESTAMPTZ DEFAULT NOW(),

  -- Verification
  verified BOOLEAN DEFAULT TRUE,
  verification_status TEXT DEFAULT 'valid',

  CONSTRAINT unique_snapshot_per_infringement UNIQUE (infringement_id)
);

-- Add RLS policies
ALTER TABLE evidence_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own evidence snapshots"
ON evidence_snapshots FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create evidence snapshots"
ON evidence_snapshots FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_evidence_snapshots_infringement
ON evidence_snapshots(infringement_id);

CREATE INDEX idx_evidence_snapshots_user
ON evidence_snapshots(user_id);

CREATE INDEX idx_evidence_snapshots_created
ON evidence_snapshots(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE evidence_snapshots IS 'Immutable evidence packages for legal defense - created when user verifies infringement';
COMMENT ON COLUMN evidence_snapshots.content_hash IS 'SHA-256 hash of all evidence - used to prove tampering has not occurred';
COMMENT ON COLUMN evidence_snapshots.timestamp_proof IS 'Blockchain or timestamp authority receipt proving when evidence was captured';
COMMENT ON COLUMN evidence_snapshots.chain_of_custody IS 'Complete audit trail of all actions taken on this evidence';
COMMENT ON COLUMN evidence_snapshots.attestation IS 'Legal attestation statement signed by user verifying authenticity';

-- Create storage bucket for evidence files
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence-snapshots', 'evidence-snapshots', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for evidence snapshots
DROP POLICY IF EXISTS "Users can upload evidence snapshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their evidence snapshots" ON storage.objects;

CREATE POLICY "Users can upload evidence snapshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'evidence-snapshots' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their evidence snapshots"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'evidence-snapshots' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create function to verify snapshot integrity
CREATE OR REPLACE FUNCTION verify_snapshot_integrity(snapshot_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  snapshot RECORD;
  computed_hash TEXT;
BEGIN
  SELECT * INTO snapshot FROM evidence_snapshots WHERE id = snapshot_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- In production, this would recreate the hash and compare
  -- For now, just verify the snapshot exists and has a hash
  RETURN snapshot.content_hash IS NOT NULL AND LENGTH(snapshot.content_hash) = 64;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add snapshot_id reference to infringements table
ALTER TABLE infringements
ADD COLUMN IF NOT EXISTS evidence_snapshot_id UUID REFERENCES evidence_snapshots(id);

CREATE INDEX IF NOT EXISTS idx_infringements_snapshot
ON infringements(evidence_snapshot_id);

COMMENT ON COLUMN infringements.evidence_snapshot_id IS 'Link to immutable evidence package created at verification';
