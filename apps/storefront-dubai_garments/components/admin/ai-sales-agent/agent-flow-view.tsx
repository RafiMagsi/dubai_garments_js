'use client';

import { useMemo, useState } from 'react';
import { Button, Card, CardText, CardTitle, TextField } from '@/components/ui';
import { getAgentFlow } from '@/features/admin/ai-sales-agent/api';
import type { AgentFlowResponse } from '@/features/admin/ai-sales-agent/types';

type AgentFlowViewProps = {
  showHeader?: boolean;
};

function toTitle(value: string) {
  return value
    .split('_')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');
}

function stageMeterPercent(status: string) {
  if (status === 'completed') return 100;
  if (status === 'active') return 62;
  if (status === 'blocked') return 28;
  return 14;
}

export default function AgentFlowView({ showHeader = true }: AgentFlowViewProps) {
  const [leadId, setLeadId] = useState('');
  const [dealId, setDealId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flow, setFlow] = useState<AgentFlowResponse | null>(null);

  async function handleLoadFlow() {
    try {
      setError(null);
      setLoading(true);

      const result = await getAgentFlow({
        leadId: leadId.trim() || undefined,
        dealId: dealId.trim() || undefined,
      });

      setFlow(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agent flow.');
      setFlow(null);
    } finally {
      setLoading(false);
    }
  }

  const completedCount = flow?.stages.filter((stage) => stage.status === 'completed').length ?? 0;
  const activeStage = flow?.stages.find((stage) => stage.status === 'active') ?? null;
  const pendingCount = flow?.stages.filter((stage) => stage.status === 'pending').length ?? 0;
  const blockedCount = flow?.stages.filter((stage) => stage.status === 'blocked').length ?? 0;

  const flowHealth = useMemo(() => {
    if (!flow) return { label: 'Not loaded', cls: 'dg-ai-badge-slate' };
    if (blockedCount > 0) return { label: 'Attention', cls: 'dg-ai-badge-red' };
    if (pendingCount > 0) return { label: 'In Progress', cls: 'dg-ai-badge-amber' };
    return { label: 'Healthy', cls: 'dg-ai-badge-green' };
  }, [flow, blockedCount, pendingCount]);

  const completionPercent = flow?.completionPercent ?? 0;

  return (
    <div className="aflow-stack">
      <Card className={`aflow-shell ${showHeader ? '' : 'aflow-shell-embedded'}`.trim()}>
        {showHeader ? (
          <>
            <div className="aflow-header">
              <CardTitle>Lead-to-Close Agent Flow</CardTitle>
              {flow ? <span className="dg-ai-badge dg-ai-badge-violet">Completion {completionPercent}%</span> : null}
            </div>
            <CardText>Query lead/deal context and map its AI execution journey end-to-end.</CardText>
          </>
        ) : (
          <div className="aflow-header aflow-embedded-head">
            <p className="aflow-kicker">AI Flow Query</p>
            {flow ? <span className="dg-ai-badge dg-ai-badge-violet">Completion {completionPercent}%</span> : null}
          </div>
        )}

        <div className="aflow-query-grid">
          <div>
            <label className="dg-text-xs dg-font-semibold dg-uppercase dg-tracking-wide dg-text-neutral-500">Lead ID</label>
            <TextField
              value={leadId}
              onChange={(event) => setLeadId(event.target.value)}
              placeholder="Optional lead ID"
              className="dg-mt-1"
            />
          </div>

          <div>
            <label className="dg-text-xs dg-font-semibold dg-uppercase dg-tracking-wide dg-text-neutral-500">Deal ID</label>
            <TextField
              value={dealId}
              onChange={(event) => setDealId(event.target.value)}
              placeholder="Optional deal ID"
              className="dg-mt-1"
            />
          </div>

          <div className="aflow-query-action">
            <Button type="button" onClick={handleLoadFlow} disabled={loading}>
              {loading ? 'Loading...' : 'Run Agent Flow'}
            </Button>
            <p className="dg-text-xs dg-text-neutral-500">Enter Lead ID, Deal ID, or both.</p>
          </div>
        </div>
      </Card>

      {error ? (
        <Card className="aflow-error-card">
          <CardTitle>Flow Error</CardTitle>
          <CardText>{error}</CardText>
        </Card>
      ) : null}

      {flow ? (
        <>
          <Card className="aflow-hero-card dg-ai-intel-hero">
            <div className="dg-ai-intel-hero-body">
              <div className="dg-ai-intel-header">
                <div className="dg-ai-intel-title">
                  <p className="aflow-kicker">AI Flow Intelligence</p>
                  <h3 className="aflow-decision-title">{activeStage ? activeStage.label : 'Flow Snapshot'}</h3>
                  <p className="aflow-decision-subtitle">{activeStage ? activeStage.description : flow.summary}</p>
                </div>

                <div className="dg-ai-intel-chip-row dg-ai-intel-meta-right">
                  <span className={`dg-ai-badge ${flowHealth.cls}`}>{flowHealth.label}</span>
                  <span className="dg-ai-badge dg-ai-badge-blue">Active {activeStage ? toTitle(activeStage.key) : 'n/a'}</span>
                  <span className="dg-ai-badge dg-ai-badge-slate">Lead {flow.leadId ? 'Linked' : 'N/A'}</span>
                  <span className="dg-ai-badge dg-ai-badge-slate">Deal {flow.dealId ? 'Linked' : 'N/A'}</span>
                </div>
              </div>

              <div className="aflow-progress-wrap">
                <div className="dg-ai-intel-progress-track">
                  <div className="dg-ai-intel-progress-fill is-good" style={{ width: `${completionPercent}%` }} />
                </div>
              </div>

              <div className="aflow-trend-grid">
                <div className="aflow-trend-chip is-good">
                  <span className="aflow-trend-label">Completed</span>
                  <span className="aflow-trend-value">{completedCount}/{flow.stages.length}</span>
                </div>
                <div className="aflow-trend-chip is-info">
                  <span className="aflow-trend-label">Pending</span>
                  <span className="aflow-trend-value">{pendingCount}</span>
                </div>
                <div className="aflow-trend-chip is-warn">
                  <span className="aflow-trend-label">Blocked</span>
                  <span className="aflow-trend-value">{blockedCount}</span>
                </div>
                <div className="aflow-trend-chip is-cold">
                  <span className="aflow-trend-label">Active Stage</span>
                  <span className="aflow-trend-value">{activeStage ? `Step ${activeStage.order}` : 'None'}</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="aflow-track-card">
            <div className="aflow-track aflow-track-matrix">
              {flow.stages.map((stage) => (
                <article key={stage.key} className={`aflow-stage is-${stage.status}`}>
                  <div className="aflow-stage-top">
                    <span className="aflow-stage-step">Step {stage.order}</span>
                    <span className={`aflow-stage-status is-${stage.status}`}>{toTitle(stage.status)}</span>
                  </div>
                  <div className="aflow-stage-node">
                    <span className={`aflow-stage-dot is-${stage.status}`} aria-hidden="true" />
                    <p className="aflow-stage-key">{toTitle(stage.key)}</p>
                  </div>
                  <h4 className="aflow-stage-title">{stage.label}</h4>
                  <p className="aflow-stage-text">{stage.description}</p>
                  <div className="aflow-stage-meter">
                    <span className={`aflow-stage-meter-fill is-${stage.status}`} style={{ width: `${stageMeterPercent(stage.status)}%` }} />
                  </div>
                  {stage.evidence[0] ? (
                    <p className="aflow-stage-evidence">{stage.evidence[0]}</p>
                  ) : (
                    <p className="aflow-stage-evidence is-muted">Waiting for evidence</p>
                  )}
                </article>
              ))}
            </div>
          </Card>

          {activeStage ? (
            <Card className="aflow-active-card">
              <div className="aflow-active-head">
                <div>
                  <p className="aflow-kicker">Execution Evidence</p>
                  <CardTitle>{activeStage.label}</CardTitle>
                </div>
                <span className="dg-ai-badge dg-ai-badge-blue">{toTitle(activeStage.key)}</span>
              </div>
              <CardText>{activeStage.description}</CardText>
              <div className="aflow-evidence-list">
                {(activeStage.evidence.length > 0 ? activeStage.evidence : ['No evidence found for this stage yet.']).map((item, index) => (
                  <div className="aflow-evidence-item" key={`${activeStage.key}-evidence-${index}`}>
                    {item}
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
