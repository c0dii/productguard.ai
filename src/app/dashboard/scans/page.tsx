import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import ProductStatusTable from './ProductStatusTable';
import type { ProductScanStatus } from '@/types';

export default async function MonitoringDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch product scan statuses from the view we created
  const { data: productStatuses } = await supabase
    .from('product_scan_status')
    .select('*')
    .order('last_run_at', { ascending: false });

  // Calculate overview metrics
  const totalProducts = productStatuses?.length || 0;
  const productsWithScans = productStatuses?.filter((p) => p.scan_id !== null).length || 0;

  // Scans in last 24 hours
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const scansLast24h = productStatuses?.filter((p) => {
    if (!p.last_run_at) return false;
    return new Date(p.last_run_at) > yesterday;
  }).length || 0;

  const totalPending = productStatuses?.reduce((sum, p) => sum + (p.pending_verification_count || 0), 0) || 0;
  const totalActive = productStatuses?.reduce((sum, p) => sum + (p.active_count || 0), 0) || 0;
  const totalThreats = totalPending + totalActive;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-pg-text">Monitoring Dashboard</h1>
        <p className="text-sm sm:text-base text-pg-text-muted">
          Overview of all product monitoring and threat detection
        </p>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {/* Products Monitored */}
        <div className="p-3 sm:p-6 rounded-lg bg-pg-surface border border-pg-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-sm text-pg-text-muted">Products Monitored</p>
              <p className="text-xl sm:text-3xl font-bold text-pg-text mt-1">{productsWithScans}</p>
              <p className="text-[10px] sm:text-xs text-pg-text-muted mt-1">of {totalProducts} total</p>
            </div>
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 sm:w-6 sm:h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Scans Last 24h */}
        <div className="p-3 sm:p-6 rounded-lg bg-pg-surface border border-pg-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-sm text-pg-text-muted">Scans (24h)</p>
              <p className="text-xl sm:text-3xl font-bold text-pg-text mt-1">{scansLast24h}</p>
              <p className="text-[10px] sm:text-xs text-pg-text-muted mt-1">completed</p>
            </div>
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 sm:w-6 sm:h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Threats */}
        <div className="p-3 sm:p-6 rounded-lg bg-pg-surface border border-pg-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-sm text-pg-text-muted">Total Threats</p>
              <p className="text-xl sm:text-3xl font-bold text-red-400 mt-1">{totalThreats}</p>
              <p className="text-[10px] sm:text-xs text-pg-text-muted mt-1">{totalActive} active</p>
            </div>
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 sm:w-6 sm:h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Pending Review */}
        <div className="p-3 sm:p-6 rounded-lg bg-pg-surface border border-pg-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-sm text-pg-text-muted">Pending Review</p>
              <p className="text-xl sm:text-3xl font-bold text-yellow-400 mt-1">{totalPending}</p>
              <p className="text-[10px] sm:text-xs text-pg-text-muted mt-1">need verification</p>
            </div>
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Product Status Table */}
      <div className="bg-pg-surface border border-pg-border rounded-lg overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-pg-border">
          <h2 className="text-base sm:text-lg font-semibold text-pg-text">Product Status</h2>
          <p className="text-xs sm:text-sm text-pg-text-muted mt-1">Click a product to view details and manage threats</p>
        </div>

        {!productStatuses || productStatuses.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <p className="text-lg sm:text-xl font-semibold mb-2 text-pg-text">No products yet</p>
            <p className="text-sm text-pg-text-muted mb-4">Add a product to start monitoring for piracy</p>
            <Link
              href="/dashboard/products"
              className="inline-block px-6 py-3 bg-pg-accent text-pg-bg font-semibold rounded-md hover:bg-pg-accent-dark transition-colors"
            >
              Add Product
            </Link>
          </div>
        ) : (
          <ProductStatusTable productStatuses={productStatuses} />
        )}
      </div>
    </div>
  );
}
