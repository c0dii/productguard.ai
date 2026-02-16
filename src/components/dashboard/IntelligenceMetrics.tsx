'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface IntelligenceMetricsProps {
  metrics: {
    precision_rate: number;
    total_detections: number;
    verified_infringements: number;
    false_positives: number;
  };
  topPatterns?: Array<{
    pattern_value: string;
    confidence_score: number;
    occurrences: number;
  }>;
  suggestions?: string[];
}

export function IntelligenceMetrics({ metrics, topPatterns = [], suggestions = [] }: IntelligenceMetricsProps) {
  const precisionPercentage = (metrics.precision_rate * 100).toFixed(1);
  const accuracyGrade = getAccuracyGrade(metrics.precision_rate);

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-pg-text">🧠 Intelligence Engine</h2>
        <Badge
          variant={
            metrics.precision_rate > 0.8 ? 'default' : metrics.precision_rate > 0.6 ? 'warning' : 'danger' as any
          }
        >
          {accuracyGrade}
        </Badge>
      </div>

      <p className="text-sm text-pg-text-muted mb-4">
        The system learns from your verifications to improve future scans automatically.
      </p>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-pg-bg border border-pg-border">
          <p className="text-xs text-pg-text-muted mb-1">Precision</p>
          <p className="text-2xl font-bold text-pg-accent">{precisionPercentage}%</p>
        </div>
        <div className="p-3 rounded-lg bg-pg-bg border border-pg-border">
          <p className="text-xs text-pg-text-muted mb-1">Total Detected</p>
          <p className="text-2xl font-bold text-pg-text">{metrics.total_detections}</p>
        </div>
        <div className="p-3 rounded-lg bg-pg-bg border border-pg-border">
          <p className="text-xs text-pg-text-muted mb-1">Verified</p>
          <p className="text-2xl font-bold text-green-500">{metrics.verified_infringements}</p>
        </div>
        <div className="p-3 rounded-lg bg-pg-bg border border-pg-border">
          <p className="text-xs text-pg-text-muted mb-1">False Positives</p>
          <p className="text-2xl font-bold text-orange-500">{metrics.false_positives}</p>
        </div>
      </div>

      {/* Top Learned Patterns */}
      {topPatterns.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-pg-bg border border-pg-border">
          <h3 className="text-sm font-semibold text-pg-text mb-2">Top Verified Patterns</h3>
          <div className="space-y-1">
            {topPatterns.slice(0, 3).map((pattern, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-pg-text truncate">{pattern.pattern_value}</span>
                <span className="text-pg-text-muted ml-2">
                  {(pattern.confidence_score * 100).toFixed(0)}% ({pattern.occurrences}x)
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-pg-text-muted mt-2">
            These keywords are automatically added to future searches.
          </p>
        </div>
      )}

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-pg-text">Suggestions</h3>
          {suggestions.map((suggestion, i) => (
            <div
              key={i}
              className={`text-xs p-2 rounded-lg ${
                suggestion.includes('✅')
                  ? 'bg-green-50 text-green-900 border border-green-200'
                  : 'bg-blue-50 text-blue-900 border border-blue-200'
              }`}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}

      {/* How It Works */}
      <div className="mt-4 pt-4 border-t border-pg-border">
        <p className="text-xs text-pg-text-muted">
          <span className="font-semibold">How it works:</span> When you verify or reject infringements, the system:
        </p>
        <ul className="text-xs text-pg-text-muted mt-2 ml-4 space-y-1 list-disc">
          <li>Learns which keywords lead to real infringements</li>
          <li>Identifies false positive patterns to avoid</li>
          <li>Optimizes search queries automatically</li>
          <li>Improves AI filtering accuracy over time</li>
        </ul>
      </div>
    </Card>
  );
}

function getAccuracyGrade(precision: number): string {
  if (precision >= 0.9) return 'Excellent';
  if (precision >= 0.8) return 'Very Good';
  if (precision >= 0.7) return 'Good';
  if (precision >= 0.6) return 'Fair';
  return 'Needs Improvement';
}
