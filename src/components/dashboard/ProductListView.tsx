'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

interface ProductWithStats {
  id: string;
  name: string;
  type: string;
  price: number;
  description: string | null;
  created_at: string;
  infringement_count?: number;
  pending_count?: number;
  active_count?: number;
  last_scan_at?: string | null;
}

interface ProductListViewProps {
  products: ProductWithStats[];
  onEdit: (product: ProductWithStats) => void;
  onDelete: (id: string) => void;
  onScan: (id: string) => void;
}

export function ProductListView({ products, onEdit, onDelete, onScan }: ProductListViewProps) {
  const getRiskBadge = (activeCount: number = 0, totalCount: number = 0) => {
    if (activeCount === 0 && totalCount === 0) {
      return <Badge variant="default" className="bg-green-600 text-white">Safe</Badge>;
    }
    if (activeCount >= 10) {
      return <Badge variant="danger">Critical</Badge>;
    }
    if (activeCount >= 5) {
      return <Badge variant="warning">High Risk</Badge>;
    }
    if (activeCount > 0) {
      return <Badge variant="warning" className="bg-yellow-600">Medium</Badge>;
    }
    return <Badge variant="default">Low Risk</Badge>;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-pg-border bg-pg-surface">
            <th className="text-left p-4 text-sm font-semibold text-pg-text">Product Name</th>
            <th className="text-left p-4 text-sm font-semibold text-pg-text">Type</th>
            <th className="text-right p-4 text-sm font-semibold text-pg-text">Price</th>
            <th className="text-center p-4 text-sm font-semibold text-pg-text">Risk Level</th>
            <th className="text-center p-4 text-sm font-semibold text-pg-text">Infringements</th>
            <th className="text-center p-4 text-sm font-semibold text-pg-text">Pending</th>
            <th className="text-center p-4 text-sm font-semibold text-pg-text">Last Scan</th>
            <th className="text-right p-4 text-sm font-semibold text-pg-text">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr
              key={product.id}
              className="border-b border-pg-border hover:bg-pg-surface transition-colors group"
            >
              <td className="p-4">
                <Link
                  href={`/dashboard/products/${product.id}`}
                  className="font-semibold text-pg-text hover:text-pg-accent transition-colors"
                >
                  {product.name}
                </Link>
                {product.description && (
                  <p className="text-xs text-pg-text-muted mt-1 line-clamp-1">{product.description}</p>
                )}
              </td>
              <td className="p-4">
                <Badge variant="default" className="capitalize text-xs">
                  {product.type}
                </Badge>
              </td>
              <td className="p-4 text-right font-bold text-pg-accent">${product.price}</td>
              <td className="p-4 text-center">
                {getRiskBadge(product.active_count, product.infringement_count)}
              </td>
              <td className="p-4 text-center">
                <span className={`font-bold ${(product.infringement_count || 0) > 0 ? 'text-pg-danger' : 'text-pg-text-muted'}`}>
                  {product.infringement_count || 0}
                </span>
              </td>
              <td className="p-4 text-center">
                {(product.pending_count || 0) > 0 ? (
                  <Badge variant="warning" className="text-xs">
                    {product.pending_count}
                  </Badge>
                ) : (
                  <span className="text-pg-text-muted text-sm">-</span>
                )}
              </td>
              <td className="p-4 text-center text-xs text-pg-text-muted">
                {product.last_scan_at
                  ? new Date(product.last_scan_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'Never'}
              </td>
              <td className="p-4">
                <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onScan(product.id);
                    }}
                    className="text-xs px-2 py-1"
                  >
                    🔍
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(product);
                    }}
                    className="text-xs px-2 py-1"
                  >
                    ✏️
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(product.id);
                    }}
                    className="text-xs px-2 py-1"
                  >
                    🗑️
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {products.length === 0 && (
        <div className="text-center py-12 text-pg-text-muted">
          <p>No products found</p>
        </div>
      )}
    </div>
  );
}
