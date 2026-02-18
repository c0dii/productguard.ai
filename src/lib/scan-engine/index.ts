import { createAdminClient } from '@/lib/supabase/server';
import type { Product, InfringementResult, ScanStage } from '@/types';
import { SerpClient } from './serp-client';
import { ScanLogger } from './scan-logger';
import { generateQueries, type GeneratedQuery } from './query-generator';
import { scoreResult } from './scoring';
import { scanTelegram } from './platforms/telegram';
import { evidenceCollector } from '@/lib/enforcement/evidence-collector';
import { priorityScorer } from '@/lib/enforcement/priority-scorer';
import { infrastructureProfiler } from '@/lib/enforcement/infrastructure-profiler';
import { filterSearchResults, estimateFilteringCost } from '@/lib/ai/infringement-filter';
import { trackFirstScan, trackScanCompleted, trackHighSeverityInfringement } from '@/lib/ghl/events';
import { fetchIntelligenceForScan, type IntelligenceData } from '@/lib/intelligence/intelligence-engine';
import { notifyHighSeverityInfringement, notifyScanComplete, notifyScanError } from '@/lib/notifications/email';
import crypto from 'crypto';

/**
 * Default scan stages matching what ScanProgressTracker expects.
 * We update these in the DB as the scan progresses.
 */
const SCAN_STAGES: ScanStage[] = [
  { name: 'initialization', display_name: 'Search Initialization', status: 'pending', started_at: null, completed_at: null },
  { name: 'keyword_search', display_name: 'Keyword Discovery', status: 'pending', started_at: null, completed_at: null },
  { name: 'trademark_search', display_name: 'Trademark Protection Scan', status: 'pending', started_at: null, completed_at: null },
  { name: 'phrase_matching', display_name: 'Content Signature Analysis', status: 'pending', started_at: null, completed_at: null },
  { name: 'marketplace_scan', display_name: 'Marketplace Intelligence', status: 'pending', started_at: null, completed_at: null },
  { name: 'platform_scan', display_name: 'Platform Network Scan', status: 'pending', started_at: null, completed_at: null },
  { name: 'finalization', display_name: 'Results Compilation', status: 'pending', started_at: null, completed_at: null },
];

/**
 * Update scan progress in the database.
 * Mutates the stages array in-place for convenience, then writes to DB.
 */
async function updateScanProgress(
  supabase: ReturnType<typeof createAdminClient>,
  scanId: string,
  stages: ScanStage[],
  currentStage: string,
) {
  await supabase
    .from('scans')
    .update({
      scan_progress: { current_stage: currentStage, stages },
    })
    .eq('id', scanId);
}

function setStageStatus(
  stages: ScanStage[],
  name: string,
  status: ScanStage['status'],
  resultCount?: number,
) {
  const stage = stages.find((s) => s.name === name);
  if (!stage) return;
  const now = new Date().toISOString();
  stage.status = status;
  if (status === 'in_progress') stage.started_at = now;
  if (status === 'completed') stage.completed_at = now;
  if (resultCount !== undefined) stage.result_count = resultCount;
}

/**
 * Normalize URL for consistent deduplication
 * Removes protocol, www prefix, query params, and trailing slashes
 */
function normalizeUrl(url: string): string {
  let normalized = url.toLowerCase();
  normalized = normalized.replace(/^https?:\/\//, '');
  normalized = normalized.replace(/^www\./, '');
  normalized = normalized.replace(/[?#].*$/, '');
  normalized = normalized.replace(/\/+$/, '');
  return normalized;
}

/**
 * Generate SHA256 hash of normalized URL for deduplication
 */
function generateUrlHash(url: string): string {
  const normalized = normalizeUrl(url);
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Main scan orchestrator
 * Coordinates scans across all platforms and aggregates results
 */
export async function scanProduct(scanId: string, product: Product): Promise<void> {
  const supabase = createAdminClient();
  const scanStartTime = Date.now();
  const MAX_SCAN_DURATION_MS = 240_000; // 4 minute hard cap (leave 1 min buffer for maxDuration=300)
  let logger: ScanLogger | undefined;

  try {
    // Get current scan info to determine if this is a re-run
    const { data: currentScan } = await supabase
      .from('scans')
      .select('run_count, initial_run_at')
      .eq('id', scanId)
      .single();

    const isFirstRun = !currentScan?.run_count || currentScan.run_count === 1;
    const runNumber = (currentScan?.run_count || 0) + 1;

    // Initialize structured logger
    logger = new ScanLogger(scanId, product.id, product.user_id, product, {
      serpBudget: 50,
      maxDurationMs: MAX_SCAN_DURATION_MS,
      aiFilterEnabled: process.env.DISABLE_AI_FILTER !== 'true',
      aiConfidenceThreshold: parseFloat(process.env.AI_CONFIDENCE_THRESHOLD || '0.75'),
      runNumber,
    });

    logger.info('initialization', `Scan started (Run #${runNumber}, first=${isFirstRun})`);

    // Update scan status to running
    const stages = SCAN_STAGES.map((s) => ({ ...s })); // Deep copy
    setStageStatus(stages, 'initialization', 'completed');
    setStageStatus(stages, 'keyword_search', 'in_progress');

    await supabase
      .from('scans')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
        last_run_at: new Date().toISOString(),
        run_count: runNumber,
        scan_progress: { current_stage: 'keyword_search', stages },
      })
      .eq('id', scanId);

    // Fetch intelligence data for query optimization (non-blocking)
    const intelligence = await fetchIntelligenceForScan(supabase, product.id);

    // ── TIERED SEARCH via SerpClient ──────────────────────────────────
    const scanResults = await runTieredSearch(
      product,
      intelligence,
      supabase,
      scanId,
      stages,
      scanStartTime,
      MAX_SCAN_DURATION_MS,
      logger,
    );

    logger.info('keyword_search', `Found ${scanResults.length} raw results from tiered search`, {
      results_count: scanResults.length,
      elapsed_ms: Date.now() - scanStartTime,
    });

    // Progress: All search tiers + Telegram complete, starting AI filtering
    setStageStatus(stages, 'phrase_matching', 'in_progress');
    await updateScanProgress(supabase, scanId, stages, 'phrase_matching');

    // DELTA DETECTION: Fetch existing URL hashes for this product
    const { data: existingInfringements } = await supabase
      .from('infringements')
      .select('id, url_hash, source_url, status, seen_count')
      .eq('product_id', product.id);

    const existingUrlHashes = new Set(
      (existingInfringements || []).map((inf) => inf.url_hash).filter((hash): hash is string => hash !== null)
    );

    logger.info('phrase_matching', `Delta Detection: Found ${existingUrlHashes.size} existing URLs in database`, {
      existing_url_count: existingUrlHashes.size,
    });

    // Filter out known URLs BEFORE expensive processing
    const newResults = scanResults.filter((result) => {
      const urlHash = generateUrlHash(result.source_url);
      return !existingUrlHashes.has(urlHash);
    });

    const knownUrls = scanResults.length - newResults.length;

    logger.info('phrase_matching', `Delta Detection: ${newResults.length} new URLs, ${knownUrls} already tracked`, {
      new_urls: newResults.length,
      known_urls: knownUrls,
    });

    // WHITELIST URL FILTERING: Remove user-approved URLs before expensive processing
    const whitelistUrls = product.whitelist_urls || [];
    let whitelistFiltered = newResults;
    if (whitelistUrls.length > 0) {
      const normalizedWhitelist = whitelistUrls.map(u =>
        u.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '')
      );
      whitelistFiltered = newResults.filter((result) => {
        const normalizedResultUrl = result.source_url.toLowerCase()
          .replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
        return !normalizedWhitelist.some(wUrl =>
          normalizedResultUrl === wUrl || normalizedResultUrl.startsWith(wUrl)
        );
      });
      const whitelistSkipped = newResults.length - whitelistFiltered.length;
      if (whitelistSkipped > 0) {
        logger.info('phrase_matching', `Whitelist: Skipped ${whitelistSkipped} user-approved URLs`, {
          whitelist_skipped: whitelistSkipped,
        });
      }
    }

    // Calculate API savings
    const apiCallsSaved = knownUrls; // Each known URL saves 1 WHOIS + DNS lookup
    const aiFilteringSaved = knownUrls; // Each known URL saves 1 AI filtering call

    // Use filtered results for processing
    const resultsToProcess = whitelistFiltered;

    // AI-POWERED FILTERING: Remove false positives before processing
    // Only process NEW URLs (delta detection saves AI costs)
    const useAIFilter = process.env.DISABLE_AI_FILTER !== 'true';
    const aiConfidenceThreshold = parseFloat(process.env.AI_CONFIDENCE_THRESHOLD || '0.75');

    let filteredResults = resultsToProcess;

    if (useAIFilter && resultsToProcess.length > 0) {
      filteredResults = await filterSearchResults(resultsToProcess, product, aiConfidenceThreshold, intelligence);

      const passRate = resultsToProcess.length > 0 ? ((filteredResults.length / resultsToProcess.length) * 100).toFixed(1) : '0';
      logger.info('phrase_matching', `AI Filter: ${filteredResults.length}/${resultsToProcess.length} NEW results passed (${passRate}% pass rate)`, {
        ai_passed: filteredResults.length,
        ai_total: resultsToProcess.length,
        pass_rate: parseFloat(passRate),
        ai_cost_usd: parseFloat(estimateFilteringCost(resultsToProcess.length).toFixed(4)),
        ai_savings_usd: parseFloat(estimateFilteringCost(aiFilteringSaved).toFixed(4)),
      });
    } else if (resultsToProcess.length === 0) {
      logger.info('phrase_matching', 'No new URLs to filter (all URLs already tracked)');
    } else {
      logger.warn('phrase_matching', 'AI filtering disabled, using all new results');
    }

    // Progress: AI filtering complete
    setStageStatus(stages, 'phrase_matching', 'completed', filteredResults.length);
    setStageStatus(stages, 'finalization', 'in_progress');
    await updateScanProgress(supabase, scanId, stages, 'finalization');

    // DEDUPLICATION: Remove duplicate URLs within the same scan batch
    // Different platform scanners may find the same URL, causing unique constraint violations
    const seenUrlHashes = new Set<string>();
    const deduplicatedResults = filteredResults.filter((result) => {
      const urlHash = generateUrlHash(result.source_url);
      if (seenUrlHashes.has(urlHash)) {
        return false;
      }
      seenUrlHashes.add(urlHash);
      return true;
    });

    if (deduplicatedResults.length < filteredResults.length) {
      logger.info('finalization', `Deduplication: Removed ${filteredResults.length - deduplicatedResults.length} duplicate URLs within scan batch`, {
        duplicates_removed: filteredResults.length - deduplicatedResults.length,
      });
    }

    // Progress: Deduplication complete, evidence collection happening during insert

    // Calculate total revenue loss (from deduplicated results)
    const totalRevenueLoss = deduplicatedResults.reduce((sum, result) => sum + result.est_revenue_loss, 0);

    // Track actual inserted count
    let actualInsertedCount = 0;

    // Insert infringements into database with evidence and priority scoring
    if (deduplicatedResults.length > 0) {
      const infringementsWithScoring = await Promise.all(
        deduplicatedResults.map(async (result) => {
          // Collect evidence and infrastructure data in parallel
          const [evidence, infrastructure] = await Promise.all([
            evidenceCollector.collectEvidence(
              {
                url: result.source_url,
                platform: result.platform,
                detectionMethod: 'keyword', // TODO: Get from platform scanner
              },
              {
                productName: product.name,
                productUrl: product.url,
                keywords: product.keywords,
                fileHash: product.file_hash,
              }
            ),
            infrastructureProfiler.profile(result.source_url),
          ]);

          // Calculate match confidence
          const matchConfidence = evidenceCollector.calculateMatchConfidence(evidence, product);

          // Parse audience count from string
          const audienceCount = priorityScorer.parseAudienceCount(result.audience_size);

          // Calculate priority and severity score (with country data for enforceability bonus)
          const scoring = priorityScorer.score({
            matchConfidence,
            platform: result.platform,
            audienceCount,
            monetizationDetected: false, // TODO: Detect monetization in platform scanners
            estimatedRevenueLoss: result.est_revenue_loss,
            riskLevel: result.risk_level,
            country: infrastructure.country, // Add country for priority boosting
          });

          // Calculate next check time based on priority
          const nextCheckAt = priorityScorer.calculateNextCheck(scoring.priority);

          // Generate URL hash for deduplication
          const urlHash = generateUrlHash(result.source_url);
          const urlNormalized = normalizeUrl(result.source_url);
          const now = new Date().toISOString();

          // Extract WHOIS data from infrastructure profile
          const whoisFullRecord = (infrastructure.whois_data as any)?._fullRecord || null;
          const whoisDomain = whoisFullRecord?.domain || null;

          return {
            scan_id: scanId,
            product_id: product.id,
            user_id: product.user_id, // Add user_id for RLS
            platform: result.platform,
            source_url: result.source_url,
            risk_level: result.risk_level,
            type: result.type,

            // URL deduplication fields
            url_hash: urlHash,
            url_normalized: urlNormalized,
            first_seen_at: now,
            last_seen_at: now,
            seen_count: 1,

            // Verification tracking (initially null, user must verify)
            verified_by_user_at: null,
            verified_by_user_id: null,

            // Enhanced fields
            severity_score: scoring.severityScore,
            priority: scoring.priority,
            match_type: 'keyword' as const, // TODO: Get from detection
            match_confidence: matchConfidence,
            match_evidence: evidence.matched_excerpts,
            audience_size: result.audience_size,
            audience_count: audienceCount,
            monetization_detected: false, // TODO: Detect in platform scanners
            est_revenue_loss: result.est_revenue_loss,

            // Evidence packet
            evidence,

            // Infrastructure profile (populated via WHOIS and DNS lookups)
            infrastructure,

            // WHOIS data (dedicated columns for queryability)
            whois_domain: whoisDomain,
            whois_registrant_org: whoisFullRecord?.registrant_organization || null,
            whois_registrant_country: whoisFullRecord?.registrant_country || null,
            whois_registrant_country_code: whoisFullRecord?.registrant_country_code || null,
            whois_registrar_name: whoisFullRecord?.registrar_name || infrastructure.registrar || null,
            whois_registrar_abuse_email: whoisFullRecord?.registrar_abuse_email || infrastructure.abuse_contact || null,
            whois_registrar_abuse_phone: whoisFullRecord?.registrar_abuse_phone || null,
            whois_created_date: whoisFullRecord?.created_date || infrastructure.creation_date || null,
            whois_updated_date: whoisFullRecord?.updated_date || null,
            whois_expires_date: whoisFullRecord?.expires_date || infrastructure.expiration_date || null,
            whois_name_servers: whoisFullRecord?.name_servers || infrastructure.nameservers || [],
            whois_status: whoisFullRecord?.status || null,
            whois_domain_age_days: whoisFullRecord?.estimated_domain_age_days || null,
            whois_fetched_at: whoisFullRecord ? now : null,

            // Status tracking
            status: 'pending_verification' as const, // Changed from 'active' - user must verify first
            next_check_at: nextCheckAt.toISOString(),
          };
        })
      );

      // All results here are NEW and deduplicated (within-batch + delta detection)
      // Use regular insert — deduplication already handles duplicates
      const { data: insertedData, error: insertError } = await supabase
        .from('infringements')
        .insert(infringementsWithScoring)
        .select('id');

      if (insertError) {
        logger.error('finalization', `Batch insert failed: ${insertError.message}`, 'DB_BATCH_FAIL', {
          error_message: insertError.message,
          error_code: insertError.code,
          batch_size: infringementsWithScoring.length,
        });
        // Attempt individual inserts as fallback so partial results aren't lost
        for (const infringement of infringementsWithScoring) {
          const { error: singleError } = await supabase
            .from('infringements')
            .insert(infringement);
          if (!singleError) {
            actualInsertedCount++;
          } else {
            logger.warn('finalization', `Failed to insert ${infringement.source_url}: ${singleError.message}`, 'DB_INSERT_FAIL');
          }
        }
        logger.selfHeal('finalization', 'DB_BATCH_FAIL', `Switched to individual inserts: ${actualInsertedCount}/${infringementsWithScoring.length} succeeded`, {
          inserted: actualInsertedCount,
          total: infringementsWithScoring.length,
        });
      } else {
        actualInsertedCount = insertedData?.length ?? infringementsWithScoring.length;
        logger.info('finalization', `Inserted ${actualInsertedCount} new unique infringements`, {
          inserted_count: actualInsertedCount,
        });
      }
    }

    // Progress: Results inserted
    setStageStatus(stages, 'finalization', 'completed', actualInsertedCount);
    await updateScanProgress(supabase, scanId, stages, 'finalization');

    // Update last_seen_at and seen_count for known URLs that were re-discovered
    if (knownUrls > 0) {
      const now = new Date().toISOString();

      // Build a map from url_hash to existing record for efficient lookup
      const existingMap = new Map(
        (existingInfringements || [])
          .filter((inf) => inf.url_hash !== null)
          .map((inf) => [inf.url_hash, { id: inf.id, seen_count: inf.seen_count || 1, status: inf.status }])
      );

      // Update each known URL with incremented seen_count
      const updatePromises = scanResults
        .filter((result) => {
          const urlHash = generateUrlHash(result.source_url);
          return existingUrlHashes.has(urlHash);
        })
        .map((result) => {
          const urlHash = generateUrlHash(result.source_url);
          const existing = existingMap.get(urlHash);
          if (!existing) return Promise.resolve();

          return supabase
            .from('infringements')
            .update({
              last_seen_at: now,
              seen_count: existing.seen_count + 1,
            })
            .eq('id', existing.id);
        });

      const results = await Promise.all(updatePromises);
      const errors = results.filter((r) => r && 'error' in r && r.error);

      if (errors.length > 0) {
        logger.warn('finalization', `Failed to update ${errors.length} existing infringements`, 'DB_INSERT_FAIL');
      } else {
        logger.info('finalization', `Updated ${knownUrls} existing infringements with new last_seen_at timestamp`, {
          updated_count: knownUrls,
        });
      }

      // Re-listing detection: check if any previously removed URLs have reappeared
      const removedUrls = scanResults.filter((result) => {
        const urlHash = generateUrlHash(result.source_url);
        const existing = existingMap.get(urlHash);
        return existing && existing.status === 'removed';
      });

      if (removedUrls.length > 0) {
        // Check global + per-user re-listing monitoring settings
        let relistingEnabled = true;

        try {
          const { data: globalSetting } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'relisting_monitoring_global')
            .single();

          if (globalSetting?.value && (globalSetting.value as any).enabled === false) {
            relistingEnabled = false;
            logger.info('finalization', 'Re-listing monitoring disabled globally');
          }
        } catch {
          // If system_settings table doesn't exist yet, default to enabled
        }

        if (relistingEnabled) {
          try {
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('relisting_monitoring_enabled')
              .eq('id', product.user_id)
              .single();

            if (userProfile?.relisting_monitoring_enabled === false) {
              relistingEnabled = false;
              logger.info('finalization', `Re-listing monitoring disabled for user ${product.user_id}`);
            }
          } catch {
            // Default to enabled if column doesn't exist yet
          }
        }

        if (relistingEnabled) {
          logger.info('finalization', `Re-listing detection: ${removedUrls.length} previously removed URLs reappeared`);

          for (const result of removedUrls) {
            const urlHash = generateUrlHash(result.source_url);
            const existing = existingMap.get(urlHash);
            if (!existing) continue;

            // Re-activate the infringement
            await supabase
              .from('infringements')
              .update({ status: 'active' })
              .eq('id', existing.id);

            // Log the status transition
            await supabase.from('status_transitions').insert({
              infringement_id: existing.id,
              from_status: 'removed',
              to_status: 'active',
              reason: 'Re-listing detected: previously removed content reappeared during scan',
              changed_by: 'system',
            });

            logger.info('finalization', `Re-listed infringement ${existing.id}: removed → active (${result.source_url})`);
          }

          // Send re-listing notification emails
          try {
            const { notifyRelisting } = await import('@/lib/notifications/email');
            const { data: userData } = await supabase.auth.admin.getUserById(product.user_id);
            const userEmail = userData?.user?.email;

            if (userEmail) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', product.user_id)
                .single();

              for (const result of removedUrls) {
                const urlHash = generateUrlHash(result.source_url);
                const existing = existingMap.get(urlHash);
                if (!existing) continue;

                await notifyRelisting({
                  to: userEmail,
                  userName: profile?.full_name || 'there',
                  productName: product.name,
                  sourceUrl: result.source_url,
                  platform: result.platform,
                  originalRemovalDate: now, // approximate
                  infringementId: existing.id,
                });
              }
            }
          } catch (notifyError) {
            logger.warn('finalization', `Failed to send re-listing notifications: ${notifyError}`, 'EMAIL_FAIL');
          }
        }
      }
    }

    // Calculate scan duration
    const durationSeconds = Math.floor((Date.now() - scanStartTime) / 1000);

    // Update scan status to completed (use actual inserted count, not filtered count)
    await supabase
      .from('scans')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        infringement_count: actualInsertedCount,
        est_revenue_loss: totalRevenueLoss,
      })
      .eq('id', scanId);

    // Create scan_history entry
    const { error: historyError } = await supabase.from('scan_history').insert({
      scan_id: scanId,
      run_number: runNumber,
      run_at: new Date().toISOString(),
      new_urls_found: scanResults.length,
      total_urls_scanned: scanResults.length,
      new_infringements_created: actualInsertedCount,
      api_calls_saved: apiCallsSaved,
      ai_filtering_saved: aiFilteringSaved,
      duration_seconds: durationSeconds,
      platforms_searched: ['tiered-search', 'telegram-bot-api'],
      search_queries_used: product.keywords || [],
    });

    if (historyError) {
      logger.error('finalization', `Error creating scan history: ${historyError.message}`, 'DB_INSERT_FAIL', {
        error_message: historyError.message,
      });
    }

    logger.info('finalization', `Scan completed (Run #${runNumber}): ${actualInsertedCount} new infringements`, {
      run_number: runNumber,
      inserted_count: actualInsertedCount,
      processed_count: deduplicatedResults.length,
      total_scanned: scanResults.length,
      known_urls: knownUrls,
      new_urls: newResults.length,
      api_calls_saved: apiCallsSaved,
      ai_filtering_saved: aiFilteringSaved,
      duration_seconds: durationSeconds,
    });

    // ── Early Evidence Capture for P0 Results ────────────────────────
    // Trigger lightweight evidence capture for P0 infringements at scan time
    // so evidence exists before user verification
    if (filteredResults.length > 0) {
      const p0Results = filteredResults.filter((r: any) => r.priority === 'P0' || r.severity_score >= 80);
      if (p0Results.length > 0) {
        logger.info('finalization', `Triggering early evidence capture for ${p0Results.length} P0 results`, {
          p0_count: p0Results.length,
        });

        // Capture page content for P0 results (non-blocking, best-effort)
        for (const result of p0Results.slice(0, 5)) { // Cap at 5 to avoid overloading
          try {
            const response = await fetch(result.source_url, {
              headers: { 'User-Agent': 'ProductGuard-Scanner/1.0' },
              signal: AbortSignal.timeout(8000),
            });
            if (response.ok) {
              const html = await response.text();
              const pageText = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 5000);
              const contentHash = crypto.createHash('sha256').update(html).digest('hex');

              // Store early capture as evidence_snapshot stub
              await supabase.from('evidence_snapshots').insert({
                infringement_id: null, // Will be linked after insert
                user_id: product.user_id,
                page_url: result.source_url,
                content_hash: contentHash,
                captured_at: new Date().toISOString(),
                page_capture: {
                  page_text: pageText,
                  html_hash: contentHash,
                  early_capture: true,
                },
              });
              logger.info('finalization', `Early evidence captured for: ${result.source_url}`);
            }
          } catch {
            // Non-blocking — evidence capture failures don't affect scan
          }
        }
      }
    }

    // Track scan completion in GHL
    try {
      // Get user email
      const { data: userData } = await supabase.auth.admin.getUserById(product.user_id);

      if (userData?.user?.email) {
        // Check if this is the first scan
        const { data: scans } = await supabase
          .from('scans')
          .select('id')
          .eq('user_id', product.user_id)
          .eq('status', 'completed')
          .order('created_at', { ascending: true })
          .limit(2);

        const isFirstScan = scans && scans.length === 1;

        if (isFirstScan) {
          // Track first scan
          await trackFirstScan(
            product.user_id,
            userData.user.email,
            scanId,
            product.name,
            filteredResults.length
          );
        } else {
          // Track regular scan completion
          await trackScanCompleted(
            product.user_id,
            userData.user.email,
            scanId,
            scans?.length || 1
          );
        }

        // Track high severity infringements
        const highSeverityResults = filteredResults.filter(r => (r as any).severity_score >= 80);
        for (const result of highSeverityResults) {
          await trackHighSeverityInfringement(
            product.user_id,
            userData.user.email,
            '',
            result.source_url,
            (result as any).severity_score || 80,
            result.platform,
            product.name
          );
        }
      }
    } catch (error) {
      logger.error('notification', `Error tracking events in GHL: ${error instanceof Error ? error.message : String(error)}`, 'GHL_FAIL', {
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Don't fail the scan if GHL tracking fails
    }

    // ── Email Notifications via Resend ──────────────────────────────
    try {
      const { data: userData } = await supabase.auth.admin.getUserById(product.user_id);
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', product.user_id)
        .single();

      if (userData?.user?.email) {
        const userName = userProfile?.full_name || 'there';
        const p0Count = filteredResults.filter((r: any) => r.priority === 'P0' || r.severity_score >= 80).length;

        // Send scan complete notification
        await notifyScanComplete({
          to: userData.user.email,
          userName,
          productName: product.name,
          scanId,
          newInfringements: filteredResults.length,
          totalScanned: scanResults.length,
          p0Count,
        });

        // Send individual P0 alerts for critical findings
        const highSeverityInfringements = filteredResults.filter((r: any) => r.severity_score >= 80);
        for (const result of highSeverityInfringements.slice(0, 3)) {
          await notifyHighSeverityInfringement({
            to: userData.user.email,
            userName,
            productName: product.name,
            sourceUrl: result.source_url,
            platform: result.platform,
            severityScore: (result as any).severity_score || 80,
            estRevenueLoss: result.est_revenue_loss,
            infringementId: '', // Not yet inserted, will have ID after insert
          });
        }
      }
    } catch (error) {
      logger.error('notification', `Error sending email notifications: ${error instanceof Error ? error.message : String(error)}`, 'EMAIL_FAIL', {
        stack: error instanceof Error ? error.stack : undefined,
      });
    }

    // Final flush — persist all buffered logs
    await logger.flush();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Logger may not exist if error happened before initialization
    if (logger) {
      logger.fatal('initialization', `Scan failed: ${errorMessage}`, 'UNKNOWN', {
        stack: errorStack,
      });
      await logger.flush();

      // Send admin alert for fatal scan failure
      try {
        await notifyScanError({
          scanId,
          productName: product.name,
          productId: product.id,
          errorCode: 'UNKNOWN',
          errorMessage,
          stage: 'initialization',
          scanParams: logger.getScanParams(),
          recentLogs: logger.getRecentLogs(10),
        });
      } catch {
        // Don't let alert failure mask the original error
      }
    } else {
      console.error(`Scan ${scanId} failed (pre-logger):`, error);
    }

    // Update scan status to failed
    await supabase
      .from('scans')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', scanId);
  }
}

/**
 * Run tiered search using SerpClient + Telegram Bot API.
 *
 * Tier 1: Broad Discovery (8-12 queries @ num=30)
 * Tier 2: Targeted Platform (10-20 queries @ num=10)
 * Tier 3: Signal-Based Deep Dive (0-10 queries @ num=10)
 * + Telegram Bot API channel search
 *
 * Updates scan progress stages as each tier completes.
 * Hard cap: 50 SerpAPI calls per scan via SerpClient budget.
 */
async function runTieredSearch(
  product: Product,
  intelligence: IntelligenceData,
  supabase: ReturnType<typeof createAdminClient>,
  scanId: string,
  stages: ScanStage[],
  scanStartTime: number = Date.now(),
  maxDurationMs: number = 240_000,
  logger?: ScanLogger,
): Promise<InfringementResult[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey || apiKey === 'xxxxx') {
    logger?.warn('keyword_search', 'No Serper API key configured, skipping tiered search', 'API_LIMIT');
    // Still run Telegram Bot API
    const telegramResults = await scanTelegram(product, intelligence);
    return telegramResults;
  }

  const isTimedOut = () => Date.now() - scanStartTime > maxDurationMs;

  const client = new SerpClient(apiKey, 50);
  const allResults: InfringementResult[] = [];
  const allFoundUrls: string[] = [];

  // Generate Tier 1 + Tier 2 queries (Tier 3 needs Tier 1/2 URLs)
  const { tier1, tier2 } = generateQueries(product, intelligence);

  // ── TIER 1: Broad Discovery ──────────────────────────────────────
  logger?.info('keyword_search', `Tier 1: ${tier1.length} broad queries (budget: ${client.remaining})`, {
    tier: 1,
    query_count: tier1.length,
    budget_remaining: client.remaining,
  });

  const tier1Responses = await client.searchBatch(
    tier1.map((q) => ({ query: q.query, num: q.num }))
  );

  for (let i = 0; i < tier1Responses.length; i++) {
    const response = tier1Responses[i];
    const queryInfo = tier1[i];
    if (!response || !queryInfo) continue;

    for (const result of response.organic_results) {
      const scored = scoreResult(
        {
          url: result.link,
          title: result.title,
          snippet: result.snippet,
          position: result.position,
          query: response.query,
          queryCategory: queryInfo.category,
          tier: queryInfo.tier,
        },
        product
      );

      if (!scored.isFalsePositive) {
        allFoundUrls.push(result.link);
        allResults.push({
          platform: scored.platform,
          source_url: result.link,
          risk_level: scored.risk_level,
          type: scored.type,
          audience_size: scored.audience_size,
          est_revenue_loss: scored.est_revenue_loss,
          title: result.title,
          snippet: result.snippet,
        });
      }
    }
  }

  logger?.info('keyword_search', `Tier 1 complete: ${allResults.length} results (${client.used} API calls used)`, {
    tier: 1,
    results_count: allResults.length,
    api_calls_used: client.used,
    elapsed_ms: Date.now() - scanStartTime,
  });

  // Progress: Tier 1 (Keyword Discovery) complete
  setStageStatus(stages, 'keyword_search', 'completed', allResults.length);
  setStageStatus(stages, 'trademark_search', 'in_progress');
  await updateScanProgress(supabase, scanId, stages, 'trademark_search');

  // ── TIER 2: Targeted Platform ────────────────────────────────────
  logger?.info('trademark_search', `Tier 2: ${tier2.length} platform queries (budget: ${client.remaining})`, {
    tier: 2,
    query_count: tier2.length,
    budget_remaining: client.remaining,
  });

  const tier2Responses = await client.searchBatch(
    tier2.map((q) => ({ query: q.query, num: q.num }))
  );

  const tier2StartCount = allResults.length;

  for (let i = 0; i < tier2Responses.length; i++) {
    const response = tier2Responses[i];
    const queryInfo = tier2[i];
    if (!response || !queryInfo) continue;

    for (const result of response.organic_results) {
      const scored = scoreResult(
        {
          url: result.link,
          title: result.title,
          snippet: result.snippet,
          position: result.position,
          query: response.query,
          queryCategory: queryInfo.category,
          tier: queryInfo.tier,
        },
        product
      );

      if (!scored.isFalsePositive) {
        allFoundUrls.push(result.link);
        allResults.push({
          platform: scored.platform,
          source_url: result.link,
          risk_level: scored.risk_level,
          type: scored.type,
          audience_size: scored.audience_size,
          est_revenue_loss: scored.est_revenue_loss,
          title: result.title,
          snippet: result.snippet,
        });
      }
    }
  }

  logger?.info('trademark_search', `Tier 2 complete: +${allResults.length - tier2StartCount} results (${client.used} API calls used)`, {
    tier: 2,
    new_results: allResults.length - tier2StartCount,
    total_results: allResults.length,
    api_calls_used: client.used,
    elapsed_ms: Date.now() - scanStartTime,
  });

  // Progress: Tier 2 (Trademark Protection) complete
  setStageStatus(stages, 'trademark_search', 'completed', allResults.length - tier2StartCount);
  setStageStatus(stages, 'marketplace_scan', 'in_progress');
  await updateScanProgress(supabase, scanId, stages, 'marketplace_scan');

  // ── TIER 3: Signal-Based Deep Dive ───────────────────────────────
  if (isTimedOut()) {
    logger?.selfHeal('marketplace_scan', 'TIMEOUT', 'Skipped Tier 3 and Telegram due to time limit', {
      elapsed_ms: Date.now() - scanStartTime,
      max_duration_ms: maxDurationMs,
    });
    setStageStatus(stages, 'marketplace_scan', 'completed', 0);
    setStageStatus(stages, 'platform_scan', 'completed', 0);
    return allResults;
  }

  if (client.remaining > 0 && allFoundUrls.length > 0) {
    const { tier3 } = generateQueries(product, intelligence, allFoundUrls);

    if (tier3.length > 0) {
      logger?.info('marketplace_scan', `Tier 3: ${tier3.length} deep-dive queries (budget: ${client.remaining})`, {
        tier: 3,
        query_count: tier3.length,
        budget_remaining: client.remaining,
      });

      const tier3Responses = await client.searchBatch(
        tier3.map((q) => ({ query: q.query, num: q.num }))
      );

      const tier3StartCount = allResults.length;

      for (let i = 0; i < tier3Responses.length; i++) {
        const response = tier3Responses[i];
        const queryInfo = tier3[i];
        if (!response || !queryInfo) continue;

        for (const result of response.organic_results) {
          const scored = scoreResult(
            {
              url: result.link,
              title: result.title,
              snippet: result.snippet,
              position: result.position,
              query: response.query,
              queryCategory: queryInfo.category,
              tier: queryInfo.tier,
            },
            product
          );

          if (!scored.isFalsePositive) {
            allResults.push({
              platform: scored.platform,
              source_url: result.link,
              risk_level: scored.risk_level,
              type: scored.type,
              audience_size: scored.audience_size,
              est_revenue_loss: scored.est_revenue_loss,
              title: result.title,
              snippet: result.snippet,
            });
          }
        }
      }

      logger?.info('marketplace_scan', `Tier 3 complete: +${allResults.length - tier3StartCount} results`, {
        tier: 3,
        new_results: allResults.length - tier3StartCount,
        total_results: allResults.length,
        api_calls_used: client.used,
        elapsed_ms: Date.now() - scanStartTime,
      });
    }
  }

  logger?.info('marketplace_scan', `SerpAPI budget: ${client.used}/50 calls used`, {
    api_calls_used: client.used,
    api_calls_remaining: client.remaining,
  });

  // Progress: Search tiers complete
  setStageStatus(stages, 'marketplace_scan', 'completed', allResults.length);
  setStageStatus(stages, 'platform_scan', 'in_progress');
  await updateScanProgress(supabase, scanId, stages, 'platform_scan');

  // ── TELEGRAM BOT API (supplementary channel search) ──────────────
  if (isTimedOut()) {
    logger?.selfHeal('platform_scan', 'TIMEOUT', 'Skipped Telegram due to time limit', {
      elapsed_ms: Date.now() - scanStartTime,
      max_duration_ms: maxDurationMs,
    });
    setStageStatus(stages, 'platform_scan', 'completed', 0);
    return allResults;
  }

  try {
    const telegramResults = await scanTelegram(product, intelligence);
    if (telegramResults.length > 0) {
      logger?.info('platform_scan', `Telegram Bot API: +${telegramResults.length} results`, {
        telegram_results: telegramResults.length,
      });
      allResults.push(...telegramResults);
    }
  } catch (error) {
    logger?.error('platform_scan', `Telegram scanner error: ${error instanceof Error ? error.message : String(error)}`, 'TELEGRAM_FAIL', {
      stack: error instanceof Error ? error.stack : undefined,
    });
    logger?.selfHeal('platform_scan', 'TELEGRAM_FAIL', 'Continued scan without Telegram results');
  }

  // Progress: Telegram complete
  setStageStatus(stages, 'platform_scan', 'completed', allResults.length);

  logger?.info('platform_scan', `Total raw results: ${allResults.length}`, {
    total_results: allResults.length,
    elapsed_ms: Date.now() - scanStartTime,
  });
  return allResults;
}
