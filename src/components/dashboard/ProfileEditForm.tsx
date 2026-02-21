'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface ProfileData {
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
  address: string | null;
  dmca_reply_email: string | null;
  is_copyright_owner: boolean;
  created_at?: string;
}

interface ProfileEditFormProps {
  profile: ProfileData;
  onSaved: () => void;
}

export function ProfileEditForm({ profile, onSaved }: ProfileEditFormProps) {
  // Profile info state
  const [fullName, setFullName] = useState(profile.full_name || '');
  const [companyName, setCompanyName] = useState(profile.company_name || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // DMCA contact state
  const [phone, setPhone] = useState(profile.phone || '');
  const [address, setAddress] = useState(profile.address || '');
  const [dmcaReplyEmail, setDmcaReplyEmail] = useState(profile.dmca_reply_email || '');
  const [isCopyrightOwner, setIsCopyrightOwner] = useState(profile.is_copyright_owner ?? true);
  const [dmcaSaving, setDmcaSaving] = useState(false);
  const [dmcaSuccess, setDmcaSuccess] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const saveProfile = async (fields: Record<string, any>, setLoading: (v: boolean) => void, setSuccess: (v: boolean) => void) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save');
      }

      setSuccess(true);
      onSaved();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Couldn\'t save your changes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = () => {
    saveProfile(
      { full_name: fullName, company_name: companyName },
      setProfileSaving,
      setProfileSuccess
    );
  };

  const handleSaveDMCA = () => {
    saveProfile(
      {
        phone: phone || null,
        address: address || null,
        dmca_reply_email: dmcaReplyEmail || null,
        is_copyright_owner: isCopyrightOwner,
      },
      setDmcaSaving,
      setDmcaSuccess
    );
  };

  return (
    <>
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Card 1: Profile Information */}
      <Card>
        <h2 className="text-lg sm:text-xl font-bold mb-4">Profile Information</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-pg-text-muted mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-pg-bg border border-pg-border text-pg-text focus:outline-none focus:ring-2 focus:ring-pg-accent/50 focus:border-pg-accent"
              placeholder="Your full name"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-pg-text-muted mb-1">
              Company Name
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-pg-bg border border-pg-border text-pg-text focus:outline-none focus:ring-2 focus:ring-pg-accent/50 focus:border-pg-accent"
              placeholder="Your company (optional)"
            />
          </div>
          <Button
            onClick={handleSaveProfile}
            disabled={profileSaving}
            size="sm"
          >
            {profileSaving ? 'Saving...' : profileSuccess ? 'Saved!' : 'Save Profile'}
          </Button>
          {profile.created_at && (
            <p className="text-xs text-pg-text-muted pt-2 border-t border-pg-border">
              Member since {new Date(profile.created_at).toLocaleDateString()}
            </p>
          )}
        </div>
      </Card>

      {/* Card 2: DMCA Contact Information */}
      <Card>
        <h2 className="text-lg sm:text-xl font-bold mb-2">DMCA Contact Information</h2>
        <p className="text-sm text-pg-text-muted mb-4">
          This information is used in your DMCA takedown notices. A physical address is legally required for sworn DMCA statements.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-pg-text-muted mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-pg-bg border border-pg-border text-pg-text focus:outline-none focus:ring-2 focus:ring-pg-accent/50 focus:border-pg-accent"
              placeholder="+1 (555) 123-4567"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-pg-text-muted mb-1">
              Physical Address
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-pg-bg border border-pg-border text-pg-text focus:outline-none focus:ring-2 focus:ring-pg-accent/50 focus:border-pg-accent resize-none"
              placeholder="123 Main St, City, State ZIP"
            />
            <p className="text-xs text-pg-text-muted mt-1">Required for legally valid DMCA sworn statements</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-pg-text-muted mb-1">
              DMCA Reply Email
            </label>
            <input
              type="email"
              value={dmcaReplyEmail}
              onChange={(e) => setDmcaReplyEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-pg-bg border border-pg-border text-pg-text focus:outline-none focus:ring-2 focus:ring-pg-accent/50 focus:border-pg-accent"
              placeholder="dmca@yourdomain.com"
            />
            <p className="text-xs text-pg-text-muted mt-1">Replies to your DMCA notices go here. Defaults to your account email if empty.</p>
          </div>
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="is_copyright_owner"
              checked={isCopyrightOwner}
              onChange={(e) => setIsCopyrightOwner(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-pg-border text-pg-accent focus:ring-pg-accent/50"
            />
            <label htmlFor="is_copyright_owner" className="text-sm text-pg-text">
              I am the copyright owner of my products
              <span className="block text-xs text-pg-text-muted mt-0.5">
                If unchecked, you may need to specify your relationship to the copyright owner in each DMCA notice.
              </span>
            </label>
          </div>
          <Button
            onClick={handleSaveDMCA}
            disabled={dmcaSaving}
            size="sm"
          >
            {dmcaSaving ? 'Saving...' : dmcaSuccess ? 'Saved!' : 'Save DMCA Contact'}
          </Button>
        </div>
      </Card>
      </div>
    </>
  );
}
