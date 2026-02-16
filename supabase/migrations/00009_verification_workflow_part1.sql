-- Migration 00009 Part 1: Add enum values
-- Must be run separately due to PostgreSQL enum constraints

-- ============================================
-- 1. Extend infringement_status enum
-- ============================================
ALTER TYPE infringement_status ADD VALUE IF NOT EXISTS 'pending_verification';
ALTER TYPE infringement_status ADD VALUE IF NOT EXISTS 'false_positive';
