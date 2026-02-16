import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { learnFromFeedback, recordDailyMetrics, calculatePerformanceMetrics } from '@/lib/intelligence/intelligence-engine';
import { createBlockchainTimestamp, formatTimestampProof } from '@/lib/evidence/blockchain-timestamp';
import { trackInfringementVerified } from '@/lib/ghl/events';

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

    if (!action || !['verify', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "verify" or "reject"' },
        { status: 400 }
      );
    }

    // Fetch infringement and verify ownership
    const { data: infringement, error: fetchError } = await supabase
      .from('infringements')
      .select('*, products!inner(user_id)')
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
    const newStatus = action === 'verify' ? 'active' : 'false_positive';
    const now = new Date().toISOString();

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
    await supabase.from('status_transitions').insert({
      infringement_id: id,
      from_status: infringement.status,
      to_status: newStatus,
      reason:
        action === 'verify' ? 'User verified as real infringement' : 'User marked as false positive',
      triggered_by: 'user',
      metadata: { user_id: user.id, action },
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

        // Create cryptographic hash of evidence for integrity verification
        const evidenceData = JSON.stringify({
          url: infringement.source_url,
          infrastructure: infringement.infrastructure,
          evidence: infringement.evidence,
          timestamp: now,
        });
        const contentHash = crypto.createHash('sha256').update(evidenceData).digest('hex');

        // Create blockchain timestamp (Bitcoin notary via OpenTimestamps)
        console.log('[Blockchain Timestamp] Creating Bitcoin timestamp for evidence...');
        const timestampProof = await createBlockchainTimestamp(contentHash);

        if (timestampProof.status !== 'failed') {
          console.log('[Blockchain Timestamp] Successfully created. Status:', timestampProof.status);
          console.log('[Blockchain Timestamp] Verification URL:', timestampProof.verification_url);
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
            action: 'user_verified',
            performed_by: user.id,
            performed_at: now,
            ip_address: userIp,
            user_agent: userAgent,
          },
        ];

        // Create evidence snapshot record
        const { data: snapshot, error: snapshotError } = await supabase
          .from('evidence_snapshots')
          .insert({
            infringement_id: id,
            user_id: user.id,
            page_title: infringement.evidence?.page_title || '',
            page_url: infringement.source_url,
            page_hash: infringement.evidence?.page_hash || contentHash,
            content_hash: contentHash,
            timestamp_proof: timestampProof.status !== 'failed' ? JSON.stringify(timestampProof) : null,
            infrastructure_snapshot: infringement.infrastructure || {},
            evidence_matches: infringement.evidence?.matches || infringement.evidence?.matched_excerpts?.map((text: string) => ({
              type: 'text_match',
              matched_text: text,
              context: `Found on page: "${text}"`,
              severity: 'high',
            })) || [],
            chain_of_custody: chainOfCustody,
            attestation,
            captured_at: now,
            verified: true,
            verification_status: 'valid',
            // Screenshot and HTML archive would be added here via separate API calls
            // screenshot_url: null,  // Will be populated by screenshot service
            // html_archive_url: null, // Will be populated by archive service
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

          if (timestampProof.status !== 'failed') {
            console.log(`[Evidence Snapshot] Blockchain timestamp anchored. Proof:`, formatTimestampProof(timestampProof));
          }

          // TODO: Trigger background jobs for:
          // 1. Screenshot capture (Puppeteer/Playwright)
          // 2. HTML archival
          // 3. Blockchain timestamp upgrade (check confirmation after ~1 hour)
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
          : 'Infringement marked as false positive',
    });
  } catch (error) {
    console.error('Verification endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
