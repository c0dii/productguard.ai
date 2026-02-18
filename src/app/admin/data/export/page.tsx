'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const SOURCES = [
  { value: 'scan_logs', label: 'Scan Logs' },
  { value: 'system_logs', label: 'System Logs (All)' },
  { value: 'system_logs_api', label: 'API Call Logs' },
  { value: 'system_logs_cron', label: 'Cron Job Logs' },
  { value: 'system_logs_webhook', label: 'Webhook Logs' },
  { value: 'system_logs_email', label: 'Email Logs' },
  { value: 'admin_alerts', label: 'Admin Alerts' },
  { value: 'dmca_submission_logs', label: 'DMCA Submission Logs' },
];

const FORMATS = [
  { value: 'csv', label: 'CSV' },
  { value: 'json', label: 'JSON' },
];

export default function ExportPage() {
  const [source, setSource] = useState('scan_logs');
  const [format, setFormat] = useState('csv');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [logLevel, setLogLevel] = useState('all');
  const [status, setStatus] = useState('all');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        source,
        format,
        ...(startDate && { start: startDate }),
        ...(endDate && { end: endDate }),
        ...(logLevel !== 'all' && { log_level: logLevel }),
        ...(status !== 'all' && { status }),
      });

      const response = await fetch(`/api/admin/data/export?${params.toString()}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Export failed');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = format === 'csv' ? 'csv' : 'json';
      a.download = `productguard-${source}-${new Date().toISOString().slice(0, 10)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const showLogLevelFilter = source.startsWith('system_logs') || source === 'scan_logs';
  const showStatusFilter = source.startsWith('system_logs');

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Export Data</h1>
        <p className="text-pg-text-muted">Download log data as CSV or JSON for external analysis</p>
      </div>

      <Card className="max-w-2xl">
        <div className="space-y-5">
          {/* Source */}
          <div>
            <label className="block text-sm font-medium text-pg-text mb-2">Data Source</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full bg-pg-bg border border-pg-border rounded-lg px-3 py-2 text-sm text-pg-text focus:outline-none focus:border-pg-accent"
            >
              {SOURCES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-pg-text mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-pg-bg border border-pg-border rounded-lg px-3 py-2 text-sm text-pg-text focus:outline-none focus:border-pg-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-pg-text mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-pg-bg border border-pg-border rounded-lg px-3 py-2 text-sm text-pg-text focus:outline-none focus:border-pg-accent"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 gap-4">
            {showLogLevelFilter && (
              <div>
                <label className="block text-sm font-medium text-pg-text mb-2">Log Level</label>
                <select
                  value={logLevel}
                  onChange={(e) => setLogLevel(e.target.value)}
                  className="w-full bg-pg-bg border border-pg-border rounded-lg px-3 py-2 text-sm text-pg-text focus:outline-none focus:border-pg-accent"
                >
                  <option value="all">All Levels</option>
                  <option value="debug">Debug</option>
                  <option value="info">Info</option>
                  <option value="warn">Warning</option>
                  <option value="error">Error</option>
                  <option value="fatal">Fatal</option>
                </select>
              </div>
            )}

            {showStatusFilter && (
              <div>
                <label className="block text-sm font-medium text-pg-text mb-2">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-pg-bg border border-pg-border rounded-lg px-3 py-2 text-sm text-pg-text focus:outline-none focus:border-pg-accent"
                >
                  <option value="all">All Statuses</option>
                  <option value="success">Success</option>
                  <option value="failure">Failure</option>
                  <option value="partial">Partial</option>
                  <option value="timeout">Timeout</option>
                  <option value="skipped">Skipped</option>
                </select>
              </div>
            )}
          </div>

          {/* Format */}
          <div>
            <label className="block text-sm font-medium text-pg-text mb-2">Format</label>
            <div className="flex gap-3">
              {FORMATS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setFormat(f.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    format === f.value
                      ? 'bg-pg-accent/10 text-pg-accent border-pg-accent'
                      : 'bg-pg-bg text-pg-text-muted border-pg-border hover:text-pg-text'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Export Button */}
          <Button
            onClick={handleExport}
            disabled={exporting}
            className="w-full"
          >
            {exporting ? 'Exporting...' : `Export as ${format.toUpperCase()}`}
          </Button>

          <p className="text-xs text-pg-text-muted text-center">
            Maximum 10,000 rows per export. For larger datasets, narrow the date range.
          </p>
        </div>
      </Card>
    </div>
  );
}
