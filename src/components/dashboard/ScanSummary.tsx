'use client';

import { useState } from 'react';
import type { ScanSummaryData } from '@/lib/ai/scan-summarizer';

interface ScanSummaryProps {
  summary: ScanSummaryData;
}

export function ScanSummary({ summary }: ScanSummaryProps) {
  const [isClosed, setIsClosed] = useState(false);

  if (isClosed) {
    return null;
  }
  // Determine styling based on severity
  const getSeverityStyles = () => {
    switch (summary.severity) {
      case 'none':
        return {
          border: 'border-green-500',
          bg: 'bg-gradient-to-br from-green-50 to-emerald-50',
          icon: '✓',
          iconBg: 'bg-green-500',
          textColor: 'text-green-900',
          accentColor: 'text-green-700',
        };
      case 'low':
        return {
          border: 'border-blue-500',
          bg: 'bg-gradient-to-br from-blue-50 to-cyan-50',
          icon: 'ℹ',
          iconBg: 'bg-blue-500',
          textColor: 'text-blue-900',
          accentColor: 'text-blue-700',
        };
      case 'moderate':
        return {
          border: 'border-yellow-500',
          bg: 'bg-gradient-to-br from-yellow-50 to-orange-50',
          icon: '⚠',
          iconBg: 'bg-yellow-500',
          textColor: 'text-yellow-900',
          accentColor: 'text-yellow-700',
        };
      case 'high':
      case 'critical':
        return {
          border: 'border-red-500',
          bg: 'bg-gradient-to-br from-red-50 to-pink-50',
          icon: '!',
          iconBg: 'bg-red-500',
          textColor: 'text-red-900',
          accentColor: 'text-red-700',
        };
      default:
        return {
          border: 'border-gray-500',
          bg: 'bg-gradient-to-br from-gray-50 to-slate-50',
          icon: '•',
          iconBg: 'bg-gray-500',
          textColor: 'text-gray-900',
          accentColor: 'text-gray-700',
        };
    }
  };

  const styles = getSeverityStyles();

  return (
    <div
      className={`rounded-xl border-2 ${styles.border} ${styles.bg} p-6 shadow-lg relative`}
    >
      {/* Close Button */}
      <button
        onClick={() => setIsClosed(true)}
        className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors"
        title="Dismiss summary"
        aria-label="Close summary"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={`flex-shrink-0 w-12 h-12 rounded-full ${styles.iconBg} flex items-center justify-center text-white text-2xl font-bold shadow-md`}
        >
          {styles.icon}
        </div>

        {/* Content */}
        <div className="flex-1 space-y-3">
          {/* Title */}
          <h3 className={`text-lg font-bold ${styles.textColor}`}>
            {summary.severity === 'none' && '🎉 Scan Complete - All Clear'}
            {summary.severity === 'low' && '📊 Scan Complete - Minor Activity Detected'}
            {summary.severity === 'moderate' && '⚡ Scan Complete - Action Recommended'}
            {(summary.severity === 'high' || summary.severity === 'critical') &&
              '🚨 Scan Complete - Immediate Attention Required'}
          </h3>

          {/* AI Summary */}
          <p className={`text-base leading-relaxed ${styles.textColor}`}>
            {summary.summary}
          </p>

          {/* Recommendation */}
          <div className={`flex items-start gap-2 pt-2 border-t ${styles.border} border-opacity-30`}>
            <span className={`text-sm font-semibold ${styles.accentColor}`}>
              Next Step:
            </span>
            <span className={`text-sm ${styles.textColor}`}>
              {summary.recommendation}
            </span>
          </div>
        </div>
      </div>

      {/* AI Badge */}
      <div className="mt-4 flex justify-end">
        <span className="text-xs text-gray-500 bg-white bg-opacity-50 px-2 py-1 rounded-full">
          🤖 AI-Generated Summary
        </span>
      </div>
    </div>
  );
}
