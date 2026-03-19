'use client';

import { useEffect, useState } from 'react';
import { Card, CardText, CardTitle } from '@/components/ui';
import { getAutomationTemplateLibrary } from '@/features/admin/ai-sales-agent/api';
import type { AutomationTemplateItem } from '@/features/admin/ai-sales-agent/types';

export default function TemplateLibraryCard() {
  const [templates, setTemplates] = useState<AutomationTemplateItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadTemplates() {
      try {
        const result = await getAutomationTemplateLibrary();
        if (!mounted) return;
        setTemplates(result.templates || []);
      } catch (err) {
        if (!mounted) return;
        setError(
          err instanceof Error ? err.message : 'Failed to load template library.'
        );
      }
    }

    void loadTemplates();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Card className="pins-card arscope-result-card">
      <CardTitle>Automation Template Library</CardTitle>
      {error ? (
        <CardText>{error}</CardText>
      ) : (
        <div className="pins-list">
          {templates.map((item) => (
            <div key={item.key} className="pins-item">
              <div className="pins-item-head">
                <div className="pins-item-title">{item.name}</div>
                <span className="dg-badge">{item.category}</span>
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
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
