'use client';

import Link from 'next/link';
import AdminShell from '@/components/admin/admin-shell';
import AdminPageHeader from '@/components/admin/common/page-header';
import { PageShell, Panel, Toolbar } from '@/components/ui';
import AiSalesAgentTabShell from '@/components/admin/ai-sales-agent/tab-shell';

export default function AdminAiSalesAgentPage() {
  return (
    <AdminShell>
      <PageShell>
        <AdminPageHeader
          title="Ai Sales Agent"
          subtitle="Visible AI workspace for lead intelligence, guided responses, quote copilots, and lead-to-close agent flow."
          actions={
            <Toolbar>
                <Link key="leads" href="/admin/leads" className="dg-btn dg-btn-secondary">
                  Open Leads
                </Link>
                <Link key="automations" href="/admin/automations" className="dg-btn dg-btn-secondary">
                  Automation Runs
                </Link>
                <Link key="ai-logs" href="/admin/ai-logs" className="dg-btn dg-btn-primary">
                  AI Logs
                </Link>
            </Toolbar>
          }
        />

        <AiSalesAgentTabShell />

        <div className="dg-grid dg-grid-cols-3 dg-gap-6">
          <Panel>
            <h3 className="dg-panel-title">Today’s Objective</h3>
            <p className="dg-muted">
              Expose the AI layer as a first-class sales experience instead of keeping it hidden behind admin flows.
            </p>
          </Panel>

          <Panel>
            <h3 className="dg-panel-title">Primary Day 1 Outcome</h3>
            <p className="dg-muted">
              Route, sidebar entry, tab navigation, and guard rules are all wired and ready for feature implementation.
            </p>
          </Panel>

          <Panel>
            <h3 className="dg-panel-title">Next Build Focus</h3>
            <p className="dg-muted">
              Lead Intelligence, Reply Studio, Quote Copilot, Pipeline Insights, Agent Flow, and Automation Runs.
            </p>
          </Panel>
        </div>
      </PageShell>
    </AdminShell>
  );
}