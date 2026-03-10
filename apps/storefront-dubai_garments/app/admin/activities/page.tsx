'use client';

import { useState } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import { Card } from '@/components/ui';
import { ActivityType, useActivities } from '@/features/admin/activities';

const activityOptions: Array<{ label: string; value: ActivityType | 'all' }> = [
  { label: 'All Activities', value: 'all' },
  { label: 'Lead Created', value: 'lead_created' },
  { label: 'Lead Updated', value: 'lead_updated' },
  { label: 'Lead Status Changed', value: 'lead_status_changed' },
  { label: 'AI Processed Lead', value: 'ai_processed_lead' },
  { label: 'Quote Generated', value: 'quote_generated' },
  { label: 'Email Sent', value: 'email_sent' },
  { label: 'Follow-up Triggered', value: 'followup_triggered' },
  { label: 'Customer Replied', value: 'customer_replied' },
  { label: 'Deal Created', value: 'deal_created' },
  { label: 'Deal Stage Changed', value: 'deal_stage_changed' },
];

export default function AdminActivitiesPage() {
  const [activityType, setActivityType] = useState<ActivityType | 'all'>('all');
  const { data, isLoading, isError, error } = useActivities({ activity_type: activityType });

  return (
    <AdminShell>
      <Card>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Activity Log System</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Track system-generated actions across leads, deals, quotes, follow-ups, and customer communication.
        </p>
      </Card>

      <section>
        <Card className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-text)]">Event Stream</h2>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                Latest actions recorded automatically by the system.
              </p>
            </div>
            <select
              className="ui-field max-w-56"
              value={activityType}
              onChange={(event) => setActivityType(event.target.value as ActivityType | 'all')}
            >
              {activityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {isLoading && <p className="text-sm text-[var(--color-text-muted)]">Loading activities...</p>}
          {isError && (
            <p className="text-sm text-[var(--color-danger-text)]">
              {error instanceof Error ? error.message : 'Failed to load activities.'}
            </p>
          )}

          {!isLoading && !isError && (
            <div className="grid gap-3">
              {data?.items.map((activity) => (
                <div
                  key={activity.id}
                  className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text)]">{activity.title}</p>
                      <p className="text-xs uppercase tracking-[0.06em] text-[var(--color-ink-500)]">
                        {activity.activity_type}
                      </p>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {new Date(activity.created_at).toLocaleString()}
                    </p>
                  </div>
                  {activity.details && (
                    <p className="mt-2 text-sm text-[var(--color-text-muted)]">{activity.details}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[var(--color-ink-500)]">
                    {activity.lead_id && <span>Lead: {activity.lead_id}</span>}
                    {activity.deal_id && <span>Deal: {activity.deal_id}</span>}
                    {activity.quote_id && <span>Quote: {activity.quote_id}</span>}
                  </div>
                </div>
              ))}
              {data?.items.length === 0 && (
                <p className="text-sm text-[var(--color-text-muted)]">No activity records found.</p>
              )}
            </div>
          )}
        </Card>
      </section>
    </AdminShell>
  );
}
