-- Add theme column to profiles table
-- This allows users to have personalized theme preferences (light/dark mode)

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'dark' CHECK (theme IN ('light', 'dark'));

-- Create index for faster theme lookups
CREATE INDEX IF NOT EXISTS idx_profiles_theme ON profiles(theme);

-- Add comment
COMMENT ON COLUMN profiles.theme IS 'User preferred theme: light or dark mode';
