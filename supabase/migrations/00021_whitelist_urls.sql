-- Add whitelist_urls column to products table
-- Stores specific URLs that the user has approved (e.g., their own product pages on other sites)
-- These URLs are excluded from infringement detection to prevent false DMCA takedowns

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS whitelist_urls TEXT[] DEFAULT '{}';

COMMENT ON COLUMN products.whitelist_urls IS 'Specific approved URLs to exclude from infringement detection (e.g., user''s own product pages on other websites)';

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_products_whitelist_urls ON products USING GIN (whitelist_urls);
