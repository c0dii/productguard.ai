'use client';

import { useState } from 'react';

interface RelistingToggleProps {
  initialEnabled: boolean;
  scope: 'global' | 'user';
  userId?: string;
  label?: string;
}

export function RelistingToggle({ initialEnabled, scope, userId, label }: RelistingToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (scope === 'global') {
        const response = await fetch('/api/admin/system-settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: 'relisting_monitoring_global',
            value: { enabled: !enabled },
          }),
        });

        if (!response.ok) throw new Error('Failed to update setting');
      } else if (scope === 'user' && userId) {
        const response = await fetch(`/api/admin/users/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ relisting_monitoring_enabled: !enabled }),
        });

        if (!response.ok) throw new Error('Failed to update user setting');
      }

      setEnabled(!enabled);
    } catch (error) {
      console.error('Toggle error:', error);
      alert('Failed to update setting');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-pg-surface border border-pg-border">
      <div>
        <p className="text-sm font-semibold text-pg-text">
          {label || 'Re-listing Monitoring'}
        </p>
        <p className="text-xs text-pg-text-muted">
          {scope === 'global'
            ? 'When enabled, scans will detect previously removed content that reappears'
            : 'When disabled, this user will not receive re-listing alerts'}
        </p>
      </div>
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          enabled ? 'bg-pg-accent' : 'bg-pg-border'
        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
