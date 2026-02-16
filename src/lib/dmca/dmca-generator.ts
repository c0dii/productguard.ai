/**
 * DMCA Takedown Notice Generator
 *
 * Uses AI to generate professional DMCA takedown notices following
 * 17 USC § 512(c)(3) requirements.
 *
 * Key Features:
 * - Platform-specific formatting (YouTube, web hosts, etc.)
 * - Includes all legally required elements
 * - References blockchain timestamp proof
 * - Professional legal tone
 * - User-editable before sending
 */

import { OpenAI } from 'openai';
import type { Product, Infringement, DMCAContact } from '@/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface DMCANoticeParams {
  product: Product;
  infringement: Infringement;
  evidenceSnapshot?: any; // Evidence snapshot with blockchain timestamp
  userContact: DMCAContact;
  platform: {
    name: string;
    dmca_agent_email?: string;
    dmca_agent_name?: string;
    specific_requirements?: string;
  };
}

export interface GeneratedDMCANotice {
  subject: string;
  body: string;
  recipient_email: string;
  recipient_name: string;
  cc_emails?: string[];
  legal_references: string[];
  evidence_links: string[];
  sworn_statement: string;
}

/**
 * Generate a DMCA takedown notice using AI
 */
export async function generateDMCANotice(params: DMCANoticeParams): Promise<GeneratedDMCANotice> {
  const { product, infringement, evidenceSnapshot, userContact, platform } = params;

  // Build comprehensive context for AI
  const prompt = buildDMCAPrompt(params);

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a legal assistant specializing in DMCA takedown notices. Generate professional, legally compliant DMCA notices following 17 USC § 512(c)(3) requirements.

Key requirements:
1. Identify the copyrighted work
2. Identify the infringing material and location
3. Include contact information
4. Include good faith statement
5. Include accuracy statement under penalty of perjury
6. Include physical or electronic signature

Tone: Professional, firm, factual. No threats. Cite specific laws.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent, formal output
      max_tokens: 2000,
    });

    const generatedText = completion.choices[0]?.message?.content || '';

    // Parse the AI response into structured format
    const notice = parseDMCAResponse(generatedText, params);

    return notice;
  } catch (error) {
    console.error('[DMCA Generator] Error generating notice:', error);
    throw new Error('Failed to generate DMCA notice. Please try again.');
  }
}

/**
 * Build the AI prompt with all necessary context
 */
function buildDMCAPrompt(params: DMCANoticeParams): string {
  const { product, infringement, evidenceSnapshot, userContact, platform } = params;

  const hasBlockchainTimestamp = evidenceSnapshot?.timestamp_proof;
  const timestampInfo = hasBlockchainTimestamp
    ? `\n- Evidence timestamped on Bitcoin blockchain (block #${JSON.parse(evidenceSnapshot.timestamp_proof).bitcoin_block})`
    : '';

  const copyrightInfo = product.copyright_info
    ? `\n- Copyright Registration: ${product.copyright_info.registration_number || 'Registered'} (${product.copyright_info.year})`
    : '';

  const trademarkInfo = product.trademark_info
    ? `\n- Trademark: ${product.trademark_info.name}${product.trademark_info.registration_number ? ` (Reg. #${product.trademark_info.registration_number})` : ''}`
    : '';

  return `Generate a DMCA takedown notice with the following details:

**COPYRIGHTED WORK:**
- Product Name: "${product.name}"
- Type: ${product.type}
- Price: $${product.price}
- Official URL: ${product.url || 'N/A'}
- Description: ${product.description || 'N/A'}${copyrightInfo}${trademarkInfo}
- Copyright Holder: ${product.copyright_info?.holder_name || product.copyright_owner || userContact.full_name}

**INFRINGING MATERIAL:**
- Infringing URL: ${infringement.source_url}
- Platform: ${infringement.platform}
- First Detected: ${new Date(infringement.first_seen_at || infringement.created_at).toLocaleDateString()}
- Severity Score: ${infringement.severity_score}/100
- Risk Level: ${infringement.risk_level}${timestampInfo}

**EVIDENCE:**
${infringement.evidence?.matched_excerpts?.length ? `- Matched Content: "${infringement.evidence.matched_excerpts.slice(0, 3).join('", "')}"` : ''}
${infringement.infrastructure?.country ? `- Hosted in: ${infringement.infrastructure.country}` : ''}
${infringement.infrastructure?.hosting_provider ? `- Hosting Provider: ${infringement.infrastructure.hosting_provider}` : ''}

**DOMAIN REGISTRATION (WHOIS):**
${infringement.whois_domain ? `- Domain: ${infringement.whois_domain}` : ''}
${infringement.whois_registrant_org ? `- Registered To: ${infringement.whois_registrant_org}` : ''}
${infringement.whois_registrant_country ? `- Registrant Country: ${infringement.whois_registrant_country}` : ''}
${infringement.whois_registrar_name ? `- Domain Registrar: ${infringement.whois_registrar_name}` : ''}
${infringement.whois_registrar_abuse_email ? `- Registrar Abuse Contact: ${infringement.whois_registrar_abuse_email}` : ''}
${infringement.whois_registrar_abuse_phone ? `- Registrar Abuse Phone: ${infringement.whois_registrar_abuse_phone}` : ''}
${infringement.whois_created_date ? `- Domain Created: ${new Date(infringement.whois_created_date).toLocaleDateString()}` : ''}
${infringement.whois_domain_age_days ? `- Domain Age: ~${Math.floor(infringement.whois_domain_age_days / 365)} years` : ''}

**SENDER (Copyright Holder/Agent):**
- Name: ${userContact.full_name}
${userContact.company ? `- Company: ${userContact.company}` : ''}
- Email: ${userContact.email}
${userContact.phone ? `- Phone: ${userContact.phone}` : ''}
- Address: ${userContact.address}
- Relationship to Copyright: ${userContact.is_copyright_owner ? 'Copyright Owner' : userContact.relationship_to_owner || 'Authorized Agent'}

**RECIPIENT:**
- Platform: ${platform.name}
${platform.dmca_agent_name ? `- DMCA Agent: ${platform.dmca_agent_name}` : ''}
${platform.dmca_agent_email ? `- Email: ${platform.dmca_agent_email}` : ''}
${platform.specific_requirements ? `- Special Requirements: ${platform.specific_requirements}` : ''}

**FORMAT REQUIREMENTS:**
Generate the notice in this JSON structure:
{
  "subject": "Subject line for email",
  "body": "Full DMCA notice body with all required elements",
  "sworn_statement": "The complete sworn statement under penalty of perjury"
}

**REQUIRED ELEMENTS IN BODY:**
1. Formal greeting
2. Identification of copyrighted work (include ALL details provided)
3. Identification of infringing material (URL and description)
4. Statement of good faith belief
5. Statement of accuracy under penalty of perjury (separate section)
6. Contact information
7. Request for expedited removal
8. Reference to blockchain timestamp evidence if available
9. Closing and signature line

**TONE:** Professional, firm, factual. Cite 17 USC § 512(c)(3). No threats or aggressive language.`;
}

/**
 * Parse AI response into structured format
 */
function parseDMCAResponse(text: string, params: DMCANoticeParams): GeneratedDMCANotice {
  try {
    // Try to parse as JSON first
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      return {
        subject: parsed.subject || generateDefaultSubject(params),
        body: parsed.body || text,
        recipient_email: params.platform.dmca_agent_email || '',
        recipient_name: params.platform.dmca_agent_name || `${params.platform.name} DMCA Agent`,
        legal_references: [
          '17 USC § 512(c)(3)',
          'Digital Millennium Copyright Act',
        ],
        evidence_links: [params.infringement.source_url],
        sworn_statement: parsed.sworn_statement || extractSwornStatement(parsed.body || text),
      };
    }
  } catch (error) {
    // If JSON parsing fails, treat entire response as body
  }

  // Fallback: use entire text as body
  return {
    subject: generateDefaultSubject(params),
    body: text,
    recipient_email: params.platform.dmca_agent_email || '',
    recipient_name: params.platform.dmca_agent_name || `${params.platform.name} DMCA Agent`,
    legal_references: [
      '17 USC § 512(c)(3)',
      'Digital Millennium Copyright Act',
    ],
    evidence_links: [params.infringement.source_url],
    sworn_statement: extractSwornStatement(text),
  };
}

/**
 * Generate default subject line
 */
function generateDefaultSubject(params: DMCANoticeParams): string {
  return `DMCA Takedown Notice - Copyright Infringement of "${params.product.name}"`;
}

/**
 * Extract sworn statement from body text
 */
function extractSwornStatement(body: string): string {
  // Look for common sworn statement patterns
  const patterns = [
    /I swear, under penalty of perjury[\s\S]*?(?=\n\n|\n[A-Z]|$)/i,
    /under penalty of perjury[\s\S]*?(?=\n\n|\n[A-Z]|$)/i,
    /I declare[\s\S]*?under penalty of perjury[\s\S]*?(?=\n\n|\n[A-Z]|$)/i,
  ];

  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }

  // Default sworn statement if not found
  return `I swear, under penalty of perjury, that the information in this notification is accurate and that I am the copyright owner, or am authorized to act on behalf of the owner, of an exclusive right that is allegedly infringed.`;
}

/**
 * Get platform-specific DMCA agent information
 *
 * This should be expanded with a database of known platforms
 */
export function getPlatformDMCAInfo(platformName: string): {
  name: string;
  dmca_agent_email?: string;
  dmca_agent_name?: string;
  specific_requirements?: string;
} {
  const platforms: Record<string, any> = {
    youtube: {
      name: 'YouTube',
      dmca_agent_email: 'copyright@youtube.com',
      dmca_agent_name: 'YouTube Copyright Team',
      specific_requirements: 'Include timestamps for video content. Use web form if available.',
    },
    google: {
      name: 'Google',
      dmca_agent_email: 'dmca-agent@google.com',
      dmca_agent_name: 'Google DMCA Agent',
      specific_requirements: 'Include specific URLs to be removed from search results.',
    },
    telegram: {
      name: 'Telegram',
      dmca_agent_email: 'dmca@telegram.org',
      dmca_agent_name: 'Telegram DMCA Agent',
      specific_requirements: 'Include channel/group username or invite link.',
    },
    discord: {
      name: 'Discord',
      dmca_agent_email: 'copyright@discord.com',
      dmca_agent_name: 'Discord Trust & Safety',
      specific_requirements: 'Include server ID and message links if applicable.',
    },
  };

  return platforms[platformName.toLowerCase()] || {
    name: platformName,
    dmca_agent_email: undefined,
    dmca_agent_name: undefined,
    specific_requirements: 'Contact hosting provider directly.',
  };
}
