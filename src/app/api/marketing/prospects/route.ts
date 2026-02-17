// ============================================================
// Marketing Prospects API
// src/app/api/marketing/prospects/route.ts
//
// Internal API for:
//   GET  — Retrieve prospect data (for alerts pages)
//   PATCH — Record attribution events (signup, DMCA sent, etc.)
//
// Used by the alerts subdomain client components to:
//   1. Load prospect data for the DMCA review page
//   2. Record account_created event
//   3. Record dmca_sent event
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// ── GET: Load prospect data ─────────────────────────────────

export async function GET(req: NextRequest) {
  const supabase = createAdminClient();
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('marketing_prospects')
    .select(`
      id, product_name, product_url, product_price,
      infringing_url, infringing_platform, audience_size,
      confidence_score, screenshot_url, est_revenue_loss,
      company_name, owner_name
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}

// ── PATCH: Record attribution events ────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await req.json();
    const { prospect_id, event, user_id } = body;

    if (!prospect_id || !event) {
      return NextResponse.json(
        { error: 'Missing prospect_id or event' },
        { status: 400 }
      );
    }

    switch (event) {
      case 'account_created': {
        // Update outreach record
        await supabase
          .from('marketing_outreach')
          .update({
            signed_up_at: new Date().toISOString(),
            user_id: user_id || null,
          })
          .eq('prospect_id', prospect_id);

        // Update prospect status
        await supabase
          .from('marketing_prospects')
          .update({ status: 'account_created' })
          .eq('id', prospect_id);

        // Auto-add exclusion entries so engine never contacts them again
        const { data: prospect } = await supabase
          .from('marketing_prospects')
          .select('company_domain, owner_email, product_name, company_name')
          .eq('id', prospect_id)
          .single();

        if (prospect && user_id) {
          const exclusions = [];

          if (prospect.owner_email) {
            exclusions.push({
              match_type: 'email',
              match_value: prospect.owner_email,
              user_id,
            });
          }
          if (prospect.company_domain) {
            exclusions.push({
              match_type: 'domain',
              match_value: prospect.company_domain,
              user_id,
            });
          }
          if (prospect.product_name) {
            exclusions.push({
              match_type: 'product',
              match_value: prospect.product_name,
              user_id,
            });
          }
          if (prospect.company_name) {
            exclusions.push({
              match_type: 'brand',
              match_value: prospect.company_name,
              user_id,
            });
          }

          if (exclusions.length > 0) {
            await supabase
              .from('marketing_exclusions')
              .upsert(exclusions, { onConflict: 'match_type,match_value' })
              .select();
          }
        }

        return NextResponse.json({ ok: true, event: 'account_created' });
      }

      case 'dmca_sent': {
        // Update outreach record
        await supabase
          .from('marketing_outreach')
          .update({ dmca_sent_at: new Date().toISOString() })
          .eq('prospect_id', prospect_id);

        // Create takedown record in main takedowns table
        const { data: prospect } = await supabase
          .from('marketing_prospects')
          .select('infringing_url, product_name, owner_name')
          .eq('id', prospect_id)
          .single();

        if (prospect && user_id) {
          await supabase.from('takedowns').insert({
            user_id,
            type: 'dmca',
            status: 'sent',
            sent_at: new Date().toISOString(),
            notice_content: `DMCA takedown for "${prospect.product_name}" — ${prospect.infringing_url}`,
          });
        }

        return NextResponse.json({ ok: true, event: 'dmca_sent' });
      }

      case 'converted': {
        const { plan_tier } = body;
        await supabase
          .from('marketing_outreach')
          .update({
            converted_at: new Date().toISOString(),
            converted_plan: plan_tier || null,
          })
          .eq('prospect_id', prospect_id);

        await supabase
          .from('marketing_prospects')
          .update({ status: 'converted' })
          .eq('id', prospect_id);

        return NextResponse.json({ ok: true, event: 'converted' });
      }

      default:
        return NextResponse.json(
          { error: `Unknown event: ${event}` },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error('[marketing-prospects] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
