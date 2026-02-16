-- ============================================================================
-- Migration: Add WHOIS Data to Infringements
-- ============================================================================
-- Adds hosting provider and domain registration information to infringements
-- for improved takedown targeting and DMCA notice accuracy.
-- ============================================================================

-- Add WHOIS data columns to infringements table
ALTER TABLE infringements
ADD COLUMN IF NOT EXISTS whois_domain TEXT,
ADD COLUMN IF NOT EXISTS whois_registrant_org TEXT,
ADD COLUMN IF NOT EXISTS whois_registrant_country TEXT,
ADD COLUMN IF NOT EXISTS whois_registrant_country_code TEXT,
ADD COLUMN IF NOT EXISTS whois_registrar_name TEXT,
ADD COLUMN IF NOT EXISTS whois_registrar_abuse_email TEXT,
ADD COLUMN IF NOT EXISTS whois_registrar_abuse_phone TEXT,
ADD COLUMN IF NOT EXISTS whois_created_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS whois_updated_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS whois_expires_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS whois_name_servers TEXT[],
ADD COLUMN IF NOT EXISTS whois_status TEXT,
ADD COLUMN IF NOT EXISTS whois_domain_age_days INTEGER,
ADD COLUMN IF NOT EXISTS whois_fetched_at TIMESTAMPTZ;

-- Add index for querying by registrar (useful for tracking which hosting providers have most infringements)
CREATE INDEX IF NOT EXISTS idx_infringements_whois_registrar
ON infringements(whois_registrar_name)
WHERE whois_registrar_name IS NOT NULL;

-- Add index for querying by country (useful for geographic analysis)
CREATE INDEX IF NOT EXISTS idx_infringements_whois_country
ON infringements(whois_registrant_country_code)
WHERE whois_registrant_country_code IS NOT NULL;

-- Add index for querying by organization (useful for identifying repeat infringers)
CREATE INDEX IF NOT EXISTS idx_infringements_whois_org
ON infringements(whois_registrant_org)
WHERE whois_registrant_org IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN infringements.whois_domain IS 'Domain extracted from infringement URL';
COMMENT ON COLUMN infringements.whois_registrant_org IS 'Organization that owns the domain';
COMMENT ON COLUMN infringements.whois_registrant_country IS 'Country where domain owner is located';
COMMENT ON COLUMN infringements.whois_registrant_country_code IS 'ISO country code (e.g., US, GB)';
COMMENT ON COLUMN infringements.whois_registrar_name IS 'Domain registrar (e.g., GoDaddy, Namecheap)';
COMMENT ON COLUMN infringements.whois_registrar_abuse_email IS 'Abuse contact email for hosting provider';
COMMENT ON COLUMN infringements.whois_registrar_abuse_phone IS 'Abuse contact phone number';
COMMENT ON COLUMN infringements.whois_created_date IS 'When the domain was first registered';
COMMENT ON COLUMN infringements.whois_updated_date IS 'When WHOIS record was last updated';
COMMENT ON COLUMN infringements.whois_expires_date IS 'When domain registration expires';
COMMENT ON COLUMN infringements.whois_name_servers IS 'DNS name servers for the domain';
COMMENT ON COLUMN infringements.whois_status IS 'Domain status flags (e.g., clientTransferProhibited)';
COMMENT ON COLUMN infringements.whois_domain_age_days IS 'Estimated age of domain in days';
COMMENT ON COLUMN infringements.whois_fetched_at IS 'When WHOIS data was fetched';

-- ============================================================================
-- Analytics View: Top Hosting Providers by Infringement Count
-- ============================================================================
CREATE OR REPLACE VIEW infringement_hosting_providers AS
SELECT
  whois_registrar_name as registrar,
  whois_registrant_country_code as country_code,
  COUNT(*) as total_infringements,
  COUNT(*) FILTER (WHERE status = 'active') as active_infringements,
  COUNT(*) FILTER (WHERE status = 'takedown_sent') as takedowns_sent,
  COUNT(*) FILTER (WHERE status = 'removed') as removed,
  SUM(est_revenue_loss) as total_est_loss,
  MIN(created_at) as first_seen,
  MAX(created_at) as last_seen
FROM infringements
WHERE whois_registrar_name IS NOT NULL
GROUP BY whois_registrar_name, whois_registrant_country_code
ORDER BY total_infringements DESC;

COMMENT ON VIEW infringement_hosting_providers IS 'Analytics view showing which hosting providers have the most infringements';

-- ============================================================================
-- Analytics View: Repeat Infringer Organizations
-- ============================================================================
CREATE OR REPLACE VIEW repeat_infringer_organizations AS
SELECT
  whois_registrant_org as organization,
  whois_registrant_country as country,
  whois_domain,
  COUNT(*) as total_infringements,
  COUNT(*) FILTER (WHERE status = 'active') as active_infringements,
  SUM(est_revenue_loss) as total_est_loss,
  ARRAY_AGG(DISTINCT platform) as platforms,
  MIN(created_at) as first_seen,
  MAX(created_at) as last_seen
FROM infringements
WHERE whois_registrant_org IS NOT NULL
GROUP BY whois_registrant_org, whois_registrant_country, whois_domain
HAVING COUNT(*) > 1  -- Only show repeat infringers
ORDER BY total_infringements DESC;

COMMENT ON VIEW repeat_infringer_organizations IS 'Identifies organizations with multiple infringements (repeat infringers)';
