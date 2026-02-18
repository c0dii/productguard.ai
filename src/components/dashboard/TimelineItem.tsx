import Link from 'next/link';

interface TimelineItemProps {
  type: 'detection' | 'takedown' | 'removal' | 'scan';
  title: string;
  subtitle: string;
  timestamp: string;
  href: string;
}

const TYPE_CONFIG: Record<TimelineItemProps['type'], { dot: string; textClass: string }> = {
  detection: { dot: 'bg-yellow-500', textClass: 'text-yellow-400' },
  takedown: { dot: 'bg-blue-500', textClass: 'text-blue-400' },
  removal: { dot: 'bg-green-500', textClass: 'text-green-400' },
  scan: { dot: 'bg-pg-accent', textClass: 'text-pg-accent' },
};

export function TimelineItem({ type, title, subtitle, timestamp, href }: TimelineItemProps) {
  const config = TYPE_CONFIG[type];

  return (
    <Link href={href} className="flex items-center gap-2.5 py-1.5 px-2 -mx-2 rounded-md hover:bg-pg-bg transition-colors group">
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
      <span className={`text-xs font-medium shrink-0 ${config.textClass} group-hover:underline`}>{title}</span>
      <span className="text-xs text-pg-text-muted truncate">{subtitle}</span>
      <span className="text-[10px] text-pg-text-muted opacity-60 shrink-0 ml-auto">{formatTimeAgo(timestamp)}</span>
    </Link>
  );
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
