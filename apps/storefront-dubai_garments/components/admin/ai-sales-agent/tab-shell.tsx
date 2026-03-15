'use client';

import { useMemo, useState } from 'react';
import { Panel } from '@/components/ui';

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
};

const tabs: AgentTab[] = [
  {
    key: 'lead-intelligence',
    label: 'Lead Intelligence',
    eyebrow: 'AI Intake',
    title: 'Lead Intelligence',
    description: 'Lead summary, score, urgency, complexity, intent, and recommended next action.',
  },
  {
    key: 'reply-studio',
    label: 'Reply Studio',
    eyebrow: 'AI Messaging',
    title: 'Reply Studio',
    description: 'Generate first replies, follow-ups, and sales-ready communication drafts.',
  },
  {
    key: 'quote-copilot',
    label: 'Quote Copilot',
    eyebrow: 'AI Revenue',
    title: 'Quote Copilot',
    description: 'Suggest products, quantities, upsells, and quote-ready summaries.',
  },
  {
    key: 'pipeline-insights',
    label: 'Pipeline Insights',
    eyebrow: 'AI Guidance',
    title: 'Pipeline Insights',
    description: 'Show stalled deals, next-best actions, and at-risk opportunities.',
  },
  {
    key: 'agent-flow',
    label: 'Agent Flow',
    eyebrow: 'Visual AI Journey',
    title: 'Lead-to-Close Agent Flow',
    description: 'Track visible AI and automation steps for every lead from intake to outcome.',
  },
  {
    key: 'automation-runs',
    label: 'Automation Runs',
    eyebrow: 'Execution Layer',
    title: 'Automation Runs',
    description: 'Surface AI-triggered workflow activity and system actions.',
  },
  {
    key: 'model-settings',
    label: 'Model Settings',
    eyebrow: 'LLM Controls',
    title: 'Model & Prompt Settings',
    description: 'Future home for model selection, prompt templates, and fallback strategy.',
  },
];

export default function AiSalesAgentTabShell() {
  const [activeTab, setActiveTab] = useState<AgentTabKey>('lead-intelligence');

  const currentTab = useMemo(
    () => tabs.find((tab) => tab.key === activeTab) ?? tabs[0],
    [activeTab]
  );

  return (
    <Panel>
      <div className="dg-flex dg-flex-col dg-gap-5">
        <div className="dg-flex dg-flex-wrap dg-gap-2">
          {tabs.map((tab) => {
            const isActive = tab.key === activeTab;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={isActive ? 'dg-tab dg-tab-active' : 'dg-tab'}
                aria-pressed={isActive}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="dg-rounded-xl dg-border dg-border-neutral-200 dg-bg-white dg-p-6">
          <div className="dg-mb-2 dg-text-xs dg-font-semibold dg-uppercase dg-tracking-wide dg-text-neutral-500">
            {currentTab.eyebrow}
          </div>

          <h2 className="dg-text-xl dg-font-semibold">{currentTab.title}</h2>

          <p className="dg-mt-2 dg-text-sm dg-text-neutral-600">
            {currentTab.description}
          </p>

          <div className="dg-mt-6 dg-grid dg-grid-cols-2 dg-gap-4">
            <div className="dg-rounded-lg dg-border dg-border-dashed dg-border-neutral-300 dg-p-4">
                <h3 className="dg-font-medium">Visible AI Outcome</h3>
                <p className="dg-mt-2 dg-text-sm dg-text-neutral-500">
                Make AI understandable and actionable for sales teams, not hidden in backend services.
                </p>
            </div>

            <div className="dg-rounded-lg dg-border dg-border-dashed dg-border-neutral-300 dg-p-4">
                <h3 className="dg-font-medium">Implementation Status</h3>
                <p className="dg-mt-2 dg-text-sm dg-text-neutral-500">
                Route, navigation, tab shell, and permission hooks are ready. Feature modules come next.
                </p>
            </div>
            </div>
        </div>
      </div>
    </Panel>
  );
}