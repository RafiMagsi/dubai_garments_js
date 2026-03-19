'use client';

import { useEffect, useState } from 'react';
import { Card, CardText, CardTitle } from '@/components/ui';
import {
  getAutomationTemplateLibrary,
  toggleAutomationTemplate,
} from '@/features/admin/ai-sales-agent/api';
import type { AutomationTemplateItem } from '@/features/admin/ai-sales-agent/types';

export default function TemplateLibraryCard() {
  const [templates, setTemplates] = useState<AutomationTemplateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadTemplates() {
      try {
        setLoading(true);
        const result = await getAutomationTemplateLibrary();
        if (!mounted) return;
        setTemplates(result.templates || []);
        setError(null);
      } catch (err) {
        if (!mounted) return;
        setError(
          err instanceof Error ? err.message : 'Failed to load template library.'
        );
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    void loadTemplates();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleToggle(item: AutomationTemplateItem) {
    try {
      setStatus(null);
      setError(null);
      setTogglingKey(item.key);

      const nextEnabled = !item.enabled;
      const result = await toggleAutomationTemplate({
        key: item.key,
        enabled: nextEnabled,
      });

      setTemplates((prev) =>
        prev.map((entry) =>
          entry.key === result.key ? { ...entry, enabled: result.enabled } : entry
        )
      );
      setStatus(`${item.name} ${result.enabled ? 'enabled' : 'disabled'}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle template.');
    } finally {
      setTogglingKey(null);
    }
  }

  return (
    <Card className="pins-card arscope-result-card">
      <CardTitle>Automation Template Library</CardTitle>
      <CardText className="pins-muted">
        Quick-enable or disable automation templates with guardrail visibility.
      </CardText>
      {error ? (
        <CardText className="dg-rounded-xl dg-border dg-border-rose-200 dg-bg-rose-50 dg-p-3 dg-text-rose-700">
          {error}
        </CardText>
      ) : null}
      {status ? (
        <CardText className="dg-rounded-xl dg-border dg-border-emerald-200 dg-bg-emerald-50 dg-p-3 dg-text-emerald-700">
          {status}
        </CardText>
      ) : null}
      {loading ? (
        <CardText className="pins-muted">Loading automation templates…</CardText>
      ) : (
        <div className="pins-list">
          {templates.length === 0 ? (
            <p className="pins-muted">No templates configured yet.</p>
          ) : null}
          {templates.map((item) => (
            <div key={item.key} className="pins-item">
              <div className="pins-item-head">
                <div className="pins-item-title">{item.name}</div>
                <div className="dg-flex dg-items-center dg-gap-2">
                  <span className={`dg-ai-badge ${item.enabled ? 'dg-ai-badge-green' : 'dg-ai-badge-amber'}`}>
                    {item.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <span className="dg-badge">{item.category}</span>
                </div>
              </div>
              <div className="pins-item-text">
                {item.description}
              </div>
              <div className="pins-item-text">
                Inputs: {item.inputs.join(', ')}
              </div>
              <div className="pins-item-text">
                Outputs: {item.outputs.join(', ')}
              </div>
              <div className="pins-item-text">
                Guardrails: {item.guardrails.join(', ')}
              </div>
              <div className="pins-actions">
                <button
                  type="button"
                  className={item.enabled ? 'ui-btn ui-btn-secondary ui-btn-sm' : 'ui-btn ui-btn-primary ui-btn-sm'}
                  onClick={() => handleToggle(item)}
                  disabled={togglingKey !== null}
                >
                  {togglingKey === item.key
                    ? 'Updating...'
                    : item.enabled
                    ? 'Disable Template'
                    : 'Enable Template'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
