-- Fix product_scan_status view to show actual infringements created
-- instead of raw SERP URLs found (which is misleading).
-- Cannot rename columns with CREATE OR REPLACE, so drop and recreate.

DROP VIEW IF EXISTS product_scan_status;

CREATE VIEW product_scan_status AS
SELECT
  p.id as product_id,
  p.name as product_name,
  s.id as scan_id,
  s.status as scan_status,
  s.run_count,
  s.initial_run_at as first_scanned_at,
  s.last_run_at,
  s.infringement_count as total_infringements,

  -- Infringement counts by status
  COUNT(*) FILTER (WHERE i.status = 'pending_verification') as pending_verification_count,
  COUNT(*) FILTER (WHERE i.status = 'active') as active_count,
  COUNT(*) FILTER (WHERE i.status IN ('removed', 'disputed')) as resolved_count,
  COUNT(*) FILTER (WHERE i.status = 'false_positive') as false_positive_count,

  -- Recent run stats - use new_infringements_created (actual inserts), NOT new_urls_found (raw SERP results)
  (SELECT sh.new_infringements_created
   FROM scan_history sh
   WHERE sh.scan_id = s.id
   ORDER BY sh.run_at DESC
   LIMIT 1) as last_run_new_infringements,

  (SELECT sh.api_calls_saved
   FROM scan_history sh
   WHERE sh.scan_id = s.id
   ORDER BY sh.run_at DESC
   LIMIT 1) as last_run_api_savings

FROM products p
LEFT JOIN scans s ON s.product_id = p.id AND s.id = (
  SELECT id FROM scans WHERE product_id = p.id ORDER BY created_at DESC LIMIT 1
)
LEFT JOIN infringements i ON i.product_id = p.id
GROUP BY p.id, p.name, s.id, s.status, s.run_count, s.initial_run_at, s.last_run_at, s.infringement_count;
