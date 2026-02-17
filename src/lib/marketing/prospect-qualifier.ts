// ============================================================
// Prospect Qualifier
// src/lib/marketing/prospect-qualifier.ts
//
// Runs the full qualification gate:
//   1. Confidence score >= 95%
//   2. Not in exclusion DB (existing customer)
//   3. Not in suppression list (opted out)
//   4. Not previously contacted (one email per company)
//   5. Valid contact email found
//
// Only prospects that pass ALL checks get pushed to GHL.
// ============================================================

import { checkExclusion } from './exclusion-filter';
import type { MarketingProspect, QualificationResult } from '@/types/marketing';

const CONFIDENCE_THRESHOLD = 95;

export async function qualifyProspect(
  prospect: MarketingProspect
): Promise<QualificationResult> {

  const checks: QualificationResult['checks'] = {
    confidence_met: false,
    not_excluded: false,
    not_suppressed: false,
    not_previously_contacted: false,
    valid_contact: false,
  };

  // 1. Confidence gate
  checks.confidence_met = prospect.confidence_score >= CONFIDENCE_THRESHOLD;
  if (!checks.confidence_met) {
    return {
      qualified: false,
      reason: `Confidence ${prospect.confidence_score}% below ${CONFIDENCE_THRESHOLD}% threshold`,
      checks,
    };
  }

  // 2. Valid contact email
  checks.valid_contact = !!(prospect.owner_email && prospect.owner_email.includes('@'));
  if (!checks.valid_contact) {
    return {
      qualified: false,
      reason: 'No valid contact email found for prospect',
      checks,
    };
  }

  // 3 + 4 + 5. Exclusion check (handles customers, suppression, and prior outreach)
  const exclusionResult = await checkExclusion({
    company_domain: prospect.company_domain,
    owner_email: prospect.owner_email,
    product_name: prospect.product_name,
    company_name: prospect.company_name,
  });

  if (exclusionResult.excluded) {
    // Map the matched_table to the specific check that failed
    if (exclusionResult.matched_table === 'exclusions') {
      checks.not_excluded = false;
      checks.not_suppressed = true;
      checks.not_previously_contacted = true;
    } else if (exclusionResult.matched_table === 'suppression') {
      checks.not_excluded = true;
      checks.not_suppressed = false;
      checks.not_previously_contacted = true;
    } else if (exclusionResult.matched_table === 'outreach') {
      checks.not_excluded = true;
      checks.not_suppressed = true;
      checks.not_previously_contacted = false;
    }

    return {
      qualified: false,
      reason: exclusionResult.reason!,
      checks,
    };
  }

  // All checks passed
  checks.not_excluded = true;
  checks.not_suppressed = true;
  checks.not_previously_contacted = true;

  return {
    qualified: true,
    checks,
  };
}
