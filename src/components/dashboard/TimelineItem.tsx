interface TimelineItemProps {
  type: 'detection' | 'takedown' | 'removal' | 'scan';
  title: string;
  subtitle: string;
  timestamp: string;
  isLast?: boolean;
}

const TYPE_CONFIG: Record<TimelineItemProps['type'], { icon: string; dotClass: string; textClass: string }> = {
  detection: {
    icon: '!',
    dotClass: 'bg-yellow-500/20 border-yellow-500/50',
    textClass: 'text-yellow-400',
  },
  takedown: {
    icon: '\u2709',
    dotClass: 'bg-blue-500/20 border-blue-500/50',
    textClass: 'text-blue-400',
  },
  removal: {
    icon: '\u2713',
    dotClass: 'bg-green-500/20 border-green-500/50',
    textClass: 'text-green-400',
  },
  scan: {
    icon: '\u21BB',
    dotClass: 'bg-pg-accent/20 border-pg-accent/50',
    textClass: 'text-pg-accent',
  },
};

export function TimelineItem({ type, title, subtitle, timestamp, isLast }: TimelineItemProps) {
  const config = TYPE_CONFIG[type];

  return (
    <div className="relative flex gap-3">
      {/* Connector line */}
      {!isLast && (
        <div className="absolute left-[11px] top-6 bottom-0 w-px bg-pg-border" />
      )}

      {/* Dot */}
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 z-10 border ${config.dotClass}`}>
        <span className={config.textClass}>{config.icon}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-4">
        <p className={`text-sm font-medium ${config.textClass}`}>{title}</p>
        <p className="text-xs text-pg-text-muted truncate mt-0.5">{subtitle}</p>
        <p className="text-[10px] text-pg-text-muted mt-0.5 opacity-60">{formatTimeAgo(timestamp)}</p>
      </div>
    </div>
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
