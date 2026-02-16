// ============================================================================
// DMCA TAKEDOWN NOTICE GENERATOR
// ============================================================================

export interface DMCANoticeParams {
  copyrightHolder: string;
  copyrightHolderEmail: string;
  copyrightHolderAddress?: string;
  productName: string;
  productUrl: string;
  infringingUrl: string;
  platformName: string;
  recipientName?: string;
  infringementTypes?: string[];
  tone?: string;
  additionalEvidence?: string;
  ipOwnership?: {
    copyright_date?: string;
    license_info?: string;
    ip_claims?: string;
  };
}

const INFRINGEMENT_TYPE_DESCRIPTIONS: Record<string, string> = {
  exact_recreation: 'Exact recreation of the copyrighted work with identical or substantially similar functionality',
  name_trademark: 'Unauthorized use of trademarked names, brands, and identifiers',
  unauthorized_distribution: 'Distribution of the copyrighted work without permission',
  piracy_sale: 'Commercial sale of unauthorized copies',
  copyright_infringement: 'Direct copying of copyrighted code, documentation, and materials',
  trade_dress: 'Imitation of distinctive visual appearance and presentation',
  derivative_work: 'Creation of derivative works without authorization',
};

export function generateDMCANotice(params: DMCANoticeParams): string {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const tone = params.tone || 'professional';

  // Opening based on tone
  const getOpening = () => {
    switch (tone) {
      case 'formal_legal':
        return 'This is a formal legal notice of copyright infringement pursuant to';
      case 'urgent':
        return 'This is an urgent notice requiring immediate attention regarding copyright infringement pursuant to';
      case 'friendly_firm':
        return 'I am writing to bring to your attention a copyright infringement matter pursuant to';
      default:
        return 'I am writing to notify you of copyright infringement pursuant to';
    }
  };

  // Infringement details section
  const getInfringementDetails = () => {
    if (!params.infringementTypes || params.infringementTypes.length === 0) {
      return 'The following URL on your platform contains unauthorized copies of my copyrighted work:';
    }

    const types = params.infringementTypes
      .map(type => `• ${INFRINGEMENT_TYPE_DESCRIPTIONS[type] || type}`)
      .join('\n');

    return `The infringing material constitutes the following violations:\n\n${types}\n\nInfringing URL:`;
  };

  // IP ownership section
  const getIPOwnershipSection = () => {
    if (!params.ipOwnership) return '';

    let section = '\n\nINTELLECTUAL PROPERTY OWNERSHIP:\n';

    if (params.ipOwnership.copyright_date) {
      section += `Copyright Date: ${params.ipOwnership.copyright_date}\n`;
    }
    if (params.ipOwnership.license_info) {
      section += `License: ${params.ipOwnership.license_info}\n`;
    }
    if (params.ipOwnership.ip_claims) {
      section += `Registration/Claims: ${params.ipOwnership.ip_claims}\n`;
    }

    return section;
  };

  // Evidence section
  const getEvidenceSection = () => {
    if (!params.additionalEvidence) return '';
    return `\n\nADDITIONAL EVIDENCE:\n${params.additionalEvidence}\n`;
  };

  // Specific requirements for exact recreations (trademark/brand removal)
  const getExactRecreationRequirements = () => {
    if (!params.infringementTypes?.includes('exact_recreation') && !params.infringementTypes?.includes('name_trademark')) {
      return '';
    }

    return `\n\nSPECIFIC REQUIREMENTS FOR EXACT RECREATION/TRADEMARK INFRINGEMENT:

In addition to removing the infringing content, the infringer must:

1. REMOVE ALL REFERENCES to our protected trademarks and brand names, including but not limited to:
   - All instances of the product name
   - Company/brand names
   - Creator/author names
   - Any trademarked terms or phrases

2. CEASE AND DESIST from:
   - Using our trademarked names in any capacity
   - Suggesting any affiliation, endorsement, or connection to our brand
   - Creating confusion in the marketplace through name similarity
   - Representing their work as our original product

3. If the infringer has created a derivative or similar product, they must:
   - Rebrand completely with a distinct, non-confusing name
   - Remove all references to our original work
   - Add clear disclaimers that it is NOT associated with our brand

This is a trademark infringement matter in addition to copyright infringement. Under 15 U.S.C. § 1114 (Lanham Act), unauthorized use of trademarks can result in additional statutory damages and penalties.`;
  };

  // Legal consequences section based on tone
  const getLegalConsequences = () => {
    switch (tone) {
      case 'formal_legal':
        return `\n\nLEGAL NOTICE:
Please be advised that under 17 U.S.C. § 512(f), any person who knowingly materially misrepresents that material or activity is infringing may be subject to liability. Additionally, failure to expeditiously remove or disable access to infringing material may result in loss of safe harbor protections under the DMCA and potential liability for contributory copyright infringement.

Statutory damages for copyright infringement can reach up to $150,000 per work infringed (17 U.S.C. § 504(c)). Trademark violations carry additional penalties under the Lanham Act. I reserve all rights to pursue legal action if this matter is not resolved promptly.`;

      case 'urgent':
        return `\n\nURGENT ACTION REQUIRED:
This infringement is causing immediate and ongoing damage to my business and reputation. Under the DMCA, service providers must act expeditiously to remove infringing content upon notification. Failure to do so may result in loss of safe harbor protection and potential legal liability.

I request confirmation of content removal within 24-48 hours.`;

      case 'friendly_firm':
        return `\n\nI understand that your platform receives many such notices and appreciate your cooperation in this matter. Under the DMCA, service providers are required to remove or disable access to infringing material upon proper notification. I trust that you will handle this matter expeditiously and in accordance with applicable law.`;

      default:
        return `\n\nPlease note that under the DMCA, service providers must expeditiously remove or disable access to infringing material upon notification to maintain safe harbor protections.`;
    }
  };

  return `
DMCA TAKEDOWN NOTICE PURSUANT TO 17 U.S.C. § 512(c)

Date: ${today}

To: ${params.recipientName || `${params.platformName} DMCA Agent / Abuse Team`}

Dear Sir/Madam,

${getOpening()} the Digital Millennium Copyright Act (DMCA), 17 U.S.C. § 512(c).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COPYRIGHT HOLDER INFORMATION:
Name: ${params.copyrightHolder}
Email: ${params.copyrightHolderEmail}
${params.copyrightHolderAddress ? `Address: ${params.copyrightHolderAddress}` : ''}

COPYRIGHTED WORK:
Title: ${params.productName}
Original Location: ${params.productUrl}${getIPOwnershipSection()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INFRINGING MATERIAL:
${getInfringementDetails()}
${params.infringingUrl}${getEvidenceSection()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DMCA COMPLIANCE STATEMENTS:

GOOD FAITH STATEMENT:
I have a good faith belief that the use of the copyrighted material described above is not authorized by the copyright owner, its agent, or the law.

ACCURACY STATEMENT:
I declare, under penalty of perjury under the laws of the United States of America, that the information in this notification is accurate and that I am the copyright owner or am authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.

ELECTRONIC SIGNATURE:
${params.copyrightHolder}
${params.copyrightHolderEmail}
${today}${getLegalConsequences()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REQUESTED ACTION:
I hereby request that you immediately:
1. Remove or disable access to the infringing material at the URL specified above
2. Notify the user responsible for posting the infringing content
3. Provide written confirmation of removal to ${params.copyrightHolderEmail}
4. Preserve any relevant logs or records pursuant to 17 U.S.C. § 512(h)${getExactRecreationRequirements()}

I expect prompt action on this notice in accordance with the DMCA's requirements for expeditious response.

Please confirm receipt of this notice and provide an estimated timeline for removal.

Respectfully,

${params.copyrightHolder}
${params.copyrightHolderEmail}
${today}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated via ProductGuard.ai - Automated IP Protection Platform
This notice complies with 17 U.S.C. § 512(c)(3)(A)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();
}

// ============================================================================
// CEASE & DESIST LETTER GENERATOR
// ============================================================================

export interface CeaseDesistParams {
  copyrightHolder: string;
  copyrightHolderEmail: string;
  copyrightHolderAddress?: string;
  productName: string;
  productUrl: string;
  infringingUrl: string;
  recipientName?: string;
  platformName?: string;
}

export function generateCeaseDesist(params: CeaseDesistParams): string {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
CEASE AND DESIST LETTER

Date: ${today}

To: ${params.recipientName || 'Website Operator'}
${params.platformName ? `Platform: ${params.platformName}` : ''}

RE: Unauthorized Use and Distribution of Copyrighted Material

Dear ${params.recipientName || 'Sir/Madam'},

I am the owner of the copyright in the work titled "${params.productName}" (the "Work"), which is available at ${params.productUrl}.

It has come to my attention that you are using, reproducing, and/or distributing my copyrighted Work without my permission at the following location:
${params.infringingUrl}

This unauthorized use constitutes copyright infringement in violation of U.S. Copyright Law (17 U.S.C. § 101 et seq.) and applicable international copyright laws.

DEMAND FOR IMMEDIATE ACTION:
I hereby demand that you:
1. Immediately cease and desist all use, reproduction, and distribution of the Work
2. Remove all infringing content from the URL specified above
3. Confirm in writing within 7 days that you have complied with this demand

LEGAL CONSEQUENCES:
Please be advised that if you fail to comply with this demand, I will have no choice but to pursue all available legal remedies, including:
- Filing a lawsuit for copyright infringement
- Seeking injunctive relief
- Claiming statutory damages up to $150,000 per work infringed
- Recovering attorney's fees and costs

This letter is not a complete statement of my rights and remedies, all of which are expressly reserved.

I expect your full cooperation in this matter. Please respond to this letter within 7 days to confirm your compliance.

Sincerely,

${params.copyrightHolder}
${params.copyrightHolderEmail}
${params.copyrightHolderAddress || ''}
${today}

---
Generated by ProductGuard.ai - AI-Powered Piracy Protection
`.trim();
}

// ============================================================================
// GOOGLE URL REMOVAL REQUEST TEMPLATE
// ============================================================================

export interface GoogleRemovalParams {
  productName: string;
  infringingUrls: string[];
  copyrightHolder: string;
}

export function generateGoogleRemovalRequest(params: GoogleRemovalParams): string {
  return `
GOOGLE SEARCH DE-INDEXING REQUEST

Copyrighted Work: ${params.productName}
Copyright Owner: ${params.copyrightHolder}

The following URLs contain infringing copies of my copyrighted work and should be removed from Google Search results:

${params.infringingUrls.map((url, i) => `${i + 1}. ${url}`).join('\n')}

I have a good faith belief that the use of this material is not authorized by the copyright owner, and I request that Google remove these URLs from search results.

This request is made in accordance with the DMCA and Google's policies.
`.trim();
}
