'use client';

import { useState } from 'react';
import { Button, Card, SelectField, TextField } from '@/components/ui';
import AiSalesAgentActionCards from './action-cards';
import { executeCopilot, queryCopilot } from '@/features/admin/ai-sales-agent/api';
import type {
  CopilotEnvelope,
  CopilotExecuteRequest,
  CopilotIntent,
} from '@/features/admin/ai-sales-agent/types';

type Props = {
  compact?: boolean;
};

type CopilotUiState = 'idle' | 'loading' | 'success' | 'empty' | 'error' | 'executing';

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
  const [expanded, setExpanded] = useState(!compact);
  const [activeIntent, setActiveIntent] = useState<CopilotIntent>('followups_today');
  const [leadId, setLeadId] = useState('');
  const [dealId, setDealId] = useState('');
  const [userNotes, setUserNotes] = useState('');
  const [tone, setTone] = useState<'professional' | 'friendly' | 'persuasive'>('professional');
  const [channel, setChannel] = useState<'email' | 'whatsapp'>('email');
  const [dryRun, setDryRun] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<CopilotEnvelope | null>(null);
  const [uiState, setUiState] = useState<CopilotUiState>('idle');

  function applyIntent(intent: CopilotIntent, prompt: string) {
    setActiveIntent(intent);
    if (!userNotes.trim()) setUserNotes(prompt);
  }

    async function handleRunQuery() {
        try {
            setError(null);
            setIsLoading(true);
            setUiState('loading');

            const result = await queryCopilot({
                intent: activeIntent,
                leadId: leadId.trim() || undefined,
                dealId: dealId.trim() || undefined,
                channel,
                    context: {
                        tone,
                        userNotes: userNotes.trim() || undefined,
                    },
            });

            const hasFollowupItems =
            result.intent === 'followups_today' &&
            Array.isArray((result as any).data?.items) &&
            (result as any).data.items.length > 0;

            const hasDraftReply =
            result.intent === 'draft_reply' &&
            !!(result as any).data?.message;

            const hasAtRiskDeals =
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

            const result = await executeCopilot({
            action: input.action!,
            leadId: input.leadId ?? (leadId.trim() || undefined),
            dealId: input.dealId ?? (dealId.trim() || undefined),
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

      <div className="copilot-core" style={{ padding: 18, display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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

        <div className="copilot-prompt-row" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
          <TextField
            value={userNotes}
            onChange={(e) => setUserNotes(e.target.value)}
            placeholder="Ask what to do next with a lead, quote, or deal..."
          />
          <Button onClick={handleRunQuery} disabled={isLoading}>
            {isLoading ? 'Thinking...' : 'Run Copilot'}
          </Button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12, color: '#64748b' }}>
          <div>
            Intent: <strong>{activeIntent}</strong>
          </div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            style={{ border: 0, background: 'transparent', color: '#64748b', fontWeight: 600, cursor: 'pointer', padding: 0 }}
          >
            {expanded ? 'Hide advanced controls' : 'Show advanced controls'}
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="copilot-advanced" style={{ borderTop: '1px solid var(--color-border)', padding: 18, display: 'grid', gap: 12 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 10,
            }}
          >
            <TextField value={leadId} onChange={(e) => setLeadId(e.target.value)} placeholder="Lead ID" />
            <TextField value={dealId} onChange={(e) => setDealId(e.target.value)} placeholder="Deal ID" />
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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155' }}>
              <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
              <span>Demo safe mode (no destructive side effects)</span>
            </label>
            <small style={{ color: '#64748b', fontSize: 12 }}>
              Channel and tone apply to query and execute actions.
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
                {'source' in response && response.source ? (
                <span className="dg-badge">Source: {response.source}</span>
                ) : null}
                {'schemaValid' in response && typeof response.schemaValid === 'boolean' ? (
                <span className="dg-badge">Schema: {response.schemaValid ? 'valid' : 'fallback'}</span>
                ) : null}
                {response.requestId ? <span className="dg-badge">Request: {response.requestId}</span> : null}
                {response.auditId ? <span className="dg-badge">Audit: {response.auditId}</span> : null}
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
