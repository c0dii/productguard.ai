/**
 * Protection Score (0-100)
 *
 * Formula:
 *   base = 100
 *   - 5 per active/takedown_sent/disputed infringement
 *   - 2 per pending_verification infringement
 *   + 3 per removed infringement (capped at +20)
 *   + 10 if at least one scan was run in the last 7 days
 *
 * Clamped to [0, 100].
 */
export function computeProtectionScore(params: {
  activeCount: number;
  pendingCount: number;
  removedCount: number;
  hasRecentScan: boolean;
}): number {
  const { activeCount, pendingCount, removedCount, hasRecentScan } = params;

  let score = 100;
  score -= activeCount * 5;
  score -= pendingCount * 2;
  score += Math.min(removedCount * 3, 20);
  if (hasRecentScan) score += 10;

  return Math.max(0, Math.min(100, score));
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return 'Strong';
  if (score >= 60) return 'Moderate';
  if (score >= 40) return 'At Risk';
  return 'Critical';
}

export function getScoreColor(score: number): string {
  if (score >= 80) return '#00D4AA';
  if (score >= 60) return '#FFB830';
  if (score >= 40) return '#FF8C00';
  return '#FF4757';
}
