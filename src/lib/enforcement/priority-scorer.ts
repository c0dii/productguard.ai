/**
 * Priority Scorer Module
 *
 * Calculates severity scores (0-100) and assigns priorities (P0/P1/P2) to infringements
 * based on:
 * - Monetization detection (is the pirate making money?)
 * - Audience size/reach
 * - Match confidence
 * - Platform type
 * - Estimated revenue loss
 */

import type { Priority, PlatformType, RiskLevel } from '@/types';

export interface ScoringInputs {
  // Core detection data
  matchConfidence: number; // 0.00-1.00
  platform: PlatformType;
  audienceCount: number; // Numeric count of followers/visitors

  // Monetization signals
  monetizationDetected: boolean; // Are they selling it?
  estimatedRevenueLoss: number; // $$$ impact

  // Risk level from initial scan
  riskLevel: RiskLevel;

  // Geographic data (optional)
  country?: string | null; // ISO country code or country name
}

export interface ScoringResult {
  severityScore: number; // 0-100
  priority: Priority; // P0, P1, P2
  scoringBreakdown: {
    matchConfidencePoints: number;
    audiencePoints: number;
    monetizationPoints: number;
    platformPoints: number;
    revenueImpactPoints: number;
    countryBonusPoints: number;
  };
}

/**
 * Platform risk weights (how serious is piracy on this platform?)
 */
const PLATFORM_WEIGHTS: Record<PlatformType, number> = {
  telegram: 0.9, // Very high risk - large piracy networks
  torrent: 0.85, // High risk - permanent distribution
  cyberlocker: 0.80, // High risk - monetized file sharing
  google: 0.75, // High risk - discoverability
  discord: 0.70, // Medium-high risk - private communities
  forum: 0.65, // Medium risk - niche distribution
  social: 0.60, // Medium risk - viral potential
};

/**
 * Main priority scorer class
 */
export class PriorityScorer {
  /**
   * Calculate severity score and assign priority
   */
  score(inputs: ScoringInputs): ScoringResult {
    const breakdown = {
      matchConfidencePoints: this.scoreMatchConfidence(inputs.matchConfidence),
      audiencePoints: this.scoreAudience(inputs.audienceCount),
      monetizationPoints: this.scoreMonetization(inputs.monetizationDetected),
      platformPoints: this.scorePlatform(inputs.platform),
      revenueImpactPoints: this.scoreRevenueImpact(inputs.estimatedRevenueLoss),
      countryBonusPoints: this.scoreCountryEnforceability(inputs.country),
    };

    // Calculate total severity score (0-100)
    const severityScore = Math.min(
      Math.round(
        breakdown.matchConfidencePoints +
        breakdown.audiencePoints +
        breakdown.monetizationPoints +
        breakdown.platformPoints +
        breakdown.revenueImpactPoints +
        breakdown.countryBonusPoints
      ),
      100
    );

    // Assign priority based on severity and key factors
    const priority = this.assignPriority(severityScore, inputs);

    return {
      severityScore,
      priority,
      scoringBreakdown: breakdown,
    };
  }

  /**
   * Score match confidence (0-20 points)
   * Higher confidence = higher priority
   */
  private scoreMatchConfidence(confidence: number): number {
    return Math.round(confidence * 20);
  }

  /**
   * Score audience size (0-25 points)
   * Larger audience = more damage potential
   */
  private scoreAudience(count: number): number {
    if (count === 0) return 0;
    if (count < 100) return 5;
    if (count < 500) return 10;
    if (count < 2000) return 15;
    if (count < 10000) return 20;
    return 25; // 10K+ audience
  }

  /**
   * Score monetization (0-30 points)
   * If pirate is making money, this is urgent
   */
  private scoreMonetization(detected: boolean): number {
    return detected ? 30 : 0;
  }

  /**
   * Score platform risk (0-15 points)
   * Different platforms have different piracy severity
   */
  private scorePlatform(platform: PlatformType): number {
    const weight = PLATFORM_WEIGHTS[platform] || 0.5;
    return Math.round(weight * 15);
  }

  /**
   * Score revenue impact (0-10 points)
   * Higher estimated loss = higher priority
   */
  private scoreRevenueImpact(loss: number): number {
    if (loss === 0) return 0;
    if (loss < 100) return 2;
    if (loss < 500) return 4;
    if (loss < 1000) return 6;
    if (loss < 5000) return 8;
    return 10; // $5K+ loss
  }

  /**
   * Score country enforceability (0-10 points)
   * Countries with stronger IP laws and easier takedown processes get bonus points
   *
   * Tier 1 (10 points): US, UK, CA, AU, NZ - Strong DMCA/copyright laws
   * Tier 2 (5 points): EU countries - GDPR + copyright enforcement
   * Tier 3 (2 points): Other developed nations - Moderate enforcement
   * Tier 4 (0 points): Countries with weak IP enforcement
   */
  private scoreCountryEnforceability(country: string | null | undefined): number {
    if (!country) return 0;

    const countryUpper = country.toUpperCase();

    // Tier 1: Countries with strongest IP enforcement (10 points)
    const tier1Countries = [
      'US', 'USA', 'UNITED STATES',
      'GB', 'UK', 'UNITED KINGDOM',
      'CA', 'CANADA',
      'AU', 'AUSTRALIA',
      'NZ', 'NEW ZEALAND',
    ];

    if (tier1Countries.some(c => countryUpper.includes(c))) {
      return 10;
    }

    // Tier 2: EU countries with good enforcement (5 points)
    const tier2Countries = [
      'DE', 'GERMANY',
      'FR', 'FRANCE',
      'IT', 'ITALY',
      'ES', 'SPAIN',
      'NL', 'NETHERLANDS',
      'SE', 'SWEDEN',
      'NO', 'NORWAY',
      'DK', 'DENMARK',
      'FI', 'FINLAND',
      'BE', 'BELGIUM',
      'AT', 'AUSTRIA',
      'CH', 'SWITZERLAND',
      'IE', 'IRELAND',
      'PL', 'POLAND',
    ];

    if (tier2Countries.some(c => countryUpper.includes(c))) {
      return 5;
    }

    // Tier 3: Other developed nations (2 points)
    const tier3Countries = [
      'JP', 'JAPAN',
      'KR', 'SOUTH KOREA',
      'SG', 'SINGAPORE',
      'IL', 'ISRAEL',
      'BR', 'BRAZIL',
      'MX', 'MEXICO',
      'AR', 'ARGENTINA',
    ];

    if (tier3Countries.some(c => countryUpper.includes(c))) {
      return 2;
    }

    // Tier 4: Unknown or weak enforcement (0 points)
    return 0;
  }

  /**
   * Assign priority tier based on severity score and key factors
   *
   * P0 (Critical/Urgent): Immediate action required
   * - Severity >= 75 OR
   * - Monetization detected with high confidence OR
   * - Huge audience (50K+) with medium+ confidence
   *
   * P1 (Standard): Should be addressed promptly
   * - Severity >= 50 OR
   * - Monetization detected OR
   * - Large audience (5K+)
   *
   * P2 (Watchlist): Monitor, lower priority
   * - Everything else
   */
  private assignPriority(score: number, inputs: ScoringInputs): Priority {
    // P0: Critical cases
    if (
      score >= 75 ||
      (inputs.monetizationDetected && inputs.matchConfidence >= 0.75) ||
      (inputs.audienceCount >= 50000 && inputs.matchConfidence >= 0.60)
    ) {
      return 'P0';
    }

    // P1: Standard priority
    if (
      score >= 50 ||
      inputs.monetizationDetected ||
      inputs.audienceCount >= 5000
    ) {
      return 'P1';
    }

    // P2: Watchlist
    return 'P2';
  }

  /**
   * Recommend next check time based on priority
   * P0 = 1 day, P1 = 3 days, P2 = 7 days
   */
  getNextCheckInterval(priority: Priority): number {
    switch (priority) {
      case 'P0':
        return 1; // 1 day
      case 'P1':
        return 3; // 3 days
      case 'P2':
        return 7; // 7 days
      default:
        return 7;
    }
  }

  /**
   * Calculate next check timestamp
   */
  calculateNextCheck(priority: Priority): Date {
    const days = this.getNextCheckInterval(priority);
    const nextCheck = new Date();
    nextCheck.setDate(nextCheck.getDate() + days);
    return nextCheck;
  }

  /**
   * Convert audience size string to numeric count
   * Examples:
   * - "12,400 members" -> 12400
   * - "2.1K subscribers" -> 2100
   * - "500 followers" -> 500
   */
  parseAudienceCount(audienceSize: string | null): number {
    if (!audienceSize) return 0;

    // Remove common words
    let cleaned = audienceSize
      .toLowerCase()
      .replace(/members|subscribers|followers|visits|views/g, '')
      .trim();

    // Handle K/M suffixes
    const kMatch = cleaned.match(/([0-9.]+)k/i);
    if (kMatch && kMatch[1]) {
      return Math.round(parseFloat(kMatch[1]) * 1000);
    }

    const mMatch = cleaned.match(/([0-9.]+)m/i);
    if (mMatch && mMatch[1]) {
      return Math.round(parseFloat(mMatch[1]) * 1000000);
    }

    // Remove commas and parse
    const numMatch = cleaned.match(/([0-9,]+)/);
    if (numMatch && numMatch[1]) {
      return parseInt(numMatch[1].replace(/,/g, ''), 10);
    }

    return 0;
  }
}

// Export singleton instance
export const priorityScorer = new PriorityScorer();
