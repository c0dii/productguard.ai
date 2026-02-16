import { createClient } from '@/lib/supabase/server';
import { generateDMCANotice } from '@/lib/utils/dmca-templates';
import { getRecommendedRecipient } from '@/lib/utils/platform-abuse-contacts';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      infringement_ids,
      product_id,
      infringement_types,
      tone,
      additional_evidence,
      ip_ownership,
      contact_info,
      signature,
      infrastructure,
      infringing_url,
      recipient_email,
      cc_emails,
      discovered_at,
      verified_at,
      verified_by,
    } = body;

    if (!product_id || !infringement_types || infringement_types.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!recipient_email) {
      return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 });
    }

    // Fetch product details
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', product_id)
      .eq('user_id', user.id)
      .single();

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Fetch infringement details if provided
    let infringement = null;
    if (infringement_ids && infringement_ids.length > 0) {
      const { data } = await supabase
        .from('infringements')
        .select('*')
        .eq('id', infringement_ids[0])
        .eq('user_id', user.id)
        .single();
      infringement = data;
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get platform-specific recipient information
    const targetUrl = infringing_url || infringement?.source_url || '';
    const platformRecipient = getRecommendedRecipient(targetUrl);

    // Generate comprehensive DMCA notice with all enhanced fields
    const noticeContent = generateDMCANotice({
      copyrightHolder: contact_info.name,
      copyrightHolderEmail: contact_info.email,
      copyrightHolderAddress: contact_info.address || profile.company_name || undefined,
      copyrightHolderPhone: contact_info.phone || undefined,
      productName: product.name,
      productType: product.type || undefined,
      productUrl: product.url || '',
      infringingUrl: targetUrl,
      platformName: infringement?.platform || 'Unknown',
      recipientName: platformRecipient.recipient,
      infringementTypes: infringement_types,
      tone: tone,
      additionalEvidence: additional_evidence,
      ipOwnership: ip_ownership,
      infrastructure: infrastructure || infringement?.infrastructure || undefined,
      signature: signature || undefined,
    });

    // Create takedown record with comprehensive tracking
    const { data: takedown, error } = await supabase
      .from('takedowns')
      .insert({
        infringement_id: infringement_ids && infringement_ids.length > 0 ? infringement_ids[0] : null,
        user_id: user.id,
        type: 'dmca',
        status: 'draft',
        notice_content: noticeContent,
        // Email tracking
        recipient_email,
        cc_emails: cc_emails || [],
        infringing_url: targetUrl,
        // Timeline tracking
        discovered_at: discovered_at || infringement?.first_seen_at,
        verified_at: verified_at || infringement?.verified_by_user_at,
        verified_by: verified_by || infringement?.verified_by_user_id,
        submitted_at: new Date().toISOString(),
        // Monitoring will be set by trigger (next_check_at = 7 days from now)
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating takedown:', error);
      return NextResponse.json({ error: 'Failed to create takedown' }, { status: 500 });
    }

    // Update infringement status if applicable
    if (infringement_ids && infringement_ids.length > 0) {
      await supabase
        .from('infringements')
        .update({ status: 'takedown_sent' })
        .in('id', infringement_ids);
    }

    return NextResponse.json({ success: true, takedown, takedown_id: takedown.id });
  } catch (error) {
    console.error('Create takedown error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
