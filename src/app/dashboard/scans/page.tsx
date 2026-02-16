import { createClient } from '@/lib/supabase/server';
import ScansTable from './ScansTable';

export default async function ScansPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: scans } = await supabase
    .from('scans')
    .select('*, products(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Calculate verified revenue loss for each scan
  const scansWithVerifiedLoss = await Promise.all(
    (scans || []).map(async (scan) => {
      // Get sum of est_revenue_loss from VERIFIED infringements only
      const { data: verifiedInfringements } = await supabase
        .from('infringements')
        .select('est_revenue_loss')
        .eq('scan_id', scan.id)
        .in('status', ['active', 'takedown_sent', 'disputed', 'removed']);

      const verifiedRevenueLoss =
        verifiedInfringements?.reduce((sum, inf) => sum + (inf.est_revenue_loss || 0), 0) || 0;

      return {
        ...scan,
        est_revenue_loss: verifiedRevenueLoss, // Override with verified-only loss
      };
    })
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-pg-text">Scan History</h1>
        <p className="text-sm sm:text-base text-pg-text-muted">View all your piracy scans</p>
      </div>

      {/* Scans Table */}
      {!scansWithVerifiedLoss || scansWithVerifiedLoss.length === 0 ? (
        <div className="p-12 rounded-2xl bg-pg-surface backdrop-blur-sm border border-pg-border">
          <div className="text-center">
            <p className="text-xl font-semibold mb-2 text-pg-text">No scans yet</p>
            <p className="text-pg-text-muted">
              Add a product and run your first scan to start monitoring for piracy
            </p>
          </div>
        </div>
      ) : (
        <ScansTable scans={scansWithVerifiedLoss} />
      )}
    </div>
  );
}
