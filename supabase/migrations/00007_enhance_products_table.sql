-- Enhanced Product Schema Migration
-- Adds fields for better piracy detection accuracy

-- Add new columns to products table
ALTER TABLE products

-- Image
ADD COLUMN IF NOT EXISTS product_image_url TEXT,

-- Search Accuracy
ADD COLUMN IF NOT EXISTS alternative_names TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS brand_name TEXT,
ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS negative_keywords TEXT[] DEFAULT '{}',

-- Whitelisting
ADD COLUMN IF NOT EXISTS whitelist_domains TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS authorized_sellers TEXT[] DEFAULT '{}',

-- Advanced Detection
ADD COLUMN IF NOT EXISTS release_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS min_price_threshold DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS unique_identifiers TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS file_hash TEXT,

-- Legal
ADD COLUMN IF NOT EXISTS copyright_number TEXT,
ADD COLUMN IF NOT EXISTS copyright_owner TEXT,

-- Organization
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'English',
ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- Add comments for documentation
COMMENT ON COLUMN products.product_image_url IS 'URL to product image in Supabase Storage for reverse image search';
COMMENT ON COLUMN products.alternative_names IS 'Alternative product names/aliases for search matching';
COMMENT ON COLUMN products.brand_name IS 'Brand or creator name for enhanced search queries';
COMMENT ON COLUMN products.keywords IS 'Keywords to actively monitor in searches';
COMMENT ON COLUMN products.negative_keywords IS 'Keywords to exclude from results (false positives)';
COMMENT ON COLUMN products.whitelist_domains IS 'Authorized domains to exclude from infringement detection';
COMMENT ON COLUMN products.authorized_sellers IS 'Official sales channels/platforms';
COMMENT ON COLUMN products.release_date IS 'Product release date to filter pre-release results';
COMMENT ON COLUMN products.min_price_threshold IS 'Minimum price to flag as suspicious (e.g., 50% of retail)';
COMMENT ON COLUMN products.unique_identifiers IS 'Course IDs, ISBNs, serial numbers for exact matching';
COMMENT ON COLUMN products.file_hash IS 'MD5/SHA256 hash for software/file comparison';
COMMENT ON COLUMN products.copyright_number IS 'Copyright registration number for DMCA';
COMMENT ON COLUMN products.copyright_owner IS 'Legal copyright owner name';
COMMENT ON COLUMN products.tags IS 'Organizational tags for filtering/categorization';
COMMENT ON COLUMN products.language IS 'Primary product language';
COMMENT ON COLUMN products.internal_notes IS 'Internal team notes (not used in search)';

-- Create index for array searches
CREATE INDEX IF NOT EXISTS idx_products_alternative_names ON products USING GIN (alternative_names);
CREATE INDEX IF NOT EXISTS idx_products_keywords ON products USING GIN (keywords);
CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING GIN (tags);

-- Create storage bucket for product images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS for product images bucket
CREATE POLICY "Users can upload their own product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own product images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own product images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public access to product images
CREATE POLICY "Public can view product images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');
