'use client';

import { StatusBadge } from '@/components/ui';
import { formatDateTime, titleCase } from '@/features/admin/shared/view-format';

export type RecordTimelineEvent = {
  id: string;
  occurredAt: string;
  title: string;
  details?: string | null;
  type: string;
  meta?: string | null;
};

type RecordTimelineProps = {
  title?: string;
  events: RecordTimelineEvent[];
  emptyText?: string;
  isLoading?: boolean;
  errorText?: string | null;
};

function statusFromType(type: string): 'info' | 'warning' | 'success' | 'danger' | 'neutral' {
  const normalized = type.toLowerCase();
  if (normalized.includes('fail') || normalized.includes('error') || normalized.includes('lost')) return 'danger';
  if (normalized.includes('won') || normalized.includes('approved') || normalized.includes('success')) return 'success';
  if (normalized.includes('quote') || normalized.includes('qualified') || normalized.includes('negotiation')) return 'warning';
  if (normalized.includes('email') || normalized.includes('created') || normalized.includes('updated')) return 'info';
  return 'neutral';
}

export default function RecordTimeline({
  title = 'Timeline',
  events,
  emptyText = 'No timeline events yet.',
  isLoading = false,
  errorText = null,
}: RecordTimelineProps) {
  const sortedEvents = [...events].sort((a, b) => {
    return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
  });

  return (
    <div className="dg-card">
      <h2 className="dg-title-sm">{title}</h2>
      {isLoading ? (
        <p className="dg-muted-sm">Loading timeline...</p>
      ) : errorText ? (
        <p className="dg-alert-error">{errorText}</p>
      ) : sortedEvents.length > 0 ? (
        <div className="dg-list dg-list-density-compact">
          {sortedEvents.map((event) => (
            <div key={event.id} className="dg-list-row">
              <div className="dg-list-main">
                <div className="dg-form-row">
                  <p className="dg-list-title">{event.title}</p>
                  <StatusBadge status={statusFromType(event.type)}>{titleCase(event.type)}</StatusBadge>
                </div>
                <p className="dg-list-meta">{formatDateTime(event.occurredAt)}</p>
                {event.meta ? <p className="dg-list-meta">{event.meta}</p> : null}
                {event.details ? <p className="dg-list-meta">{event.details}</p> : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="dg-muted-sm">{emptyText}</p>
      )}
    </div>
  );
}
