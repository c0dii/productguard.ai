// ============================================================
// Exclusion Filter
// src/lib/marketing/exclusion-filter.ts
//
// Checks whether a prospect should be contacted by verifying
// against three databases:
//   1. marketing_exclusions (registered PG customers)
//   2. marketing_suppression (opted-out non-customers)
//   3. marketing_outreach (already contacted)
//
// Must return FALSE for any match. This is the safety gate
// that prevents us from ever contacting our own customers or
// re-contacting someone who already got an email.
// ============================================================

import { createAdminClient } from '@/lib/supabase/server';

interface ExclusionCheckInput {
  company_domain: string | null;
  owner_email: string | null;
  product_name: string;
  company_name: string;
}

interface ExclusionResult {
  excluded: boolean;
  reason: string | null;
  matched_table: 'exclusions' | 'suppression' | 'outreach' | null;
  matched_value: string | null;
}

// ── Main exclusion check ────────────────────────────────────

export async function checkExclusion(
  input: ExclusionCheckInput
): Promise<ExclusionResult> {
  const supabase = createAdminClient();

  // 1. Check marketing_exclusions (registered customers)
  const exclusionChecks: string[] = [];
  if (input.company_domain) {
    exclusionChecks.push(
      `and(match_type.eq.domain,match_value.ilike.${input.company_domain})`
    );
  }
  if (input.owner_email) {
    exclusionChecks.push(
      `and(match_type.eq.email,match_value.ilike.${input.owner_email})`
    );
  }
  exclusionChecks.push(
    `and(match_type.eq.product,match_value.ilike.%${input.product_name}%)`
  );
  exclusionChecks.push(
    `and(match_type.eq.brand,match_value.ilike.%${input.company_name}%)`
  );

  const { data: exclusions, error: exErr } = await supabase
    .from('marketing_exclusions')
    .select('id, match_type, match_value')
    .or(exclusionChecks.join(','))
    .limit(1);

  if (exErr) throw new Error(`Exclusion check failed: ${exErr.message}`);

  const firstExclusion = exclusions?.[0];
  if (firstExclusion) {
    return {
      excluded: true,
      reason: `Existing customer: ${firstExclusion.match_type} = "${firstExclusion.match_value}"`,
      matched_table: 'exclusions',
      matched_value: firstExclusion.match_value,
    };
  }

  // 2. Check marketing_suppression (opted-out companies)
  const suppressionOr: string[] = [];
  if (input.company_domain) {
    suppressionOr.push(`domain.ilike.${input.company_domain}`);
  }
  if (input.owner_email) {
    suppressionOr.push(`email.ilike.${input.owner_email}`);
  }

  if (suppressionOr.length > 0) {
    const { data: suppressed, error: supErr } = await supabase
      .from('marketing_suppression')
      .select('id, domain, email, reason')
      .or(suppressionOr.join(','))
      .limit(1);

    if (supErr) throw new Error(`Suppression check failed: ${supErr.message}`);

    const firstSuppressed = suppressed?.[0];
    if (firstSuppressed) {
      return {
        excluded: true,
        reason: `Suppressed (${firstSuppressed.reason}): ${firstSuppressed.domain || firstSuppressed.email}`,
        matched_table: 'suppression',
        matched_value: firstSuppressed.domain || firstSuppressed.email || null,
      };
    }
  }

  // 3. Check marketing_outreach (already contacted)
  if (input.owner_email) {
    const { data: contacted, error: outErr } = await supabase
      .from('marketing_outreach')
      .select('id, email_sent_to, sent_at')
      .ilike('email_sent_to', input.owner_email)
      .limit(1);

    if (outErr) throw new Error(`Outreach check failed: ${outErr.message}`);

    const firstContacted = contacted?.[0];
    if (firstContacted) {
      return {
        excluded: true,
        reason: `Already contacted: ${firstContacted.email_sent_to} on ${firstContacted.sent_at}`,
        matched_table: 'outreach',
        matched_value: firstContacted.email_sent_to,
      };
    }
  }

  // All clear
  return {
    excluded: false,
    reason: null,
    matched_table: null,
    matched_value: null,
  };
}
