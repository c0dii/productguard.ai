import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { generateDMCANotice, getPlatformDMCAInfo } from '@/lib/dmca/dmca-generator';
import type { DMCAContact } from '@/types';
import { trackDMCASent } from '@/lib/ghl/events';

/**
 * POST /api/dmca/generate
 *
 * Generate an AI-powered DMCA takedown notice for a confirmed infringement
 *
 * Body: {
 *   infringement_id: string;
 *   user_contact?: DMCAContact; // Optional override for product's dmca_contact
 * }
 *
 * Returns: {
 *   notice: GeneratedDMCANotice;
 *   product: Product;
 *   infringement: Infringement;
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
    const { infringement_id, user_contact } = body;

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
    if (infringement.status !== 'active') {
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
    // Priority: user_contact override > product.dmca_contact > user profile
    let dmcaContact: DMCAContact;

    if (user_contact) {
      dmcaContact = user_contact;
    } else if (product.dmca_contact) {
      dmcaContact = product.dmca_contact as DMCAContact;
    } else {
      // Fallback: use user profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, company_name')
        .eq('id', user.id)
        .single();

      if (!profile || !profile.full_name || !profile.email) {
        return NextResponse.json(
          {
            error: 'DMCA contact information not found',
            hint: 'Please add DMCA contact information to your product or profile settings',
          },
          { status: 400 }
        );
      }

      dmcaContact = {
        full_name: profile.full_name,
        company: profile.company_name || null,
        email: profile.email,
        phone: null,
        address: '', // Required but missing - will need to be filled manually
        is_copyright_owner: true,
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

    // Get platform-specific DMCA info
    const platformInfo = getPlatformDMCAInfo(infringement.platform);

    // Generate DMCA notice using AI
    console.log(`[DMCA Generate] Generating notice for infringement ${infringement_id}`);
    const notice = await generateDMCANotice({
      product,
      infringement,
      evidenceSnapshot,
      userContact: dmcaContact,
      platform: platformInfo,
    });

    console.log(`[DMCA Generate] Successfully generated notice`);

    // Track DMCA generation in GHL
    if (user.email) {
      try {
        // Get total DMCA count
        const { data: dmcaCount } = await supabase
          .from('infringements')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'takedown_sent');

        const totalDMCASent = (dmcaCount?.length || 0) + 1; // +1 for current one

        await trackDMCASent(
          user.id,
          user.email,
          infringement_id,
          totalDMCASent
        );
      } catch (ghlError) {
        console.error('[GHL Events] Error tracking DMCA generation:', ghlError);
        // Don't fail the request if GHL tracking fails
      }
    }

    return NextResponse.json({
      notice,
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
    });
  } catch (error: any) {
    console.error('[DMCA Generate] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate DMCA notice',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
