/**
 * DMCA Notice Quality Checker
 *
 * Scores notices 0-100 with hard errors (blocks sending) and
 * soft warnings (weaker but sendable). Shows users exactly what
 * to fix to strengthen their notice.
 */

import type { ComparisonItem } from './comparison-builder';

export type NoticeStrength = 'strong' | 'standard' | 'weak';

export interface QualityError {
  code: string;
  message: string;
  fix: string;
}

export interface QualityWarning {
  code: string;
  message: string;
  fix: string;
}

export interface QualityResult {
  passed: boolean;
  score: number;
  strength: NoticeStrength;
  errors: QualityError[];
  warnings: QualityWarning[];
}

interface QualityInput {
  // Rights holder
  contactName?: string;
  contactEmail?: string;
  contactAddress?: string;
  contactPhone?: string;

  // Copyrighted work
  productName?: string;
  productDescription?: string;
  productUrl?: string | null;
  copyrightRegNumber?: string | null;

  // Infringing material
  infringingUrl?: string;

  // Notice content
  hasGoodFaithStatement: boolean;
  hasPerjuryStatement: boolean;
  hasSignature: boolean;

  // Strength boosters
  comparisonItems: ComparisonItem[];
  hasEvidencePacket: boolean;
  hasUniqueMarkers: boolean; // watermarks, logos, distinctive phrases
  hasBlockchainTimestamp: boolean;
  hasWaybackArchive: boolean;
}

/**
 * Check the quality of a DMCA notice and return a score with actionable feedback.
 */
export function checkNoticeQuality(input: QualityInput): QualityResult {
  const errors: QualityError[] = [];
  const warnings: QualityWarning[] = [];

  // ── Hard Errors (legally required under §512(c)(3)) ───────────────
  // These block sending — the notice is legally incomplete without them.

  if (!input.contactName) {
    errors.push({
      code: 'NO_CONTACT_NAME',
      message: 'Rights holder name is missing',
      fix: 'Add your full legal name in Settings → Profile',
    });
  }

  if (!input.contactEmail) {
    errors.push({
      code: 'NO_CONTACT_EMAIL',
      message: 'Contact email is missing',
      fix: 'Add your email address in Settings → Profile',
    });
  }

  if (!input.contactAddress) {
    errors.push({
      code: 'NO_CONTACT_ADDRESS',
      message: 'Mailing address is missing (required by §512)',
      fix: 'Add your mailing address in Settings → Profile or Product → DMCA Contact',
    });
  }

  if (!input.productName) {
    errors.push({
      code: 'NO_PRODUCT_NAME',
      message: 'Copyrighted work title is missing',
      fix: 'Ensure your product has a name',
    });
  }

  if (!input.infringingUrl) {
    errors.push({
      code: 'NO_INFRINGING_URL',
      message: 'No infringing URL specified',
      fix: 'An infringing URL must be provided',
    });
  }

  if (!input.hasGoodFaithStatement) {
    errors.push({
      code: 'NO_GOOD_FAITH',
      message: 'Good faith belief statement is missing',
      fix: 'This is auto-included by the notice builder — regenerate the notice',
    });
  }

  if (!input.hasPerjuryStatement) {
    errors.push({
      code: 'NO_PERJURY',
      message: 'Accuracy statement under penalty of perjury is missing',
      fix: 'This is auto-included by the notice builder — regenerate the notice',
    });
  }

  if (!input.hasSignature) {
    errors.push({
      code: 'NO_SIGNATURE',
      message: 'Electronic signature is missing',
      fix: 'This is auto-included by the notice builder — regenerate the notice',
    });
  }

  // ── Soft Warnings (weaker but sendable) ───────────────────────────

  if (input.comparisonItems.length < 3) {
    warnings.push({
      code: 'FEW_COMPARISONS',
      message: `Only ${input.comparisonItems.length} comparison item${input.comparisonItems.length !== 1 ? 's' : ''} (3+ recommended)`,
      fix: 'Run a scan to detect more evidence, or add comparison details manually when editing the notice',
    });
  }

  if (!input.hasEvidencePacket) {
    warnings.push({
      code: 'NO_EVIDENCE',
      message: 'No evidence packet attached',
      fix: 'Confirm the infringement to trigger automatic evidence capture (HTML, text, links, Wayback Machine)',
    });
  }

  if (!input.copyrightRegNumber) {
    warnings.push({
      code: 'NO_COPYRIGHT_REG',
      message: 'No copyright registration number',
      fix: 'Add your copyright registration number in Product → IP Protection settings. Not required, but significantly strengthens the notice.',
    });
  }

  if (!input.hasUniqueMarkers) {
    warnings.push({
      code: 'NO_UNIQUE_MARKERS',
      message: 'No unique markers identified (watermarks, distinctive phrases)',
      fix: 'Add unique identifiers to your product that make infringement easier to prove',
    });
  }

  if (!input.contactPhone) {
    warnings.push({
      code: 'NO_PHONE',
      message: 'No phone number provided',
      fix: 'Add a phone number in Settings → Profile for stronger contact credibility',
    });
  }

  if (!input.productUrl) {
    warnings.push({
      code: 'NO_PRODUCT_URL',
      message: 'No original product URL provided',
      fix: 'Add the official product URL to your product settings',
    });
  }

  if (!input.productDescription || input.productDescription.length < 20) {
    warnings.push({
      code: 'WEAK_DESCRIPTION',
      message: 'Product description is missing or too short',
      fix: 'Add a detailed description (20+ characters) to your product settings',
    });
  }

  // ── Scoring ───────────────────────────────────────────────────────
  let score = 100;

  // Hard errors
  score -= errors.length * 15;

  // Soft warnings
  score -= warnings.length * 4;

  // Bonuses
  if (input.comparisonItems.length >= 3) score += 5;
  if (input.hasEvidencePacket) score += 5;
  if (input.copyrightRegNumber) score += 3;
  if (input.hasBlockchainTimestamp) score += 3;
  if (input.hasWaybackArchive) score += 2;
  if (input.hasUniqueMarkers) score += 2;

  // Clamp
  score = Math.max(0, Math.min(100, score));

  // Determine pass/fail and strength
  const passed = errors.length === 0;

  let strength: NoticeStrength;
  if (passed && score >= 85 && warnings.length <= 2) {
    strength = 'strong';
  } else if (passed && score >= 60) {
    strength = 'standard';
  } else {
    strength = 'weak';
  }

  return { passed, score, strength, errors, warnings };
}
