'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface DMCAQuickSetupProps {
  onComplete: () => void;
  onCancel: () => void;
}

export function DMCAQuickSetup({ onComplete, onCancel }: DMCAQuickSetupProps) {
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [dmcaReplyEmail, setDmcaReplyEmail] = useState('');
  const [isCopyrightOwner, setIsCopyrightOwner] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!fullName.trim()) {
      setError('Full name is required');
      return;
    }
    if (!address.trim()) {
      setError('Physical address is required for DMCA notices');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          address: address.trim(),
          phone: phone.trim() || null,
          dmca_reply_email: dmcaReplyEmail.trim() || null,
          is_copyright_owner: isCopyrightOwner,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save');
      }

      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 rounded-lg bg-pg-surface border border-pg-accent/30">
      <h3 className="text-sm font-bold text-pg-text mb-1">Complete DMCA Setup</h3>
      <p className="text-xs text-pg-text-muted mb-3">
        We need a few details before generating your DMCA notice. This only takes a moment.
      </p>

      {error && (
        <div className="mb-3 p-2 rounded bg-red-500/10 border border-red-500/30">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-pg-text-muted mb-1">
            Full Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-1.5 text-sm rounded-lg bg-pg-bg border border-pg-border text-pg-text focus:outline-none focus:ring-2 focus:ring-pg-accent/50"
            placeholder="Your full legal name"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-pg-text-muted mb-1">
            Physical Address <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3 py-1.5 text-sm rounded-lg bg-pg-bg border border-pg-border text-pg-text focus:outline-none focus:ring-2 focus:ring-pg-accent/50"
            placeholder="123 Main St, City, State ZIP"
          />
          <p className="text-[10px] text-pg-text-muted mt-0.5">Required for legally valid DMCA sworn statements</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-pg-text-muted mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-1.5 text-sm rounded-lg bg-pg-bg border border-pg-border text-pg-text focus:outline-none focus:ring-2 focus:ring-pg-accent/50"
            placeholder="+1 (555) 123-4567"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-pg-text-muted mb-1">
            DMCA Reply Email
          </label>
          <input
            type="email"
            value={dmcaReplyEmail}
            onChange={(e) => setDmcaReplyEmail(e.target.value)}
            className="w-full px-3 py-1.5 text-sm rounded-lg bg-pg-bg border border-pg-border text-pg-text focus:outline-none focus:ring-2 focus:ring-pg-accent/50"
            placeholder="Defaults to your account email"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="quick_copyright_owner"
            checked={isCopyrightOwner}
            onChange={(e) => setIsCopyrightOwner(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-pg-border text-pg-accent focus:ring-pg-accent/50"
          />
          <label htmlFor="quick_copyright_owner" className="text-xs text-pg-text">
            I am the copyright owner
          </label>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
            className="flex-1"
          >
            {saving ? 'Saving...' : 'Save & Generate Notice'}
          </Button>
          <Button
            onClick={onCancel}
            variant="secondary"
            size="sm"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
