'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Scan, ScanProgress, ScanStage } from '@/types';

interface ScanProgressTrackerProps {
  scan: Scan;
}

// Default fancy scan stages if no progress data exists
const DEFAULT_STAGES: ScanStage[] = [
  {
    name: 'initialization',
    display_name: 'Search Initialization',
    status: 'pending',
    started_at: null,
    completed_at: null,
  },
  {
    name: 'keyword_search',
    display_name: 'Keyword Discovery',
    status: 'pending',
    started_at: null,
    completed_at: null,
  },
  {
    name: 'trademark_search',
    display_name: 'Trademark Protection Scan',
    status: 'pending',
    started_at: null,
    completed_at: null,
  },
  {
    name: 'phrase_matching',
    display_name: 'Content Signature Analysis',
    status: 'pending',
    started_at: null,
    completed_at: null,
  },
  {
    name: 'marketplace_scan',
    display_name: 'Marketplace Intelligence',
    status: 'pending',
    started_at: null,
    completed_at: null,
  },
  {
    name: 'platform_scan',
    display_name: 'Platform Network Scan',
    status: 'pending',
    started_at: null,
    completed_at: null,
  },
  {
    name: 'finalization',
    display_name: 'Results Compilation',
    status: 'pending',
    started_at: null,
    completed_at: null,
  },
];

export function ScanProgressTracker({ scan }: ScanProgressTrackerProps) {
  const router = useRouter();
  const [progress, setProgress] = useState<ScanProgress>(
    scan.scan_progress || { current_stage: null, stages: DEFAULT_STAGES }
  );
  const [isPolling, setIsPolling] = useState(
    scan.status === 'running' || scan.status === 'pending'
  );

  // Poll for updates when scan is running
  useEffect(() => {
    if (!isPolling) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/scans/${scan.id}/progress`);
        if (response.ok) {
          const data = await response.json();
          setProgress(data.scan_progress || progress);

          // Stop polling if scan is complete
          if (data.status === 'completed' || data.status === 'failed') {
            setIsPolling(false);
            router.refresh(); // Refresh the page to show final results
          }
        }
      } catch (error) {
        console.error('Error polling scan progress:', error);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [isPolling, scan.id, progress, router]);

  const stages = progress.stages.length > 0 ? progress.stages : DEFAULT_STAGES;

  // Calculate overall progress percentage
  const completedStages = stages.filter((s) => s.status === 'completed').length;
  const progressPercent = Math.round((completedStages / stages.length) * 100);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4 space-y-3 shadow-sm">
      {/* Compact Header with Progress */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {isPolling && (
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          )}
          <h2 className="text-sm font-bold text-gray-900">
            {isPolling ? 'Scanning' : scan.status === 'completed' ? 'Scan Complete' : 'Scan Progress'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-blue-600">{progressPercent}%</span>
          {isPolling && (
            <span className="text-xs text-blue-600 animate-pulse">●</span>
          )}
        </div>
      </div>

      {/* Slim Progress Bar */}
      <div className="relative w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="absolute h-full bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 transition-all duration-700 ease-out rounded-full"
          style={{ width: `${progressPercent}%` }}
        >
          {/* Animated shimmer effect */}
          {isPolling && progressPercent < 100 && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer" />
          )}
        </div>
      </div>

      {/* Compact Stage List */}
      <div className="space-y-1">
        {stages.map((stage, index) => {
          const isActive = stage.status === 'in_progress';
          const isCompleted = stage.status === 'completed';
          const isSkipped = stage.status === 'skipped';

          return (
            <div
              key={stage.name}
              className={`flex items-center gap-2 px-2 py-1.5 rounded transition-all duration-300 ${
                isActive
                  ? 'bg-blue-100 scale-105'
                  : isCompleted
                  ? 'bg-white/50'
                  : 'bg-transparent'
              }`}
            >
              {/* Compact Icon */}
              <div className="flex-shrink-0">
                {isCompleted ? (
                  <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                ) : isActive ? (
                  <div className="relative w-4 h-4">
                    <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                    <div className="absolute inset-1 rounded-full bg-blue-400 animate-pulse" />
                  </div>
                ) : isSkipped ? (
                  <div className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-xs text-white">−</span>
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded-full border border-gray-300 bg-white" />
                )}
              </div>

              {/* Stage Name */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-xs truncate transition-colors ${
                    isActive
                      ? 'text-blue-900 font-semibold'
                      : isCompleted
                      ? 'text-gray-600 font-medium'
                      : 'text-gray-500'
                  }`}
                >
                  {stage.display_name}
                </p>
              </div>

              {/* Result Count or Status */}
              {stage.result_count !== undefined && isCompleted ? (
                <span className="text-xs text-green-600 font-medium shrink-0">
                  +{stage.result_count}
                </span>
              ) : isActive ? (
                <div className="flex gap-0.5">
                  <span className="w-1 h-1 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-1 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-1 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              ) : (
                <span className="text-xs text-gray-400 shrink-0">
                  {index + 1}/{stages.length}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Current Stage Label (only when active) */}
      {isPolling && progress.current_stage && (
        <div className="flex items-center gap-2 px-2 py-1 rounded bg-blue-100/50 border border-blue-200">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          <p className="text-xs text-blue-800">
            <span className="font-semibold">
              {stages.find((s) => s.name === progress.current_stage)?.display_name || 'Processing'}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
