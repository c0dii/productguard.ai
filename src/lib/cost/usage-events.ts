/**
 * Usage Cost Event Logger
 *
 * Logs per-user cost events using known unit rates. No external API calls —
 * just buffered DB inserts with pre-defined pricing.
 *
 * Usage:
 *   await logCostEvent(userId, 'scan_serper', 12, { scan_id });
 *   await costEventLogger.flush(); // At end of request
 */

import { createAdminClient } from '@/lib/supabase/server';

// Known unit costs — update when provider pricing changes
export const UNIT_COSTS = {
  scan_serper: 0.01,       // $0.01 per Serper API query
  scan_ai_filter: 0.0002,  // $0.0002 per result filtered by GPT-4o-mini
  scan_whois: 0.005,       // $0.005 per WHOIS lookup
  email_send: 0.001,       // $0.001 per Resend email (~$1/1000)
} as const;

export type CostEventType = keyof typeof UNIT_COSTS;

interface CostEvent {
  user_id: string;
  event_type: CostEventType;
  unit_cost: number;
  units: number;
  metadata: Record<string, unknown>;
}

class CostEventLogger {
  private buffer: CostEvent[] = [];
  private static readonly BUFFER_LIMIT = 25;

  /**
   * Log a cost event. Buffered — call flush() at end of request.
   */
  async log(
    userId: string,
    eventType: CostEventType,
    units: number,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    if (units <= 0) return; // Skip zero-unit events

    this.buffer.push({
      user_id: userId,
      event_type: eventType,
      unit_cost: UNIT_COSTS[eventType],
      units,
      metadata: metadata || {},
    });

    if (this.buffer.length >= CostEventLogger.BUFFER_LIMIT) {
      await this.flush();
    }
  }

  /**
   * Flush all buffered events to the database.
   * Call at end of scan engine runs, API routes, etc.
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    const events = [...this.buffer];
    this.buffer = [];

    try {
      const supabase = createAdminClient();
      const { error } = await supabase
        .from('usage_cost_events')
        .insert(events);

      if (error) {
        console.error('[CostEvents] Failed to write events:', error.message);
      }
    } catch (err) {
      console.error('[CostEvents] Write failed:', err);
    }
  }

  /** Number of events currently buffered */
  get pending(): number {
    return this.buffer.length;
  }
}

// Singleton instance
export const costEventLogger = new CostEventLogger();

/**
 * Convenience wrapper — logs a single cost event.
 */
export async function logCostEvent(
  userId: string,
  eventType: CostEventType,
  units: number,
  metadata?: Record<string, unknown>
): Promise<void> {
  await costEventLogger.log(userId, eventType, units, metadata);
}
