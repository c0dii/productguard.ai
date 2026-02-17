import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { DMCAContact } from '@/types';
import { trackDMCASent } from '@/lib/ghl/events';
import { detectInfringementProfile } from '@/lib/dmca/infringement-profiles';
import { resolveProvider, resolveAllTargets, type EnforcementTarget } from '@/lib/dmca/provider-database';
import { buildComparisonItems } from '@/lib/dmca/comparison-builder';
import { buildNotice } from '@/lib/dmca/notice-builder';
import { checkNoticeQuality } from '@/lib/dmca/quality-checker';

/**
 * POST /api/dmca/generate
 *
 * Generate a structured DMCA takedown notice for a confirmed infringement.
 * Uses template assembly (not freeform AI) for legal reliability.
 *
 * Body: {
 *   infringement_id: string;
 *   user_contact?: DMCAContact; // Optional override
 *   target?: { type: string; provider_name: string }; // Optional target override for escalation workflow
 * }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { infringement_id, user_contact, target: targetOverride, selected_evidence } = body;

    if (!infringement_id) {
      return NextResponse.json({ error: 'infringement_id is required' }, { status: 400 });
    }

    // Fetch infringement with product details
    const { data: infringement, error: infringementError } = await supabase
      .from('infringements')
      .select('*, products!inner(*)')
      .eq('id', infringement_id)
      .single();

    if (infringementError || !infringement) {
      return NextResponse.json({ error: 'Infringement not found' }, { status: 404 });
    }

    // Verify user owns the product
    if (infringement.products.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify infringement is confirmed (active status)
    if (infringement.status !== 'active' && infringement.status !== 'takedown_sent') {
      return NextResponse.json(
        {
          error: 'Infringement must be confirmed before generating DMCA notice',
          hint: 'Click "Confirm" on the infringement first',
        },
        { status: 400 }
      );
    }

    const product = infringement.products;

    // Get DMCA contact information
    let dmcaContact: DMCAContact;

    if (user_contact) {
      dmcaContact = user_contact;
    } else if (product.dmca_contact) {
      dmcaContact = product.dmca_contact as DMCAContact;
    } else {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name, email, company_name, phone, address, dmca_reply_email, is_copyright_owner')
        .eq('id', user.id)
        .single();

      if (!userProfile || !userProfile.full_name || !userProfile.email) {
        return NextResponse.json(
          {
            error: 'DMCA contact information not found',
            hint: 'Please add DMCA contact information to your product or profile settings',
          },
          { status: 400 }
        );
      }

      if (!userProfile.address) {
        return NextResponse.json(
          {
            error: 'Physical address is required for DMCA notices',
            hint: 'profile_incomplete',
          },
          { status: 400 }
        );
      }

      dmcaContact = {
        full_name: userProfile.full_name,
        company: userProfile.company_name || null,
        email: userProfile.dmca_reply_email || userProfile.email,
        phone: userProfile.phone || null,
        address: userProfile.address,
        is_copyright_owner: userProfile.is_copyright_owner ?? true,
        relationship_to_owner: null,
      };
    }

    // Fetch evidence snapshot if available
    let evidenceSnapshot = null;
    if (infringement.evidence_snapshot_id) {
      const { data } = await supabase
        .from('evidence_snapshots')
        .select('*')
        .eq('id', infringement.evidence_snapshot_id)
        .single();
      evidenceSnapshot = data;
    }

    // ── Step 1: Detect infringement profile ─────────────────────────
    const profile = detectInfringementProfile({
      platform: infringement.platform,
      infringement_type: infringement.infringement_type,
      evidence: infringement.evidence,
      source_url: infringement.source_url,
    });

    console.log(`[DMCA Generate] Detected profile: ${profile}`);

    // ── Step 2: Resolve provider ────────────────────────────────────
    // Get all enforcement targets for the escalation plan
    const allTargets = resolveAllTargets(
      infringement.source_url,
      infringement.platform,
      infringement.infrastructure?.hosting_provider,
      infringement.whois_registrar_name,
      infringement.whois_registrar_abuse_email,
    );

    // Use the target override if provided, otherwise use the first recommended target
    let provider;
    if (targetOverride?.provider_name) {
      const matchedTarget = allTargets.find(
        (t) => t.provider.name === targetOverride.provider_name
      );
      provider = matchedTarget?.provider || resolveProvider(
        infringement.source_url,
        infringement.platform,
        infringement.infrastructure?.hosting_provider,
        infringement.whois_registrar_name,
        infringement.whois_registrar_abuse_email,
      );
    } else {
      // Default: use the first recommended target (platform-first strategy)
      const recommended = allTargets.find((t) => t.recommended) || allTargets[0];
      provider = recommended?.provider || resolveProvider(
        infringement.source_url,
        infringement.platform,
        infringement.infrastructure?.hosting_provider,
        infringement.whois_registrar_name,
        infringement.whois_registrar_abuse_email,
      );
    }

    console.log(`[DMCA Generate] Resolved provider: ${provider.name} (${provider.dmcaEmail || provider.dmcaFormUrl || 'no contact'})`);

    // ── Step 3: Build comparison items (with AI-extracted data) ─────
    // If user selected specific evidence items, use those instead of auto-building
    let comparisonItems;
    if (selected_evidence && Array.isArray(selected_evidence) && selected_evidence.length > 0) {
      // User-curated evidence: always include the product URL context first
      comparisonItems = [];
      if (product.url) {
        comparisonItems.push({
          original: `Original product page: ${product.url}`,
          infringing: `Unauthorized copy found at: ${infringement.source_url}`,
        });
      }
      // Add user-selected evidence items (limit to 10)
      for (const item of selected_evidence.slice(0, 9)) {
        if (item.original && item.infringing) {
          comparisonItems.push({
            original: `Original content from "${product.name}": "${String(item.original).slice(0, 200)}"`,
            infringing: String(item.infringing).slice(0, 300),
          });
        }
      }
      console.log(`[DMCA Generate] Using ${comparisonItems.length} user-selected comparison items`);
    } else {
      comparisonItems = buildComparisonItems({
        productName: product.name,
        productUrl: product.url,
        productType: product.type,
        sourceUrl: infringement.source_url,
        evidence: infringement.evidence,
        evidenceSnapshot,
        aiExtractedData: product.ai_extracted_data,
      });
      console.log(`[DMCA Generate] Built ${comparisonItems.length} auto-generated comparison items`);
    }

    // ── Step 4: Build structured notice ─────────────────────────────
    const notice = buildNotice({
      contact: dmcaContact,
      product: {
        name: product.name,
        type: product.type,
        price: product.price,
        url: product.url,
        description: product.description,
        copyright_info: product.copyright_info,
        trademark_info: product.trademark_info,
      },
      infringement: {
        source_url: infringement.source_url,
        platform: infringement.platform,
        first_seen_at: infringement.first_seen_at || infringement.created_at,
        severity_score: infringement.severity_score,
        infrastructure: infringement.infrastructure,
        whois_domain: infringement.whois_domain,
        whois_registrant_org: infringement.whois_registrant_org,
        whois_registrar_name: infringement.whois_registrar_name,
      },
      profile,
      provider,
      comparisonItems,
      evidence: evidenceSnapshot ? {
        contentHash: evidenceSnapshot.content_hash,
        timestampProof: evidenceSnapshot.timestamp_proof,
        waybackUrl: evidenceSnapshot.page_capture?.wayback_url,
        capturedAt: evidenceSnapshot.captured_at,
        htmlStoragePath: evidenceSnapshot.page_capture?.html_storage_path || evidenceSnapshot.html_archive_url,
        pageLinksCount: evidenceSnapshot.page_capture?.page_links?.length,
        pageTextLength: evidenceSnapshot.page_capture?.page_text?.length,
      } : null,
    });

    // ── Step 5: Quality check ───────────────────────────────────────
    const quality = checkNoticeQuality({
      contactName: dmcaContact.full_name,
      contactEmail: dmcaContact.email,
      contactAddress: dmcaContact.address || undefined,
      contactPhone: dmcaContact.phone || undefined,
      productName: product.name,
      productDescription: product.description || undefined,
      productUrl: product.url,
      copyrightRegNumber: product.copyright_info?.registration_number || null,
      infringingUrl: infringement.source_url,
      hasGoodFaithStatement: true, // Always included by builder
      hasPerjuryStatement: true,   // Always included by builder
      hasSignature: true,          // Always included by builder
      comparisonItems,
      hasEvidencePacket: !!evidenceSnapshot,
      hasUniqueMarkers: !!(product.copyright_info?.registration_number || product.trademark_info?.name),
      hasBlockchainTimestamp: !!evidenceSnapshot?.timestamp_proof,
      hasWaybackArchive: !!evidenceSnapshot?.page_capture?.wayback_url,
    });

    console.log(`[DMCA Generate] Quality: ${quality.score}/100 (${quality.strength}) | ${quality.errors.length} errors, ${quality.warnings.length} warnings`);

    // ── Step 6: Track in GHL ────────────────────────────────────────
    if (user.email) {
      try {
        const { data: dmcaCount } = await supabase
          .from('infringements')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'takedown_sent');

        const totalDMCASent = (dmcaCount?.length || 0) + 1;

        await trackDMCASent(
          user.id,
          user.email,
          infringement_id,
          totalDMCASent
        );
      } catch (ghlError) {
        console.error('[GHL Events] Error tracking DMCA generation:', ghlError);
      }
    }

    return NextResponse.json({
      notice,
      quality,
      product: {
        id: product.id,
        name: product.name,
        type: product.type,
      },
      infringement: {
        id: infringement.id,
        source_url: infringement.source_url,
        platform: infringement.platform,
      },
      enforcement_targets: allTargets,
    });
  } catch (error: any) {
    console.error('[DMCA Generate] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate DMCA notice',
      },
      { status: 500 }
    );
  }
}
