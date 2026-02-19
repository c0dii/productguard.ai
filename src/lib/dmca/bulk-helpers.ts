/**
 * Bulk DMCA Generation Helpers
 *
 * Shared pipeline for generating DMCA notices for multiple infringements.
 * Reuses the same profile detection, target resolution, comparison building,
 * and notice building as the single-infringement flow.
 */

import { detectInfringementProfile } from './infringement-profiles';
import { resolveAllTargets, type EnforcementTarget, type ProviderInfo } from './provider-database';
import { buildComparisonItems, type ComparisonItem } from './comparison-builder';
import { buildNotice, type BuiltNotice } from './notice-builder';
import type { DMCAContact, DeliveryMethod } from '@/types';

export interface BulkGenerationInput {
  infringement: {
    id: string;
    source_url: string;
    platform: string | null;
    infringement_type: string | null;
    evidence: any;
    severity_score: number | null;
    first_seen_at: string | null;
    created_at: string;
    infrastructure: any;
    whois_domain: string | null;
    whois_registrant_org: string | null;
    whois_registrar_name: string | null;
    whois_registrar_abuse_email: string | null;
    evidence_snapshot_id: string | null;
  };
  product: {
    id: string;
    name: string;
    type: string;
    price: number | null;
    url: string | null;
    description: string | null;
    copyright_info: any;
    trademark_info: any;
    ai_extracted_data: any;
  };
  contact: DMCAContact;
}

export interface BulkGenerationResult {
  infringement_id: string;
  target: EnforcementTarget;
  provider: ProviderInfo;
  notice: BuiltNotice;
  delivery_method: DeliveryMethod;
  all_targets: EnforcementTarget[];
}

/**
 * Generate a DMCA notice for a single infringement (used in bulk pipeline).
 * Returns the resolved target, generated notice, and delivery method.
 */
export function generateForInfringement(input: BulkGenerationInput): BulkGenerationResult {
  const { infringement, product, contact } = input;

  // Step 1: Detect infringement profile
  const profile = detectInfringementProfile({
    platform: infringement.platform || undefined,
    infringement_type: infringement.infringement_type || undefined,
    evidence: infringement.evidence,
    source_url: infringement.source_url,
  });

  // Step 2: Resolve all enforcement targets
  const allTargets = resolveAllTargets(
    infringement.source_url,
    infringement.platform || undefined,
    infringement.infrastructure?.hosting_provider,
    infringement.whois_registrar_name,
    infringement.whois_registrar_abuse_email,
  );

  // Step 3: Pick the first recommended target (platform-first)
  const recommendedTarget = allTargets.find((t) => t.recommended) || allTargets[0]!;
  const provider = recommendedTarget.provider;

  // Step 4: Determine delivery method
  let deliveryMethod: DeliveryMethod;
  if (provider.dmcaEmail && !provider.prefersWebForm) {
    deliveryMethod = 'email';
  } else if (provider.dmcaEmail) {
    // Has email but prefers web form — still use email for bulk automation
    deliveryMethod = 'email';
  } else if (provider.dmcaFormUrl) {
    deliveryMethod = 'web_form';
  } else {
    deliveryMethod = 'manual';
  }

  // Step 5: Build comparison items
  const comparisonItems = buildComparisonItems({
    productName: product.name,
    productUrl: product.url,
    productType: product.type,
    sourceUrl: infringement.source_url,
    evidence: infringement.evidence,
    aiExtractedData: product.ai_extracted_data,
  });

  // Step 6: Build the DMCA notice
  const notice = buildNotice({
    contact,
    product: {
      name: product.name,
      type: product.type,
      price: product.price || undefined,
      url: product.url,
      description: product.description,
      copyright_info: product.copyright_info,
      trademark_info: product.trademark_info,
    },
    infringement: {
      source_url: infringement.source_url,
      platform: infringement.platform || undefined,
      first_seen_at: infringement.first_seen_at || infringement.created_at,
      severity_score: infringement.severity_score || undefined,
      infrastructure: infringement.infrastructure,
      whois_domain: infringement.whois_domain,
      whois_registrant_org: infringement.whois_registrant_org,
      whois_registrar_name: infringement.whois_registrar_name,
    },
    profile,
    provider,
    comparisonItems,
  });

  return {
    infringement_id: infringement.id,
    target: recommendedTarget,
    provider,
    notice,
    delivery_method: deliveryMethod,
    all_targets: allTargets,
  };
}

export interface BulkSummary {
  email_targets: Array<{
    recipient_email: string;
    recipient_name: string;
    provider_name: string;
    target_type: string;
    infringement_ids: string[];
    count: number;
  }>;
  web_form_targets: Array<{
    provider_name: string;
    form_url: string;
    infringement_ids: string[];
    count: number;
  }>;
  manual_targets: Array<{
    provider_name: string;
    infringement_ids: string[];
    count: number;
  }>;
  total_email: number;
  total_web_form: number;
  total_manual: number;
}

/**
 * Group bulk generation results into a summary for the review modal.
 */
export function summarizeBulkResults(results: BulkGenerationResult[]): BulkSummary {
  const emailMap = new Map<string, BulkSummary['email_targets'][0]>();
  const webFormMap = new Map<string, BulkSummary['web_form_targets'][0]>();
  const manualMap = new Map<string, BulkSummary['manual_targets'][0]>();

  for (const result of results) {
    if (result.delivery_method === 'email') {
      const key = result.notice.recipient_email;
      const existing = emailMap.get(key);
      if (existing) {
        existing.infringement_ids.push(result.infringement_id);
        existing.count++;
      } else {
        emailMap.set(key, {
          recipient_email: result.notice.recipient_email,
          recipient_name: result.notice.recipient_name,
          provider_name: result.provider.name,
          target_type: result.target.type,
          infringement_ids: [result.infringement_id],
          count: 1,
        });
      }
    } else if (result.delivery_method === 'web_form') {
      const key = result.provider.name;
      const existing = webFormMap.get(key);
      if (existing) {
        existing.infringement_ids.push(result.infringement_id);
        existing.count++;
      } else {
        webFormMap.set(key, {
          provider_name: result.provider.name,
          form_url: result.provider.dmcaFormUrl || '',
          infringement_ids: [result.infringement_id],
          count: 1,
        });
      }
    } else {
      const key = result.provider.name;
      const existing = manualMap.get(key);
      if (existing) {
        existing.infringement_ids.push(result.infringement_id);
        existing.count++;
      } else {
        manualMap.set(key, {
          provider_name: result.provider.name,
          infringement_ids: [result.infringement_id],
          count: 1,
        });
      }
    }
  }

  return {
    email_targets: Array.from(emailMap.values()),
    web_form_targets: Array.from(webFormMap.values()),
    manual_targets: Array.from(manualMap.values()),
    total_email: results.filter((r) => r.delivery_method === 'email').length,
    total_web_form: results.filter((r) => r.delivery_method === 'web_form').length,
    total_manual: results.filter((r) => r.delivery_method === 'manual').length,
  };
}
