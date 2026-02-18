/**
 * Scan Verdict Determination
 *
 * Analyzes scan_logs entries for a given scan to determine success/failure:
 * - SUCCESS: status='completed' AND no fatal errors AND SERP queries executed
 * - PARTIAL: status='completed' AND self_healed=true in any log
 * - FAILURE: status='failed' OR any fatal log entry
 */

import type { ScanLogEntry, ScanStatus } from '@/types';

export type ScanVerdict = 'success' | 'partial' | 'failure' | 'unknown';

export interface ScanVerdictResult {
  verdict: ScanVerdict;
  reason: string;
  errorCount: number;
  selfHealCount: number;
  hasFatal: boolean;
}

export function determineScanVerdict(
  scanStatus: ScanStatus,
  logs: ScanLogEntry[]
): ScanVerdictResult {
  const errorCount = logs.filter(l => l.log_level === 'error' || l.log_level === 'fatal').length;
  const selfHealCount = logs.filter(l => l.self_healed).length;
  const hasFatal = logs.some(l => l.log_level === 'fatal');

  // Explicit failure
  if (scanStatus === 'failed' || hasFatal) {
    const fatalLog = logs.find(l => l.log_level === 'fatal');
    return {
      verdict: 'failure',
      reason: fatalLog?.message || 'Scan failed',
      errorCount,
      selfHealCount,
      hasFatal,
    };
  }

  // Still running or pending
  if (scanStatus === 'pending' || scanStatus === 'running') {
    return {
      verdict: 'unknown',
      reason: scanStatus === 'running' ? 'Scan in progress' : 'Scan pending',
      errorCount,
      selfHealCount,
      hasFatal,
    };
  }

  // Completed with self-healing = partial success
  if (selfHealCount > 0) {
    return {
      verdict: 'partial',
      reason: `Completed with ${selfHealCount} self-healed issue${selfHealCount > 1 ? 's' : ''}`,
      errorCount,
      selfHealCount,
      hasFatal,
    };
  }

  // Completed with errors but no fatal
  if (errorCount > 0) {
    return {
      verdict: 'partial',
      reason: `Completed with ${errorCount} error${errorCount > 1 ? 's' : ''}`,
      errorCount,
      selfHealCount,
      hasFatal,
    };
  }

  // Clean completion
  return {
    verdict: 'success',
    reason: 'Scan completed successfully',
    errorCount,
    selfHealCount,
    hasFatal,
  };
}

export function getVerdictColor(verdict: ScanVerdict): string {
  switch (verdict) {
    case 'success': return 'text-green-400';
    case 'partial': return 'text-yellow-400';
    case 'failure': return 'text-red-400';
    case 'unknown': return 'text-pg-text-muted';
  }
}

export function getVerdictBgColor(verdict: ScanVerdict): string {
  switch (verdict) {
    case 'success': return 'bg-green-500/10 border-green-500/30';
    case 'partial': return 'bg-yellow-500/10 border-yellow-500/30';
    case 'failure': return 'bg-red-500/10 border-red-500/30';
    case 'unknown': return 'bg-pg-surface-light border-pg-border';
  }
}
