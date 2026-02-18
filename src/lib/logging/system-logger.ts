/**
 * SystemLogger — Singleton buffered logger for the system_logs table.
 *
 * Follows the same buffered-write pattern as ScanLogger but covers all
 * services: API calls, scrapes, cron jobs, webhooks, email, DMCA, scans.
 *
 * - info/warn: buffered, flushed every 50 entries or on explicit flush()
 * - error/fatal: immediately flushed + auto-creates admin_alerts
 * - trackApiCall(): wraps async functions with timing + success/failure logging
 * - logCron/logWebhook/logEmail: convenience methods for common log sources
 */

import { createAdminClient } from '@/lib/supabase/server';
import type {
  SystemLogSource,
  SystemLogLevel,
  SystemLogStatus,
  AlertSeverity,
  AlertCategory,
} from '@/types';
import type { LogContext } from './contexts';

// ============================================================================
// TYPES
// ============================================================================

interface LogEntry {
  log_source: SystemLogSource;
  log_level: SystemLogLevel;
  operation: string;
  status: SystemLogStatus;
  message: string;
  duration_ms?: number | null;
  started_at?: string | null;
  completed_at?: string | null;
  trace_id?: string | null;
  user_id?: string | null;
  product_id?: string | null;
  context?: LogContext;
  error_code?: string | null;
  error_message?: string | null;
  error_stack?: string | null;
}

interface AlertEntry {
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  message: string;
  log_id?: string | null;
  trace_id?: string | null;
  context?: Record<string, unknown>;
}

interface TrackApiCallOptions {
  userId?: string;
  productId?: string;
  traceId?: string;
  context?: Record<string, unknown>;
}

// ============================================================================
// ALERT RULES — determines when to auto-create admin_alerts
// ============================================================================

function shouldCreateAlert(entry: LogEntry): AlertEntry | null {
  // Fatal errors always create critical alerts
  if (entry.log_level === 'fatal') {
    return {
      severity: 'critical',
      category: mapSourceToAlertCategory(entry.log_source),
      title: `Fatal: ${entry.operation}`,
      message: entry.error_message || entry.message,
      trace_id: entry.trace_id,
      context: { operation: entry.operation, error_code: entry.error_code },
    };
  }

  // API call failures
  if (entry.log_source === 'api_call' && entry.status === 'failure') {
    const isCore = entry.operation.startsWith('openai.') || entry.operation.startsWith('serper.');
    return {
      severity: isCore ? 'critical' : 'warning',
      category: 'api_error',
      title: `API Failure: ${entry.operation}`,
      message: entry.error_message || entry.message,
      trace_id: entry.trace_id,
      context: { operation: entry.operation, error_code: entry.error_code },
    };
  }

  // Cron failures
  if (entry.log_source === 'cron' && entry.status === 'failure') {
    return {
      severity: 'critical',
      category: 'cron_failure',
      title: `Cron Failed: ${entry.operation}`,
      message: entry.message,
      trace_id: entry.trace_id,
      context: { operation: entry.operation },
    };
  }

  // Webhook failures
  if (entry.log_source === 'webhook' && entry.status === 'failure') {
    return {
      severity: 'critical',
      category: 'webhook_failure',
      title: `Webhook Failed: ${entry.operation}`,
      message: entry.message,
      trace_id: entry.trace_id,
      context: { operation: entry.operation },
    };
  }

  // Email failures
  if (entry.log_source === 'email' && entry.status === 'failure') {
    return {
      severity: 'warning',
      category: 'api_error',
      title: `Email Failed: ${entry.operation}`,
      message: entry.message,
      trace_id: entry.trace_id,
      context: { operation: entry.operation },
    };
  }

  // Scan failures
  if (entry.log_source === 'scan' && entry.status === 'failure') {
    return {
      severity: 'critical',
      category: 'scan_failure',
      title: `Scan Failed: ${entry.operation}`,
      message: entry.message,
      trace_id: entry.trace_id,
      context: { operation: entry.operation },
    };
  }

  return null;
}

function mapSourceToAlertCategory(source: SystemLogSource): AlertCategory {
  switch (source) {
    case 'scan': return 'scan_failure';
    case 'api_call': return 'api_error';
    case 'cron': return 'cron_failure';
    case 'webhook': return 'webhook_failure';
    default: return 'system';
  }
}

// ============================================================================
// SYSTEM LOGGER CLASS
// ============================================================================

class SystemLoggerImpl {
  private buffer: LogEntry[] = [];
  private static readonly BUFFER_LIMIT = 50;

  /**
   * Core log method. Buffers info/warn, immediately flushes error/fatal.
   */
  async log(entry: LogEntry): Promise<void> {
    // Console output for Vercel function logs
    const prefix = `[System][${entry.log_level.toUpperCase()}][${entry.log_source}]`;
    if (entry.log_level === 'error' || entry.log_level === 'fatal') {
      console.error(prefix, entry.operation, entry.message, entry.error_message || '');
    } else if (entry.log_level === 'warn') {
      console.warn(prefix, entry.operation, entry.message);
    }

    // Immediately flush errors/fatals
    if (entry.log_level === 'error' || entry.log_level === 'fatal') {
      await this.writeEntries([entry]);
      return;
    }

    // Buffer info/warn/debug
    this.buffer.push(entry);
    if (this.buffer.length >= SystemLoggerImpl.BUFFER_LIMIT) {
      await this.flush();
    }
  }

  /**
   * Wrap an async function with timing, success/failure logging, and alert creation.
   */
  async trackApiCall<T>(
    operation: string,
    fn: () => Promise<T>,
    options?: TrackApiCallOptions
  ): Promise<T> {
    const startedAt = new Date().toISOString();
    const startMs = Date.now();

    try {
      const result = await fn();
      const durationMs = Date.now() - startMs;

      await this.log({
        log_source: 'api_call',
        log_level: 'info',
        operation,
        status: 'success',
        message: `${operation} completed in ${durationMs}ms`,
        duration_ms: durationMs,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        trace_id: options?.traceId,
        user_id: options?.userId,
        product_id: options?.productId,
        context: options?.context,
      });

      return result;
    } catch (err: any) {
      const durationMs = Date.now() - startMs;

      await this.log({
        log_source: 'api_call',
        log_level: 'error',
        operation,
        status: 'failure',
        message: `${operation} failed after ${durationMs}ms`,
        duration_ms: durationMs,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        trace_id: options?.traceId,
        user_id: options?.userId,
        product_id: options?.productId,
        context: options?.context,
        error_code: err.code || err.status?.toString() || 'UNKNOWN',
        error_message: err.message || String(err),
        error_stack: err.stack,
      });

      throw err;
    }
  }

  /**
   * Log a cron job execution.
   */
  async logCron(
    jobName: string,
    status: SystemLogStatus,
    message: string,
    context?: Record<string, unknown>,
    durationMs?: number
  ): Promise<void> {
    await this.log({
      log_source: 'cron',
      log_level: status === 'failure' ? 'error' : 'info',
      operation: `cron.${jobName}`,
      status,
      message,
      duration_ms: durationMs,
      started_at: durationMs ? new Date(Date.now() - durationMs).toISOString() : undefined,
      completed_at: new Date().toISOString(),
      context,
    });
  }

  /**
   * Log a webhook event.
   */
  async logWebhook(
    provider: string,
    eventType: string,
    status: SystemLogStatus,
    message: string,
    context?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      log_source: 'webhook',
      log_level: status === 'failure' ? 'error' : 'info',
      operation: `webhook.${provider}.${eventType}`,
      status,
      message,
      context,
    });
  }

  /**
   * Log an email send.
   */
  async logEmail(
    template: string,
    to: string,
    status: SystemLogStatus,
    context?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      log_source: 'email',
      log_level: status === 'failure' ? 'error' : 'info',
      operation: `email.${template}`,
      status,
      message: `Email "${template}" to ${to}: ${status}`,
      context: { ...context, to, template },
    });
  }

  /**
   * Flush all buffered entries to the database. Must be called at the end
   * of request handlers to ensure all logs are persisted.
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    const entries = [...this.buffer];
    this.buffer = [];
    await this.writeEntries(entries);
  }

  /**
   * Write entries to system_logs and auto-create alerts if rules match.
   */
  private async writeEntries(entries: LogEntry[]): Promise<void> {
    if (entries.length === 0) return;

    try {
      const supabase = createAdminClient();

      // Insert logs
      const { data: insertedLogs, error: logError } = await supabase
        .from('system_logs')
        .insert(entries.map(e => ({
          log_source: e.log_source,
          log_level: e.log_level,
          operation: e.operation,
          status: e.status,
          message: e.message,
          duration_ms: e.duration_ms ?? null,
          started_at: e.started_at ?? null,
          completed_at: e.completed_at ?? null,
          trace_id: e.trace_id ?? null,
          user_id: e.user_id ?? null,
          product_id: e.product_id ?? null,
          context: e.context ?? {},
          error_code: e.error_code ?? null,
          error_message: e.error_message ?? null,
          error_stack: e.error_stack ?? null,
        })))
        .select('id');

      if (logError) {
        console.error('[SystemLogger] Failed to write logs:', logError.message);
        return;
      }

      // Auto-create alerts for qualifying entries
      const alerts: (AlertEntry & { log_id: string | null })[] = [];
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (!entry) continue;
        const alertData = shouldCreateAlert(entry);
        if (alertData) {
          alerts.push({
            ...alertData,
            log_id: insertedLogs?.[i]?.id ?? null,
          });
        }
      }

      if (alerts.length > 0) {
        const { error: alertError } = await supabase
          .from('admin_alerts')
          .insert(alerts);

        if (alertError) {
          console.error('[SystemLogger] Failed to create alerts:', alertError.message);
        }
      }
    } catch (err) {
      console.error('[SystemLogger] Write failed:', err);
    }
  }
}

// Singleton instance
export const systemLogger = new SystemLoggerImpl();
