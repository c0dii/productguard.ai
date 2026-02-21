'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ArchiveScanButton({ scanId }: { scanId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleArchive = async () => {
    if (!confirm('Archive this scan? It will be hidden from your dashboard.')) return;
    setLoading(true);
    const response = await fetch(`/api/scans/${scanId}/archive`, { method: 'POST' });
    if (response.ok) {
      router.push('/dashboard/scans');
    } else {
      alert('Couldn\'t archive this scan. Please try again.');
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleArchive}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-pg-text-muted hover:text-pg-text bg-pg-surface hover:bg-pg-surface-light border border-pg-border rounded-lg transition-all"
    >
      {loading ? 'Archiving...' : 'Archive Scan'}
    </button>
  );
}
