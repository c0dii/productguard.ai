import { createAdminClient } from '@/lib/supabase/server';
import type { Product, ScanLogLevel, ScanLogStage, ScanErrorCode } from '@/types';

interface ScanLogConfig {
  serpBudget: number;
  maxDurationMs: number;
  aiFilterEnabled: boolean;
  aiConfidenceThreshold: number;
  runNumber: number;
}

interface BufferedLogEntry {
  scan_id: string;
  product_id: string;
  user_id: string;
  log_level: ScanLogLevel;
  stage: ScanLogStage;
  message: string;
  error_code: ScanErrorCode | null;
  error_details: Record<string, unknown> | null;
  scan_params: Record<string, unknown> | null;
  metrics: Record<string, unknown> | null;
  self_healed: boolean;
  heal_action: string | null;
}

/**
 * Buffered scan logger that persists structured logs to the scan_logs table.
 *
 * - info/warn: buffer only, flushed at scan end
 * - error/fatal: immediate async flush (fire-and-forget, non-blocking)
 * - selfHeal: creates warn-level entry with self_healed=true
 * - flush(): final await at scan end to persist all buffered entries
 */
export class ScanLogger {
  private buffer: BufferedLogEntry[] = [];
  private scanId: string;
  private productId: string;
  private userId: string;
  private scanParams: Record<string, unknown>;

  constructor(
    scanId: string,
    productId: string,
    userId: string,
    product: Product,
    config: ScanLogConfig
  ) {
    this.scanId = scanId;
    this.productId = productId;
    this.userId = userId;
    this.scanParams = {
      product_name: product.name,
      product_type: product.type,
      product_url: product.url,
      serp_budget: config.serpBudget,
      max_duration_ms: config.maxDurationMs,
      ai_filter_enabled: config.aiFilterEnabled,
      ai_confidence_threshold: config.aiConfidenceThreshold,
      run_number: config.runNumber,
      started_at: new Date().toISOString(),
    };
  }

  info(stage: ScanLogStage, message: string, metrics?: Record<string, unknown>) {
    this.addToBuffer('info', stage, message, null, null, metrics || null);
  }

  warn(stage: ScanLogStage, message: string, errorCode?: ScanErrorCode, metrics?: Record<string, unknown>) {
    this.addToBuffer('warn', stage, message, errorCode || null, null, metrics || null);
  }

  error(
    stage: ScanLogStage,
    message: string,
    errorCode: ScanErrorCode,
    errorDetails?: Record<string, unknown>,
    metrics?: Record<string, unknown>
  ) {
    const entry = this.addToBuffer(
      'error', stage, message, errorCode,
      errorDetails || null, metrics || null, true // attach scan_params
    );
    // Immediate async flush for errors (fire-and-forget)
    this.writeToDb([entry]).catch(() => {
      // Re-buffer failed entry for retry on final flush
      this.buffer.push(entry);
    });
  }

  fatal(
    stage: ScanLogStage,
    message: string,
    errorCode: ScanErrorCode,
    errorDetails?: Record<string, unknown>
  ) {
    const entry = this.addToBuffer(
      'fatal', stage, message, errorCode,
      errorDetails || null, null, true // attach scan_params
    );
    // Immediate async flush for fatal (fire-and-forget)
    this.writeToDb([entry]).catch(() => {
      this.buffer.push(entry);
    });
  }

  selfHeal(
    stage: ScanLogStage,
    errorCode: ScanErrorCode,
    healAction: string,
    metrics?: Record<string, unknown>
  ) {
    this.addToBuffer(
      'warn', stage, `Self-healed: ${healAction}`, errorCode,
      null, metrics || null, false, true, healAction
    );
  }

  /**
   * Final flush — awaited at scan end to persist all buffered entries
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entries = [...this.buffer];
    this.buffer = [];

    await this.writeToDb(entries);
  }

  /**
   * Get recent log entries (for building alert payloads)
   */
  getRecentLogs(count: number = 10): BufferedLogEntry[] {
    return this.buffer.slice(-count);
  }

  /**
   * Expose scan params for alert payloads
   */
  getScanParams(): Record<string, unknown> {
    return { ...this.scanParams };
  }

  private addToBuffer(
    level: ScanLogLevel,
    stage: ScanLogStage,
    message: string,
    errorCode: ScanErrorCode | null,
    errorDetails: Record<string, unknown> | null,
    metrics: Record<string, unknown> | null,
    attachParams: boolean = false,
    selfHealed: boolean = false,
    healAction: string | null = null
  ): BufferedLogEntry {
    const entry: BufferedLogEntry = {
      scan_id: this.scanId,
      product_id: this.productId,
      user_id: this.userId,
      log_level: level,
      stage,
      message,
      error_code: errorCode,
      error_details: errorDetails,
      scan_params: attachParams ? this.scanParams : null,
      metrics,
      self_healed: selfHealed,
      heal_action: healAction,
    };

    this.buffer.push(entry);
    // Also log to console for serverless function logs
    const prefix = `[ScanLog][${level.toUpperCase()}][${stage}]`;
    if (level === 'error' || level === 'fatal') {
      console.error(prefix, message, errorDetails || '');
    } else if (level === 'warn') {
      console.warn(prefix, message);
    } else {
      console.log(prefix, message);
    }

    return entry;
  }

  /**
   * Write entries to DB. Batch insert with individual fallback.
   */
  private async writeToDb(entries: BufferedLogEntry[]): Promise<void> {
    if (entries.length === 0) return;

    try {
      const supabase = createAdminClient();

      const { error } = await supabase
        .from('scan_logs')
        .insert(entries);

      if (error) {
        console.error('[ScanLogger] Batch insert failed, attempting individual inserts:', error.message);
        // Individual insert fallback
        let succeeded = 0;
        for (const entry of entries) {
          const { error: singleError } = await supabase
            .from('scan_logs')
            .insert(entry);
          if (!singleError) succeeded++;
        }
        console.log(`[ScanLogger] Individual fallback: ${succeeded}/${entries.length} entries persisted`);
      }
    } catch (err) {
      console.error('[ScanLogger] Failed to write logs to DB:', err);
    }
  }
}
