'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button, Card, SelectField, TextField } from '@/components/ui';
import AiSalesAgentActionCards from '@/components/admin/ai-sales-agent/copilot/action-cards';
import { AisTrustBadges } from '@/components/admin/ai-sales-agent/reusable';
import { executeCopilot, queryCopilot, runLeadTriage } from '@/features/admin/ai-sales-agent/api';
import type {
  AiSalesAgentEnvelope,
  CopilotEnvelope,
  CopilotExecuteRequest,
  CopilotIntent,
} from '@/features/admin/ai-sales-agent/types';


type Props = {
  compact?: boolean;
};

type CopilotUiState = 'idle' | 'loading' | 'success' | 'empty' | 'error' | 'executing';

function isCopilotEnvelope(response: AiSalesAgentEnvelope): response is CopilotEnvelope {
  return 'intent' in response || 'action' in response;
}

function asUuidOrUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const uuidV4Like =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Like.test(trimmed) ? trimmed : undefined;
}

function extractUuidFromText(value: string): string | undefined {
  const direct = asUuidOrUndefined(value);
  if (direct) return direct;
  const match = value.match(
    /([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/i
  );
  return match?.[1];
}

const intentChips: Array<{ label: string; intent: CopilotIntent; prompt: string }> = [
  {
    label: 'Follow-ups',
    intent: 'followups_today',
    prompt: 'Show the highest-priority follow-ups I should handle today.',
  },
  {
    label: 'Draft Reply',
    intent: 'draft_reply',
    prompt: 'Draft a professional first reply for this lead.',
  },
  {
    label: 'At-Risk Deals',
    intent: 'at_risk_deals',
    prompt: 'Show deals that are likely to stall and what to do next.',
  },
];

export default function GlobalAiSalesCopilot({ compact = false }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [expanded, setExpanded] = useState(!compact);
  const [activeIntent, setActiveIntent] = useState<CopilotIntent>(
    (searchParams.get('copilotIntent') as CopilotIntent) || 'followups_today'
  );
  const [copilotLeadInput, setCopilotLeadInput] = useState(searchParams.get('copilotLeadId') ?? '');
  const [copilotDealInput, setCopilotDealInput] = useState(searchParams.get('copilotDealId') ?? '');
  const [triageLeadInput, setTriageLeadInput] = useState(searchParams.get('triageLeadId') ?? '');
  const [userNotes, setUserNotes] = useState('');
  const [tone, setTone] = useState<'professional' | 'friendly' | 'persuasive'>(
    (searchParams.get('copilotTone') as 'professional' | 'friendly' | 'persuasive') || 'professional'
  );
  const [channel, setChannel] = useState<'email' | 'whatsapp'>(
    (searchParams.get('copilotChannel') as 'email' | 'whatsapp') || 'email'
  );
  const [dryRun, setDryRun] = useState(searchParams.get('copilotDryRun') !== 'false');
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AiSalesAgentEnvelope | null>(null);
  const [uiState, setUiState] = useState<CopilotUiState>('idle');
  const [isTriaging, setIsTriaging] = useState(false);
  const isDraftReplyIntent = activeIntent === 'draft_reply';
  const isAtRiskIntent = activeIntent === 'at_risk_deals';

  function syncCopilotQueryParam() {
    const params = new URLSearchParams(searchParams.toString());
    params.set('copilotIntent', activeIntent);
    params.set('copilotTone', tone);
    params.set('copilotChannel', channel);
    params.set('copilotDryRun', String(dryRun));
    if (copilotLeadInput.trim()) params.set('copilotLeadId', copilotLeadInput);
    else params.delete('copilotLeadId');
    if (copilotDealInput.trim()) params.set('copilotDealId', copilotDealInput);
    else params.delete('copilotDealId');
    if (triageLeadInput.trim()) params.set('triageLeadId', triageLeadInput);
    else params.delete('triageLeadId');

    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();
    if (nextQuery === currentQuery) return;
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }

  useEffect(() => {
    const intent = searchParams.get('copilotIntent');
    if (
      intent &&
      (intent === 'followups_today' || intent === 'draft_reply' || intent === 'at_risk_deals')
    ) {
      setActiveIntent((prev) => (prev === intent ? prev : intent));
    }
    const nextLeadId = searchParams.get('copilotLeadId') ?? '';
    setCopilotLeadInput((prev) => (prev === nextLeadId ? prev : nextLeadId));
    const nextDealId = searchParams.get('copilotDealId') ?? '';
    setCopilotDealInput((prev) => (prev === nextDealId ? prev : nextDealId));
    const nextTriageLeadId = searchParams.get('triageLeadId') ?? '';
    setTriageLeadInput((prev) => (prev === nextTriageLeadId ? prev : nextTriageLeadId));
    const nextTone = searchParams.get('copilotTone');
    if (nextTone === 'professional' || nextTone === 'friendly' || nextTone === 'persuasive') {
      setTone((prev) => (prev === nextTone ? prev : nextTone));
    }
    const nextChannel = searchParams.get('copilotChannel');
    if (nextChannel === 'email' || nextChannel === 'whatsapp') {
      setChannel((prev) => (prev === nextChannel ? prev : nextChannel));
    }
    const nextDryRun = searchParams.get('copilotDryRun') !== 'false';
    setDryRun((prev) => (prev === nextDryRun ? prev : nextDryRun));
  }, [searchParams]);

  useEffect(() => {
    syncCopilotQueryParam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIntent, copilotLeadInput, copilotDealInput, triageLeadInput, tone, channel, dryRun]);

  function applyIntent(intent: CopilotIntent, prompt: string) {
    setActiveIntent(intent);
    if (!userNotes.trim()) setUserNotes(prompt);
  }

    async function handleRunQuery() {
        try {
            setError(null);
            setIsLoading(true);
            setUiState('loading');
            const normalizedLeadId = extractUuidFromText(copilotLeadInput);
            const normalizedDealId = extractUuidFromText(copilotDealInput);

            const result = await queryCopilot({
                intent: activeIntent,
                leadId: normalizedLeadId,
                dealId: normalizedDealId,
                channel,
                    context: {
                        tone,
                        userNotes: userNotes.trim() || undefined,
                    },
            });

            const hasFollowupItems =
            isCopilotEnvelope(result) &&
            result.intent === 'followups_today' &&
            Array.isArray((result as any).data?.items) &&
            (result as any).data.items.length > 0;

            const hasDraftReply =
            isCopilotEnvelope(result) &&
            result.intent === 'draft_reply' &&
            !!(result as any).data?.message;

            const hasAtRiskDeals =
            isCopilotEnvelope(result) &&
            result.intent === 'at_risk_deals' &&
            Array.isArray((result as any).data?.deals) &&
            (result as any).data.deals.length > 0;

            const hasData = hasFollowupItems || hasDraftReply || hasAtRiskDeals;

            setResponse(result);
            setUiState(hasData ? 'success' : 'empty');
            setExpanded(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to run copilot.');
            setResponse(null);
            setUiState('error');
        } finally {
            setIsLoading(false);
        }
    }

    async function handleExecute(input: Partial<CopilotExecuteRequest>) {
        try {
            setError(null);
            setIsExecuting(true);
            setUiState('executing');
            const normalizedLeadId = extractUuidFromText(copilotLeadInput);
            const normalizedDealId = extractUuidFromText(copilotDealInput);

            const result = await executeCopilot({
            action: input.action!,
            leadId: input.leadId ?? normalizedLeadId,
            dealId: input.dealId ?? normalizedDealId,
            channel: input.channel ?? channel,
            dry_run: dryRun,
            payload: {
                tone,
                userNotes: userNotes.trim() || undefined,
                ...(input.payload ?? {}),
            },
            });

            setResponse(result);
            setUiState('success');
            setExpanded(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to execute copilot action.');
            setUiState('error');
        } finally {
            setIsExecuting(false);
        }
    }

    async function handleRunLeadTriage() {
        const normalizedLeadId = extractUuidFromText(triageLeadInput);
        if (!triageLeadInput.trim()) {
            setError('Lead ID is required to run lead triage.');
            setUiState('error');
            return;
        }
        if (!normalizedLeadId) {
            setError('Lead ID must be a full UUID (example: 62d05770-3406-4f11-a43d-ea024260f98e).');
            setUiState('error');
            return;
        }

        try {
            setError(null);
            setIsTriaging(true);
            setUiState('loading');

            const result = await runLeadTriage({
            leadId: normalizedLeadId,
            dry_run: dryRun,
            });

            setResponse(result);
            setUiState('success');
            setExpanded(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to run lead triage.');
            setUiState('error');
        } finally {
            setIsTriaging(false);
        }
    }

  return (
    <Card className="copilot-root" style={{ padding: 0 }}>
      <div className="copilot-head" style={{ padding: '16px 18px', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              border: '1px solid rgba(59,130,246,0.22)',
              background: 'rgba(59,130,246,0.08)',
              color: '#1d4ed8',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.03em',
            }}
          >
            AI
          </div>
          <div style={{ minWidth: 200, flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>AI Sales Copilot</div>
            <div style={{ fontSize: 13, color: 'var(--color-muted-foreground)', lineHeight: 1.45 }}>
              Query, analyze, and execute guided sales actions from any admin page.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="dg-badge">{dryRun ? 'Dry Run' : 'Live'}</span>
            <Button variant="secondary" size="sm" onClick={() => setExpanded((v) => !v)}>
              {expanded ? 'Hide' : 'Open'}
            </Button>
          </div>
        </div>
      </div>

      <div className="copilot-core" style={{ padding: 16, display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {intentChips.map((chip, index) => {
            const active = chip.intent === activeIntent;
            return (
              <Button
                key={chip.intent}
                variant={active ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => applyIntent(chip.intent, chip.prompt)}
                className="copilot-chip"
                style={{ animationDelay: `${80 + index * 45}ms`, ...(active ? { boxShadow: '0 8px 16px rgba(37,99,235,0.16)' } : undefined) }}
              >
                {chip.label}
              </Button>
            );
          })}
        </div>

        <div
          className="copilot-controls-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(340px, 0.95fr)',
            gap: 10,
            alignItems: 'start',
          }}
        >
          <div
            style={{
              display: 'grid',
              gap: 8,
              border: '1px solid var(--color-border)',
              borderRadius: 12,
              padding: 10,
              background: '#fff',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Query Copilot
            </div>
            <div
              className="copilot-query-row"
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <TextField
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                placeholder="Ask what to do next with a lead, quote, or deal..."
                style={{ width: '100%', minWidth: 0 }}
              />
              <Button size="sm" onClick={handleRunQuery} disabled={isLoading}>
                {isLoading ? 'Thinking...' : 'Run Copilot'}
              </Button>
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              Intent: <strong>{activeIntent}</strong>
            </div>

            {isDraftReplyIntent ? (
              <div style={{ display: 'grid', gap: 8 }}>
                <div
                  className="copilot-draft-fields"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 8,
                  }}
                >
                  <TextField
                    value={copilotLeadInput}
                    onChange={(e) => setCopilotLeadInput(e.target.value)}
                    placeholder="Lead ID (paste UUID or text containing UUID)"
                  />
                  <TextField
                    value={copilotDealInput}
                    onChange={(e) => setCopilotDealInput(e.target.value)}
                    placeholder="Deal ID (optional)"
                  />
                  <SelectField value={channel} onChange={(e) => setChannel(e.target.value as 'email' | 'whatsapp')}>
                    <option value="email">Email</option>
                    <option value="whatsapp">WhatsApp</option>
                  </SelectField>
                  <SelectField value={tone} onChange={(e) => setTone(e.target.value as 'professional' | 'friendly' | 'persuasive')}>
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="persuasive">Persuasive</option>
                  </SelectField>
                </div>
                <small style={{ color: '#64748b', fontSize: 12 }}>
                  Lead ID is required for targeted draft reply. Channel/tone apply only to Draft Reply.
                </small>
              </div>
            ) : null}

            {isAtRiskIntent ? (
              <div style={{ display: 'grid', gap: 8 }}>
                <TextField
                  value={copilotDealInput}
                  onChange={(e) => setCopilotDealInput(e.target.value)}
                  placeholder="Deal ID (paste UUID or text containing UUID)"
                />
                <small style={{ color: '#64748b', fontSize: 12 }}>
                  Deal ID is used for at-risk workflow targeting and related actions.
                </small>
              </div>
            ) : null}

            {!isDraftReplyIntent && !isAtRiskIntent ? (
              <small style={{ color: '#64748b', fontSize: 12 }}>
                No additional fields are required for this intent.
              </small>
            ) : null}
          </div>

          <div
            style={{
              display: 'grid',
              gap: 8,
              border: '1px solid var(--color-border)',
              borderRadius: 12,
              padding: 10,
              background: '#fff',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Lead Triage
            </div>
            <div
              className="copilot-triage-row"
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <TextField
                value={triageLeadInput}
                onChange={(e) => setTriageLeadInput(e.target.value)}
                placeholder="Lead ID (paste UUID or text containing UUID)"
                style={{ width: '100%', minWidth: 0 }}
              />
              <Button size="sm" variant="secondary" onClick={handleRunLeadTriage} disabled={isTriaging}>
                {isTriaging ? 'Triaging...' : 'Run Lead Triage'}
              </Button>
            </div>
            <small style={{ color: '#64748b', fontSize: 12 }}>
              Triage uses only this Lead ID field.
            </small>
          </div>
        </div>

      </div>
      <style jsx>{`
        @media (max-width: 860px) {
          .copilot-controls-grid {
            grid-template-columns: 1fr !important;
          }
          .copilot-draft-fields {
            grid-template-columns: 1fr !important;
          }
          .copilot-query-row,
          .copilot-triage-row {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {expanded ? (
        <div className="copilot-advanced" style={{ borderTop: '1px solid var(--color-border)', padding: 18, display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155' }}>
              <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
              <span>Demo safe mode (no destructive side effects)</span>
            </label>
            <small style={{ color: '#64748b', fontSize: 12 }}>
              Advanced controls affect execution safety and response behavior.
            </small>
          </div>

          {uiState === 'loading' ? (
            <div className="dg-mt-4 dg-rounded-2xl dg-border dg-border-indigo-200 dg-bg-indigo-50 dg-p-4">
                <div className="dg-flex dg-items-center dg-gap-3">
                <span
                    className="dg-inline-flex h-3 w-3 dg-rounded-full"
                    style={{
                    background: '#6366f1',
                    boxShadow: '0 0 16px rgba(99,102,241,0.8)',
                    animation: 'ai-pulse 1.3s infinite',
                    }}
                />
                <div>
                    <div className="dg-text-sm dg-font-semibold">Ai Sales Agent is analyzing...</div>
                    <div className="dg-text-xs dg-text-neutral-600">
                    Running {activeIntent} with {dryRun ? 'safe demo mode' : 'live mode'}.
                    </div>
                </div>
                </div>
            </div>
            ) : null}

            {uiState === 'empty' ? (
            <div className="dg-mt-4 dg-rounded-2xl dg-border dg-border-neutral-200 dg-bg-white dg-p-5">
                <div className="dg-text-sm dg-font-semibold">No results found</div>
                <div className="dg-mt-1 dg-text-sm dg-text-neutral-600">
                Try a different intent, provide a lead/deal ID, or add more guidance in the input.
                </div>
            </div>
            ) : null}

            {uiState === 'error' && error ? (
            <div className="dg-mt-4 dg-rounded-2xl dg-border dg-border-rose-200 dg-bg-rose-50 dg-p-4">
                <div className="dg-text-sm dg-font-semibold dg-text-rose-700">Copilot failed</div>
                <div className="dg-mt-1 dg-text-sm dg-text-rose-600">{error}</div>
            </div>
            ) : null}

            {response?.ok ? (
            <div className="dg-mt-4 dg-flex dg-flex-wrap dg-gap-2">
                <AisTrustBadges
                  processingMs={'processingMs' in response ? response.processingMs : undefined}
                  fallbackUsed={'fallbackUsed' in response ? Boolean(response.fallbackUsed) : false}
                  provider={'provider' in response ? response.provider : undefined}
                  model={'model' in response ? response.model : undefined}
                  source={'source' in response ? response.source : undefined}
                  schemaValid={'schemaValid' in response ? response.schemaValid : undefined}
                />
                {response.requestId ? <span className="dg-badge">Request: {response.requestId}</span> : null}
                {isCopilotEnvelope(response) && response.auditId ? (
                  <span className="dg-badge">Audit: {response.auditId}</span>
                ) : null}
            </div>
            ) : null}

            {response ? (
            <div className="dg-mt-4">
                <AiSalesAgentActionCards
                response={response}
                onExecute={handleExecute}
                isExecuting={isExecuting}
                dryRun={dryRun}
                />
            </div>
            ) : null}
        </div>
      ) : null}
      <style jsx>{`
        .copilot-root {
          animation: copilot-in 220ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .copilot-head {
          animation: copilot-fade-up 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .copilot-core {
          animation: copilot-fade-up 300ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .copilot-chip {
          animation: copilot-chip-in 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .copilot-prompt-row {
          animation: copilot-fade-up 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .copilot-advanced {
          animation: copilot-disclose 240ms cubic-bezier(0.22, 1, 0.36, 1) both;
          transform-origin: top;
        }
        .copilot-results {
          animation: copilot-fade-up 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes copilot-in {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes copilot-fade-up {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes copilot-chip-in {
          from {
            opacity: 0;
            transform: translateY(6px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes copilot-disclose {
          from {
            opacity: 0;
            transform: translateY(-8px) scaleY(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scaleY(1);
          }
        }
        @keyframes ai-pulse {
            0% {
                transform: scale(0.95);
                opacity: 0.85;
            }
            50% {
                transform: scale(1.08);
                opacity: 1;
            }
            100% {
                transform: scale(0.95);
                opacity: 0.85;
            }
        }
        @media (prefers-reduced-motion: reduce) {
          .copilot-root,
          .copilot-head,
          .copilot-core,
          .copilot-chip,
          .copilot-prompt-row,
          .copilot-advanced,
          .copilot-results {
            animation: none !important;
          }
        }
      `}</style>
    </Card>
  );
}
