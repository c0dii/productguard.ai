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
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

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

  // Elapsed time counter
  useEffect(() => {
    if (!isPolling) return;

    const startTime = new Date(scan.created_at).getTime();
    const updateElapsed = () => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    };
    updateElapsed();

    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [isPolling, scan.created_at]);

  const stages = progress.stages.length > 0 ? progress.stages : DEFAULT_STAGES;

  // Calculate overall progress percentage
  const completedStages = stages.filter((s) => s.status === 'completed').length;
  const inProgressStages = stages.filter((s) => s.status === 'in_progress').length;
  const progressPercent = Math.round(((completedStages + inProgressStages * 0.5) / stages.length) * 100);

  const formatElapsed = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const currentStageName = stages.find((s) => s.status === 'in_progress')?.display_name
    || stages.find((s) => s.name === progress.current_stage)?.display_name
    || 'Initializing';

  return (
    <div className="relative overflow-hidden rounded-2xl bg-pg-surface border border-pg-border">
      {/* Animated background gradient */}
      {isPolling && (
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 animate-gradient-x" />
        </div>
      )}

      <div className="relative p-4 sm:p-6 space-y-4 sm:space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            {isPolling ? (
              <div className="relative w-8 h-8 sm:w-10 sm:h-10">
                <div className="absolute inset-0 rounded-full border-2 border-cyan-500/30" />
                <div className="absolute inset-0 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                <div className="absolute inset-2.5 rounded-full bg-cyan-500/20 animate-pulse" />
              </div>
            ) : (
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            <div>
              <h2 className="text-base sm:text-lg font-bold text-pg-text">
                {isPolling ? 'Scan in Progress' : 'Scan Complete'}
              </h2>
              {isPolling ? (
                <p className="text-sm text-pg-text-muted">
                  {currentStageName}
                  <span className="inline-flex ml-1">
                    <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                  </span>
                </p>
              ) : (
                <p className="text-sm text-green-400">All stages completed successfully</p>
              )}
            </div>
          </div>

          <div className="text-right">
            <p className="text-xl sm:text-2xl font-bold text-pg-accent">{progressPercent}%</p>
            {isPolling && (
              <p className="text-xs text-pg-text-muted">{formatElapsed(elapsedSeconds)} elapsed</p>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative w-full h-3 bg-pg-bg rounded-full overflow-hidden">
          <div
            className="absolute h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-700 ease-out rounded-full"
            style={{ width: `${progressPercent}%` }}
          >
            {isPolling && progressPercent < 100 && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            )}
          </div>
        </div>

        {/* Stages */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {stages.map((stage, index) => {
            const isActive = stage.status === 'in_progress';
            const isCompleted = stage.status === 'completed';
            const isSkipped = stage.status === 'skipped';

            return (
              <div
                key={stage.name}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 ${
                  isActive
                    ? 'bg-cyan-500/10 border border-cyan-500/30'
                    : isCompleted
                    ? 'bg-pg-bg/50'
                    : 'bg-transparent'
                }`}
              >
                {/* Icon */}
                <div className="flex-shrink-0">
                  {isCompleted ? (
                    <div className="w-5 h-5 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center">
                      <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  ) : isActive ? (
                    <div className="relative w-5 h-5">
                      <div className="absolute inset-0 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                      <div className="absolute inset-1.5 rounded-full bg-cyan-400/40 animate-pulse" />
                    </div>
                  ) : isSkipped ? (
                    <div className="w-5 h-5 rounded-full bg-pg-bg border border-pg-border flex items-center justify-center">
                      <span className="text-[10px] text-pg-text-muted">-</span>
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-pg-border bg-pg-bg" />
                  )}
                </div>

                {/* Stage Name */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm truncate transition-colors ${
                      isActive
                        ? 'text-cyan-400 font-semibold'
                        : isCompleted
                        ? 'text-pg-text font-medium'
                        : 'text-pg-text-muted'
                    }`}
                  >
                    {stage.display_name}
                  </p>
                </div>

                {/* Result Count or Status */}
                <div className="shrink-0">
                  {stage.result_count !== undefined && isCompleted ? (
                    <span className="text-xs text-green-400 font-semibold bg-green-500/10 px-2 py-0.5 rounded-full">
                      +{stage.result_count}
                    </span>
                  ) : isActive ? (
                    <div className="flex gap-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  ) : (
                    <span className="text-xs text-pg-text-muted">
                      {index + 1}/{stages.length}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom message while scanning */}
        {isPolling && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <p className="text-sm text-pg-text-muted">
              Scans typically take 2-5 minutes. This page will <span className="text-pg-accent font-medium">update automatically</span> when complete.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
