'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Card, CardText, CardTitle } from '@/components/ui';
// import { Button, Card, CardText, CardTitle, Panel } from '@/components/ui';
import {
  draftReplyFromLeadIntelligence,
  convertLeadFromIntelligence,
  prioritizeLeadFromIntelligence,
  runLeadTriage,
  writeLeadIntelligenceAudit,
} from '@/features/admin/ai-sales-agent/api';

type LeadAiReasoning = {
  summary?: string;
  intent?: string;
  urgency?: string;
  complexity?: string;
  quantity?: number | null;
  confidence?: number | null;
  score?: number | null;
  classification?: string;
  nextBestAction?: string;
  provider?: string;
  source?: string;
  fallbackUsed?: boolean;
  failureReason?: string | null;
  processedAt?: string;
};

type LeadIntelligenceCardsProps = {
  lead: {
    id: string;
    ai_processed_at?: string | null;
    ai_provider?: string | null;
    ai_fallback_used?: boolean | null;
    ai_score?: number | null;
    ai_classification?: string | null;
    ai_quantity?: number | null;
    ai_urgency?: string | null;
    ai_complexity?: string | null;
    ai_reasoning?: unknown;
  } | null | undefined;
  title?: string;
  compact?: boolean;
};

function parseReasoning(raw: unknown): LeadAiReasoning | null {
  if (!raw) return null;
  if (typeof raw === 'object') return raw as LeadAiReasoning;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as LeadAiReasoning;
    } catch {
      return null;
    }
  }
  return null;
}

function toTitle(value?: string | null) {
  if (!value) return 'Unknown';
  return value
    .split('_')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Not analyzed yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function hoursSince(value?: string | null) {
  if (!value) return null;
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return null;
  return (Date.now() - ts) / (1000 * 60 * 60);
}

function freshnessKind(lastAnalyzed?: string | null) {
  const hours = hoursSince(lastAnalyzed);
  if (hours == null) return { label: 'No analysis', tone: 'slate' as const };
  if (hours <= 24) return { label: 'Fresh', tone: 'green' as const };
  if (hours <= 72) return { label: 'Aging', tone: 'amber' as const };
  return { label: 'Stale', tone: 'red' as const };
}

function classificationKind(value?: string | null) {
  const normalized = (value || '').toLowerCase();
  if (normalized === 'hot') return 'red' as const;
  if (normalized === 'warm') return 'amber' as const;
  if (normalized === 'cold') return 'blue' as const;
  return 'slate' as const;
}

type TrendTone = 'good' | 'warn' | 'cold' | 'info';

function trendToneByScore(score: number | null): TrendTone {
  if (score == null) return 'info';
  if (score >= 75) return 'good';
  if (score >= 55) return 'warn';
  return 'cold';
}

function trendToneByUrgency(value?: string | null): TrendTone {
  const v = (value || '').toLowerCase();
  if (v === 'high') return 'warn';
  if (v === 'medium') return 'info';
  return 'cold';
}

function trendToneByConfidence(confidence: number | null): TrendTone {
  if (confidence == null) return 'cold';
  if (confidence >= 70) return 'good';
  if (confidence >= 45) return 'warn';
  return 'cold';
}

function badgePalette(kind: 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'slate') {
  return {
    blue: { bg: '#eff6ff', fg: '#1d4ed8', border: '#93c5fd' },
    green: { bg: '#ecfdf5', fg: '#047857', border: '#6ee7b7' },
    amber: { bg: '#fff7ed', fg: '#b45309', border: '#fdba74' },
    red: { bg: '#fef2f2', fg: '#b91c1c', border: '#fca5a5' },
    violet: { bg: '#f5f3ff', fg: '#6d28d9', border: '#c4b5fd' },
    slate: { bg: '#f8fafc', fg: '#475569', border: '#cbd5e1' },
  }[kind];
}

function Badge({
  children,
  kind = 'slate',
}: {
  children: React.ReactNode;
  kind?: 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'slate';
}) {
  const toneClass = {
    blue: 'dg-ai-badge-blue',
    green: 'dg-ai-badge-green',
    amber: 'dg-ai-badge-amber',
    red: 'dg-ai-badge-red',
    violet: 'dg-ai-badge-violet',
    slate: 'dg-ai-badge-slate',
  }[kind];
  const palette = badgePalette(kind);
  return (
    <span
      className={`dg-ai-badge ${toneClass}`}
      style={{
        backgroundColor: palette.bg,
        color: palette.fg,
        borderColor: palette.border,
      }}
    >
      {children}
    </span>
  );
}

function SignalTile({
  label,
  value,
  tone,
  compact = false,
}: {
  label: string;
  value: string;
  tone: 'intent' | 'urgency' | 'complexity' | 'quantity' | 'confidence' | 'score';
  compact?: boolean;
}) {
  return (
    <div className={`dg-ai-intel-signal-tile is-${tone}${compact ? ' is-compact' : ''}`}>
      <div className="dg-ai-intel-label">{label}</div>
      <div className="dg-ai-intel-signal-value">{value}</div>
    </div>
  );
}

export default function LeadIntelligenceCards({
  lead,
  title = 'Lead Intelligence',
  compact = false,
}: LeadIntelligenceCardsProps) {
  const [triageBusy, setTriageBusy] = useState(false);
  const [triageStatus, setTriageStatus] = useState<string | null>(null);
  const [triageError, setTriageError] = useState<string | null>(null);
    const [actionBusy, setActionBusy] = useState<null | 'draft' | 'convert' | 'prioritize'>(null);
    const [actionStatus, setActionStatus] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [draftReplyPreview, setDraftReplyPreview] = useState<{
    subject?: string;
    message: string;
    rationale?: string;
    suggestedNextAction?: string;
    } | null>(null);

  if (!lead) return null;
  const leadId = lead.id;

  const reasoning = parseReasoning(lead.ai_reasoning);
  const lastAnalyzed = reasoning?.processedAt || lead.ai_processed_at || null;
  const provider = reasoning?.provider || lead.ai_provider || 'unknown';
  const source = reasoning?.source || 'fallback';
  const fallbackUsed =
    typeof reasoning?.fallbackUsed === 'boolean'
      ? reasoning.fallbackUsed
      : !!lead.ai_fallback_used;

  const classification = lead.ai_classification || reasoning?.classification || 'unknown';
  const summary = reasoning?.summary || 'No persisted AI summary available yet.';
  const nextBestAction =
    reasoning?.nextBestAction ||
    'Run lead triage to persist a recommended next-best action for this lead.';

  const confidenceValue =
    reasoning?.confidence != null ? Math.max(0, Math.min(100, reasoning.confidence)) : null;
  const confidenceLabel = confidenceValue != null ? `${confidenceValue}%` : 'Not available';

  const scoreValue =
    lead.ai_score != null
      ? Math.max(0, Math.min(100, lead.ai_score))
      : reasoning?.score != null
      ? Math.max(0, Math.min(100, reasoning.score))
      : null;
  const scoreLabel = scoreValue != null ? `${scoreValue}/100` : 'Not scored';

  const freshness = freshnessKind(lastAnalyzed);
  const scoreTone = scoreValue != null && scoreValue >= 75 ? 'good' : scoreValue != null && scoreValue >= 55 ? 'warn' : 'cold';
  const confidenceTone = confidenceValue != null && confidenceValue >= 70 ? 'good' : confidenceValue != null && confidenceValue >= 45 ? 'warn' : 'cold';
  const urgency = lead.ai_urgency || reasoning?.urgency || 'low';

  const trendChips = [
    {
      label: 'Pipeline Momentum',
      value:
        scoreValue == null
          ? 'Awaiting score'
          : scoreValue >= 75
          ? 'High conversion potential'
          : scoreValue >= 55
          ? 'Recoverable with follow-up'
          : 'Needs nurture sequence',
      tone: trendToneByScore(scoreValue),
    },
    {
      label: 'Urgency Signal',
      value: toTitle(urgency),
      tone: trendToneByUrgency(urgency),
    },
    {
      label: 'Model Confidence',
      value: confidenceLabel,
      tone: trendToneByConfidence(confidenceValue),
    },
    {
      label: 'Analysis Freshness',
      value: freshness.label,
      tone: freshness.tone === 'green' ? 'good' : freshness.tone === 'amber' ? 'warn' : freshness.tone === 'red' ? 'cold' : 'info',
    },
  ] as const;

  async function handleRunLeadTriage() {
    try {
      setTriageError(null);
      setTriageStatus(null);
      setTriageBusy(true);
      const result = await runLeadTriage({ leadId, dry_run: false });
      setTriageStatus(
        result.persisted
          ? 'Lead triage completed and persisted.'
          : 'Lead triage completed (not persisted).'
      );
    } catch (error) {
      setTriageError(error instanceof Error ? error.message : 'Failed to run lead triage.');
    } finally {
      setTriageBusy(false);
    }
  }

  async function handleDraftReply() {
    try {
        setActionError(null);
        setActionStatus(null);
        setActionBusy('draft');

        const result = await draftReplyFromLeadIntelligence({
        leadId,
        tone: 'professional',
        channel: 'email',
        });

        const draftData = (result as any).data;
        setDraftReplyPreview({
        subject: draftData?.subject,
        message: draftData?.message || '',
        rationale: draftData?.rationale,
        suggestedNextAction: draftData?.suggestedNextAction,
        });

        await writeLeadIntelligenceAudit({
        leadId,
        action: 'draft_reply',
        outcome: 'success',
        details: 'Draft reply generated from lead intelligence.',
        metadata: {
            source: (result as any).source ?? null,
            schemaValid: (result as any).schemaValid ?? null,
        },
        });

        setActionStatus('Draft reply generated successfully.');
    } catch (error) {
        const message =
        error instanceof Error ? error.message : 'Failed to generate draft reply.';
        setActionError(message);

        try {
        await writeLeadIntelligenceAudit({
            leadId,
            action: 'draft_reply',
            outcome: 'failure',
            details: message,
        });
        } catch {}

    } finally {
        setActionBusy(null);
    }
    }

    async function handleConvertLead() {
    try {
        setActionError(null);
        setActionStatus(null);
        setActionBusy('convert');

        const result = await convertLeadFromIntelligence(leadId);

        await writeLeadIntelligenceAudit({
        leadId,
        action: 'convert',
        outcome: 'success',
        details: 'Lead converted to deal from intelligence card.',
        metadata: {
            result,
        },
        });

        setActionStatus('Lead converted to deal successfully.');
    } catch (error) {
        const message =
        error instanceof Error ? error.message : 'Failed to convert lead.';
        setActionError(message);

        try {
        await writeLeadIntelligenceAudit({
            leadId,
            action: 'convert',
            outcome: 'failure',
            details: message,
        });
        } catch {}

    } finally {
        setActionBusy(null);
    }
    }

    async function handlePrioritizeLead() {
    try {
        setActionError(null);
        setActionStatus(null);
        setActionBusy('prioritize');

        const result = await prioritizeLeadFromIntelligence(leadId);

        await writeLeadIntelligenceAudit({
        leadId,
        action: 'prioritize',
        outcome: 'success',
        details: 'Lead prioritized from intelligence card.',
        metadata: {
            result,
        },
        });

        setActionStatus('Lead prioritized successfully.');
    } catch (error) {
        const message =
        error instanceof Error ? error.message : 'Failed to prioritize lead.';
        setActionError(message);

        try {
        await writeLeadIntelligenceAudit({
            leadId,
            action: 'prioritize',
            outcome: 'failure',
            details: message,
        });
        } catch {}

    } finally {
        setActionBusy(null);
    }
    }

  return (
    <div className="dg-ai-intel-root">
      <div className="dg-ai-intel-hero">
        <div className="dg-ai-intel-hero-body">
          <div className="dg-ai-intel-header">
            <div className="dg-ai-intel-title">
              <CardTitle>{title}</CardTitle>
              <CardText className="dg-ai-intel-subtitle">
                Persistent AI intelligence profile for this lead.
              </CardText>
            </div>
            <div className="dg-ai-intel-chip-row">
              <Badge kind={classificationKind(classification)}>{String(classification).toUpperCase()}</Badge>
              <Badge kind={fallbackUsed ? 'amber' : 'green'}>
                {fallbackUsed ? 'Fallback' : 'Primary'}
              </Badge>
            </div>
          </div>

          <div className="dg-ai-intel-meta-grid">
            <div className="dg-ai-intel-chip-row">
              <Badge kind={freshness.tone}>{freshness.label}</Badge>
              <Badge kind="slate">Last: {formatDateTime(lastAnalyzed)}</Badge>
            </div>
            <div className="dg-ai-intel-chip-row dg-ai-intel-meta-right">
              <Badge kind="blue">Provider: {provider}</Badge>
              <Badge kind="slate">Source: {source}</Badge>
            </div>
          </div>

          <div className="dg-ai-intel-score-grid">
            <div className="dg-ai-intel-score-card is-score">
              <div className="dg-ai-intel-label">Score</div>
              <div className="dg-ai-intel-value">{scoreLabel}</div>
              <div className="dg-ai-intel-progress-track">
                <div
                  className={`dg-ai-intel-progress-fill is-${scoreTone}`}
                  style={{
                    width: `${scoreValue ?? 0}%`,
                  }}
                />
              </div>
            </div>
            <div className="dg-ai-intel-score-card is-confidence">
              <div className="dg-ai-intel-label">Confidence</div>
              <div className="dg-ai-intel-value">{confidenceLabel}</div>
              <div className="dg-ai-intel-progress-track">
                <div
                  className={`dg-ai-intel-progress-fill is-${confidenceTone}`}
                  style={{
                    width: `${confidenceValue ?? 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="dg-ai-intel-divider" />

          <div className="dg-ai-intel-decision">
            <div className="dg-ai-intel-decision-head">
              <p className="dg-ai-intel-decision-kicker">Decision</p>
              <div className="dg-ai-intel-chip-row">
                <Badge kind={scoreTone === 'good' ? 'green' : scoreTone === 'warn' ? 'amber' : 'red'}>
                  {scoreTone === 'good' ? 'Low Risk' : scoreTone === 'warn' ? 'Medium Risk' : 'High Risk'}
                </Badge>
              </div>
            </div>
            <p className="dg-ai-intel-decision-title">{nextBestAction}</p>
            <div className="dg-ai-intel-decision-actions">
              <Link href={`/admin/leads/${lead.id}`} className="dg-btn-secondary">
                Open Lead
              </Link>
              <button
                type="button"
                className="dg-btn-primary"
                onClick={handleRunLeadTriage}
                disabled={triageBusy}
              >
                {triageBusy ? 'Running Triage...' : 'Run Lead Triage'}
              </button>
              <Link href="/admin/ai-sales-agent" className="dg-btn-primary">
                Run Agent Flow
              </Link>
            </div>
            {triageStatus ? <p className="dg-alert-success">{triageStatus}</p> : null}
            {triageError ? <p className="dg-alert-error">{triageError}</p> : null}
          </div>
        </div>
      </div>

      <Card className="dg-ai-intel-body">
        <div className="dg-ai-intel-action-rail">
          <Button
            type="button"
            variant="primary"
            onClick={handleDraftReply}
            disabled={actionBusy !== null}
          >
            {actionBusy === 'draft' ? 'Drafting...' : 'Draft Reply'}
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={handleConvertLead}
            disabled={actionBusy !== null}
          >
            {actionBusy === 'convert' ? 'Converting...' : 'Convert to Deal'}
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={handlePrioritizeLead}
            disabled={actionBusy !== null}
          >
            {actionBusy === 'prioritize' ? 'Prioritizing...' : 'Prioritize Lead'}
          </Button>
        </div>
        <p className="dg-ai-intel-action-help">
          Convert to Deal creates a deal from this lead. Prioritize Lead updates lead status to Qualified.
        </p>

        <div className="dg-ai-intel-divider" />

        <div className="dg-ai-intel-summary-block">
          <div className="dg-ai-intel-section-title">Strategic Summary</div>
          <div className="dg-ai-intel-copy">{summary}</div>
        </div>

        <div className="dg-ai-intel-trend-rail">
          {trendChips.map((chip) => (
            <div key={chip.label} className={`dg-ai-intel-trend-chip is-${chip.tone}`}>
              <span className="dg-ai-intel-trend-label">{chip.label}</span>
              <span className="dg-ai-intel-trend-value">{chip.value}</span>
            </div>
          ))}
        </div>

        <div className="dg-ai-intel-divider" />

        <CardTitle>Intelligence Signals</CardTitle>
        {compact ? (
          <div className="dg-ai-intel-signal-strip">
            <div className="dg-ai-intel-signal-pill is-intent">
              <span className="dg-ai-intel-pill-label">Intent</span>
              <span className="dg-ai-intel-pill-value">{toTitle(reasoning?.intent)}</span>
            </div>
            <div className="dg-ai-intel-signal-pill is-urgency">
              <span className="dg-ai-intel-pill-label">Urgency</span>
              <span className="dg-ai-intel-pill-value">{toTitle(lead.ai_urgency || reasoning?.urgency)}</span>
            </div>
            <div className="dg-ai-intel-signal-pill is-complexity">
              <span className="dg-ai-intel-pill-label">Complexity</span>
              <span className="dg-ai-intel-pill-value">{toTitle(lead.ai_complexity || reasoning?.complexity)}</span>
            </div>
            <div className="dg-ai-intel-signal-pill is-quantity">
              <span className="dg-ai-intel-pill-label">Quantity</span>
              <span className="dg-ai-intel-pill-value">
                {lead.ai_quantity != null
                  ? String(lead.ai_quantity)
                  : reasoning?.quantity != null
                  ? String(reasoning.quantity)
                  : 'Not detected'}
              </span>
            </div>
          </div>
        ) : (
          <div className="dg-ai-intel-signal-grid">
            <SignalTile label="Intent" value={toTitle(reasoning?.intent)} tone="intent" />
            <SignalTile label="Urgency" value={toTitle(lead.ai_urgency || reasoning?.urgency)} tone="urgency" />
            <SignalTile label="Complexity" value={toTitle(lead.ai_complexity || reasoning?.complexity)} tone="complexity" />
            <SignalTile
              label="Quantity"
              value={
                lead.ai_quantity != null
                  ? String(lead.ai_quantity)
                  : reasoning?.quantity != null
                  ? String(reasoning.quantity)
                  : 'Not detected'
              }
              tone="quantity"
            />
            <SignalTile label="Confidence" value={confidenceLabel} tone="confidence" />
            <SignalTile label="Score" value={scoreLabel} tone="score" />
          </div>
        )}

        <Card>
        <CardTitle>Explainability</CardTitle>
        <CardText>
            Why the AI rated this lead the way it did.
        </CardText>

        <div className="dg-mt-4 dg-grid dg-grid-cols-2 dg-gap-4">
            <div
            className="dg-rounded-xl dg-p-4"
            style={{
                background: 'rgba(99,102,241,0.05)',
                border: '1px solid rgba(99,102,241,0.12)',
            }}
            >
            <div className="dg-text-xs dg-font-semibold dg-uppercase dg-tracking-wide dg-text-neutral-500">
                Confidence
            </div>
            <div className="dg-mt-2 dg-text-sm dg-text-neutral-800">
                {confidenceLabel}
            </div>
            <div className="dg-mt-2 dg-text-xs dg-text-neutral-500">
                Higher confidence means the triage had stronger signal quality from the lead content.
            </div>
            </div>

            <div
            className="dg-rounded-xl dg-p-4"
            style={{
                background: 'rgba(245,158,11,0.05)',
                border: '1px solid rgba(245,158,11,0.12)',
            }}
            >
            <div className="dg-text-xs dg-font-semibold dg-uppercase dg-tracking-wide dg-text-neutral-500">
                Reason
            </div>
            <div className="dg-mt-2 dg-text-sm dg-text-neutral-800">
                {reasoning?.summary || 'No detailed reason available yet.'}
            </div>
            {reasoning?.failureReason ? (
                <div className="dg-mt-2 dg-text-xs dg-text-amber-700">
                Fallback reason: {reasoning.failureReason}
                </div>
            ) : null}
            </div>
        </div>
        </Card>

        {actionStatus ? (
        <Card
            style={{
            border: '1px solid #a7f3d0',
            background: '#ecfdf5',
            }}
        >
            <CardTitle>Action Status</CardTitle>
            <CardText>{actionStatus}</CardText>
        </Card>
        ) : null}

        {actionError ? (
        <Card
            style={{
            border: '1px solid #fecaca',
            background: '#fef2f2',
            }}
        >
            <CardTitle>Action Error</CardTitle>
            <CardText>{actionError}</CardText>
        </Card>
        ) : null}

        {draftReplyPreview ? (
        <Card className="dg-ai-intel-draft-card">
            <CardTitle>Draft Reply Preview</CardTitle>
            {draftReplyPreview.subject ? (
            <CardText className="dg-ai-intel-draft-subject dg-ai-intel-wrap">
                <strong>Subject:</strong> {draftReplyPreview.subject}
            </CardText>
            ) : null}
            <div className="dg-ai-intel-draft-body">
            <pre className="dg-ai-intel-prewrap dg-ai-intel-wrap">
                {draftReplyPreview.message}
            </pre>
            </div>

            {draftReplyPreview.rationale ? (
            <div className="dg-mt-3 dg-text-sm dg-text-neutral-600 dg-ai-intel-wrap">
                <strong>Rationale:</strong> {draftReplyPreview.rationale}
            </div>
            ) : null}

            {draftReplyPreview.suggestedNextAction ? (
            <div className="dg-mt-2 dg-text-sm dg-text-neutral-600 dg-ai-intel-wrap">
                <strong>Suggested next action:</strong> {draftReplyPreview.suggestedNextAction}
            </div>
            ) : null}
        </Card>
        ) : null}

        <div className="dg-ai-intel-divider" />

        <div className={`dg-ai-intel-foot${reasoning?.failureReason ? ' is-warning' : ''}`}>
          <div className="dg-ai-intel-foot-grid">
            <div className="dg-ai-intel-foot-item"><strong>Lead ID:</strong> {lead.id}</div>
            <div className="dg-ai-intel-foot-item"><strong>AI Path:</strong> {fallbackUsed ? 'Fallback' : 'Primary'}</div>
          </div>
          <div className="dg-ai-intel-foot-meta">
            <strong>Pipeline Reliability:</strong>{' '}
            {reasoning?.failureReason
              ? reasoning.failureReason
              : 'No failure reason logged on latest persisted analysis.'}
          </div>
        </div>
      </Card>
    </div>
  );
}
