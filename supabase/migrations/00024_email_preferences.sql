-- Email communication preferences
-- Adds per-user email preference controls and a secure token for email-based access

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email_threat_alerts BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_scan_notifications BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_takedown_updates BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_account_only BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_unsubscribe_all BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_preferences_token TEXT UNIQUE;

-- Generate tokens for all existing users
UPDATE profiles
SET email_preferences_token = encode(gen_random_bytes(32), 'hex')
WHERE email_preferences_token IS NULL;

-- Index for fast token lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_pref_token
  ON profiles (email_preferences_token)
  WHERE email_preferences_token IS NOT NULL;

-- Update handle_new_user() to generate token on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, email_preferences_token)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    encode(gen_random_bytes(32), 'hex')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
