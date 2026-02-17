/**
 * Scan History Utility Functions (Client-safe)
 *
 * Pure utility functions that can be imported by both
 * server components and client components.
 * No server-side imports (no Supabase, no next/headers).
 */

/**
 * Format duration in human-readable format
 */
export function formatDuration(seconds: number | null): string {
  if (!seconds) return 'Unknown';

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Format time ago (e.g., "2 hours ago", "3 days ago")
 */
export function formatTimeAgo(timestamp: string | null): string {
  if (!timestamp) return 'Never';

  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months !== 1 ? 's' : ''} ago`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `${years} year${years !== 1 ? 's' : ''} ago`;
  }
}

/**
 * Calculate cost savings from delta detection
 */
export function calculateCostSavings(stats: {
  total_api_savings: number;
  total_ai_savings: number;
}): {
  whois_savings: number;
  ai_filtering_savings: number;
  total_savings: number;
} {
  const WHOIS_COST_PER_LOOKUP = 0.002;
  const AI_FILTER_COST_PER_CALL = 0.0001;

  const whois_savings = stats.total_api_savings * WHOIS_COST_PER_LOOKUP;
  const ai_filtering_savings = stats.total_ai_savings * AI_FILTER_COST_PER_CALL;
  const total_savings = whois_savings + ai_filtering_savings;

  return { whois_savings, ai_filtering_savings, total_savings };
}
