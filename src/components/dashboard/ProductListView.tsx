'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import type { ProductWithStats } from '@/types';

interface ProductListViewProps {
  products: ProductWithStats[];
  onEdit: (product: ProductWithStats) => void;
  onDelete: (id: string) => void;
  onArchive?: (id: string) => void;
  onScan: (id: string) => void;
}

export function ProductListView({ products, onEdit, onDelete, onArchive, onScan }: ProductListViewProps) {
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
            <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold text-pg-text">Product Name</th>
            <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold text-pg-text hidden sm:table-cell">Type</th>
            <th className="text-right p-3 sm:p-4 text-xs sm:text-sm font-semibold text-pg-text hidden md:table-cell">Price</th>
            <th className="text-center p-3 sm:p-4 text-xs sm:text-sm font-semibold text-pg-text">Risk</th>
            <th className="text-center p-3 sm:p-4 text-xs sm:text-sm font-semibold text-pg-text hidden sm:table-cell">Threats</th>
            <th className="text-center p-3 sm:p-4 text-xs sm:text-sm font-semibold text-pg-text hidden md:table-cell">Pending</th>
            <th className="text-center p-3 sm:p-4 text-xs sm:text-sm font-semibold text-pg-text hidden lg:table-cell">Last Scan</th>
            <th className="text-right p-3 sm:p-4 text-xs sm:text-sm font-semibold text-pg-text">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr
              key={product.id}
              className="border-b border-pg-border hover:bg-pg-surface transition-colors group"
            >
              <td className="p-3 sm:p-4">
                <Link
                  href={`/dashboard/products/${product.id}`}
                  className="font-semibold text-pg-text hover:text-pg-accent transition-colors text-sm"
                >
                  {product.name}
                </Link>
                {product.description && (
                  <p className="text-xs text-pg-text-muted mt-1 line-clamp-1">{product.description}</p>
                )}
              </td>
              <td className="p-3 sm:p-4 hidden sm:table-cell">
                <Badge variant="default" className="capitalize text-xs">
                  {product.type}
                </Badge>
              </td>
              <td className="p-3 sm:p-4 text-right font-bold text-pg-accent hidden md:table-cell">${product.price}</td>
              <td className="p-3 sm:p-4 text-center">
                {getRiskBadge(product.active_count, product.infringement_count)}
              </td>
              <td className="p-3 sm:p-4 text-center hidden sm:table-cell">
                <span className={`font-bold ${(product.infringement_count || 0) > 0 ? 'text-pg-danger' : 'text-pg-text-muted'}`}>
                  {product.infringement_count || 0}
                </span>
              </td>
              <td className="p-3 sm:p-4 text-center hidden md:table-cell">
                {(product.pending_count || 0) > 0 ? (
                  <Badge variant="warning" className="text-xs">
                    {product.pending_count}
                  </Badge>
                ) : (
                  <span className="text-pg-text-muted text-sm">-</span>
                )}
              </td>
              <td className="p-3 sm:p-4 text-center text-xs text-pg-text-muted hidden lg:table-cell">
                {product.last_scan_at
                  ? new Date(product.last_scan_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'Never'}
              </td>
              <td className="p-3 sm:p-4">
                <div className="flex gap-1.5 sm:gap-2 justify-end sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onScan(product.id);
                    }}
                    className="text-xs min-w-[36px] min-h-[36px] px-2 py-1.5 sm:px-2 sm:py-1"
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
                    className="text-xs min-w-[36px] min-h-[36px] px-2 py-1.5 sm:px-2 sm:py-1"
                  >
                    ✏️
                  </Button>
                  {onArchive && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onArchive(product.id);
                      }}
                      className="text-xs min-w-[36px] min-h-[36px] px-2 py-1.5 sm:px-2 sm:py-1 hidden sm:inline-flex"
                      title="Archive"
                    >
                      📦
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(product.id);
                    }}
                    className="text-xs min-w-[36px] min-h-[36px] px-2 py-1.5 sm:px-2 sm:py-1"
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
