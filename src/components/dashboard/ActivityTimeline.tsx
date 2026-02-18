import { TimelineItem } from '@/components/dashboard/TimelineItem';
import Link from 'next/link';
import type { DashboardData } from '@/types';

interface ActivityTimelineProps {
  events: DashboardData['timeline'];
}

export function ActivityTimeline({ events }: ActivityTimelineProps) {
  return (
    <div className="p-5 rounded-xl bg-pg-surface border border-pg-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-pg-text">Recent Activity</h3>
        <Link href="/dashboard/infringements" className="text-xs text-pg-accent hover:underline">
          View all →
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-pg-text-muted">No activity yet</p>
          <p className="text-xs text-pg-text-muted mt-1">
            Activity will appear here as scans run and threats are resolved.
          </p>
        </div>
      ) : (
        <div>
          {events.map((event, i) => (
            <TimelineItem
              key={event.id}
              type={event.type}
              title={event.title}
              subtitle={event.subtitle}
              timestamp={event.timestamp}
              isLast={i === events.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
