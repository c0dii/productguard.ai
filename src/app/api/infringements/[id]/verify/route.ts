import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { learnFromFeedback, recordDailyMetrics, calculatePerformanceMetrics } from '@/lib/intelligence/intelligence-engine';
import { createBlockchainTimestamp, formatTimestampProof } from '@/lib/evidence/blockchain-timestamp';
import { capturePageEvidence } from '@/lib/evidence/capture-page';
import { trackInfringementVerified } from '@/lib/ghl/events';
import { analyzeEvidence } from '@/lib/evidence/analyze-evidence';

/**
 * POST /api/infringements/[id]/verify
 * Verify or reject a pending infringement
 *
 * Body: { action: 'verify' | 'reject' }
 *
 * - 'verify' → status becomes 'active', sets verified_by_user_at timestamp
 * - 'reject' → status becomes 'false_positive', excludes from charts
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
      .select('*, products!inner(user_id, ai_extracted_data, keywords, name, description)')
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

    // INTELLIGENCE ENGINE: Learn from user feedback
    // This improves future searches and AI filtering
    try {
      await learnFromFeedback(id, action);

      // Update performance metrics (async, don't block response)
      const metrics = await calculatePerformanceMetrics(infringement.product_id);
      await recordDailyMetrics(infringement.product_id, user.id, metrics);

      console.log(
        `[Intelligence] Learned from ${action} action. Current precision: ${(metrics.precision_rate * 100).toFixed(1)}%`
      );
    } catch (intelligenceError) {
      // Don't fail verification if intelligence learning fails
      console.error('[Intelligence] Error in learning system:', intelligenceError);
    }

    // Create immutable evidence snapshot when user verifies (not for rejection)
    if (action === 'verify') {
      try {
        // Get user IP and user agent for chain of custody
        const userIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
        const userAgent = request.headers.get('user-agent') || 'unknown';

        // Capture live page evidence: HTML, text, links, Wayback Machine archive
        console.log('[Evidence Capture] Starting page capture for', infringement.source_url);
        const pageCapture = await capturePageEvidence(
          infringement.source_url,
          user.id,
          id
        );

        // Create cryptographic hash of ALL evidence (including captured page)
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

        // Create blockchain timestamp (Bitcoin notary via OpenTimestamps)
        console.log('[Blockchain Timestamp] Creating Bitcoin timestamp for evidence...');
        const timestampProof = await createBlockchainTimestamp(contentHash);

        if (timestampProof.status !== 'failed') {
          console.log('[Blockchain Timestamp] Successfully created. Status:', timestampProof.status);
        } else {
          console.warn('[Blockchain Timestamp] Failed to create timestamp, continuing without it');
        }

        // Create legal attestation
        const attestation = {
          statement: `I, the undersigned, hereby attest that on ${new Date(now).toLocaleString()}, I personally reviewed the content located at ${infringement.source_url} and determined it to be an unauthorized infringement. This determination was made in good faith based on my knowledge of the copyrighted work and the content observed at the URL. The evidence captured herein is a true and accurate representation of the content as it appeared at the time of review.`,
          attested_by: user.id,
          attested_at: now,
          signature: crypto
            .createHash('sha256')
            .update(`${evidenceData}${user.id}${now}`)
            .digest('hex'),
        };

        // Build chain of custody
        const chainOfCustody = [
          {
            action: 'infringement_detected',
            performed_by: 'system',
            performed_at: infringement.created_at,
            ip_address: 'system',
            user_agent: 'ProductGuard Scanner',
          },
          {
            action: 'page_evidence_captured',
            performed_by: 'system',
            performed_at: pageCapture.captured_at,
            ip_address: 'system',
            user_agent: 'ProductGuard Evidence Capture',
          },
          {
            action: 'user_verified',
            performed_by: user.id,
            performed_at: now,
            ip_address: userIp,
            user_agent: userAgent,
          },
        ];

        // Freeze product AI data at time of verification for content comparisons
        const productAiData = infringement.products?.ai_extracted_data || null;

        // Create evidence snapshot record with captured page data
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
            // Store captured page data
            page_capture: {
              page_text: pageCapture.page_text.slice(0, 100000), // Cap at 100KB
              page_links: pageCapture.page_links,
              wayback_url: pageCapture.wayback_url,
              html_storage_path: pageCapture.html_storage_path,
              page_html_hash: pageCapture.page_html_hash,
            },
            // Freeze product AI data for "Original vs Infringing" content comparisons
            product_ai_data: productAiData,
            captured_at: now,
            verified: true,
            verification_status: 'valid',
          })
          .select()
          .single();

        if (!snapshotError && snapshot) {
          // Link snapshot to infringement
          await supabase
            .from('infringements')
            .update({ evidence_snapshot_id: snapshot.id })
            .eq('id', id);

          console.log(`[Evidence Snapshot] Created snapshot ${snapshot.id} for infringement ${id}`);
          console.log(`[Evidence Snapshot] Page: "${pageCapture.page_title}" | ${pageCapture.page_links.length} links | HTML hash: ${pageCapture.page_html_hash.slice(0, 12)}...`);

          if (pageCapture.wayback_url) {
            console.log(`[Evidence Snapshot] Wayback Machine archive: ${pageCapture.wayback_url}`);
          }
          if (timestampProof.status !== 'failed') {
            console.log(`[Evidence Snapshot] Blockchain timestamp anchored. Proof:`, formatTimestampProof(timestampProof));
          }

          // Run AI evidence analysis (non-blocking — don't fail verification if this fails)
          try {
            const product = infringement.products;
            const analysisResult = await analyzeEvidence({
              productName: product.name || '',
              productDescription: product.description || null,
              productUrl: (infringement as any).products?.url || null,
              productType: (infringement as any).products?.type || 'other',
              productKeywords: product.keywords || null,
              aiExtractedData: product.ai_extracted_data || null,
              capturedPageText: pageCapture.page_text || '',
              capturedPageTitle: pageCapture.page_title || null,
              infringementUrl: infringement.source_url,
              platform: infringement.platform,
            });

            if (analysisResult && analysisResult.matches.length > 0) {
              // Update the evidence snapshot with AI analysis
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

              console.log(`[Evidence Analyzer] AI analysis complete: ${analysisResult.matches.length} matches, strength: ${analysisResult.strength_score}/100`);
            }
          } catch (analysisError) {
            console.error('[Evidence Analyzer] AI analysis failed (non-blocking):', analysisError);
          }
        } else {
          console.error('[Evidence Snapshot] Failed to create snapshot:', snapshotError);
        }
      } catch (snapshotErr) {
        // Don't fail the verification if snapshot creation fails
        console.error('[Evidence Snapshot] Error creating snapshot:', snapshotErr);
      }
    }

    // Track verification in GHL
    if (action === 'verify' && user.email) {
      try {
        // Get total verified infringements count
        const { data: verifiedInfringements } = await supabase
          .from('infringements')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .not('verified_by_user_at', 'is', null);

        const totalInfringements = verifiedInfringements?.length || 1;

        await trackInfringementVerified(
          user.id,
          user.email,
          id,
          totalInfringements
        );
      } catch (ghlError) {
        console.error('[GHL Events] Error tracking verification:', ghlError);
        // Don't fail the request if GHL tracking fails
      }
    }

    return NextResponse.json({
      success: true,
      action,
      newStatus,
      message:
        action === 'verify'
          ? 'Infringement verified and marked as active. Evidence snapshot created for legal defense.'
          : action === 'whitelist'
          ? 'URL whitelisted and infringement dismissed. Future scans will skip this URL.'
          : 'Infringement marked as false positive',
    });
  } catch (error) {
    console.error('Verification endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
