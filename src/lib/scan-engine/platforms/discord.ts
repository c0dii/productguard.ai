import type { Product, InfringementResult } from '@/types';

/**
 * Discord Server Scanner
 * TODO: Implement Discord scanning in Phase 2
 */
export async function scanDiscord(product: Product): Promise<InfringementResult[]> {
  console.log(`[Discord Scanner] Scanning for: ${product.name} (STUB - returns empty)`);

  // STUB: Return empty array for now
  return [];

  /* Phase 2 Implementation Plan:
   *
   * 1. Search public Discord server directories (disboard.org, top.gg, etc.)
   * 2. Look for servers related to product niche or piracy
   * 3. Use Discord API (with bot token) to search server descriptions
   * 4. Join public servers and scan for file shares (requires manual review)
   * 5. Return InfringementResult array with:
   *    - platform: 'discord'
   *    - source_url: discord.gg/invite_code
   *    - risk_level: based on server size
   *    - type: 'server'
   *    - audience_size: "X,XXX members"
   *    - est_revenue_loss: (members * engagement_rate * product price * 0.15)
   */
}
