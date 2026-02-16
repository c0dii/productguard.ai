-- Migration: AI-Powered Product Analysis
-- Description: Add fields for AI-extracted data, full text content, and product images
-- Created: 2026-02-15

-- Add AI analysis fields to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS full_text_content TEXT,
ADD COLUMN IF NOT EXISTS ai_extracted_data JSONB DEFAULT '{
  "brand_identifiers": [],
  "unique_phrases": [],
  "keywords": [],
  "copyrighted_terms": [],
  "content_fingerprint": "",
  "extraction_metadata": {
    "model": "",
    "analyzed_at": "",
    "confidence_scores": {}
  }
}'::jsonb,
ADD COLUMN IF NOT EXISTS product_images JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ai_analysis_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_analyzed_at TIMESTAMPTZ;

-- Create index for AI data queries
CREATE INDEX IF NOT EXISTS idx_products_ai_data
ON products USING GIN (ai_extracted_data);

-- Create index for full text search
CREATE INDEX IF NOT EXISTS idx_products_full_text
ON products USING GIN (to_tsvector('english', full_text_content));

-- Add comment for documentation
COMMENT ON COLUMN products.full_text_content IS 'Complete text content from product page for comparison and search';
COMMENT ON COLUMN products.ai_extracted_data IS 'AI-extracted structured data: brands, keywords, phrases, fingerprints';
COMMENT ON COLUMN products.product_images IS 'Array of uploaded product images with metadata for reverse image search';
COMMENT ON COLUMN products.ai_analysis_version IS 'Version tracker for AI analysis updates';
COMMENT ON COLUMN products.last_analyzed_at IS 'Timestamp of last AI analysis for cache invalidation';

-- Create storage bucket for product images (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for product images
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can upload their product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their product images" ON storage.objects;

-- Create new policies
CREATE POLICY "Users can upload their product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their product images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their product images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create helper function to validate product image count
CREATE OR REPLACE FUNCTION validate_product_image_count()
RETURNS TRIGGER AS $$
BEGIN
  IF jsonb_array_length(NEW.product_images) > 4 THEN
    RAISE EXCEPTION 'Maximum 4 images allowed per product';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce image limit
DROP TRIGGER IF EXISTS check_product_image_limit ON products;
CREATE TRIGGER check_product_image_limit
  BEFORE INSERT OR UPDATE OF product_images ON products
  FOR EACH ROW
  EXECUTE FUNCTION validate_product_image_count();

-- Create function to extract keywords from AI data
CREATE OR REPLACE FUNCTION get_product_keywords(product_id UUID)
RETURNS TEXT[] AS $$
  SELECT COALESCE(
    ARRAY(
      SELECT jsonb_array_elements_text(ai_extracted_data->'keywords')
      FROM products
      WHERE id = product_id
    ),
    ARRAY[]::TEXT[]
  );
$$ LANGUAGE SQL STABLE;

-- Create function to get content fingerprint
CREATE OR REPLACE FUNCTION get_content_fingerprint(product_id UUID)
RETURNS TEXT AS $$
  SELECT COALESCE(
    ai_extracted_data->>'content_fingerprint',
    ''
  )
  FROM products
  WHERE id = product_id;
$$ LANGUAGE SQL STABLE;
