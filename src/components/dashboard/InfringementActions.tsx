'use client';

import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface InfringementActionsProps {
  infringementId: string;
  sourceUrl: string;
  isResolved: boolean;
  hasInfrastructureData?: boolean;
}

export function InfringementActions({
  infringementId,
  sourceUrl,
  isResolved,
  hasInfrastructureData = false,
}: InfringementActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

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

  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="secondary" onClick={handleVisitSite}>
        🔗 Visit Source URL
      </Button>
      {!isResolved && (
        <>
          <Link href={`/dashboard/takedowns/new?infringement_id=${infringementId}`}>
            <Button>⚡ Send DMCA Notice</Button>
          </Link>
          <Button variant="ghost" onClick={handleMarkNotAThreat} disabled={isLoading}>
            ✓ Mark as Not a Threat
          </Button>
        </>
      )}
      {isResolved && (
        <Button variant="secondary" onClick={handleReopen} disabled={isLoading}>
          ↻ Reopen Infringement
        </Button>
      )}
      <Button
        variant="secondary"
        onClick={handleRefreshInfrastructure}
        disabled={isProfileLoading}
        className="text-xs"
      >
        {isProfileLoading ? 'Profiling...' : hasInfrastructureData ? '🔄 Refresh Infrastructure' : '🔍 Get Infrastructure Data'}
      </Button>
    </div>
  );
}
