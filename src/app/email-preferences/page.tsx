'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface EmailPreferences {
  email_threat_alerts: boolean;
  email_scan_notifications: boolean;
  email_takedown_updates: boolean;
  email_account_only: boolean;
  email_unsubscribe_all: boolean;
}

export default function EmailPreferencesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-pg-bg flex items-center justify-center">
        <p className="text-pg-text-muted">Loading preferences...</p>
      </div>
    }>
      <EmailPreferencesContent />
    </Suspense>
  );
}

function EmailPreferencesContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [email, setEmail] = useState<string>('');
  const [prefs, setPrefs] = useState<EmailPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const url = token
        ? `/api/email-preferences?token=${encodeURIComponent(token)}`
        : '/api/email-preferences';

      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 401) {
          setError('Invalid or expired link. Please log in to manage your preferences.');
        } else {
          setError('Couldn\'t load your preferences. Please refresh the page.');
        }
        setLoading(false);
        return;
      }

      const data = await res.json();
      setEmail(data.email);
      setPrefs(data.preferences);
    } catch {
      setError('Couldn\'t load your preferences. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (updates: Partial<EmailPreferences>) => {
    setSaving(true);
    setSaved(false);

    try {
      const url = token
        ? `/api/email-preferences?token=${encodeURIComponent(token)}`
        : '/api/email-preferences';

      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const data = await res.json();
        setPrefs(data.preferences);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        alert('Couldn\'t save your preferences. Please try again.');
      }
    } catch {
      alert('Couldn\'t save your preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (field: keyof EmailPreferences) => {
    if (!prefs) return;

    const updates: Partial<EmailPreferences> = {};

    if (field === 'email_unsubscribe_all') {
      if (!prefs.email_unsubscribe_all) {
        // Turning on unsubscribe all
        updates.email_unsubscribe_all = true;
      } else {
        // Turning off unsubscribe all — restore defaults
        updates.email_unsubscribe_all = false;
        updates.email_threat_alerts = true;
        updates.email_scan_notifications = true;
        updates.email_takedown_updates = true;
      }
    } else if (field === 'email_account_only') {
      if (!prefs.email_account_only) {
        // Turning on account only
        updates.email_account_only = true;
      } else {
        // Turning off account only — restore defaults
        updates.email_account_only = false;
        updates.email_threat_alerts = true;
        updates.email_scan_notifications = true;
        updates.email_takedown_updates = true;
      }
    } else {
      // Toggling a category — also clear account_only and unsubscribe_all
      updates[field] = !prefs[field];
      if (prefs.email_account_only) updates.email_account_only = false;
      if (prefs.email_unsubscribe_all) updates.email_unsubscribe_all = false;
    }

    savePreferences(updates);
  };

  const categoryDisabled = prefs?.email_account_only || prefs?.email_unsubscribe_all;

  if (loading) {
    return (
      <div className="min-h-screen bg-pg-bg flex items-center justify-center">
        <p className="text-pg-text-muted">Loading preferences...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-pg-bg flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-pg-text mb-4">Email Preferences</h1>
          <p className="text-pg-text-muted mb-6">{error}</p>
          <Link
            href="/auth/login"
            className="inline-block px-6 py-3 bg-pg-accent text-black font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pg-bg py-8 sm:py-16 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-pg-text mb-2">
            Manage Your Communications
          </h1>
          {email && (
            <p className="text-sm text-pg-text-muted">
              Receiving emails at <span className="font-medium text-pg-text">{email}</span>
            </p>
          )}
        </div>

        {/* Success banner */}
        {saved && (
          <div className="mb-6 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
            <p className="text-sm text-green-400 font-medium">Preferences saved successfully</p>
          </div>
        )}

        {/* Category Toggles */}
        <div className="bg-pg-surface border border-pg-border rounded-xl p-5 sm:p-6 mb-4">
          <h2 className="text-base font-semibold text-pg-text mb-4">Notification Types</h2>

          <div className="space-y-4">
            <ToggleRow
              label="Threat Alerts"
              description="Get notified when high-severity infringements are detected"
              checked={prefs?.email_threat_alerts ?? true}
              disabled={!!categoryDisabled || saving}
              onChange={() => handleToggle('email_threat_alerts')}
            />
            <ToggleRow
              label="Scan Notifications"
              description="Receive updates when scans complete with new threats found"
              checked={prefs?.email_scan_notifications ?? true}
              disabled={!!categoryDisabled || saving}
              onChange={() => handleToggle('email_scan_notifications')}
            />
            <ToggleRow
              label="Takedown Updates"
              description="Get confirmations when takedown requests are successful"
              checked={prefs?.email_takedown_updates ?? true}
              disabled={!!categoryDisabled || saving}
              onChange={() => handleToggle('email_takedown_updates')}
            />
          </div>
        </div>

        {/* Global Options */}
        <div className="bg-pg-surface border border-pg-border rounded-xl p-5 sm:p-6">
          <div className="space-y-4">
            <ToggleRow
              label="Account notifications only"
              description="Only receive essential account and billing emails"
              checked={prefs?.email_account_only ?? false}
              disabled={saving}
              onChange={() => handleToggle('email_account_only')}
            />

            <div className="border-t border-pg-border pt-4">
              <ToggleRow
                label="Unsubscribe from all emails"
                description="Stop all emails from ProductGuard including account notifications"
                checked={prefs?.email_unsubscribe_all ?? false}
                disabled={saving}
                onChange={() => handleToggle('email_unsubscribe_all')}
                danger
              />
              {prefs?.email_unsubscribe_all && (
                <p className="text-xs text-pg-warning mt-2 ml-14">
                  You will not receive any emails from ProductGuard, including important account and billing notifications.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <Link
            href="/dashboard/settings"
            className="text-sm text-pg-text-muted hover:text-pg-accent transition-colors"
          >
            Back to Settings
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Toggle Component
// ============================================================================

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
  danger = false,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
  danger?: boolean;
}) {
  return (
    <div className={`flex items-start gap-3 ${disabled && !checked ? 'opacity-50' : ''}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={onChange}
        className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-pg-bg mt-0.5 ${
          checked
            ? danger
              ? 'bg-pg-danger focus:ring-pg-danger'
              : 'bg-pg-accent focus:ring-pg-accent'
            : 'bg-gray-600 focus:ring-gray-500'
        } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </button>
      <div>
        <p className={`text-sm font-medium ${danger && checked ? 'text-pg-danger' : 'text-pg-text'}`}>
          {label}
        </p>
        <p className="text-xs text-pg-text-muted mt-0.5">{description}</p>
      </div>
    </div>
  );
}
