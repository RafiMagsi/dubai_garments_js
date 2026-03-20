'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button, Card, CardText, CardTitle, Panel } from '@/components/ui';
import LeadIntelligenceCards from './lead-intelligence-cards';
import { useLeadById } from '@/features/admin/leads';
import AgentFlowView from '@/components/admin/ai-sales-agent/agent-flow-view';
import ReplyStudioPanel from '@/components/admin/ai-sales-agent/reply-studio-panel';
import {
  AisEmptyState,
  AisFeatureCard,
  AisKpiPill,
  AisSectionEyebrow,
} from './reusable';
import QuoteCopilotPanel from '@/components/admin/ai-sales-agent/quote-copilot-panel';
import PipelineInsightsPanel from '@/components/admin/ai-sales-agent/pipeline-insights-panel';
import AutomationRunsPanel from '@/components/admin/ai-sales-agent/automation-runs-panel';
import GlobalAiSalesCopilot from '@/components/admin/ai-sales-agent/global-copilot';
import ModelSettingsPanel from '@/components/admin/ai-sales-agent/model-settings-panel';
import AiImpactKpiBoard from '@/components/admin/ai-sales-agent/ai-impact-kpi-board';

type AgentTabKey =
  | 'copilot'
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
    key: 'copilot',
    label: 'AI Copilot',
    eyebrow: 'AI Command Center',
    title: 'AI Sales Copilot',
    description: 'Unified guided actions for follow-ups, replies, triage, and at-risk signals.',
    kpiLabel: 'Copilot Actions',
    kpiValue: '184',
    kpiDelta: '+23 today',
    health: 'healthy',
    features: ['Follow-up command', 'Draft reply execution', 'At-risk deal cues'],
  },
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
    description: 'Manage provider/model routing, prompt defaults, and strict environment checks.',
    kpiLabel: 'Prompt Versions',
    kpiValue: '11',
    kpiDelta: '2 active',
    health: 'warning',
    features: ['Prompt templates', 'Provider fallback strategy', 'Contract validation rules'],
  },
];

// const flowSteps = ['Lead Intake', 'AI Analysis', 'Reply Draft', 'Deal Guidance', 'Quote Assist', 'Close Loop'];

export default function AiSalesAgentTabShell() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<AgentTabKey>('copilot');
  const [expanded, setExpanded] = useState(searchParams.get('expanded') !== 'false');
  const [leadPreviewId, setLeadPreviewId] = useState(searchParams.get('leadPreviewId') ?? '');
  const { data: leadPreviewData } = useLeadById(leadPreviewId.trim());
  const previewLead = leadPreviewData?.item;

  const currentTab = useMemo(() => tabs.find((tab) => tab.key === activeTab) ?? tabs[0], [activeTab]);
  const validTabKeys = useMemo(() => new Set(tabs.map((tab) => tab.key)), []);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (!tabParam || !validTabKeys.has(tabParam as AgentTabKey)) {
      return;
    }
    const nextTab = tabParam as AgentTabKey;
    setActiveTab((prev) => (prev === nextTab ? prev : nextTab));
  }, [searchParams, validTabKeys]);

  useEffect(() => {
    const expandedParam = searchParams.get('expanded');
    const nextExpanded = expandedParam !== 'false';
    setExpanded((prev) => (prev === nextExpanded ? prev : nextExpanded));
    const nextLeadPreviewId = searchParams.get('leadPreviewId') ?? '';
    setLeadPreviewId((prev) => (prev === nextLeadPreviewId ? prev : nextLeadPreviewId));
  }, [searchParams]);

  function setTabInUrl(nextTab: AgentTabKey) {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('tab', nextTab);
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }

  function setUiStateInUrl(patch: Partial<{ expanded: boolean; leadPreviewId: string }>) {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (typeof patch.expanded === 'boolean') {
      nextParams.set('expanded', String(patch.expanded));
    }
    if (typeof patch.leadPreviewId === 'string') {
      const trimmed = patch.leadPreviewId.trim();
      if (trimmed) {
        nextParams.set('leadPreviewId', patch.leadPreviewId);
      } else {
        nextParams.delete('leadPreviewId');
      }
    }

    const nextQuery = nextParams.toString();
    const currentQuery = searchParams.toString();
    if (nextQuery === currentQuery) return;
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }

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
                  setTabInUrl(tab.key);
                  setUiStateInUrl({ expanded: true });
                }}
                className="ais-tab-btn"
                style={{ animationDelay: `${60 + index * 35}ms`, ...(isActive ? { boxShadow: '0 8px 16px rgba(37,99,235,0.16)' } : undefined) }}
              >
                {tab.label}
              </Button>
            );
          })}

          <div style={{ marginLeft: 'auto' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setExpanded((v) => {
                  const next = !v;
                  setUiStateInUrl({ expanded: next });
                  return next;
                })
              }
            >
              {expanded ? 'Collapse Overview' : 'Expand Overview'}
            </Button>
          </div>
        </div>

        <Card className="ais-overview" key={activeTab}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <AisSectionEyebrow>{currentTab.eyebrow}</AisSectionEyebrow>
                <CardTitle style={{ marginTop: 6 }}>{currentTab.title}</CardTitle>
                <CardText style={{ marginTop: 8 }}>{currentTab.description}</CardText>
              </div>

              <AisKpiPill
                label={currentTab.kpiLabel}
                value={currentTab.kpiValue}
                delta={currentTab.kpiDelta}
                border={healthStyles.border}
                bg={healthStyles.bg}
                fg={healthStyles.fg}
              />
            </div>

            {expanded ? (
              <div className="ais-tab-content">
                {currentTab.key === 'copilot' ? (
                  <div className="pins-stack">
                    <AiImpactKpiBoard
                      title="AI Impact KPI Board"
                      subtitle="Time saved, suggestion acceptance, and risk-resolution outcomes from recent AI activity."
                    />
                    <GlobalAiSalesCopilot />
                  </div>
                ) : currentTab.key === 'agent-flow' ? (
                  <AgentFlowView showHeader={false} />
                ) : currentTab.key === 'quote-copilot' ? (
                  <QuoteCopilotPanel />
                ) : currentTab.key === 'reply-studio' ? (
                  <ReplyStudioPanel showHeading={false} />
                ) : currentTab.key === 'pipeline-insights' ? (
                  <PipelineInsightsPanel />
                ) : currentTab.key === 'automation-runs' ? (
                  <AutomationRunsPanel />
                ) : currentTab.key === 'model-settings' ? (
                  <ModelSettingsPanel />
                ) : (
                  <div className="dg-grid dg-grid-cols-3 dg-gap-4">
                    {currentTab.features.map((feature, index) => (
                      <AisFeatureCard
                        key={`${currentTab.key}-feature-${index}`}
                        title={feature}
                        text={`Operational capability for ${currentTab.label.toLowerCase()}.`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </Card>

        {activeTab === 'lead-intelligence' ? (
          <Card className="ais-preview-card">
            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <AisSectionEyebrow>Lead Intelligence Preview</AisSectionEyebrow>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
                  Paste a Lead ID to load the same intelligence cards used on Lead Detail page.
                </p>
              </div>
              <input
                className="dg-input"
                value={leadPreviewId}
                onChange={(event) => {
                  setLeadPreviewId(event.target.value);
                  setUiStateInUrl({ leadPreviewId: event.target.value });
                }}
                placeholder="Paste a Lead ID"
                data-testid="ai-sales-agent-lead-preview-input"
              />
              {previewLead ? (
                <div data-testid="ai-sales-agent-lead-preview-cards" className="ais-preview-pane">
                  <LeadIntelligenceCards
                    lead={previewLead}
                    title="AI Sales Agent > Lead Intelligence"
                    data-testid="ai-sales-agent-lead-intelligence-preview"
                    compact
                  />
                </div>
              ) : (
                <AisEmptyState message="No lead loaded yet. Enter a valid lead ID to preview intelligence output." />
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
        .ais-tab-content {
          margin-top: 0.95rem;
          display: grid;
          gap: 0.9rem;
        }
        .ais-preview-card {
          margin-top: 0.18rem;
        }
        .ais-preview-pane {
          margin-top: 0.15rem;
          padding-top: 0.55rem;
          border-top: 1px solid #e5e7eb;
          background: linear-gradient(180deg, rgba(238,242,255,0.45), rgba(255,255,255,0.9));
          border-radius: 12px;
          padding-left: 0.35rem;
          padding-right: 0.35rem;
          padding-bottom: 0.35rem;
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
