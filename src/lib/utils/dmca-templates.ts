// ============================================================================
// DMCA TAKEDOWN NOTICE GENERATOR
// ============================================================================

export interface DMCANoticeParams {
  copyrightHolder: string;
  copyrightHolderEmail: string;
  copyrightHolderAddress?: string;
  copyrightHolderPhone?: string;
  productName: string;
  productType?: string; // e.g., "Video Course", "Software", "Digital Product"
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
    first_published_date?: string;
  };
  infrastructure?: {
    ip_address?: string;
    hosting_provider?: string;
    asn?: string;
    asn_org?: string;
    country?: string;
    region?: string;
    city?: string;
    registrar?: string;
    cdn?: string;
    creation_date?: string;
    expiration_date?: string;
    abuse_contact?: string;
  };
  signature?: {
    full_name: string;
    date: string;
    ip_address?: string;
    timestamp?: string;
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
    if (!params.ipOwnership && !params.productType) return '';

    let section = '\n\nINTELLECTUAL PROPERTY OWNERSHIP:\n';

    if (params.productType) {
      section += `Type of Work: ${params.productType}\n`;
    }

    if (params.ipOwnership?.first_published_date || params.ipOwnership?.copyright_date) {
      const pubDate = params.ipOwnership.first_published_date || params.ipOwnership.copyright_date;
      section += `\nThis work is an original, proprietary creation first published on or about ${pubDate}, and is protected under U.S. and international copyright law. No license, assignment, or authorization has been granted to the infringing party.\n`;
    }

    if (params.ipOwnership?.copyright_date && !params.ipOwnership?.first_published_date) {
      section += `Copyright Date: ${params.ipOwnership.copyright_date}\n`;
    }
    if (params.ipOwnership?.license_info) {
      section += `License: ${params.ipOwnership.license_info}\n`;
    }
    if (params.ipOwnership?.ip_claims) {
      section += `Registration/Claims: ${params.ipOwnership.ip_claims}\n`;
    }

    return section;
  };

  // Evidence section
  const getEvidenceSection = () => {
    if (!params.additionalEvidence) return '';
    return `\n\nADDITIONAL EVIDENCE:\n${params.additionalEvidence}\n`;
  };

  // Infrastructure evidence section (NEW - strengthens legal case)
  const getInfrastructureSection = () => {
    if (!params.infrastructure) return '';

    const infra = params.infrastructure;
    const details: string[] = [];

    if (infra.ip_address) {
      details.push(`IP Address: ${infra.ip_address}`);
    }
    if (infra.hosting_provider) {
      details.push(`Hosting Provider: ${infra.hosting_provider}`);
    }
    if (infra.asn) {
      details.push(`Autonomous System Number (ASN): ${infra.asn}${infra.asn_org ? ` (${infra.asn_org})` : ''}`);
    }
    if (infra.city || infra.region || infra.country) {
      const location = [infra.city, infra.region, infra.country].filter(Boolean).join(', ');
      details.push(`Geographic Location: ${location}`);
    }
    if (infra.registrar) {
      details.push(`Domain Registrar: ${infra.registrar}`);
    }
    if (infra.cdn) {
      details.push(`Content Delivery Network: ${infra.cdn}`);
    }
    if (infra.creation_date) {
      details.push(`Domain Created: ${new Date(infra.creation_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
    }
    if (infra.expiration_date) {
      details.push(`Domain Expires: ${new Date(infra.expiration_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
    }
    if (infra.abuse_contact) {
      details.push(`Abuse Contact: ${infra.abuse_contact}`);
    }

    if (details.length === 0) return '';

    return `\n\nTECHNICAL EVIDENCE & INFRASTRUCTURE ANALYSIS:
The infringing material is hosted on infrastructure controlled by:

${details.join('\n')}

This technical evidence establishes:
• The exact server location and responsible parties
• A clear chain of hosting responsibility for escalation purposes
• Alternative contact paths if the primary recipient fails to respond
• Jurisdictional information relevant to potential legal proceedings`;
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

  // Signature section
  const getSignatureSection = () => {
    if (params.signature) {
      return `ELECTRONIC SIGNATURE:
/${params.signature.full_name}/

Name: ${params.signature.full_name}
Date: ${params.signature.date}${params.signature.ip_address ? `\nSignature IP Address: ${params.signature.ip_address} (logged for verification)` : ''}${params.signature.timestamp ? `\nTimestamp: ${params.signature.timestamp}` : ''}`;
    }

    // Fallback to basic signature
    return `ELECTRONIC SIGNATURE:
/${params.copyrightHolder}/

Name: ${params.copyrightHolder}
Email: ${params.copyrightHolderEmail}
Date: ${today}`;
  };

  return `
DMCA TAKEDOWN NOTICE PURSUANT TO 17 U.S.C. § 512(c)

Subject: DMCA Takedown Notice – Copyright Infringement of Protected Work

Date: ${today}

To: ${params.recipientName || `${params.platformName} DMCA Agent / Abuse Team`}

Dear Sir/Madam,

${getOpening()} the Digital Millennium Copyright Act (DMCA), 17 U.S.C. § 512(c).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. COPYRIGHT OWNER INFORMATION

Copyright Owner (or Authorized Agent):
${params.copyrightHolder}

Email Address:
${params.copyrightHolderEmail}
${params.copyrightHolderAddress ? `\nMailing Address:\n${params.copyrightHolderAddress}` : ''}
${params.copyrightHolderPhone ? `\nTelephone Number:\n${params.copyrightHolderPhone}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2. IDENTIFICATION OF THE COPYRIGHTED WORK

I am the owner of the copyrighted work described below, or I am authorized to act on behalf of the owner.

Title of Original Work:
${params.productName}

Original Publication URL:
${params.productUrl}${getIPOwnershipSection()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

3. IDENTIFICATION OF THE INFRINGING MATERIAL

${getInfringementDetails()}
${params.infringingUrl}${getEvidenceSection()}${getInfrastructureSection()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

4. GOOD FAITH STATEMENT (Statutory Requirement)

I have a good faith belief that the use of the copyrighted material described above is not authorized by the copyright owner, its agent, or the law.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

5. ACCURACY & AUTHORITY STATEMENT (Statutory Requirement)

The information in this notice is accurate, and under penalty of perjury, I state that I am the copyright owner or am authorized to act on behalf of the owner of the exclusive rights that are allegedly infringed.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

6. DEMAND FOR EXPEDITIOUS REMOVAL

Pursuant to 17 U.S.C. § 512(c), I respectfully request the expeditious removal or disabling of access to the infringing material identified above.

I hereby request that you immediately:
1. Remove or disable access to the infringing material at the URL specified above
2. Notify the user responsible for posting the infringing content as required by law
3. Provide written confirmation of removal to ${params.copyrightHolderEmail}
4. Preserve any relevant logs or records pursuant to 17 U.S.C. § 512(h)${getExactRecreationRequirements()}

I expect prompt action on this notice in accordance with the DMCA's requirements for expeditious response.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

7. RESERVATION OF RIGHTS

Nothing in this notice constitutes a waiver of any rights or remedies available to the copyright owner, all of which are expressly reserved.${getLegalConsequences()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

8. ${getSignatureSection()}

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
