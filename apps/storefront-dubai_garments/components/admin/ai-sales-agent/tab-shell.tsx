'use client';

import { useMemo, useState } from 'react';
import { Button, Card, CardText, CardTitle, Panel } from '@/components/ui';
import LeadIntelligenceCards from './lead-intelligence-cards';
import { useLeadById } from '@/features/admin/leads';
import AgentFlowView from '@/components/admin/ai-sales-agent/agent-flow-view';
import ReplyStudioPanel from '@/components/admin/ai-sales-agent/reply-studio-panel';

type AgentTabKey =
  | 'lead-intelligence'
  | 'reply-studio'
  | 'quote-copilot'
  | 'pipeline-insights'
  | 'agent-flow'
  | 'automation-runs'
  | 'model-settings';

type AgentTab = {
  key: AgentTabKey;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  kpiLabel: string;
  kpiValue: string;
  kpiDelta: string;
  health: 'healthy' | 'warning' | 'critical';
  features: string[];
};

const tabs: AgentTab[] = [
  {
    key: 'lead-intelligence',
    label: 'Lead Intelligence',
    eyebrow: 'AI Intake',
    title: 'Lead Intelligence',
    description: 'Lead summary, score, urgency, complexity, intent, and recommended next action.',
    kpiLabel: 'Analyzed Leads',
    kpiValue: '128',
    kpiDelta: '+14 today',
    health: 'healthy',
    features: ['Lead score calibration', 'Intent classification', 'Follow-up queue shaping'],
  },
  {
    key: 'reply-studio',
    label: 'Reply Studio',
    eyebrow: 'AI Messaging',
    title: 'Reply Studio',
    description: 'Generate first replies, follow-ups, and sales-ready communication drafts.',
    kpiLabel: 'Drafts Generated',
    kpiValue: '64',
    kpiDelta: '89% accepted',
    health: 'healthy',
    features: ['Tone controls', 'Channel-aware drafts', 'Actionable next-step prompts'],
  },
  {
    key: 'quote-copilot',
    label: 'Quote Copilot',
    eyebrow: 'AI Revenue',
    title: 'Quote Copilot',
    description: 'Suggest products, quantities, upsells, and quote-ready summaries.',
    kpiLabel: 'Quote Assist Runs',
    kpiValue: '37',
    kpiDelta: '+9 this week',
    health: 'warning',
    features: ['Product suggestions', 'Volume pricing hints', 'Upsell cross-sell cues'],
  },
  {
    key: 'pipeline-insights',
    label: 'Pipeline Insights',
    eyebrow: 'AI Guidance',
    title: 'Pipeline Insights',
    description: 'Show stalled deals, next-best actions, and at-risk opportunities.',
    kpiLabel: 'At-Risk Alerts',
    kpiValue: '12',
    kpiDelta: '3 critical',
    health: 'critical',
    features: ['Stall detection', 'Risk segmentation', 'Recommended intervention paths'],
  },
  {
    key: 'agent-flow',
    label: 'Agent Flow',
    eyebrow: 'Visual AI Journey',
    title: 'Lead-to-Close Agent Flow',
    description: 'Track visible AI and automation steps for every lead from intake to outcome.',
    kpiLabel: 'Flow Coverage',
    kpiValue: '92%',
    kpiDelta: 'End-to-end',
    health: 'healthy',
    features: ['Intake-to-close map', 'Step-level visibility', 'Execution audit links'],
  },
  {
    key: 'automation-runs',
    label: 'Automation Runs',
    eyebrow: 'Execution Layer',
    title: 'Automation Runs',
    description: 'Surface AI-triggered workflow activity and system actions.',
    kpiLabel: 'Run Success Rate',
    kpiValue: '96.4%',
    kpiDelta: 'Last 24h',
    health: 'healthy',
    features: ['Queued run stream', 'Failure drilldown', 'Retry and rerun controls'],
  },
  {
    key: 'model-settings',
    label: 'Model Settings',
    eyebrow: 'LLM Controls',
    title: 'Model & Prompt Settings',
    description: 'Future home for model selection, prompt templates, and fallback strategy.',
    kpiLabel: 'Prompt Versions',
    kpiValue: '11',
    kpiDelta: '2 active',
    health: 'warning',
    features: ['Prompt templates', 'Provider fallback strategy', 'Contract validation rules'],
  },
];

// const flowSteps = ['Lead Intake', 'AI Analysis', 'Reply Draft', 'Deal Guidance', 'Quote Assist', 'Close Loop'];

export default function AiSalesAgentTabShell() {
  const [activeTab, setActiveTab] = useState<AgentTabKey>('lead-intelligence');
  const [expanded, setExpanded] = useState(false);
  const [leadPreviewId, setLeadPreviewId] = useState('');
  const { data: leadPreviewData } = useLeadById(leadPreviewId.trim());
  const previewLead = leadPreviewData?.item;

  const currentTab = useMemo(() => tabs.find((tab) => tab.key === activeTab) ?? tabs[0], [activeTab]);

  const healthStyles = {
    healthy: { border: '#a7f3d0', bg: '#ecfdf5', fg: '#047857' },
    warning: { border: '#fed7aa', bg: '#fff7ed', fg: '#b45309' },
    critical: { border: '#fecaca', bg: '#fef2f2', fg: '#be123c' },
  }[currentTab.health];

  return (
    <Panel>
      <div className="ais-shell" style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {tabs.map((tab, index) => {
            const isActive = tab.key === activeTab;
            return (
              <Button
                key={tab.key}
                size="sm"
                variant={isActive ? 'primary' : 'secondary'}
                onClick={() => {
                  setActiveTab(tab.key);
                  setExpanded(true);
                }}
                className="ais-tab-btn"
                style={{ animationDelay: `${60 + index * 35}ms`, ...(isActive ? { boxShadow: '0 8px 16px rgba(37,99,235,0.16)' } : undefined) }}
              >
                {tab.label}
              </Button>
            );
          })}

          <div style={{ marginLeft: 'auto' }}>
            <Button variant="secondary" size="sm" onClick={() => setExpanded((v) => !v)}>
              {expanded ? 'Collapse Overview' : 'Expand Overview'}
            </Button>
          </div>
        </div>

        <Card className="ais-overview" key={activeTab}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              <div>
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
                  {currentTab.eyebrow}
                </p>
                <CardTitle style={{ marginTop: 6 }}>{currentTab.title}</CardTitle>
                <CardText style={{ marginTop: 8 }}>{currentTab.description}</CardText>
              </div>

              <div
                style={{
                  border: `1px solid ${healthStyles.border}`,
                  background: healthStyles.bg,
                  color: healthStyles.fg,
                  borderRadius: 10,
                  padding: '10px 12px',
                  minWidth: 140,
                }}
              >
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {currentTab.kpiLabel}
                </p>
                <p style={{ margin: '6px 0 0', fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{currentTab.kpiValue}</p>
                <p style={{ margin: '6px 0 0', fontSize: 12, color: '#475569' }}>{currentTab.kpiDelta}</p>
              </div>
            </div>

            {expanded ? (
              <>
                {currentTab.key === 'agent-flow' ? (
                  <div className="dg-mt-4">
                    <AgentFlowView showHeader={false} />
                  </div>
                ) : currentTab.key === 'reply-studio' ? (
                  <div className="dg-mt-4">
                    <ReplyStudioPanel showHeading={false} />
                  </div>
                ) : (
                  <div className="dg-mt-4 dg-grid dg-grid-cols-3 dg-gap-4">
                    {currentTab.features.map((feature, index) => (
                      <Card key={`${currentTab.key}-feature-${index}`} className="ais-feature-card">
                        <CardTitle>{feature}</CardTitle>
                        <CardText>
                          Operational capability for {currentTab.label.toLowerCase()}.
                        </CardText>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </Card>

        {activeTab === 'lead-intelligence' ? (
          <Card>
            <div style={{ display: 'grid', gap: 10 }}>
              <div>
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
                  Lead Intelligence Preview
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
                  Paste a Lead ID to load the same intelligence cards used on Lead Detail page.
                </p>
              </div>
              <input
                className="dg-input"
                value={leadPreviewId}
                onChange={(event) => setLeadPreviewId(event.target.value)}
                placeholder="Paste a Lead ID"
                data-testid="ai-sales-agent-lead-preview-input"
              />
              {previewLead ? (
                <div data-testid="ai-sales-agent-lead-preview-cards"
                  style={{
                    marginTop: 2,
                    paddingTop: 8,
                    borderTop: '1px solid #e5e7eb',
                    background: 'linear-gradient(180deg, rgba(238,242,255,0.45), rgba(255,255,255,0.9))',
                    borderRadius: 12,
                    paddingLeft: 6,
                    paddingRight: 6,
                    paddingBottom: 6,
                  }}
                >
                  <LeadIntelligenceCards
                    lead={previewLead}
                    title="AI Sales Agent > Lead Intelligence"
                    data-testid="ai-sales-agent-lead-intelligence-preview"
                    compact
                  />
                </div>
              ) : (
                <div
                  style={{
                    border: '1px dashed var(--color-border)',
                    borderRadius: 12,
                    padding: 14,
                    fontSize: 13,
                    color: '#64748b',
                    background: '#f8fafc',
                  }}
                >
                  No lead loaded yet. Enter a valid lead ID to preview intelligence output.
                </div>
              )}
            </div>
          </Card>
        ) : null}
      </div>
      <style jsx>{`
        .ais-shell {
          animation: ais-in 220ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .ais-tab-btn {
          animation: ais-chip-in 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .ais-overview {
          animation: ais-overview-in 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .ais-flow-step {
          animation: ais-step-in 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .ais-feature-card {
          animation: ais-card-in 280ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes ais-in {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes ais-overview-in {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.995);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes ais-chip-in {
          from {
            opacity: 0;
            transform: translateY(7px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes ais-step-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes ais-card-in {
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
          .ais-shell,
          .ais-tab-btn,
          .ais-overview,
          .ais-flow-step,
          .ais-feature-card {
            animation: none !important;
          }
        }
      `}</style>
    </Panel>
  );
}
