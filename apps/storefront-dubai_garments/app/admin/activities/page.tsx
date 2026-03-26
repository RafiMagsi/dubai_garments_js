'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/common/page-header';
import AdminShell from '@/components/admin/admin-shell';
import { PageShell, Panel, Toolbar } from '@/components/ui';
import { ActivityType, useActivities, useRelatedActivities } from '@/features/admin/activities';
import { useLeadById } from '@/features/admin/leads';
import { useDealById } from '@/features/admin/deals';
import { useQuoteById } from '@/features/admin/quotes';
import { formatDateTime, shortCode, titleCase } from '@/features/admin/shared/view-format';

const activityOptions: Array<{ label: string; value: ActivityType | 'all' }> = [
  { label: 'All Activities', value: 'all' },
  { label: 'Lead Created', value: 'lead_created' },
  { label: 'Lead Updated', value: 'lead_updated' },
  { label: 'Lead Status Changed', value: 'lead_status_changed' },
  { label: 'AI Processed Lead', value: 'ai_processed_lead' },
  { label: 'AI Lead Triage', value: 'ai_lead_triage' },
  { label: 'AI Copilot Action', value: 'ai_copilot_action' },
  { label: 'AI Intelligence Action', value: 'ai_lead_intelligence_action' },
  { label: 'Quote Generated', value: 'quote_generated' },
  { label: 'Email Sent', value: 'email_sent' },
  { label: 'Follow-up Triggered', value: 'followup_triggered' },
  { label: 'Customer Replied', value: 'customer_replied' },
  { label: 'Deal Created', value: 'deal_created' },
  { label: 'Deal Stage Changed', value: 'deal_stage_changed' },
];

export default function AdminActivitiesPage() {
  const [activityType, setActivityType] = useState<ActivityType | 'all'>('all');
  const searchParams = useSearchParams();
  const leadIdFilter = searchParams.get('lead_id') || '';
  const dealIdFilter = searchParams.get('deal_id') || '';
  const quoteIdFilter = searchParams.get('quote_id') || '';
  const source = searchParams.get('source') || '';
  const hasScopedFilters = Boolean(leadIdFilter || dealIdFilter || quoteIdFilter);
  const fromLeadExecutionBoard = source === 'lead_execution_board';
  const showExecutionSummaryLayout = fromLeadExecutionBoard && hasScopedFilters;

  const scopedActivitiesQuery = useRelatedActivities({
    activity_type: activityType,
    lead_id: leadIdFilter || undefined,
    deal_id: dealIdFilter || undefined,
    quote_id: quoteIdFilter || undefined,
  }, { enabled: hasScopedFilters });
  const globalActivitiesQuery = useActivities({
    activity_type: activityType,
  }, { enabled: !hasScopedFilters });

  const { data, isLoading, isError, error } = hasScopedFilters
    ? scopedActivitiesQuery
    : globalActivitiesQuery;

  const activities = data?.items ?? [];
  const scopeCountLabel = hasScopedFilters ? `${activities.length} related activities` : null;
  const leadQuery = useLeadById(showExecutionSummaryLayout ? leadIdFilter : undefined);
  const dealQuery = useDealById(showExecutionSummaryLayout ? dealIdFilter : undefined);
  const quoteQuery = useQuoteById(showExecutionSummaryLayout ? quoteIdFilter : undefined);

  return (
    <AdminShell>
      <PageShell density="compact">
        <Panel>
          <AdminPageHeader
            title="Activity Log System"
            subtitle="Track system-generated actions across leads, deals, quotes, follow-ups, and customer communication."
            actions={
              <Toolbar>
                <Link href="/admin/dashboard" className="ui-btn ui-btn-secondary ui-btn-md">
                  Dashboard
                </Link>
                <Link href="/admin/automations" className="ui-btn ui-btn-secondary ui-btn-md">
                  Automations
                </Link>
              </Toolbar>
            }
          />
        </Panel>

        <Panel>
          <div className="dg-admin-head">
            <div>
              <h2 className="dg-title-sm">Event Stream</h2>
              <p className="dg-muted-sm">Latest actions recorded automatically by the system.</p>
              {leadIdFilter || dealIdFilter || quoteIdFilter ? (
                <p className="dg-help">
                  Scoped view
                  {leadIdFilter ? ` • Lead: ${shortCode(leadIdFilter)}` : ''}
                  {dealIdFilter ? ` • Deal: ${shortCode(dealIdFilter)}` : ''}
                  {quoteIdFilter ? ` • Quote: ${shortCode(quoteIdFilter)}` : ''}
                  {scopeCountLabel ? ` • ${scopeCountLabel}` : ''}
                </p>
              ) : null}
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

          {!isLoading && !isError && showExecutionSummaryLayout ? (
            <div className="dg-two-col-grid dg-two-col-grid-compact">
              <div className="dg-side-stack">
                <div className="dg-card">
                  <h3 className="dg-title-sm">Execution Summary</h3>
                  <p className="dg-muted-sm">Context links and current state for this lead-to-close chain.</p>
                  <div className="dg-detail-list">
                    <div className="dg-detail-item">
                      <span>Lead</span>
                      <strong>
                        {leadIdFilter ? (
                          <Link href={`/admin/leads/${leadIdFilter}`} className="dg-link-primary">
                            {shortCode(leadIdFilter)}
                          </Link>
                        ) : (
                          '-'
                        )}
                      </strong>
                    </div>
                    <div className="dg-detail-item">
                      <span>Lead Status</span>
                      <strong>{leadQuery.data?.item?.status ? titleCase(leadQuery.data.item.status) : '-'}</strong>
                    </div>
                    <div className="dg-detail-item">
                      <span>Deal</span>
                      <strong>
                        {dealIdFilter ? (
                          <Link href={`/admin/deals/${dealIdFilter}`} className="dg-link-primary">
                            {shortCode(dealIdFilter)}
                          </Link>
                        ) : (
                          '-'
                        )}
                      </strong>
                    </div>
                    <div className="dg-detail-item">
                      <span>Deal Stage</span>
                      <strong>{dealQuery.data?.item?.stage ? titleCase(dealQuery.data.item.stage) : '-'}</strong>
                    </div>
                    <div className="dg-detail-item">
                      <span>Quote</span>
                      <strong>
                        {quoteIdFilter ? (
                          <Link href={`/admin/quotes/${quoteIdFilter}`} className="dg-link-primary">
                            {shortCode(quoteIdFilter)}
                          </Link>
                        ) : (
                          '-'
                        )}
                      </strong>
                    </div>
                    <div className="dg-detail-item">
                      <span>Quote Status</span>
                      <strong>{quoteQuery.data?.item?.status ? titleCase(quoteQuery.data.item.status) : '-'}</strong>
                    </div>
                    <div className="dg-detail-item">
                      <span>Quote Total</span>
                      <strong>
                        {quoteQuery.data?.item
                          ? `${quoteQuery.data.item.currency} ${Number(quoteQuery.data.item.total_amount || 0).toFixed(2)}`
                          : '-'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="dg-side-stack">
                <div className="dg-list">
                  {activities.map((activity) => (
                    <article key={activity.id} className="dg-list-row">
                      <div className="dg-list-main">
                        <p className="dg-list-title">{activity.title}</p>
                        <p className="dg-list-meta">{titleCase(activity.activity_type)}</p>
                        {activity.details ? <p className="dg-muted-sm">{activity.details}</p> : null}
                        <div className="dg-pill-stack">
                          {activity.lead_id ? <span className="dg-status-pill">Lead: {shortCode(activity.lead_id)}</span> : null}
                          {activity.deal_id ? <span className="dg-status-pill">Deal: {shortCode(activity.deal_id)}</span> : null}
                          {activity.quote_id ? <span className="dg-status-pill">Quote: {shortCode(activity.quote_id)}</span> : null}
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
              </div>
            </div>
          ) : null}

          {!isLoading && !isError && !showExecutionSummaryLayout ? (
            <div className="dg-list">
              {activities.map((activity) => (
                <article key={activity.id} className="dg-list-row">
                  <div className="dg-list-main">
                    <p className="dg-list-title">{activity.title}</p>
                    <p className="dg-list-meta">{titleCase(activity.activity_type)}</p>
                    {activity.details ? <p className="dg-muted-sm">{activity.details}</p> : null}
                    <div className="dg-pill-stack">
                      {activity.lead_id ? (
                        <Link href={`/admin/leads/${activity.lead_id}`} className="dg-status-pill">
                          Lead: {shortCode(activity.lead_id)}
                        </Link>
                      ) : null}
                      {activity.deal_id ? (
                        <Link href={`/admin/deals/${activity.deal_id}`} className="dg-status-pill">
                          Deal: {shortCode(activity.deal_id)}
                        </Link>
                      ) : null}
                      {activity.quote_id ? (
                        <Link href={`/admin/quotes/${activity.quote_id}`} className="dg-status-pill">
                          Quote: {shortCode(activity.quote_id)}
                        </Link>
                      ) : null}
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
          ) : null}
        </Panel>
      </PageShell>
    </AdminShell>
  );
}
