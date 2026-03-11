'use client';

import Link from 'next/link';
import { useState } from 'react';
import AdminPageHeader from '@/components/admin/common/page-header';
import AdminShell from '@/components/admin/admin-shell';
import { ActivityType, useActivities } from '@/features/admin/activities';
import { formatDateTime, titleCase } from '@/features/admin/shared/view-format';

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
  const activities = data?.items ?? [];

  return (
    <AdminShell>
      <section className="dg-admin-page">
        <AdminPageHeader
          title="Activity Log System"
          subtitle="Track system-generated actions across leads, deals, quotes, follow-ups, and customer communication."
          actions={
            <>
              <Link href="/admin/dashboard" className="dg-btn-secondary">
                Dashboard
              </Link>
              <Link href="/admin/automations" className="dg-btn-secondary">
                Automations
              </Link>
            </>
          }
        />
      </section>

      <section className="dg-admin-page">
        <article className="dg-card dg-panel">
          <div className="dg-admin-head">
            <div>
              <h2 className="dg-title-sm">Event Stream</h2>
              <p className="dg-muted-sm">Latest actions recorded automatically by the system.</p>
            </div>
            <select
              className="dg-select dg-select-md"
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

          {isLoading && <p className="dg-muted-sm">Loading activities...</p>}
          {isError && (
            <p className="dg-alert-error">
              {error instanceof Error ? error.message : 'Failed to load activities.'}
            </p>
          )}

          {!isLoading && !isError && (
            <div className="dg-list">
              {activities.map((activity) => (
                <article key={activity.id} className="dg-list-row">
                  <div className="dg-list-main">
                    <p className="dg-list-title">{activity.title}</p>
                    <p className="dg-list-meta">{titleCase(activity.activity_type)}</p>
                    {activity.details ? <p className="dg-muted-sm">{activity.details}</p> : null}
                    <div className="dg-pill-stack">
                      {activity.lead_id && <span className="dg-status-pill">Lead: {activity.lead_id}</span>}
                      {activity.deal_id && <span className="dg-status-pill">Deal: {activity.deal_id}</span>}
                      {activity.quote_id && <span className="dg-status-pill">Quote: {activity.quote_id}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div>
                      <span className="dg-badge">{formatDateTime(activity.created_at)}</span>
                    </div>
                  </div>
                </article>
              ))}
              {activities.length === 0 && <p className="dg-muted-sm">No activity records found.</p>}
            </div>
          )}
        </article>
      </section>
    </AdminShell>
  );
}
