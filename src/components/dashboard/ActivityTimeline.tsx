'use client';

import { useState } from 'react';
import { TimelineItem } from '@/components/dashboard/TimelineItem';
import Link from 'next/link';
import type { DashboardData } from '@/types';

const COLLAPSED_COUNT = 5;

interface ActivityTimelineProps {
  events: DashboardData['timeline'];
}

export function ActivityTimeline({ events }: ActivityTimelineProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? events : events.slice(0, COLLAPSED_COUNT);
  const hasMore = events.length > COLLAPSED_COUNT;

  return (
    <div className="p-4 sm:p-5 rounded-xl bg-pg-surface border border-pg-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-pg-text">Recent Activity</h3>
        <Link href="/dashboard/infringements" className="text-xs text-pg-accent hover:underline">
          View all →
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="text-xs text-pg-text-muted py-4 text-center">
          No activity yet. Your scan results, verifications, and takedowns will appear here.
        </p>
      ) : (
        <>
          <div>
            {visible.map((event) => (
              <TimelineItem
                key={event.id}
                type={event.type}
                title={event.title}
                subtitle={event.subtitle}
                timestamp={event.timestamp}
                href={event.href}
              />
            ))}
          </div>

          {hasMore && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full mt-2 py-1.5 text-xs text-pg-accent hover:underline"
            >
              {expanded ? 'Show less' : `Show ${events.length - COLLAPSED_COUNT} more`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
