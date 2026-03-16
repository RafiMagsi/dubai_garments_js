'use client';

import { Button, Card, CardText, CardTitle } from '@/components/ui';
import type { CopilotEnvelope } from '@/features/admin/ai-sales-agent/types';

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
  response: CopilotEnvelope;
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

export default function AiSalesAgentActionCards({
  response,
  onExecute,
  isExecuting = false,
  dryRun = true,
}: ActionCardsProps) {
  if (!response?.ok) return null;

  if (response.intent === 'followups_today') {
    const data = response.data as { summary: string; items: FollowupItem[] } | undefined;
    if (!data?.items) return null;

    return (
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
            <div style={{ display: 'grid', gap: 12 }}>
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
    );
  }

  if (response.intent === 'draft_reply') {
    const data = response.data as DraftReplyData | undefined;
    if (!data) return null;

    return (
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
    );
  }

  if (response.intent === 'at_risk_deals') {
    const data = response.data as { summary: string; deals: RiskDeal[] } | undefined;
    if (!data?.deals) return null;

    return (
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
            <div style={{ display: 'grid', gap: 12 }}>
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
    );
  }

  if (response.action && response.result) {
    return (
      <ItemCard accent="#3b82f6">
        <div style={{ display: 'grid', gap: 12 }}>
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
    );
  }

  return null;
}
