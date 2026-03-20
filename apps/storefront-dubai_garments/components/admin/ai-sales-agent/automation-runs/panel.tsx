'use client';

import { useState } from 'react';
import { Card, CardText, CardTitle } from '@/components/ui';
import {
  getAutomationRunDetails,
  runSmartRoutingSla,
} from '@/features/admin/ai-sales-agent/api';
import type {
  AutomationRunDetailEnvelope,
  SmartRoutingSlaEnvelope,
} from '@/features/admin/ai-sales-agent/types';
import AutomationRunQueryCard from '@/components/admin/ai-sales-agent/automation-runs/automation-run-query-card';
import SmartRoutingQueryCard from '@/components/admin/ai-sales-agent/automation-runs/smart-routing-query-card';
import AutomationRunResultsCard from '@/components/admin/ai-sales-agent/automation-runs/automation-run-results-card';
import SmartRoutingResultCard from '@/components/admin/ai-sales-agent/automation-runs/smart-routing-result-card';
import AutomationRunTimeline from '@/components/admin/ai-sales-agent/automation-runs/automation-run-timeline';
import FailureDrilldownCard from '@/components/admin/ai-sales-agent/automation-runs/failure-drilldown-card';
import TemplateLibraryCard from '@/components/admin/ai-sales-agent/automation-runs/template-library-card';

export default function AutomationRunsPanel() {
  const [page, setPage] = useState(1);
  const [workflowName, setWorkflowName] = useState('');
  const [status, setStatus] = useState<'success' | 'failed' | 'pending' | ''>('');
  const [dryRun, setDryRun] = useState(true);
  const [leadId, setLeadId] = useState('');
  const [dealId, setDealId] = useState('');
  const [loading, setLoading] = useState(false);
  const [runsResponse, setRunsResponse] = useState<AutomationRunDetailEnvelope | null>(null);
  const [routingResponse, setRoutingResponse] = useState<SmartRoutingSlaEnvelope | null>(null);
  const [error, setError] = useState<string | null>(null);
  const totalPages = runsResponse ? Math.max(1, Math.ceil(runsResponse.total / runsResponse.pageSize)) : 1;

  async function loadRuns(nextPage = page) {
    try {
      setError(null);
      setLoading(true);

      const result = await getAutomationRunDetails({
        page: nextPage,
        pageSize: 10,
        workflowName: workflowName.trim() || undefined,
        status: status || undefined,
      });

      setRunsResponse(result);
      setPage(nextPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load automation runs.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRoutingCheck() {
    try {
      setError(null);
      setLoading(true);

      const result = await runSmartRoutingSla({
        leadId: leadId.trim() || undefined,
        dealId: dealId.trim() || undefined,
        dry_run: dryRun,
      });

      setRoutingResponse(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run smart routing + SLA.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pins-scope arscope arscope-stack" data-testid="automation-runs-panel">
      <div className="arscope-query-grid">
        <AutomationRunQueryCard
          workflowName={workflowName}
          status={status}
          loading={loading}
          onWorkflowNameChange={setWorkflowName}
          onStatusChange={setStatus}
          onLoadRuns={() => loadRuns(1)}
        />
        <SmartRoutingQueryCard
          leadId={leadId}
          dealId={dealId}
          dryRun={dryRun}
          loading={loading}
          onLeadIdChange={setLeadId}
          onDealIdChange={setDealId}
          onDryRunChange={setDryRun}
          onRunRouting={handleRoutingCheck}
        />
      </div>

      {error ? (
        <Card className="pins-card pins-card-error">
          <CardTitle>Automation Error</CardTitle>
          <CardText>{error}</CardText>
        </Card>
      ) : null}

      {runsResponse?.ok ? (
        <AutomationRunResultsCard
          response={runsResponse}
          page={page}
          totalPages={totalPages}
          loading={loading}
          onPrev={() => loadRuns(Math.max(1, page - 1))}
          onNext={() => loadRuns(page + 1)}
        />
      ) : null}

        {runsResponse?.ok ? (
            <AutomationRunTimeline items={runsResponse.items} />
            ) : null}
            {runsResponse?.ok ? (
            <FailureDrilldownCard items={runsResponse.items} />
            ) : null}
            {runsResponse?.ok ? (
            <TemplateLibraryCard />
        ) : null}

      {routingResponse?.ok ? (
        <SmartRoutingResultCard response={routingResponse} />
      ) : null}
    </div>
  );
}
