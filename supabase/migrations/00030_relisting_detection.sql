-- Re-listing Detection: Per-user toggle + global system settings

-- Per-user toggle for re-listing monitoring
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS relisting_monitoring_enabled BOOLEAN DEFAULT true;

-- Global system settings table for admin-controlled feature flags
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Default: global re-listing monitoring enabled
INSERT INTO system_settings (key, value)
VALUES ('relisting_monitoring_global', '{"enabled": true}')
ON CONFLICT (key) DO NOTHING;

-- RLS: Only admins can read/write system settings
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage system_settings" ON system_settings
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Evidence screenshots storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence-screenshots', 'evidence-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload evidence screenshots"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'evidence-screenshots' AND auth.role() = 'authenticated');

-- Public read access for evidence screenshots
CREATE POLICY "Public read access for evidence screenshots"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'evidence-screenshots');
