'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import type { Product } from '@/types';

interface ProductActionsProps {
  product: Product;
}

export function ProductActions({ product }: ProductActionsProps) {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);

  const handleEdit = () => {
    router.push(`/dashboard/products?edit=${product.id}`);
  };

  const handleScan = async () => {
    setScanning(true);

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: product.id }),
      });

      if (response.ok) {
        const data = await response.json();
        alert('Scan started! Redirecting to scan results...');
        router.push(`/dashboard/scans/${data.scan_id}`);
      } else {
        const error = await response.json();
        alert(`Failed to start scan: ${error.error}`);
      }
    } catch (error) {
      console.error('Scan error:', error);
      alert('Failed to start scan. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="flex gap-3 items-center">
      <Button variant="secondary" onClick={handleEdit} size="sm">
        ✏️ Edit
      </Button>
      <Button onClick={handleScan} disabled={scanning} size="sm" className="min-w-[120px]">
        {scanning ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Starting...
          </span>
        ) : (
          '🔍 Run Scan'
        )}
      </Button>
    </div>
  );
}
