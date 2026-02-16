/**
 * Enhanced Notice Generator
 *
 * Generates DMCA notices and enforcement letters with:
 * - Tone variations (friendly, firm, nuclear)
 * - Evidence integration
 * - Smart routing based on target entity
 * - Support for multiple action types
 */

import type { ActionType, NoticeTone, Product, Infringement, InfrastructureProfile } from '@/types';
import { generateDMCANotice, generateCeaseDesist, type DMCANoticeParams, type CeaseDesistParams } from '@/lib/utils/dmca-templates';

export interface NoticeGenerationContext {
  product: Product;
  infringement: Infringement;
  actionType: ActionType;
  tone: NoticeTone;
  copyrightHolder: string;
  copyrightHolderEmail: string;
  copyrightHolderAddress?: string;
  targetEntity?: string;
  targetContact?: string;
}

/**
 * Main notice generator class
 */
export class NoticeGenerator {
  /**
   * Generate a notice based on action type and tone
   */
  generate(context: NoticeGenerationContext): string {
    switch (context.actionType) {
      case 'dmca_platform':
      case 'dmca_host':
      case 'dmca_cdn':
        return this.generateDMCANotice(context);

      case 'cease_desist':
        return this.generateCeaseDesistLetter(context);

      case 'google_deindex':
      case 'bing_deindex':
        return this.generateSearchRemovalRequest(context);

      case 'payment_complaint':
        return this.generatePaymentComplaint(context);

      case 'marketplace_report':
        return this.generateMarketplaceReport(context);

      default:
        return this.generateGenericNotice(context);
    }
  }

  /**
   * Generate DMCA notice with tone variation
   */
  private generateDMCANotice(context: NoticeGenerationContext): string {
    const platformName = this.getPlatformDisplayName(context.infringement.platform);
    const targetName = context.targetEntity || `${platformName} Abuse Team`;

    // Base DMCA notice
    const baseParams: DMCANoticeParams = {
      copyrightHolder: context.copyrightHolder,
      copyrightHolderEmail: context.copyrightHolderEmail,
      copyrightHolderAddress: context.copyrightHolderAddress,
      productName: context.product.name,
      productUrl: context.product.url || 'Proprietary Digital Product',
      infringingUrl: context.infringement.source_url,
      platformName: platformName,
      recipientName: targetName,
    };

    let notice = generateDMCANotice(baseParams);

    // Add tone-specific variations
    notice = this.applyTone(notice, context.tone, context);

    // Add evidence section if available
    if (context.infringement.evidence.matched_excerpts.length > 0 || context.infringement.evidence.screenshots.length > 0) {
      notice = this.appendEvidenceSection(notice, context.infringement);
    }

    return notice;
  }

  /**
   * Generate cease & desist letter with tone variation
   */
  private generateCeaseDesistLetter(context: NoticeGenerationContext): string {
    const params: CeaseDesistParams = {
      copyrightHolder: context.copyrightHolder,
      copyrightHolderEmail: context.copyrightHolderEmail,
      copyrightHolderAddress: context.copyrightHolderAddress,
      productName: context.product.name,
      productUrl: context.product.url || 'Proprietary Digital Product',
      infringingUrl: context.infringement.source_url,
      recipientName: context.targetEntity,
      platformName: this.getPlatformDisplayName(context.infringement.platform),
    };

    let notice = generateCeaseDesist(params);
    notice = this.applyTone(notice, context.tone, context);

    return notice;
  }

  /**
   * Generate search engine de-indexing request
   */
  private generateSearchRemovalRequest(context: NoticeGenerationContext): string {
    const engineName = context.actionType === 'google_deindex' ? 'Google' : 'Bing';
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
${engineName.toUpperCase()} SEARCH DE-INDEXING REQUEST

Date: ${today}

To: ${engineName} DMCA Team

Copyrighted Work: ${context.product.name}
Copyright Owner: ${context.copyrightHolder}
Contact Email: ${context.copyrightHolderEmail}
${context.product.url ? `Original Location: ${context.product.url}` : ''}

INFRINGING URL:
${context.infringement.source_url}

DESCRIPTION:
The URL above contains unauthorized copies of my copyrighted work "${context.product.name}". This infringement is causing significant harm to my business and should be removed from ${engineName} Search results.

${context.infringement.match_confidence >= 0.80 ? `CONFIDENCE: High-confidence match (${Math.round(context.infringement.match_confidence * 100)}%)` : ''}

GOOD FAITH STATEMENT:
I have a good faith belief that the use of this material is not authorized by the copyright owner, its agent, or the law.

ACCURACY STATEMENT:
I swear, under penalty of perjury, that the information in this notification is accurate and that I am the copyright owner or authorized to act on behalf of the copyright owner.

Sincerely,
${context.copyrightHolder}
${context.copyrightHolderEmail}

---
Generated by ProductGuard.ai
    `.trim();
  }

  /**
   * Generate payment processor complaint (Pro+ only)
   */
  private generatePaymentComplaint(context: NoticeGenerationContext): string {
    const today = new Date().toLocaleDateString('en-US');

    return `
PAYMENT PROCESSOR COMPLAINT - COPYRIGHT INFRINGEMENT

Date: ${today}

To: ${context.targetEntity || 'Payment Processor Fraud Department'}

Subject: Fraudulent Sale of Copyrighted Material

I am writing to report the fraudulent sale of my copyrighted digital product through your payment processing services.

COPYRIGHT HOLDER:
${context.copyrightHolder}
${context.copyrightHolderEmail}

COPYRIGHTED WORK:
${context.product.name}
${context.product.url ? `Legitimate source: ${context.product.url}` : ''}

INFRINGING MERCHANT:
URL: ${context.infringement.source_url}
${context.infringement.monetization_detected ? 'MONETIZATION DETECTED: This merchant is selling unauthorized copies' : ''}

EVIDENCE:
${context.infringement.evidence.matched_excerpts.length > 0 ? `- Matched content excerpts available` : ''}
${context.infringement.evidence.screenshots.length > 0 ? `- Screenshot evidence available` : ''}
Match confidence: ${Math.round(context.infringement.match_confidence * 100)}%

I request that you:
1. Immediately suspend payment processing for this merchant
2. Freeze any funds related to the sale of my copyrighted work
3. Provide information about the merchant for potential legal action

This merchant is engaged in copyright infringement and fraud. Continued processing of payments enables this illegal activity.

Sincerely,
${context.copyrightHolder}

---
Generated by ProductGuard.ai
    `.trim();
  }

  /**
   * Generate marketplace report (Etsy, Gumroad, etc.)
   */
  private generateMarketplaceReport(context: NoticeGenerationContext): string {
    return `
MARKETPLACE COPYRIGHT INFRINGEMENT REPORT

Product Name: ${context.product.name}
Infringing Listing: ${context.infringement.source_url}

Copyright Owner: ${context.copyrightHolder}
Contact: ${context.copyrightHolderEmail}

This listing is selling unauthorized copies of my copyrighted digital product. I am the rightful copyright owner and have not authorized this seller to distribute my work.

${context.infringement.match_confidence >= 0.80 ? `HIGH CONFIDENCE MATCH (${Math.round(context.infringement.match_confidence * 100)}%)` : ''}

I request immediate removal of this listing.

---
Generated by ProductGuard.ai
    `.trim();
  }

  /**
   * Generate generic notice for custom action types
   */
  private generateGenericNotice(context: NoticeGenerationContext): string {
    const today = new Date().toLocaleDateString('en-US');

    return `
COPYRIGHT INFRINGEMENT NOTICE

Date: ${today}

To: ${context.targetEntity || 'Recipient'}

I am writing to notify you of copyright infringement involving my work "${context.product.name}".

Infringing URL: ${context.infringement.source_url}

Copyright Owner: ${context.copyrightHolder}
Contact: ${context.copyrightHolderEmail}

I request immediate removal of the infringing content.

Sincerely,
${context.copyrightHolder}
    `.trim();
  }

  /**
   * Apply tone variation to notice
   */
  private applyTone(notice: string, tone: NoticeTone, context: NoticeGenerationContext): string {
    switch (tone) {
      case 'friendly':
        // Soften language
        return notice
          .replace('I hereby demand', 'I kindly request')
          .replace('DEMAND FOR IMMEDIATE ACTION:', 'REQUEST FOR ACTION:')
          .replace('Immediately cease and desist', 'Please cease and desist')
          .replace(/\$150,000/g, 'significant statutory damages');

      case 'nuclear':
        // Add escalation language
        const escalationNote = `\n\nPLEASE NOTE: This is escalation step ${context.infringement.previous_status ? '2+' : '1'}. ${context.infringement.previous_status === 'takedown_sent' ? 'Previous takedown requests have been ignored. ' : ''}Legal action is being considered.`;
        return notice + escalationNote;

      case 'firm':
      default:
        // Keep original tone
        return notice;
    }
  }

  /**
   * Append evidence section to notice
   */
  private appendEvidenceSection(notice: string, infringement: Infringement): string {
    let evidenceSection = '\n\nEVIDENCE SUMMARY:\n';

    if (infringement.evidence.screenshots.length > 0) {
      evidenceSection += `- ${infringement.evidence.screenshots.length} screenshot(s) available\n`;
    }

    if (infringement.evidence.matched_excerpts.length > 0) {
      evidenceSection += `- Matched text excerpts:\n`;
      infringement.evidence.matched_excerpts.slice(0, 3).forEach((excerpt) => {
        evidenceSection += `  "${excerpt.substring(0, 100)}${excerpt.length > 100 ? '...' : ''}"\n`;
      });
    }

    evidenceSection += `- Match confidence: ${Math.round(infringement.match_confidence * 100)}%\n`;

    return notice + evidenceSection;
  }

  /**
   * Get display name for platform
   */
  private getPlatformDisplayName(platform: string): string {
    const names: Record<string, string> = {
      telegram: 'Telegram',
      google: 'Google Search',
      cyberlocker: 'File Hosting Service',
      torrent: 'Torrent Network',
      discord: 'Discord',
      forum: 'Forum',
      social: 'Social Media Platform',
    };

    return names[platform] || platform;
  }

  /**
   * Suggest target entity based on infrastructure profile
   */
  suggestTargetEntity(infrastructure: InfrastructureProfile, actionType: ActionType): string | null {
    switch (actionType) {
      case 'dmca_host':
        return infrastructure.hosting_provider;
      case 'dmca_cdn':
        return infrastructure.cdn;
      case 'dmca_platform':
        // Would require platform-specific logic
        return null;
      default:
        return null;
    }
  }
}

// Export singleton instance
export const noticeGenerator = new NoticeGenerator();
