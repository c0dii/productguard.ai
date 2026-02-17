-- Add 'archived' status for user-owned URLs (whitelisted via "This is my URL")
ALTER TYPE infringement_status ADD VALUE IF NOT EXISTS 'archived';
