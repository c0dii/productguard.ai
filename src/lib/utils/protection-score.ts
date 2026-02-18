/**
 * Protection Score (0-100)
 *
 * Uses logarithmic scaling so the score degrades gradually:
 *   base = 100
 *   - min(20 * log2(1 + activeCount), 80)   — 1→20, 3→40, 7→60, 15→80
 *   - min(8 * log2(1 + pendingCount), 20)    — 1→8, 3→16, 7→20
 *   + min(removedCount * 3, 20)
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

  const activePenalty = Math.min(20 * Math.log2(1 + activeCount), 80);
  const pendingPenalty = Math.min(8 * Math.log2(1 + pendingCount), 20);
  const removedBonus = Math.min(removedCount * 3, 20);

  let score = 100 - activePenalty - pendingPenalty + removedBonus;
  if (hasRecentScan) score += 10;

  return Math.round(Math.max(0, Math.min(100, score)));
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
