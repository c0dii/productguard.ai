'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Product {
  id: string;
  name: string;
  type: string;
  created_at: string;
  archived_at?: string | null;
}

export function AdminUserProducts({ products }: { products: Product[] }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (product: Product) => {
    if (
      !confirm(
        `Delete "${product.name}"?\n\nThis will permanently remove the product and ALL associated scans, scan history, infringements, and intelligence patterns. This cannot be undone.`
      )
    )
      return;

    setDeleting(product.id);
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete product');
      }
    } catch {
      alert('Failed to delete product');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Products ({products.length})</h2>
      {products.length === 0 ? (
        <p className="text-sm text-pg-text-muted">No products created</p>
      ) : (
        <div className="space-y-2">
          {products.map((product) => (
            <div
              key={product.id}
              className="p-3 bg-pg-surface-light rounded-lg flex items-center justify-between"
            >
              <div>
                <p className="font-semibold">
                  {product.name}
                  {product.archived_at && (
                    <span className="text-xs text-pg-text-muted ml-2">(archived)</span>
                  )}
                </p>
                <p className="text-xs text-pg-text-muted">
                  {product.type} • Created{' '}
                  {new Date(product.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleDelete(product)}
                disabled={deleting === product.id}
                className="px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg transition-all disabled:opacity-50"
              >
                {deleting === product.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
