'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatTimeAgo } from '@/lib/scan-history/utils';
import type { ProductScanStatus } from '@/types';

interface ProductStatusTableProps {
  productStatuses: ProductScanStatus[];
}

export default function ProductStatusTable({ productStatuses }: ProductStatusTableProps) {
  const router = useRouter();

  // Poll for updates when any scan is running
  const hasRunningScans = productStatuses.some(
    (p) => p.scan_status === 'running' || p.scan_status === 'pending'
  );

  useEffect(() => {
    if (!hasRunningScans) return;
    const interval = setInterval(() => {
      router.refresh();
    }, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [hasRunningScans, router]);

  const handleRowClick = (product: ProductScanStatus) => {
    // If scan is actively running, navigate to the scan detail page
    if (product.scan_id && (product.scan_status === 'running' || product.scan_status === 'pending')) {
      router.push(`/dashboard/scans/${product.scan_id}`);
    } else {
      router.push(`/dashboard/products/${product.product_id}`);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-pg-bg border-b border-pg-border">
          <tr>
            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-pg-text-muted uppercase tracking-wider">
              Product
            </th>
            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-pg-text-muted uppercase tracking-wider">
              Last Scan
            </th>
            <th className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-pg-text-muted uppercase tracking-wider">
              Runs
            </th>
            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-pg-text-muted uppercase tracking-wider">
              Pending
            </th>
            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-pg-text-muted uppercase tracking-wider">
              Active
            </th>
            <th className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-pg-text-muted uppercase tracking-wider">
              Resolved
            </th>
            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-pg-text-muted uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-pg-border">
          {productStatuses.map((product) => (
            <tr
              key={product.product_id}
              className="hover:bg-pg-bg transition-colors cursor-pointer"
              onClick={() => handleRowClick(product)}
            >
              <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div>
                    <div className="text-xs sm:text-sm font-medium text-pg-text">{product.product_name}</div>
                    {product.last_run_new_urls !== null && product.last_run_new_urls > 0 && (
                      <div className="text-xs text-green-400">
                        +{product.last_run_new_urls} new
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                <div className="text-xs sm:text-sm text-pg-text">
                  {product.last_run_at ? formatTimeAgo(product.last_run_at) : 'Never'}
                </div>
                {product.scan_status === 'running' && (
                  <span className="text-xs text-blue-400">Running...</span>
                )}
              </td>
              <td className="hidden sm:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                <div className="text-sm text-pg-text">{product.run_count || 0}</div>
                {/* Temporarily disabled - internal metrics not customer-facing */}
                {/* {product.last_run_api_savings !== null && product.last_run_api_savings > 0 && (
                  <div className="text-xs text-green-400">
                    Saved {product.last_run_api_savings} API calls
                  </div>
                )} */}
              </td>
              <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                {product.pending_verification_count > 0 ? (
                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-500/20 text-yellow-400">
                    {product.pending_verification_count}
                  </span>
                ) : (
                  <span className="text-xs sm:text-sm text-pg-text-muted">0</span>
                )}
              </td>
              <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                {product.active_count > 0 ? (
                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-500/20 text-red-400">
                    {product.active_count}
                  </span>
                ) : (
                  <span className="text-xs sm:text-sm text-pg-text-muted">0</span>
                )}
              </td>
              <td className="hidden sm:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                <span className="text-sm text-pg-text-muted">{product.resolved_count || 0}</span>
              </td>
              <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                {!product.scan_id ? (
                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-500/20 text-gray-400">
                    <span className="hidden sm:inline">Not Scanned</span>
                    <span className="sm:hidden">None</span>
                  </span>
                ) : product.scan_status === 'running' || product.scan_status === 'pending' ? (
                  <span className="px-2 py-1 inline-flex items-center gap-1.5 text-xs leading-5 font-semibold rounded-full bg-blue-500/20 text-blue-400">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    <span className="hidden sm:inline">Running</span>
                    <span className="sm:hidden">Scan</span>
                  </span>
                ) : product.pending_verification_count > 0 ? (
                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-500/20 text-yellow-400">
                    <span className="hidden sm:inline">Action Required</span>
                    <span className="sm:hidden">Review</span>
                  </span>
                ) : product.active_count > 0 ? (
                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-500/20 text-red-400">
                    <span className="hidden sm:inline">Active Threats</span>
                    <span className="sm:hidden">Active</span>
                  </span>
                ) : (
                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-500/20 text-green-400">
                    <span className="hidden sm:inline">Protected</span>
                    <span className="sm:hidden">OK</span>
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
