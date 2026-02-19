'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ArchiveProductButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleArchive = async () => {
    if (!confirm('Archive this product? It will be hidden from your dashboard and scans.')) return;
    setLoading(true);
    const response = await fetch(`/api/products/${productId}/archive`, { method: 'POST' });
    if (response.ok) {
      router.push('/dashboard/products');
    } else {
      alert('Failed to archive product');
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleArchive}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-pg-text-muted bg-pg-surface hover:bg-pg-surface-light border border-pg-border rounded-lg transition-all"
    >
      {loading ? 'Archiving...' : 'Archive Product'}
    </button>
  );
}
