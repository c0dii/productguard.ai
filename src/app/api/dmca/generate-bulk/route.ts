import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { generateForInfringement, summarizeBulkResults, type BulkGenerationResult } from '@/lib/dmca/bulk-helpers';
import type { DMCAContact } from '@/types';

/**
 * POST /api/dmca/generate-bulk
 *
 * Generate DMCA notices for multiple infringements at once.
 * Resolves targets, builds notices, and returns a summary for review.
 *
 * Body: {
 *   infringement_ids: string[];
 *   signature_name: string;
 * }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { infringement_ids } = body;

    if (!infringement_ids || !Array.isArray(infringement_ids) || infringement_ids.length === 0) {
      return NextResponse.json({ error: 'infringement_ids is required' }, { status: 400 });
    }

    if (infringement_ids.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 infringements per bulk operation' }, { status: 400 });
    }

    // Fetch user profile for DMCA contact info
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('full_name, email, company_name, phone, address, dmca_reply_email, is_copyright_owner')
      .eq('id', user.id)
      .single();

    if (!userProfile || !userProfile.full_name || !userProfile.email) {
      return NextResponse.json(
        { error: 'DMCA contact information not found', hint: 'Please complete your profile settings' },
        { status: 400 }
      );
    }

    if (!userProfile.address) {
      return NextResponse.json(
        { error: 'Physical address is required for DMCA notices', hint: 'profile_incomplete' },
        { status: 400 }
      );
    }

    const dmcaContact: DMCAContact = {
      full_name: userProfile.full_name,
      company: userProfile.company_name || null,
      email: userProfile.dmca_reply_email || userProfile.email,
      phone: userProfile.phone || null,
      address: userProfile.address,
      is_copyright_owner: userProfile.is_copyright_owner ?? true,
      relationship_to_owner: null,
    };

    // Fetch all infringements with product details
    const { data: infringements, error: infError } = await supabase
      .from('infringements')
      .select(`
        id, source_url, platform, infringement_type, evidence,
        severity_score, first_seen_at, created_at, infrastructure,
        whois_domain, whois_registrant_org, whois_registrar_name,
        whois_registrar_abuse_email, evidence_snapshot_id, product_id, user_id,
        products!inner(id, name, type, price, url, description, copyright_info, trademark_info, ai_extracted_data)
      `)
      .in('id', infringement_ids)
      .eq('user_id', user.id);

    if (infError) {
      console.error('[Bulk Generate] Error fetching infringements:', infError);
      return NextResponse.json({ error: 'Failed to fetch infringements' }, { status: 500 });
    }

    if (!infringements || infringements.length === 0) {
      return NextResponse.json({ error: 'No matching infringements found' }, { status: 404 });
    }

    // Generate notices for each infringement
    const results: BulkGenerationResult[] = [];

    for (const inf of infringements) {
      try {
        const result = generateForInfringement({
          infringement: {
            id: inf.id,
            source_url: inf.source_url,
            platform: inf.platform,
            infringement_type: inf.infringement_type,
            evidence: inf.evidence,
            severity_score: inf.severity_score,
            first_seen_at: inf.first_seen_at,
            created_at: inf.created_at,
            infrastructure: inf.infrastructure,
            whois_domain: inf.whois_domain,
            whois_registrant_org: inf.whois_registrant_org,
            whois_registrar_name: inf.whois_registrar_name,
            whois_registrar_abuse_email: inf.whois_registrar_abuse_email,
            evidence_snapshot_id: inf.evidence_snapshot_id,
          },
          product: inf.products as any,
          contact: dmcaContact,
        });
        results.push(result);
      } catch (err) {
        console.error(`[Bulk Generate] Failed for infringement ${inf.id}:`, err);
      }
    }

    if (results.length === 0) {
      return NextResponse.json({ error: 'Failed to generate any notices' }, { status: 500 });
    }

    // Build summary for review modal
    const summary = summarizeBulkResults(results);

    return NextResponse.json({
      results,
      summary,
      contact: {
        full_name: dmcaContact.full_name,
        email: dmcaContact.email,
        company: dmcaContact.company,
        address: dmcaContact.address,
      },
    });
  } catch (error: any) {
    console.error('[Bulk Generate] Error:', error);
    return NextResponse.json({ error: 'Failed to generate bulk notices' }, { status: 500 });
  }
}
