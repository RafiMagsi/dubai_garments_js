'use client';

import { Button, Card, CardText, CardTitle } from '@/components/ui';
import type {
  AiSalesAgentEnvelope,
  LeadTriageEnvelope,
  LeadTriageOutput,
} from '@/features/admin/ai-sales-agent/types';

type FollowupItem = {
  id: string;
  type: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  reason: string;
  suggestedAction: string;
};

type DraftReplyData = {
  channel: 'email' | 'whatsapp';
  subject?: string;
  message: string;
  rationale: string;
  suggestedNextAction: string;
};

type RiskDeal = {
  id: string;
  companyName?: string | null;
  contactName?: string | null;
  stage: string;
  riskReason: string;
  suggestedAction: string;
  priority: 'high' | 'medium' | 'low';
};

type ActionCardsProps = {
  response: AiSalesAgentEnvelope;
  onExecute?: (action: {
    action: 'draft_reply' | 'schedule_followup' | 'mark_deal_at_risk';
    leadId?: string;
    dealId?: string;
    channel?: 'email' | 'whatsapp';
    payload?: Record<string, unknown>;
  }) => void;
  isExecuting?: boolean;
  dryRun?: boolean;
};

function isLeadTriageEnvelope(response: AiSalesAgentEnvelope): response is LeadTriageEnvelope {
  const candidate = response as Partial<LeadTriageEnvelope>;
  return Boolean(
    candidate &&
      typeof candidate.leadId === 'string' &&
      candidate.data &&
      typeof (candidate.data as Partial<LeadTriageOutput>).nextBestAction === 'string'
  );
}

function Badge({
  text,
  tone = 'blue',
}: {
  text: string;
  tone?: 'blue' | 'red' | 'amber' | 'green' | 'violet' | 'slate';
}) {
  const map = {
    blue: { bg: '#eff6ff', fg: '#1d4ed8', border: '#bfdbfe' },
    red: { bg: '#fef2f2', fg: '#b91c1c', border: '#fecaca' },
    amber: { bg: '#fff7ed', fg: '#b45309', border: '#fed7aa' },
    green: { bg: '#ecfdf5', fg: '#047857', border: '#a7f3d0' },
    violet: { bg: '#f5f3ff', fg: '#6d28d9', border: '#ddd6fe' },
    slate: { bg: '#f8fafc', fg: '#475569', border: '#e2e8f0' },
  }[tone];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        border: `1px solid ${map.border}`,
        borderRadius: 999,
        background: map.bg,
        color: map.fg,
        padding: '5px 10px',
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {text}
    </span>
  );
}

function Box({ title, value }: { title: string; value: string }) {
  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 10,
        background: '#f8fafc',
        padding: 12,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: '#64748b',
          fontWeight: 700,
        }}
      >
        {title}
      </p>
      <p style={{ margin: '6px 0 0', fontSize: 14, lineHeight: 1.55, color: '#1e293b' }}>{value}</p>
    </div>
  );
}

function ItemCard({
  children,
  accent,
}: {
  children: React.ReactNode;
  accent: string;
}) {
  return (
    <Card style={{ padding: 0, borderColor: accent, position: 'relative', overflow: 'hidden' }}>
      <span
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: accent,
          borderRadius: '12px 0 0 12px',
        }}
      />
      <div style={{ padding: 18, paddingLeft: 20 }}>{children}</div>
    </Card>
  );
}

function AiCard({
  children,
  accent = 'blue',
}: {
  children: React.ReactNode;
  accent?: 'blue' | 'amber' | 'rose' | 'violet';
}) {
  const accentMap = {
    blue: 'linear-gradient(180deg, rgba(59,130,246,0.95), rgba(99,102,241,0.95))',
    amber: 'linear-gradient(180deg, rgba(245,158,11,0.95), rgba(249,115,22,0.95))',
    rose: 'linear-gradient(180deg, rgba(244,63,94,0.95), rgba(239,68,68,0.95))',
    violet: 'linear-gradient(180deg, rgba(139,92,246,0.95), rgba(79,70,229,0.95))',
  };

  return (
    <div
      className="dg-relative dg-overflow-hidden dg-rounded-2xl dg-border dg-border-neutral-200 dg-bg-white dg-shadow-sm"
      style={{
        boxShadow: '0 10px 28px rgba(15,23,42,0.05)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 1,
          top: 1,
          bottom: 1,
          width: 4,
          background: accentMap[accent],
          borderRadius: '16px 0 0 16px',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.45) 12%, transparent 24%)',
          backgroundSize: '220% 100%',
          animation: 'ai-shimmer 5s linear infinite',
          opacity: 0.45,
        }}
      />
      <div className="dg-relative dg-p-5">{children}</div>
    </div>
  );
}

function toTitleFromEnum(value: string) {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function AiSalesAgentActionCards({
  response,
  onExecute,
  isExecuting = false,
  dryRun = true,
}: ActionCardsProps) {
  if (!response?.ok) return null;

  const motionStyle = (
    <style jsx>{`
      @keyframes aicReveal {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        div[style*='aicReveal'] {
          animation: none !important;
        }
      }
    `}</style>
  );

  if (isLeadTriageEnvelope(response)) {
    const triage = response.data;
    const summaryLines = triage.summary
      .split('.')
      .map((line) => line.trim())
      .filter(Boolean);
    const classificationTone =
      triage.classification === 'hot'
        ? { bg: '#fef2f2', fg: '#b91c1c', border: '#fecaca' }
        : triage.classification === 'warm'
        ? { bg: '#fff7ed', fg: '#b45309', border: '#fed7aa' }
        : { bg: '#eff6ff', fg: '#1d4ed8', border: '#bfdbfe' };

    const triageCellStyle: React.CSSProperties = {
      border: '1px solid var(--color-border)',
      borderRadius: 12,
      background: '#ffffff',
      padding: 14,
      display: 'grid',
      gap: 6,
    };

    return (
      <AiCard accent="violet">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  borderRadius: 999,
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 700,
                  border: '1px solid rgba(139,92,246,0.20)',
                  background: 'rgba(139,92,246,0.10)',
                  color: '#6d28d9',
                }}
              >
                Lead Triage
              </span>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Lead ID: <code>{response.leadId}</code>
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: 18, lineHeight: 1.25, color: '#0f172a' }}>
              AI Sales Agent Triage Output
            </h3>
          </div>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              borderRadius: 999,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 700,
              background: classificationTone.bg,
              color: classificationTone.fg,
              border: `1px solid ${classificationTone.border}`,
            }}
          >
            {String(triage.classification).toUpperCase()}
          </span>
        </div>

        <div
          style={{
            marginTop: 14,
            borderRadius: 12,
            border: '1px solid var(--color-border)',
            background: '#f8fafc',
            padding: 14,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>
            Summary
          </div>
          <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.55, color: '#1f2937' }}>
            <div style={{ display: 'grid', gap: 6 }}>
              {summaryLines.map((line, index) => (
                <div key={`${line}-${index}`} style={{ display: 'flex', gap: 8 }}>
                  <span style={{ color: '#6366f1', fontWeight: 700 }}>•</span>
                  <span>{line}.</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: 10,
          }}
        >
          <div style={triageCellStyle}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>
              Intent
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{toTitleFromEnum(triage.intent)}</div>
          </div>

          <div style={triageCellStyle}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>
              Urgency
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{toTitleFromEnum(triage.urgency)}</div>
          </div>

          <div style={triageCellStyle}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>
              Complexity
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{toTitleFromEnum(triage.complexity)}</div>
          </div>

          <div style={triageCellStyle}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>
              Quantity
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
              {triage.quantity ?? 'Not detected'}
            </div>
          </div>

          <div style={triageCellStyle}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>
              Confidence
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{triage.confidence}%</div>
          </div>

          <div style={triageCellStyle}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>
              Score
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{triage.score}/100</div>
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            borderRadius: 12,
            padding: 14,
            background: 'rgba(99,102,241,0.05)',
            border: '1px solid rgba(99,102,241,0.16)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#4f46e5' }}>
            Next Best Action
          </div>
          <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.55, color: '#1f2937', fontWeight: 500 }}>
            {triage.nextBestAction}
          </div>
        </div>
      </AiCard>
    );
  }

  if (response.intent === 'followups_today') {
    const data = response.data as { summary: string; items: FollowupItem[] } | undefined;
    if (!data?.items) return null;

    return (
      <>
      <div style={{ display: 'grid', gap: 12 }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', fontWeight: 700 }}>
                AI Follow-up Intelligence
              </p>
              <CardTitle style={{ marginTop: 6 }}>{data.summary}</CardTitle>
            </div>
            <Badge text="AI Suggested Queue" tone="blue" />
          </div>
        </Card>

        {data.items.map((item, index) => (
          <ItemCard
            key={item.id}
            accent={item.priority === 'high' ? '#f43f5e' : item.priority === 'medium' ? '#f59e0b' : '#3b82f6'}
          >
            <div
              style={{
                display: 'grid',
                gap: 12,
                animation: 'aicReveal 260ms cubic-bezier(0.22, 1, 0.36, 1) both',
                animationDelay: `${80 + index * 60}ms`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Badge text={item.type} tone="blue" />
                  <Badge text={item.priority.toUpperCase()} tone={item.priority === 'high' ? 'red' : item.priority === 'medium' ? 'amber' : 'green'} />
                  <Badge text={`#${index + 1}`} tone="slate" />
                </div>
                <Badge text="AI" tone="slate" />
              </div>
              <CardTitle>{item.title}</CardTitle>
              <CardText>{item.reason}</CardText>
              <Box title="AI Suggested Next Move" value={item.suggestedAction} />
            </div>
          </ItemCard>
        ))}
      </div>
      {motionStyle}
      </>
    );
  }

  if (response.intent === 'draft_reply') {
    const data = response.data as DraftReplyData | undefined;
    if (!data) return null;

    return (
      <>
      <div style={{ display: 'grid', gap: 12 }}>
        <ItemCard accent="#8b5cf6">
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Badge text="AI Generated Reply" tone="violet" />
                  <Badge text={`Channel: ${data.channel}`} tone="slate" />
                </div>
                <CardTitle>Reply Studio Output</CardTitle>
              </div>
              {onExecute ? (
                <Button
                  onClick={() =>
                    onExecute({
                      action: 'draft_reply',
                      channel: data.channel,
                    })
                  }
                  disabled={isExecuting}
                >
                  {isExecuting ? 'Processing...' : dryRun ? 'Simulate Action' : 'Execute Action'}
                </Button>
              ) : null}
            </div>

            {data.subject ? <Box title="Subject" value={data.subject} /> : null}
            <Box title="Message" value={data.message} />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 10,
              }}
            >
              <Box title="AI Rationale" value={data.rationale} />
              <Box title="Suggested Next Action" value={data.suggestedNextAction} />
            </div>
          </div>
        </ItemCard>
      </div>
      {motionStyle}
      </>
    );
  }

  if (response.intent === 'at_risk_deals') {
    const data = response.data as { summary: string; deals: RiskDeal[] } | undefined;
    if (!data?.deals) return null;

    return (
      <>
      <div style={{ display: 'grid', gap: 12 }}>
        <Card style={{ borderColor: '#fecdd3' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#e11d48', fontWeight: 700 }}>
                AI Risk Monitoring
              </p>
              <CardTitle style={{ marginTop: 6 }}>{data.summary}</CardTitle>
            </div>
            <Badge text="Deal Risk Queue" tone="red" />
          </div>
        </Card>

        {data.deals.map((deal) => (
          <ItemCard key={deal.id} accent="#f43f5e">
            <div
              style={{
                display: 'grid',
                gap: 12,
                animation: 'aicReveal 260ms cubic-bezier(0.22, 1, 0.36, 1) both',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Badge text={deal.priority.toUpperCase()} tone={deal.priority === 'high' ? 'red' : deal.priority === 'medium' ? 'amber' : 'green'} />
                    <Badge text={deal.stage} tone="blue" />
                  </div>
                  <CardTitle>{deal.companyName || deal.contactName || 'Unnamed deal'}</CardTitle>
                </div>
                {onExecute ? (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      onExecute({
                        action: 'mark_deal_at_risk',
                        dealId: deal.id,
                        payload: { reason: deal.riskReason },
                      })
                    }
                    disabled={isExecuting}
                  >
                    {isExecuting ? 'Running...' : dryRun ? 'Simulate Risk Flag' : 'Flag Risk'}
                  </Button>
                ) : null}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 10,
                }}
              >
                <Box title="Risk Reason" value={deal.riskReason} />
                <Box title="Suggested Action" value={deal.suggestedAction} />
              </div>
            </div>
          </ItemCard>
        ))}
      </div>
      {motionStyle}
      </>
    );
  }

  if (response.action && response.result) {
    return (
      <>
      <ItemCard accent="#3b82f6">
        <div
          style={{
            display: 'grid',
            gap: 12,
            animation: 'aicReveal 260ms cubic-bezier(0.22, 1, 0.36, 1) both',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', fontWeight: 700 }}>
                Action Outcome
              </p>
              <CardTitle style={{ marginTop: 6 }}>
                {response.dryRun ? 'Simulation Complete' : 'Execution Complete'}
              </CardTitle>
            </div>
            <Badge text={response.dryRun ? 'Dry Run Output' : 'Live Action Applied'} tone={response.dryRun ? 'blue' : 'green'} />
          </div>

          <pre
            style={{
              margin: 0,
              border: '1px solid var(--color-border)',
              borderRadius: 10,
              background: '#f8fafc',
              padding: 12,
              fontSize: 13,
              lineHeight: 1.55,
              color: '#0f172a',
              whiteSpace: 'pre-wrap',
            }}
          >
            {JSON.stringify(response.result, null, 2)}
          </pre>
        </div>
      </ItemCard>
      {motionStyle}
      </>
    );
  }

  return null;
}
