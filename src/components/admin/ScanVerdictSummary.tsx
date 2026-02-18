'use client';

import { Card } from '@/components/ui/Card';

interface ScanVerdictSummaryProps {
  successCount: number;
  partialCount: number;
  failureCount: number;
  totalScans: number;
}

export function ScanVerdictSummary({
  successCount,
  partialCount,
  failureCount,
  totalScans,
}: ScanVerdictSummaryProps) {
  const successRate = totalScans > 0 ? Math.round((successCount / totalScans) * 100) : 0;

  return (
    <Card className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-pg-text">Scan Verdicts (7-day)</h3>
        <span className="text-xs text-pg-text-muted">{totalScans} scans total</span>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-green-400" />
          <span className="text-sm font-medium text-green-400">{successCount}</span>
          <span className="text-xs text-pg-text-muted">Success</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-yellow-400" />
          <span className="text-sm font-medium text-yellow-400">{partialCount}</span>
          <span className="text-xs text-pg-text-muted">Partial</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-red-400" />
          <span className="text-sm font-medium text-red-400">{failureCount}</span>
          <span className="text-xs text-pg-text-muted">Failed</span>
        </div>
        <div className="ml-auto">
          <span className={`text-lg font-bold ${
            successRate >= 90 ? 'text-green-400' : successRate >= 70 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {successRate}%
          </span>
          <span className="text-xs text-pg-text-muted ml-1">success rate</span>
        </div>
      </div>

      {/* Visual bar */}
      {totalScans > 0 && (
        <div className="flex h-2 rounded-full overflow-hidden mt-3 bg-pg-bg">
          {successCount > 0 && (
            <div
              className="bg-green-400"
              style={{ width: `${(successCount / totalScans) * 100}%` }}
            />
          )}
          {partialCount > 0 && (
            <div
              className="bg-yellow-400"
              style={{ width: `${(partialCount / totalScans) * 100}%` }}
            />
          )}
          {failureCount > 0 && (
            <div
              className="bg-red-400"
              style={{ width: `${(failureCount / totalScans) * 100}%` }}
            />
          )}
        </div>
      )}
    </Card>
  );
}
