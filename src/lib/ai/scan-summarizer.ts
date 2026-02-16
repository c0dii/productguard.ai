/**
 * AI-Powered Scan Summary Generator
 * Creates professional, reassuring summaries of scan results for users
 */

import { generateCompletion, AI_MODELS } from './client';
import type { Scan } from '@/types';

export interface ScanSummaryData {
  summary: string;
  severity: 'none' | 'low' | 'moderate' | 'high' | 'critical';
  recommendation: string;
  tone: 'positive' | 'neutral' | 'alert';
}

/**
 * Generate an AI summary of scan results
 */
export async function generateScanSummary(
  scan: Scan,
  productName: string,
  pendingCount: number,
  activeCount: number,
  criticalCount: number,
  highCount: number
): Promise<ScanSummaryData> {
  const systemPrompt = `You are a professional cybersecurity analyst providing scan result summaries to business owners.

Your tone should be:
- Professional and reassuring
- Clear and concise (2-3 sentences max)
- Action-oriented when needed
- Empathetic but factual

IMPORTANT GUIDELINES:
- If NO infringements found: Be positive and encouraging
- If FEW infringements (1-5): Be reassuring but recommend action
- If MODERATE infringements (6-20): Be concerned but professional
- If MANY infringements (21+): Be serious but supportive

Always maintain a helpful, protective tone - you're helping them defend their business.

Respond ONLY with valid JSON in this exact format:
{
  "summary": "2-3 sentence summary of findings",
  "severity": "none" | "low" | "moderate" | "high" | "critical",
  "recommendation": "Brief actionable next step",
  "tone": "positive" | "neutral" | "alert"
}`;

  const userPrompt = `Analyze this scan result and create a professional summary:

PRODUCT: ${productName}
SCAN STATUS: ${scan.status}
TOTAL INFRINGEMENTS FOUND: ${scan.infringement_count}
PENDING VERIFICATION: ${pendingCount}
ACTIVE VERIFIED: ${activeCount}
CRITICAL RISK: ${criticalCount}
HIGH RISK: ${highCount}
ESTIMATED REVENUE LOSS: $${scan.est_revenue_loss.toLocaleString()}

Create a summary that helps the business owner understand the situation and what to do next.`;

  try {
    const response = await generateCompletion<ScanSummaryData>(
      systemPrompt,
      userPrompt,
      {
        model: AI_MODELS.MINI,
        temperature: 0.3,
        maxTokens: 300,
        responseFormat: 'json',
      }
    );

    // Validate response
    if (!response.data.summary || !response.data.severity || !response.data.recommendation) {
      throw new Error('Invalid AI summary response');
    }

    return response.data;
  } catch (error) {
    console.error('Error generating scan summary:', error);

    // Fallback to rule-based summary
    return generateFallbackSummary(
      scan.infringement_count,
      scan.est_revenue_loss,
      pendingCount,
      criticalCount
    );
  }
}

/**
 * Fallback summary if AI fails
 */
function generateFallbackSummary(
  totalCount: number,
  revenueLoss: number,
  pendingCount: number,
  criticalCount: number
): ScanSummaryData {
  if (totalCount === 0) {
    return {
      summary:
        "Great news! Our comprehensive scan didn't detect any active piracy of your product. Your content appears to be well-protected across monitored platforms.",
      severity: 'none',
      recommendation: 'Continue monitoring with regular scans to maintain protection.',
      tone: 'positive',
    };
  }

  if (totalCount <= 5) {
    return {
      summary: `We detected ${totalCount} potential ${totalCount === 1 ? 'infringement' : 'infringements'} that ${pendingCount > 0 ? 'require verification' : 'have been identified'}. ${revenueLoss > 0 ? `This may be impacting your revenue by approximately $${revenueLoss.toLocaleString()}.` : ''} Our system has flagged these for your review.`,
      severity: 'low',
      recommendation:
        pendingCount > 0
          ? 'Review pending verifications below to confirm genuine threats.'
          : 'Review active infringements and initiate takedown actions.',
      tone: 'neutral',
    };
  }

  if (totalCount <= 20) {
    return {
      summary: `We found ${totalCount} potential infringements across various platforms${revenueLoss > 0 ? `, with an estimated revenue impact of $${revenueLoss.toLocaleString()}` : ''}. ${criticalCount > 0 ? `${criticalCount} are marked as critical priority.` : 'These require your attention to protect your intellectual property.'}`,
      severity: 'moderate',
      recommendation: 'Prioritize critical and high-risk infringements for immediate action.',
      tone: 'alert',
    };
  }

  return {
    summary: `Our scan detected ${totalCount} potential infringements${criticalCount > 0 ? `, including ${criticalCount} critical threats` : ''}.${revenueLoss > 0 ? ` The estimated revenue impact is $${revenueLoss.toLocaleString()}.` : ''} This indicates significant unauthorized distribution that requires prompt attention.`,
    severity: 'high',
    recommendation:
      'Focus on critical infringements first, then systematically address high-priority cases.',
    tone: 'alert',
  };
}
