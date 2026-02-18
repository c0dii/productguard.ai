import Link from 'next/link';

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  href: string;
  trend?: number;
  trendLabel?: string;
}

export function StatCard({ label, value, icon, color, href, trend, trendLabel }: StatCardProps) {
  const trendUp = trend !== undefined && trend > 0;
  const trendDown = trend !== undefined && trend < 0;

  return (
    <Link href={href}>
      <div className="group relative p-4 sm:p-5 rounded-xl bg-pg-surface border border-pg-border hover:bg-pg-surface-light hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 cursor-pointer h-full">
        <div className="flex items-start justify-between mb-2">
          <div className={`text-2xl ${color}`}>{icon}</div>
          {trend !== undefined && trend !== 0 && (
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
              trendUp ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
            }`}>
              {trendUp ? '+' : ''}{trend}
            </span>
          )}
        </div>
        <p className="text-2xl sm:text-3xl font-bold text-pg-text mb-1">{value}</p>
        <p className="text-xs text-pg-text-muted uppercase tracking-wide">{label}</p>
        {trendLabel && (
          <p className="text-[10px] text-pg-text-muted mt-1">{trendLabel}</p>
        )}
      </div>
    </Link>
  );
}
