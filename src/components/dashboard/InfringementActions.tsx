'use client';

import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface InfringementActionsProps {
  infringementId: string;
  sourceUrl: string;
  isResolved: boolean;
  isPending?: boolean;
  productId?: string;
}

export function InfringementActions({
  infringementId,
  sourceUrl,
  isResolved,
  isPending = false,
  productId,
}: InfringementActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [verifyAction, setVerifyAction] = useState<'verify' | 'reject' | 'whitelist' | null>(null);

  const handleMarkNotAThreat = async () => {
    if (!confirm('Mark this as not a threat? This will dismiss it from active infringements.')) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/infringements/${infringementId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      });

      if (response.ok) {
        router.push(productId ? `/dashboard/products/${productId}` : '/dashboard/infringements');
      } else {
        alert('Couldn\'t update this item. Please try again.');
      }
    } catch (error) {
      console.error('Error marking as not a threat:', error);
      alert('Couldn\'t update this item. Please try again.');
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
        alert('Couldn\'t reopen this infringement. Please try again.');
      }
    } catch (error) {
      console.error('Error reopening:', error);
      alert('Couldn\'t reopen this infringement. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationAction = async (action: 'verify' | 'reject' | 'whitelist') => {
    setVerifyAction(action);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/infringements/${infringementId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        if (action === 'reject' || action === 'whitelist') {
          // Go back to product page so user can continue reviewing infringements
          router.push(productId ? `/dashboard/products/${productId}` : '/dashboard/infringements');
          return;
        }
        // 'verify' — Stay on the page so user sees the status change and can take DMCA action
        router.refresh();
      } else {
        const error = await response.json();
        alert(`Couldn't complete that action: ${error.error}`);
      }
    } catch (error) {
      console.error(`Error ${action}ing infringement:`, error);
      alert('Something went wrong. Please try again.');
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
              'Confirm Infringement'
            )}
          </Button>
          <p className="text-xs text-pg-text-muted text-center -mt-1">
            Yes, this is unauthorized use of my content
          </p>

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
              'Not an Infringement'
            )}
          </Button>
          <p className="text-xs text-pg-text-muted text-center -mt-1">
            This is legitimate use or a false positive
          </p>

          <div className="border-t border-pg-border pt-3 mt-1">
            <Button
              onClick={() => handleVerificationAction('whitelist')}
              disabled={isLoading}
              variant="ghost"
              className="w-full hover:bg-green-500/10 hover:text-green-400 border-2 border-pg-border hover:border-green-500/50"
            >
              {isLoading && verifyAction === 'whitelist' ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Whitelisting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  This Is My Approved URL
                </span>
              )}
            </Button>
            <p className="text-xs text-pg-text-muted text-center -mt-1">
              I own this page — whitelist it to prevent future alerts
            </p>
          </div>
        </>
      )}

      {/* Active Infringement Actions */}
      {!isResolved && !isPending && (
        <Button
          variant="secondary"
          onClick={handleMarkNotAThreat}
          disabled={isLoading}
          className="w-full border-2 border-pg-border hover:border-pg-danger"
        >
          ✓ Mark as Not a Threat
        </Button>
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
