'use client';

import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface InfringementActionsProps {
  infringementId: string;
  sourceUrl: string;
  isResolved: boolean;
  isPending?: boolean;
  hasInfrastructureData?: boolean;
}

export function InfringementActions({
  infringementId,
  sourceUrl,
  isResolved,
  isPending = false,
  hasInfrastructureData = false,
}: InfringementActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [verifyAction, setVerifyAction] = useState<'verify' | 'reject' | null>(null);

  const handleVisitSite = () => {
    window.open(sourceUrl, '_blank');
  };

  const handleRefreshInfrastructure = async () => {
    setIsProfileLoading(true);
    try {
      const response = await fetch(`/api/infringements/${infringementId}/profile-infrastructure`, {
        method: 'POST',
      });

      if (response.ok) {
        router.refresh();
        alert('Infrastructure data refreshed successfully!');
      } else {
        alert('Failed to refresh infrastructure data');
      }
    } catch (error) {
      console.error('Error refreshing infrastructure:', error);
      alert('Error refreshing infrastructure data');
    } finally {
      setIsProfileLoading(false);
    }
  };

  const handleMarkNotAThreat = async () => {
    if (!confirm('Mark this as not a threat? This will remove it from active infringements.')) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/infringements/${infringementId}/resolve`, {
        method: 'PUT',
      });

      if (response.ok) {
        router.refresh();
      } else {
        alert('Failed to mark as not a threat');
      }
    } catch (error) {
      console.error('Error marking as not a threat:', error);
      alert('Error marking as not a threat');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReopen = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/infringements/${infringementId}/reopen`, {
        method: 'PUT',
      });

      if (response.ok) {
        router.refresh();
      } else {
        alert('Failed to reopen infringement');
      }
    } catch (error) {
      console.error('Error reopening:', error);
      alert('Error reopening infringement');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationAction = async (action: 'verify' | 'reject') => {
    setVerifyAction(action);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/infringements/${infringementId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        // Redirect back to infringements list after action
        router.push('/dashboard/infringements');
        router.refresh();
      } else {
        const error = await response.json();
        alert(`Failed to ${action}: ${error.error}`);
      }
    } catch (error) {
      console.error(`Error ${action}ing infringement:`, error);
      alert(`Failed to ${action} infringement. Please try again.`);
    } finally {
      setIsLoading(false);
      setVerifyAction(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Pending Verification Actions */}
      {isPending && (
        <>
          <Button
            onClick={() => handleVerificationAction('verify')}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading && verifyAction === 'verify' ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Confirming...
              </span>
            ) : (
              '⚠️ Confirm Threat'
            )}
          </Button>

          <Button
            onClick={() => handleVerificationAction('reject')}
            disabled={isLoading}
            variant="ghost"
            className="w-full hover:bg-pg-danger/10 hover:text-pg-danger border-2 border-pg-border hover:border-pg-danger"
          >
            {isLoading && verifyAction === 'reject' ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Dismissing...
              </span>
            ) : (
              'Dismiss'
            )}
          </Button>

          <div className="pt-3 border-t border-pg-border">
            <p className="text-xs text-pg-text-muted mb-2">
              💡 Review all details carefully before confirming to ensure this is a genuine threat.
            </p>
          </div>
        </>
      )}

      {/* Active Infringement Actions */}
      {!isResolved && !isPending && (
        <>
          <Link href={`/dashboard/takedowns/new?infringement_id=${infringementId}`}>
            <Button className="w-full">⚡ Send DMCA Notice</Button>
          </Link>
          <Button
            variant="secondary"
            onClick={handleMarkNotAThreat}
            disabled={isLoading}
            className="w-full border-2 border-pg-border hover:border-pg-danger"
          >
            ✓ Mark as Not a Threat
          </Button>
        </>
      )}

      {/* Resolved Infringement Actions */}
      {isResolved && (
        <Button variant="secondary" onClick={handleReopen} disabled={isLoading} className="w-full">
          ↻ Reopen Infringement
        </Button>
      )}
    </div>
  );
}
