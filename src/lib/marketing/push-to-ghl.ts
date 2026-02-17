// ============================================================
// Push to GHL
// src/lib/marketing/push-to-ghl.ts
//
// After a prospect passes qualification, this module:
//   1. Formats the enrichment data into GHL contact payload
//   2. Creates the contact in GHL
//   3. Creates a pipeline opportunity
//   4. Creates the marketing_outreach row
//   5. Updates prospect status to 'pushed_to_ghl'
//
// The contact's custom fields carry everything GHL needs
// to populate email templates, social DMs, and tracking.
// ============================================================

import { createAdminClient } from '@/lib/supabase/server';
import {
  createGHLContact,
  createGHLOpportunity,
  findGHLContactByEmail,
} from './ghl-client';
import { qualifyProspect } from './prospect-qualifier';
import type {
  MarketingProspect,
  GHLContactPayload,
  PushResult,
} from '@/types/marketing';

// ── Main push function ──────────────────────────────────────

export async function pushProspectToGHL(
  prospect: MarketingProspect
): Promise<PushResult> {
  const supabase = createAdminClient();

  // 1. Run qualification gate
  const qualification = await qualifyProspect(prospect);
  if (!qualification.qualified) {
    return {
      success: false,
      error: `Qualification failed: ${qualification.reason}`,
    };
  }

  // 2. Check if contact already exists in GHL (avoid dupes)
  const existing = await findGHLContactByEmail(prospect.owner_email!);
  if (existing) {
    return {
      success: false,
      error: `Contact already exists in GHL: ${existing.contact.id}`,
    };
  }

  // 3. Parse owner name into first/last
  const nameParts = (prospect.owner_name || prospect.company_name).split(' ');
  const firstName = nameParts[0] || prospect.company_name;
  const lastName = nameParts.slice(1).join(' ') || '';

  // 4. Build GHL contact payload
  const alertsBaseUrl = process.env.ALERTS_BASE_URL || 'https://alerts.productguard.com';
  const alertPageUrl = `${alertsBaseUrl}/r/${prospect.id}`;

  const contactPayload: GHLContactPayload = {
    firstName,
    lastName,
    email: prospect.owner_email!,
    companyName: prospect.company_name,
    website: prospect.company_domain || undefined,
    source: 'productguard_engine',
    tags: [
      'piracy-detected',
      `confidence-${Math.round(prospect.confidence_score)}`,
      `platform-${prospect.infringing_platform}`,
    ],
    customField: {
      // Infringement data
      pirated_product_name: prospect.product_name,
      pirated_product_url: prospect.product_url || '',
      pirated_product_price: prospect.product_price || '',
      infringing_url: prospect.infringing_url,
      infringing_platform: prospect.infringing_platform,
      infringing_audience: prospect.audience_size || '',
      confidence_score: String(prospect.confidence_score),
      screenshot_url: prospect.screenshot_url || '',
      est_revenue_loss: prospect.est_revenue_loss || '',

      // Prospect enrichment
      owner_name: prospect.owner_name || '',
      company_domain: prospect.company_domain || '',
      social_twitter: prospect.social_twitter || '',
      social_instagram: prospect.social_instagram || '',
      social_facebook: prospect.social_facebook || '',
      social_linkedin: prospect.social_linkedin || '',
      contact_source: prospect.contact_source || '',

      // Tracking
      pg_prospect_id: prospect.id,
      discovered_at: prospect.discovered_at,
      alert_page_url: alertPageUrl,
    },
  };

  try {
    // 5. Create contact in GHL
    const ghlContact = await createGHLContact(contactPayload);
    const ghlContactId = ghlContact.contact.id;

    // 6. Create pipeline opportunity
    let ghlOpportunityId: string | undefined;
    const pipelineId = process.env.GHL_PIPELINE_ID;
    if (pipelineId) {
      const firstStageId = process.env.GHL_PIPELINE_FIRST_STAGE_ID;
      if (firstStageId) {
        const opp = await createGHLOpportunity({
          pipelineId,
          pipelineStageId: firstStageId,
          contactId: ghlContactId,
          name: `${prospect.company_name} — ${prospect.product_name}`,
          monetaryValue: parseFloat(prospect.est_revenue_loss?.replace(/[$,]/g, '') || '0'),
          source: 'productguard_engine',
        });
        ghlOpportunityId = opp.id;
      }
    }

    // 7. Create marketing_outreach row
    await supabase.from('marketing_outreach').insert({
      prospect_id: prospect.id,
      ghl_contact_id: ghlContactId,
      email_sent_to: prospect.owner_email,
      sent_at: new Date().toISOString(),
    });

    // 8. Update prospect status
    await supabase
      .from('marketing_prospects')
      .update({
        status: 'pushed_to_ghl',
        ghl_contact_id: ghlContactId,
        pushed_to_ghl_at: new Date().toISOString(),
      })
      .eq('id', prospect.id);

    return {
      success: true,
      ghl_contact_id: ghlContactId,
      ghl_opportunity_id: ghlOpportunityId,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[push-to-ghl] Failed for prospect ${prospect.id}:`, message);
    return {
      success: false,
      error: message,
    };
  }
}

// ── Batch push: process all qualified prospects ─────────────

export async function pushQualifiedProspects(): Promise<{
  total: number;
  pushed: number;
  failed: number;
  errors: string[];
}> {
  const supabase = createAdminClient();

  // Get all 'new' prospects with confidence >= 95
  const { data: prospects, error } = await supabase
    .from('marketing_prospects')
    .select('*')
    .eq('status', 'new')
    .gte('confidence_score', 95)
    .order('confidence_score', { ascending: false })
    .limit(50); // Process in batches of 50

  if (error) throw new Error(`Failed to fetch prospects: ${error.message}`);
  if (!prospects || prospects.length === 0) {
    return { total: 0, pushed: 0, failed: 0, errors: [] };
  }

  const results = { total: prospects.length, pushed: 0, failed: 0, errors: [] as string[] };

  for (const prospect of prospects) {
    const result = await pushProspectToGHL(prospect);
    if (result.success) {
      results.pushed++;
    } else {
      results.failed++;
      results.errors.push(`${prospect.company_name}: ${result.error}`);

      // If it failed due to exclusion/suppression, update status accordingly
      if (result.error?.includes('Qualification failed')) {
        await supabase
          .from('marketing_prospects')
          .update({ status: 'suppressed' })
          .eq('id', prospect.id);
      }
    }

    // Rate limit: small delay between GHL API calls
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return results;
}
