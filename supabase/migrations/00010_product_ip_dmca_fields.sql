-- Migration: Add Intellectual Property and DMCA Contact fields to products table
-- Description: Enhances product onboarding to collect IP details and DMCA contact information
--              for better takedown notice generation

-- Add IP and DMCA information columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS ip_types TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS copyright_info JSONB DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS trademark_info JSONB DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS patent_info JSONB DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS license_info JSONB DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS dmca_contact JSONB DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN products.ip_types IS 'Array of IP protection types: copyright, trademark, patent, trade_secret, license';
COMMENT ON COLUMN products.copyright_info IS 'Copyright details: {registration_number, year, holder_name}';
COMMENT ON COLUMN products.trademark_info IS 'Trademark details: {name, registration_number, country}';
COMMENT ON COLUMN products.patent_info IS 'Patent details: {number, type}';
COMMENT ON COLUMN products.license_info IS 'License details: {type, terms_url}';
COMMENT ON COLUMN products.dmca_contact IS 'DMCA contact: {full_name, company, email, phone, address, is_copyright_owner, relationship_to_owner}';

-- Example data structures:
-- ip_types: ['copyright', 'trademark']
-- copyright_info: {"registration_number": "TXu002123456", "year": "2024", "holder_name": "John Doe"}
-- trademark_info: {"name": "MyBrand™", "registration_number": "87123456", "country": "US"}
-- patent_info: {"number": "US10123456B2", "type": "utility"}
-- license_info: {"type": "All Rights Reserved", "terms_url": "https://example.com/terms"}
-- dmca_contact: {
--   "full_name": "John Doe",
--   "company": "Doe Digital LLC",
--   "email": "john@example.com",
--   "phone": "+1-555-0100",
--   "address": "123 Main St, Suite 100, San Francisco, CA 94102",
--   "is_copyright_owner": true,
--   "relationship_to_owner": null
-- }

-- Create index on ip_types for faster filtering
CREATE INDEX IF NOT EXISTS idx_products_ip_types ON products USING GIN(ip_types);

-- Migration complete
