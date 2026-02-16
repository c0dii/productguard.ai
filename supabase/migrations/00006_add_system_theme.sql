-- Update theme column to support 'system' preference
-- This allows users to automatically match their OS theme preference

-- Drop the existing check constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_theme_check;

-- Add new check constraint with 'system' option
ALTER TABLE profiles
ADD CONSTRAINT profiles_theme_check CHECK (theme IN ('light', 'dark', 'system'));

-- Update default to 'system' for new users (they'll auto-match OS)
ALTER TABLE profiles
ALTER COLUMN theme SET DEFAULT 'system';

-- Add comment
COMMENT ON COLUMN profiles.theme IS 'User preferred theme: light, dark, or system (matches OS preference)';
