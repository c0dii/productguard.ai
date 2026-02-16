import { createAdminClient } from '@/lib/supabase/server';
import type { Product, InfringementResult } from '@/types';
import { scanGoogle } from './platforms/google';
import { scanTelegram } from './platforms/telegram';
import { scanCyberlockers } from './platforms/cyberlockers';
import { scanTorrents } from './platforms/torrents';
import { scanDiscord } from './platforms/discord';
import { scanForums } from './platforms/forums';
import { evidenceCollector } from '@/lib/enforcement/evidence-collector';
import { priorityScorer } from '@/lib/enforcement/priority-scorer';
import { infrastructureProfiler } from '@/lib/enforcement/infrastructure-profiler';
import crypto from 'crypto';

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

  try {
    // Update scan status to running
    await supabase
      .from('scans')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .eq('id', scanId);

    // Run all platform scanners in parallel
    const scanResults = await runPlatformScanners(product);

    // Calculate total revenue loss
    const totalRevenueLoss = scanResults.reduce((sum, result) => sum + result.est_revenue_loss, 0);

    // Insert infringements into database with evidence and priority scoring
    if (scanResults.length > 0) {
      const infringementsWithScoring = await Promise.all(
        scanResults.map(async (result) => {
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

            // Status tracking
            status: 'pending_verification' as const, // Changed from 'active' - user must verify first
            next_check_at: nextCheckAt.toISOString(),
          };
        })
      );

      // Deduplicate before insert: check if URL hash already exists
      const dedupedInfringements = [];
      let updatedCount = 0;

      for (const inf of infringementsWithScoring) {
        // Check if URL hash already exists for this product
        const { data: existing } = await supabase
          .from('infringements')
          .select('id, seen_count, status, verified_by_user_at')
          .eq('product_id', inf.product_id)
          .eq('url_hash', inf.url_hash)
          .maybeSingle();

        if (existing) {
          // URL already exists - update last_seen_at and increment seen_count
          await supabase
            .from('infringements')
            .update({
              last_seen_at: inf.last_seen_at,
              seen_count: existing.seen_count + 1,
            })
            .eq('id', existing.id);

          updatedCount++;
          console.log(
            `Updated existing infringement: ${inf.url_normalized} (seen ${existing.seen_count + 1} times)`
          );
        } else {
          // New unique URL - add to insert batch
          dedupedInfringements.push(inf);
        }
      }

      // Insert only new unique infringements
      if (dedupedInfringements.length > 0) {
        const { error: insertError } = await supabase.from('infringements').insert(dedupedInfringements);

        if (insertError) {
          console.error('Error inserting infringements:', insertError);
        } else {
          console.log(
            `Inserted ${dedupedInfringements.length} new unique infringements, updated ${updatedCount} existing`
          );
        }
      } else {
        console.log(`No new infringements found. Updated ${updatedCount} existing infringement(s).`);
      }
    }

    // Update scan status to completed
    await supabase
      .from('scans')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        infringement_count: scanResults.length,
        est_revenue_loss: totalRevenueLoss,
      })
      .eq('id', scanId);

    console.log(`Scan ${scanId} completed: ${scanResults.length} infringements found`);

    // TODO: Send email notification via Resend (Phase 2)
  } catch (error) {
    console.error(`Scan ${scanId} failed:`, error);

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
 * Run all platform scanners and aggregate results
 */
async function runPlatformScanners(product: Product): Promise<InfringementResult[]> {
  const allResults: InfringementResult[] = [];

  try {
    // Run all scanners in parallel
    const [googleResults, telegramResults, cyberlockerResults, torrentResults, discordResults, forumResults] =
      await Promise.all([
        scanGoogle(product),
        scanTelegram(product),
        scanCyberlockers(product),
        scanTorrents(product),
        scanDiscord(product),
        scanForums(product),
      ]);

    // Aggregate all results
    allResults.push(
      ...googleResults,
      ...telegramResults,
      ...cyberlockerResults,
      ...torrentResults,
      ...discordResults,
      ...forumResults
    );
  } catch (error) {
    console.error('Platform scanner error:', error);
  }

  return allResults;
}
