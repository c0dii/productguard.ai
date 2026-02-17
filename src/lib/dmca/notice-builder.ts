/**
 * Structured DMCA Notice Builder
 *
 * Assembles legally complete DMCA notices from structured data using a
 * deterministic 7-section template. No AI hallucination risk — every
 * required element is guaranteed to be present.
 *
 * Structure follows 17 U.S.C. §512(c)(3) requirements:
 *   A) Notifier / Rights Holder
 *   B) Copyrighted Work Identification
 *   C) Infringing Material + Comparison Items
 *   D) Evidence Packet (optional)
 *   E) Required DMCA Statements
 *   F) Requested Action
 *   G) Electronic Signature
 */

import type { DMCAContact } from '@/types';
import { type InfringementProfile, getProfileInfo } from './infringement-profiles';
import { type ComparisonItem } from './comparison-builder';
import { type ProviderInfo } from './provider-database';

export interface NoticeInput {
  // Rights Holder
  contact: DMCAContact;

  // Copyrighted Work
  product: {
    name: string;
    type?: string;
    price?: number;
    url?: string | null;
    description?: string | null;
    copyright_info?: {
      registration_number?: string;
      year?: string | number;
      holder_name?: string;
    } | null;
    trademark_info?: {
      name?: string;
      registration_number?: string;
    } | null;
  };

  // Infringing Material
  infringement: {
    source_url: string;
    platform?: string;
    first_seen_at?: string;
    severity_score?: number;
    infrastructure?: {
      ip_address?: string;
      hosting_provider?: string;
      country?: string;
    } | null;
    whois_domain?: string | null;
    whois_registrant_org?: string | null;
    whois_registrar_name?: string | null;
  };

  // Resolved data
  profile: InfringementProfile;
  provider: ProviderInfo;
  comparisonItems: ComparisonItem[];

  // Evidence (optional)
  evidence?: {
    contentHash?: string;
    timestampProof?: string | null;
    waybackUrl?: string | null;
    capturedAt?: string;
    htmlStoragePath?: string | null;
    pageLinksCount?: number;
    pageTextLength?: number;
  } | null;
}

export interface BuiltNotice {
  subject: string;
  body: string;
  recipient_email: string;
  recipient_name: string;
  recipient_form_url: string | null;
  legal_references: string[];
  evidence_links: string[];
  sworn_statement: string;
  comparison_items: ComparisonItem[];
  profile: InfringementProfile;
}

/**
 * Build a complete, legally valid DMCA notice from structured data.
 */
export function buildNotice(input: NoticeInput): BuiltNotice {
  const { contact, product, infringement, profile, provider, comparisonItems, evidence } = input;
  const profileInfo = getProfileInfo(profile);
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const sections: string[] = [];

  // ── Subject Line ──────────────────────────────────────────────────
  const subject = `DMCA Takedown Notice — Unauthorized ${profileInfo.label} of "${product.name}"`;

  // ── Section A: Notifier / Rights Holder ───────────────────────────
  sections.push(`Dear ${provider.agentName},

I am writing to notify you of copyright infringement pursuant to the Digital Millennium Copyright Act, 17 U.S.C. §512(c)(3).

${contact.is_copyright_owner
    ? `I am the copyright owner of the work described below.`
    : `I am authorized to act on behalf of the copyright owner${contact.relationship_to_owner ? ` as ${contact.relationship_to_owner}` : ''}.`}

Contact Information:
  Name: ${contact.full_name}${contact.company ? `\n  Company: ${contact.company}` : ''}
  Email: ${contact.email}${contact.phone ? `\n  Phone: ${contact.phone}` : ''}${contact.address ? `\n  Address: ${contact.address}` : ''}`);

  // ── Section B: Copyrighted Work ───────────────────────────────────
  let workSection = `IDENTIFICATION OF COPYRIGHTED WORK

  Title: ${product.name}`;

  if (product.type) {
    workSection += `\n  Type: ${formatProductType(product.type)}`;
  }
  if (product.price) {
    workSection += `\n  Retail Price: $${product.price}`;
  }
  if (product.url) {
    workSection += `\n  Original URL: ${product.url}`;
  }
  if (product.description) {
    workSection += `\n  Description: ${product.description.slice(0, 300)}`;
  }
  if (product.copyright_info?.registration_number) {
    workSection += `\n  Copyright Registration: ${product.copyright_info.registration_number} (${product.copyright_info.year || ''})`;
  }
  if (product.copyright_info?.holder_name) {
    workSection += `\n  Copyright Holder: ${product.copyright_info.holder_name}`;
  }
  if (product.trademark_info?.name) {
    workSection += `\n  Trademark: ${product.trademark_info.name}${product.trademark_info.registration_number ? ` (Reg. #${product.trademark_info.registration_number})` : ''}`;
  }

  workSection += `\n\nNo authorization has been granted to the infringing party to reproduce, distribute, display, sell, or create derivative works from this content.`;

  sections.push(workSection);

  // ── Section C: Infringing Material ────────────────────────────────
  let infringementSection = `IDENTIFICATION OF INFRINGING MATERIAL

The following material constitutes ${profileInfo.legalBasis}:

  Infringing URL: ${infringement.source_url}`;

  if (infringement.platform) {
    infringementSection += `\n  Platform: ${infringement.platform}`;
  }
  if (infringement.first_seen_at) {
    infringementSection += `\n  First Detected: ${new Date(infringement.first_seen_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
  }

  infringementSection += `\n\n${profileInfo.description}`;

  // Comparison Items
  if (comparisonItems.length > 0) {
    infringementSection += `\n\nComparison of Original and Infringing Material:\n`;
    for (let i = 0; i < comparisonItems.length; i++) {
      infringementSection += `\n  ${i + 1}. Original: ${comparisonItems[i]!.original}`;
      infringementSection += `\n     Infringing: ${comparisonItems[i]!.infringing}\n`;
    }
  }

  sections.push(infringementSection);

  // ── Section D: Evidence Packet (optional) ─────────────────────────
  if (evidence) {
    let evidenceSection = `SUPPLEMENTAL EVIDENCE`;

    if (evidence.capturedAt) {
      evidenceSection += `\n\n  Evidence Captured: ${new Date(evidence.capturedAt).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}`;
    }
    if (evidence.contentHash) {
      evidenceSection += `\n  Content Fingerprint (SHA-256): ${evidence.contentHash}`;
    }
    if (evidence.waybackUrl) {
      evidenceSection += `\n  Wayback Machine Archive: ${evidence.waybackUrl}`;
    }
    if (evidence.timestampProof) {
      evidenceSection += `\n  Blockchain Timestamp: Evidence hash anchored to Bitcoin blockchain via OpenTimestamps`;
    }
    if (evidence.pageTextLength) {
      evidenceSection += `\n  Captured Page Content: ${Math.round(evidence.pageTextLength / 1000)}KB of text preserved`;
    }
    if (evidence.pageLinksCount) {
      evidenceSection += `\n  Page Links Captured: ${evidence.pageLinksCount} outbound links recorded`;
    }
    if (evidence.htmlStoragePath) {
      evidenceSection += `\n  Full HTML Archive: Preserved in secure storage`;
    }

    // Infrastructure evidence
    if (infringement.infrastructure?.ip_address || infringement.infrastructure?.hosting_provider) {
      evidenceSection += `\n\n  Server Infrastructure:`;
      if (infringement.infrastructure.ip_address) {
        evidenceSection += `\n    IP Address: ${infringement.infrastructure.ip_address}`;
      }
      if (infringement.infrastructure.hosting_provider) {
        evidenceSection += `\n    Hosting Provider: ${infringement.infrastructure.hosting_provider}`;
      }
      if (infringement.infrastructure.country) {
        evidenceSection += `\n    Server Location: ${infringement.infrastructure.country}`;
      }
    }

    if (infringement.whois_domain) {
      evidenceSection += `\n\n  Domain Registration:`;
      evidenceSection += `\n    Domain: ${infringement.whois_domain}`;
      if (infringement.whois_registrant_org) {
        evidenceSection += `\n    Registered To: ${infringement.whois_registrant_org}`;
      }
      if (infringement.whois_registrar_name) {
        evidenceSection += `\n    Registrar: ${infringement.whois_registrar_name}`;
      }
    }

    evidenceSection += `\n\nThe above evidence is supplemental and is provided to assist in identifying the infringing material.`;

    sections.push(evidenceSection);
  }

  // ── Section E: Required DMCA Statements ───────────────────────────
  const goodFaith = `I have a good faith belief that the use of the copyrighted material described above is not authorized by the copyright owner, its agent, or the law.`;

  const perjury = `I swear, under penalty of perjury, that the information in this notification is accurate and that I am the copyright owner, or am authorized to act on behalf of the owner, of an exclusive right that is allegedly infringed.`;

  sections.push(`STATEMENTS PURSUANT TO 17 U.S.C. §512(c)(3)

${goodFaith}

${perjury}`);

  // ── Section F: Requested Action ───────────────────────────────────
  sections.push(`REQUESTED ACTION

Pursuant to 17 U.S.C. §512(c), I respectfully request that you:

  1. Expeditiously remove or disable access to the infringing material identified above.
  2. Notify the individual responsible for the infringing material of this takedown request.
  3. Inform me in writing of the actions taken in response to this notice.
  4. Take reasonable steps to identify and remove any additional copies of this material hosted on your service.

Please be advised that, pursuant to 17 U.S.C. §512(f), any person who knowingly and materially misrepresents that material is infringing may be subject to liability for damages.`);

  // ── Section G: Electronic Signature ───────────────────────────────
  sections.push(`ELECTRONIC SIGNATURE

/ ${contact.full_name} /

${contact.full_name}${contact.company ? `\n${contact.company}` : ''}
Date: ${dateStr}

This notice is submitted in compliance with the Digital Millennium Copyright Act (17 U.S.C. §512).`);

  // ── Assemble ──────────────────────────────────────────────────────
  const body = sections.join('\n\n──────────────────────────────────────────\n\n');

  const legalReferences = [
    '17 U.S.C. §512(c)(3) — DMCA Safe Harbor Notification Requirements',
    '17 U.S.C. §106 — Exclusive Rights in Copyrighted Works',
  ];

  if (product.trademark_info?.name) {
    legalReferences.push('15 U.S.C. §1114 — Lanham Act (Trademark Protection)');
  }

  return {
    subject,
    body,
    recipient_email: provider.dmcaEmail || '',
    recipient_name: provider.agentName,
    recipient_form_url: provider.dmcaFormUrl,
    legal_references: legalReferences,
    evidence_links: [infringement.source_url],
    sworn_statement: perjury,
    comparison_items: comparisonItems,
    profile,
  };
}

function formatProductType(type: string): string {
  const labels: Record<string, string> = {
    video_course: 'Video Course',
    ebook: 'E-Book',
    pdf: 'PDF Document',
    software: 'Software Application',
    images: 'Image Collection',
    audio: 'Audio Content',
    slides: 'Presentation Slides',
    trading_indicator: 'Trading Indicator',
    template: 'Digital Template',
    digital_asset: 'Digital Asset',
    course: 'Online Course',
  };
  return labels[type] || type;
}
