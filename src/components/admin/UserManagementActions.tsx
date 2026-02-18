'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { RelistingToggle } from '@/components/admin/RelistingToggle';
import { useRouter } from 'next/navigation';

interface UserManagementActionsProps {
  userId: string;
  userEmail: string;
  currentPlan: string;
  grantedTier: string | null;
  isAdmin: boolean;
  hasSubscription: boolean;
  relistingMonitoringEnabled?: boolean;
}

export function UserManagementActions({
  userId,
  userEmail,
  currentPlan,
  grantedTier,
  isAdmin,
  hasSubscription,
  relistingMonitoringEnabled = true,
}: UserManagementActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [showGrantDialog, setShowGrantDialog] = useState(false);
  const [grantReason, setGrantReason] = useState('');

  const handleChangePlan = async (newPlan: string) => {
    if (!confirm(`Change user plan to ${newPlan.toUpperCase()}?`)) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/plan`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: newPlan }),
      });

      if (response.ok) {
        alert('Plan updated successfully');
        router.refresh();
      } else {
        alert('Failed to update plan');
      }
    } catch (error) {
      console.error('Plan update error:', error);
      alert('Error updating plan');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!confirm(`Send password reset email to ${userEmail}?`)) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
      });

      if (response.ok) {
        alert('Password reset email sent');
        setShowPasswordReset(false);
      } else {
        alert('Failed to send password reset');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      alert('Error sending password reset');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (
      !confirm(
        `⚠️ WARNING: Delete user ${userEmail}?\n\nThis will permanently delete:\n- User account\n- All products\n- All scans\n- All infringements\n- All takedowns\n- All DMCA logs\n\nThis action CANNOT be undone!`
      )
    ) {
      return;
    }

    const confirmation = prompt(
      'Type DELETE to confirm permanent deletion:'
    );
    if (confirmation !== 'DELETE') {
      alert('Deletion canceled');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('User deleted successfully');
        router.push('/admin/users');
      } else {
        alert('Failed to delete user');
      }
    } catch (error) {
      console.error('Delete user error:', error);
      alert('Error deleting user');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdmin = async () => {
    const action = isAdmin ? 'revoke' : 'grant';
    if (!confirm(`${action.toUpperCase()} admin access for ${userEmail}?`))
      return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/admin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAdmin: !isAdmin }),
      });

      if (response.ok) {
        alert(`Admin access ${action}ed`);
        router.refresh();
      } else {
        alert(`Failed to ${action} admin access`);
      }
    } catch (error) {
      console.error('Toggle admin error:', error);
      alert(`Error ${action}ing admin access`);
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonate = async () => {
    if (
      !confirm(
        `Impersonate user ${userEmail}?\n\nYou will be redirected to their dashboard view.`
      )
    ) {
      return;
    }

    // TODO: Implement impersonation via Supabase Auth
    alert('Impersonation feature coming soon');
  };

  const handleGrantAccess = async (tier: string) => {
    if (!grantReason.trim()) {
      alert('Please enter a reason for granting access');
      return;
    }

    if (
      !confirm(
        `Grant ${tier.toUpperCase()} access to ${userEmail}?\n\nReason: ${grantReason}\n\nThey will have ${tier} permissions without paying.`
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/grant-access`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grantedTier: tier, reason: grantReason }),
      });

      if (response.ok) {
        alert('Access granted successfully');
        setShowGrantDialog(false);
        setGrantReason('');
        router.refresh();
      } else {
        alert('Failed to grant access');
      }
    } catch (error) {
      console.error('Grant access error:', error);
      alert('Error granting access');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeGrantedAccess = async () => {
    if (!confirm(`Revoke granted access for ${userEmail}?\n\nThey will return to their paid plan tier.`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/grant-access`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Granted access revoked');
        router.refresh();
      } else {
        alert('Failed to revoke access');
      }
    } catch (error) {
      console.error('Revoke access error:', error);
      alert('Error revoking access');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <h2 className="text-xl font-bold mb-4">Admin Actions</h2>

      <div className="space-y-3">
        {/* Change Plan */}
        <div>
          <p className="text-sm font-semibold mb-2">Change Plan</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant={currentPlan === 'free' ? 'secondary' : 'ghost'}
              onClick={() => handleChangePlan('free')}
              disabled={loading || currentPlan === 'free'}
              className="text-xs"
            >
              Free
            </Button>
            <Button
              size="sm"
              variant={currentPlan === 'starter' ? 'secondary' : 'ghost'}
              onClick={() => handleChangePlan('starter')}
              disabled={loading || currentPlan === 'starter'}
              className="text-xs"
            >
              Starter
            </Button>
            <Button
              size="sm"
              variant={currentPlan === 'pro' ? 'secondary' : 'ghost'}
              onClick={() => handleChangePlan('pro')}
              disabled={loading || currentPlan === 'pro'}
              className="text-xs"
            >
              Pro
            </Button>
            <Button
              size="sm"
              variant={currentPlan === 'business' ? 'secondary' : 'ghost'}
              onClick={() => handleChangePlan('business')}
              disabled={loading || currentPlan === 'business'}
              className="text-xs"
            >
              Business
            </Button>
          </div>
        </div>

        {/* Grant Access Section */}
        <div className="border-t border-pg-border pt-3">
          <p className="text-sm font-semibold mb-2 flex items-center gap-2">
            Grant Access
            <span className="text-xs text-pg-text-muted font-normal">(Comp Account)</span>
          </p>

          {grantedTier ? (
            <div className="bg-purple-500 bg-opacity-10 border border-purple-500 rounded-lg p-3 mb-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-purple-400">
                  Currently Granted: {grantedTier.toUpperCase()}
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRevokeGrantedAccess}
                disabled={loading}
                className="w-full text-xs text-purple-400 hover:bg-purple-500 hover:bg-opacity-10"
              >
                Revoke Granted Access
              </Button>
            </div>
          ) : (
            <>
              {!showGrantDialog ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowGrantDialog(true)}
                  disabled={loading}
                  className="w-full mb-2"
                >
                  ⭐ Grant Tier Access
                </Button>
              ) : (
                <div className="bg-pg-surface-light rounded-lg p-3 space-y-2">
                  <input
                    type="text"
                    placeholder="Reason (e.g., Partner, Beta Tester, Support)"
                    value={grantReason}
                    onChange={(e) => setGrantReason(e.target.value)}
                    className="input-field w-full text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleGrantAccess('starter')}
                      disabled={loading || !grantReason.trim()}
                      className="text-xs"
                    >
                      Starter
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleGrantAccess('pro')}
                      disabled={loading || !grantReason.trim()}
                      className="text-xs"
                    >
                      Pro
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleGrantAccess('business')}
                      disabled={loading || !grantReason.trim()}
                      className="text-xs"
                    >
                      Business
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowGrantDialog(false);
                        setGrantReason('');
                      }}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                  <p className="text-xs text-pg-text-muted">
                    💡 User keeps their paid plan but gets higher tier features
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t border-pg-border pt-3">
          {/* Reset Password */}
          <Button
            size="sm"
            variant="secondary"
            onClick={handleResetPassword}
            disabled={loading}
            className="w-full mb-2"
          >
            🔑 Send Password Reset
          </Button>

          {/* Toggle Admin */}
          <Button
            size="sm"
            variant="secondary"
            onClick={handleToggleAdmin}
            disabled={loading}
            className="w-full mb-2"
          >
            {isAdmin ? '🔓 Revoke Admin' : '🔐 Grant Admin'}
          </Button>

          {/* Impersonate (Coming Soon) */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleImpersonate}
            disabled={loading}
            className="w-full mb-2"
          >
            👤 Impersonate User
          </Button>
        </div>

        <div className="border-t border-pg-border pt-3">
          <RelistingToggle
            initialEnabled={relistingMonitoringEnabled}
            scope="user"
            userId={userId}
            label="Re-listing Monitoring"
          />
        </div>

        <div className="border-t border-pg-border pt-3">
          {/* Delete User */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDeleteUser}
            disabled={loading}
            className="w-full text-pg-danger hover:bg-red-500 hover:bg-opacity-10"
          >
            🗑️ Delete User
          </Button>
        </div>

        <div className="text-xs text-pg-text-muted pt-2 border-t border-pg-border">
          <p>⚠️ All actions are logged and irreversible</p>
        </div>
      </div>
    </Card>
  );
}
