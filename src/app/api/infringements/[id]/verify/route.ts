import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse, after } from 'next/server';
import crypto from 'crypto';
import { learnFromFeedback, recordDailyMetrics, calculatePerformanceMetrics, refreshPiracyKeywords } from '@/lib/intelligence/intelligence-engine';
import { createAdminClient } from '@/lib/supabase/server';
import { createBlockchainTimestamp, formatTimestampProof } from '@/lib/evidence/blockchain-timestamp';
import { capturePageEvidence } from '@/lib/evidence/capture-page';
import { trackInfringementVerified } from '@/lib/ghl/events';
import { analyzeEvidence } from '@/lib/evidence/analyze-evidence';

/**
 * POST /api/infringements/[id]/verify
 * Verify or reject a pending infringement
 *
 * Body: { action: 'verify' | 'reject' | 'whitelist' }
 *
 * - 'verify' → status becomes 'active', sets verified_by_user_at timestamp
 * - 'reject' → status becomes 'false_positive', excludes from charts
 * - 'whitelist' → status becomes 'archived', adds URL to product whitelist
 *
 * Heavy work (evidence capture, AI analysis, blockchain timestamp) runs
 * AFTER the response is sent via next/server `after()` so the user sees
 * the status change in ~1-2s instead of 15-20s.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  try {
    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { action } = body;

    if (!action || !['verify', 'reject', 'whitelist'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "verify", "reject", or "whitelist"' },
        { status: 400 }
      );
    }

    // Fetch infringement with product data (including AI data for evidence snapshot)
    const { data: infringement, error: fetchError } = await supabase
      .from('infringements')
      .select('*, products!inner(user_id, ai_extracted_data, keywords, name, description, url, type)')
      .eq('id', id)
      .single();

    if (fetchError || !infringement) {
      return NextResponse.json({ error: 'Infringement not found' }, { status: 404 });
    }

    // Check user owns the product associated with this infringement
    if (infringement.products.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update status based on action
    const newStatus = action === 'verify' ? 'active' : action === 'whitelist' ? 'archived' : 'false_positive';
    const now = new Date().toISOString();

    // If whitelisting, add the source URL to the product's whitelist_urls
    if (action === 'whitelist') {
      const { data: currentProduct } = await supabase
        .from('products')
        .select('whitelist_urls')
        .eq('id', infringement.product_id)
        .single();

      const existingUrls: string[] = currentProduct?.whitelist_urls || [];
      if (!existingUrls.includes(infringement.source_url)) {
        const { error: whitelistError } = await supabase
          .from('products')
          .update({ whitelist_urls: [...existingUrls, infringement.source_url] })
          .eq('id', infringement.product_id);

        if (whitelistError) {
          console.error('Error adding URL to whitelist:', whitelistError);
          return NextResponse.json({ error: 'Failed to whitelist URL' }, { status: 500 });
        }
      }
    }

    const { error: updateError } = await supabase
      .from('infringements')
      .update({
        status: newStatus,
        verified_by_user_at: action === 'verify' ? now : null,
        verified_by_user_id: action === 'verify' ? user.id : null,
        status_changed_at: now,
        previous_status: infringement.status,
        updated_at: now,
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating infringement:', updateError);
      return NextResponse.json({ error: 'Failed to update infringement' }, { status: 500 });
    }

    // Log status transition in audit table
    const transitionReason = action === 'verify'
      ? 'User verified as real infringement'
      : action === 'whitelist'
      ? `User whitelisted URL: ${infringement.source_url}`
      : 'User marked as false positive';

    await supabase.from('status_transitions').insert({
      infringement_id: id,
      from_status: infringement.status,
      to_status: newStatus,
      reason: transitionReason,
      triggered_by: 'user',
      metadata: { user_id: user.id, action, ...(action === 'whitelist' ? { whitelisted_url: infringement.source_url } : {}) },
    });

    // ─── FAST PATH COMPLETE ─── Response returns here (~1-2s) ───
    // Everything below runs AFTER the response is sent via after()

    // Capture request headers now (can't access request after response)
    const userIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    after(async () => {
      // ── Intelligence learning ──
      try {
        await learnFromFeedback(id, action);
        const metrics = await calculatePerformanceMetrics(infringement.product_id);
        await recordDailyMetrics(infringement.product_id, user.id, metrics);
        console.log(
          `[Intelligence] Learned from ${action} action. Precision: ${(metrics.precision_rate * 100).toFixed(1)}%`
        );

        // Refresh piracy keywords when enough feedback has accumulated.
        // Non-blocking: has internal guards (5+ feedback items, 24h cooldown).
        const adminClient = createAdminClient();
        refreshPiracyKeywords(adminClient, infringement.product_id).catch((err) =>
          console.error('[Intelligence] Piracy keyword refresh error:', err)
        );
      } catch (intelligenceError) {
        console.error('[Intelligence] Error in learning system:', intelligenceError);
      }

      // ── Evidence capture + snapshot (verify only) ──
      if (action === 'verify') {
        try {
          console.log('[Evidence Capture] Starting background evidence capture for', infringement.source_url);

          // Page capture + GHL tracking run in parallel
          const [pageCapture] = await Promise.all([
            capturePageEvidence(infringement.source_url, user.id, id),
            // GHL tracking in parallel
            (async () => {
              if (!user.email) return;
              try {
                const { data: verifiedInfringements } = await supabase
                  .from('infringements')
                  .select('id', { count: 'exact', head: true })
                  .eq('user_id', user.id)
                  .not('verified_by_user_at', 'is', null);

                await trackInfringementVerified(user.id, user.email, id, verifiedInfringements?.length || 1);
              } catch (ghlError) {
                console.error('[GHL Events] Error tracking verification:', ghlError);
              }
            })(),
          ]);

          // Build cryptographic hash of all evidence
          const evidenceData = JSON.stringify({
            url: infringement.source_url,
            infrastructure: infringement.infrastructure,
            evidence: infringement.evidence,
            page_html_hash: pageCapture.page_html_hash,
            page_text_length: pageCapture.page_text.length,
            page_links_count: pageCapture.page_links.length,
            wayback_url: pageCapture.wayback_url,
            timestamp: now,
          });
          const contentHash = crypto.createHash('sha256').update(evidenceData).digest('hex');

          // Blockchain timestamp
          console.log('[Blockchain Timestamp] Creating Bitcoin timestamp for evidence...');
          const timestampProof = await createBlockchainTimestamp(contentHash);
          if (timestampProof.status !== 'failed') {
            console.log('[Blockchain Timestamp] Successfully created. Status:', timestampProof.status);
          } else {
            console.warn('[Blockchain Timestamp] Failed, continuing without it');
          }

          // Legal attestation
          const attestation = {
            statement: `I, the undersigned, hereby attest that on ${new Date(now).toLocaleString()}, I personally reviewed the content located at ${infringement.source_url} and determined it to be an unauthorized infringement. This determination was made in good faith based on my knowledge of the copyrighted work and the content observed at the URL. The evidence captured herein is a true and accurate representation of the content as it appeared at the time of review.`,
            attested_by: user.id,
            attested_at: now,
            signature: crypto.createHash('sha256').update(`${evidenceData}${user.id}${now}`).digest('hex'),
          };

          // Chain of custody
          const chainOfCustody = [
            { action: 'infringement_detected', performed_by: 'system', performed_at: infringement.created_at, ip_address: 'system', user_agent: 'ProductGuard Scanner' },
            { action: 'page_evidence_captured', performed_by: 'system', performed_at: pageCapture.captured_at, ip_address: 'system', user_agent: 'ProductGuard Evidence Capture' },
            { action: 'user_verified', performed_by: user.id, performed_at: now, ip_address: userIp, user_agent: userAgent },
          ];

          const productAiData = infringement.products?.ai_extracted_data || null;

          // Create evidence snapshot record
          const { data: snapshot, error: snapshotError } = await supabase
            .from('evidence_snapshots')
            .insert({
              infringement_id: id,
              user_id: user.id,
              page_title: pageCapture.page_title || (infringement.evidence as any)?.page_title || '',
              page_url: infringement.source_url,
              page_hash: pageCapture.page_html_hash || contentHash,
              content_hash: contentHash,
              timestamp_proof: timestampProof.status !== 'failed' ? JSON.stringify(timestampProof) : null,
              html_archive_url: pageCapture.html_storage_path,
              infrastructure_snapshot: infringement.infrastructure || {},
              evidence_matches: infringement.evidence?.matches || infringement.evidence?.matched_excerpts?.map((text: string) => ({
                type: 'text_match',
                matched_text: text,
                context: `Found on page: "${text}"`,
                severity: 'high',
              })) || [],
              chain_of_custody: chainOfCustody,
              attestation,
              page_capture: {
                page_text: pageCapture.page_text.slice(0, 100000),
                page_links: pageCapture.page_links,
                wayback_url: pageCapture.wayback_url,
                html_storage_path: pageCapture.html_storage_path,
                page_html_hash: pageCapture.page_html_hash,
              },
              product_ai_data: productAiData,
              captured_at: now,
              verified: true,
              verification_status: 'valid',
            })
            .select()
            .single();

          if (!snapshotError && snapshot) {
            // Link snapshot to infringement
            await supabase.from('infringements').update({ evidence_snapshot_id: snapshot.id }).eq('id', id);

            console.log(`[Evidence Snapshot] Created ${snapshot.id} | "${pageCapture.page_title}" | ${pageCapture.page_links.length} links`);
            if (pageCapture.wayback_url) console.log(`[Evidence Snapshot] Wayback: ${pageCapture.wayback_url}`);
            if (timestampProof.status !== 'failed') console.log(`[Evidence Snapshot] Blockchain:`, formatTimestampProof(timestampProof));

            // AI evidence analysis (last step)
            try {
              const product = infringement.products;
              const analysisResult = await analyzeEvidence({
                productName: product.name || '',
                productDescription: product.description || null,
                productUrl: product.url || null,
                productType: product.type || 'other',
                productKeywords: product.keywords || null,
                aiExtractedData: product.ai_extracted_data || null,
                capturedPageText: pageCapture.page_text || '',
                capturedPageTitle: pageCapture.page_title || null,
                infringementUrl: infringement.source_url,
                platform: infringement.platform,
              });

              if (analysisResult && analysisResult.matches.length > 0) {
                await supabase
                  .from('evidence_snapshots')
                  .update({
                    ai_evidence_analysis: analysisResult,
                    evidence_matches: analysisResult.matches.map((m) => ({
                      type: m.type,
                      matched_text: m.infringing_text,
                      original_text: m.original_text,
                      context: m.context,
                      severity: m.legal_significance,
                      confidence: m.confidence,
                      explanation: m.explanation,
                      dmca_language: m.dmca_language,
                    })),
                  })
                  .eq('id', snapshot.id);

                console.log(`[Evidence Analyzer] AI complete: ${analysisResult.matches.length} matches, strength: ${analysisResult.strength_score}/100`);
              }
            } catch (analysisError) {
              console.error('[Evidence Analyzer] AI analysis failed:', analysisError);
            }
          } else {
            console.error('[Evidence Snapshot] Failed to create snapshot:', snapshotError);
          }
        } catch (snapshotErr) {
          console.error('[Evidence Snapshot] Background capture error:', snapshotErr);
        }
      }
    });

    return NextResponse.json({
      success: true,
      action,
      newStatus,
      message:
        action === 'verify'
          ? 'Infringement verified and marked as active. Evidence is being captured in the background.'
          : action === 'whitelist'
          ? 'URL whitelisted and infringement dismissed. Future scans will skip this URL.'
          : 'Infringement marked as false positive',
    });
  } catch (error) {
    console.error('Verification endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
