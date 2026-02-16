'use client';

import { useState, ReactNode } from 'react';

interface InfoTooltipProps {
  content: ReactNode;
}

export function InfoTooltip({ content }: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full border border-pg-text-muted text-pg-text-muted hover:border-pg-accent hover:text-pg-accent transition-colors text-xs"
        type="button"
      >
        ?
      </button>
      {isVisible && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsVisible(false)}
          />
          {/* Tooltip */}
          <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2">
            <div className="bg-pg-surface border border-pg-border rounded-lg shadow-2xl p-4 w-64 text-sm">
              <div className="text-pg-text leading-relaxed">{content}</div>
            </div>
            {/* Arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
              <div className="border-8 border-transparent border-t-pg-border"></div>
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full">
                <div className="border-[7px] border-transparent border-t-pg-surface"></div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
