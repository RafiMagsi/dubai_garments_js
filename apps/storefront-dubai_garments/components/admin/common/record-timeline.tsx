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

const SYNTHETIC_ID_PREFIX = 'system:';
const CANONICAL_OVERLAP_WINDOW_MS = 5 * 60 * 1000;
const DUPLICATE_WINDOW_MS = 30 * 1000;

function isSyntheticEvent(event: RecordTimelineEvent) {
  return event.id.startsWith(SYNTHETIC_ID_PREFIX);
}

function toTimestamp(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeText(value?: string | null) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function timelineTypeFamily(type: string) {
  const normalized = type.toLowerCase();
  if (normalized.includes('lead_created')) return 'lead_created';
  if (normalized.includes('lead_updated') || normalized.includes('lead_status_changed')) return 'lead_updated';
  if (normalized.includes('deal_created')) return 'deal_created';
  if (normalized.includes('deal_updated') || normalized.includes('deal_stage_changed')) return 'deal_updated';
  if (normalized.includes('quote_created')) return 'quote_created';
  if (normalized.includes('quote_updated') || normalized.includes('quote_status_changed')) return 'quote_updated';
  if (normalized.includes('email_sent')) return 'email_sent';
  return normalized;
}

function dedupKey(event: RecordTimelineEvent) {
  return [timelineTypeFamily(event.type), normalizeText(event.title), normalizeText(event.details)].join('|');
}

function dedupeEvents(events: RecordTimelineEvent[]) {
  const sorted = [...events].sort((a, b) => toTimestamp(b.occurredAt) - toTimestamp(a.occurredAt));

  const canonical = sorted.filter((event) => !isSyntheticEvent(event));
  const synthetic = sorted.filter((event) => isSyntheticEvent(event));

  const canonicalDeduped: RecordTimelineEvent[] = [];
  for (const event of canonical) {
    const existing = canonicalDeduped.find((item) => {
      if (dedupKey(item) !== dedupKey(event)) return false;
      return Math.abs(toTimestamp(item.occurredAt) - toTimestamp(event.occurredAt)) <= DUPLICATE_WINDOW_MS;
    });
    if (!existing) canonicalDeduped.push(event);
  }

  const syntheticDeduped: RecordTimelineEvent[] = [];
  for (const event of synthetic) {
    const hasCanonicalOverlap = canonicalDeduped.some((item) => {
      if (timelineTypeFamily(item.type) !== timelineTypeFamily(event.type)) return false;
      return Math.abs(toTimestamp(item.occurredAt) - toTimestamp(event.occurredAt)) <= CANONICAL_OVERLAP_WINDOW_MS;
    });
    if (hasCanonicalOverlap) continue;

    const existingSynthetic = syntheticDeduped.find((item) => {
      if (dedupKey(item) !== dedupKey(event)) return false;
      return Math.abs(toTimestamp(item.occurredAt) - toTimestamp(event.occurredAt)) <= DUPLICATE_WINDOW_MS;
    });
    if (!existingSynthetic) syntheticDeduped.push(event);
  }

  return [...canonicalDeduped, ...syntheticDeduped].sort(
    (a, b) => toTimestamp(b.occurredAt) - toTimestamp(a.occurredAt)
  );
}

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
  const sortedEvents = dedupeEvents(events);

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
