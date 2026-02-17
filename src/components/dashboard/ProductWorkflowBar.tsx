'use client';

import Link from 'next/link';

interface ProductWorkflowBarProps {
  scanStatus: { run_count: number | null; scan_id: string | null } | null;
  pendingCount: number;
  activeCount: number;
  productId: string;
}

const STEPS = [
  { label: 'Product Added', shortLabel: 'Added' },
  { label: 'Scanned', shortLabel: 'Scanned' },
  { label: 'Review', shortLabel: 'Review' },
  { label: 'Take Action', shortLabel: 'Action' },
  { label: 'Protected', shortLabel: 'Safe' },
];

export function ProductWorkflowBar({ scanStatus, pendingCount, activeCount, productId }: ProductWorkflowBarProps) {
  const hasScanned = !!scanStatus?.scan_id;
  const reviewComplete = hasScanned && pendingCount === 0;
  const actionComplete = hasScanned && activeCount === 0;
  const isProtected = reviewComplete && actionComplete;

  // Determine step states
  const stepStates = [
    { complete: true }, // Product Added - always complete
    { complete: hasScanned }, // Scanned
    { complete: reviewComplete }, // Review
    { complete: actionComplete }, // Take Action
    { complete: isProtected }, // Protected
  ];

  // Find current active step (first incomplete step)
  const currentStep = stepStates.findIndex((s) => !s.complete);
  const activeStepIndex = currentStep === -1 ? 4 : currentStep;

  const getStepDetail = (index: number) => {
    switch (index) {
      case 1:
        if (hasScanned) {
          const runs = scanStatus!.run_count || 0;
          return `${runs} run${runs !== 1 ? 's' : ''}`;
        }
        return 'Not yet';
      case 2:
        if (reviewComplete) return 'Done';
        if (hasScanned && pendingCount > 0) return `${pendingCount} pending`;
        return '';
      case 3:
        if (actionComplete && hasScanned) return 'Done';
        if (activeCount > 0) return `${activeCount} threat${activeCount !== 1 ? 's' : ''}`;
        return '';
      default:
        return '';
    }
  };

  return (
    <div className="bg-pg-surface border border-pg-border rounded-lg p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-pg-text">Protection Progress</h3>
        {isProtected && (
          <span className="text-xs font-medium text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
            Fully Protected
          </span>
        )}
      </div>

      {/* Desktop: horizontal steps */}
      <div className="hidden sm:flex items-center gap-0">
        {STEPS.map((step, i) => {
          const state = stepStates[i];
          const isComplete = state?.complete ?? false;
          const isActive = i === activeStepIndex && !isComplete;
          const detail = getStepDetail(i);

          return (
            <div key={step.label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center min-w-0">
                {/* Circle */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                    isComplete
                      ? 'bg-green-500 text-white'
                      : isActive
                      ? 'bg-pg-accent text-white ring-2 ring-pg-accent/30'
                      : 'bg-pg-surface-light text-pg-text-muted border border-pg-border'
                  }`}
                >
                  {isComplete ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                {/* Label */}
                <span
                  className={`text-[11px] mt-1.5 text-center leading-tight ${
                    isComplete ? 'text-green-500 font-medium' : isActive ? 'text-pg-accent font-medium' : 'text-pg-text-muted'
                  }`}
                >
                  {step.label}
                </span>
                {/* Detail */}
                {detail && (
                  <span className={`text-[10px] ${isActive ? 'text-pg-accent' : 'text-pg-text-muted'}`}>
                    {detail}
                  </span>
                )}
              </div>
              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 mt-[-1.25rem] ${
                    (stepStates[i + 1]?.complete) ? 'bg-green-500' : isComplete ? 'bg-pg-accent/40' : 'bg-pg-border'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: compact current step */}
      <div className="sm:hidden">
        <div className="flex items-center gap-3">
          {STEPS.map((step, i) => {
            const isComplete = stepStates[i]?.complete ?? false;
            const isActive = i === activeStepIndex && !isComplete;
            return (
              <div
                key={step.shortLabel}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  isComplete
                    ? 'bg-green-500 text-white'
                    : isActive
                    ? 'bg-pg-accent text-white ring-2 ring-pg-accent/30'
                    : 'bg-pg-surface-light text-pg-text-muted border border-pg-border'
                }`}
              >
                {isComplete ? (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
            );
          })}
        </div>
        {/* Current step description */}
        {activeStepIndex < STEPS.length && (
          <p className="text-xs text-pg-text-muted mt-2">
            <span className="font-medium text-pg-accent">Next: </span>
            {activeStepIndex === 1 && (
              <>
                Run your first scan to detect infringements.{' '}
                <Link href={`/dashboard/products/${productId}`} className="text-pg-accent hover:underline">
                  Run Scan
                </Link>
              </>
            )}
            {activeStepIndex === 2 && (
              <>
                Review {pendingCount} pending infringement{pendingCount !== 1 ? 's' : ''}.
              </>
            )}
            {activeStepIndex === 3 && (
              <>
                Take action on {activeCount} active threat{activeCount !== 1 ? 's' : ''}.{' '}
                <Link href="/dashboard/infringements" className="text-pg-accent hover:underline">
                  View Threats
                </Link>
              </>
            )}
            {activeStepIndex >= STEPS.length && 'Your product is fully protected!'}
          </p>
        )}
      </div>
    </div>
  );
}
