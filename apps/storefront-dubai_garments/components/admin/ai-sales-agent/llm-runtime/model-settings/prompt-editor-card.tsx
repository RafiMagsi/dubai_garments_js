'use client';

import { Card, CardText, CardTitle } from '@/components/ui';
import { AisFieldLabel } from '@/components/admin/ai-sales-agent/reusable';
import type { AiModelConfig } from '@/features/admin/ai-sales-agent/types';

type Props = {
  loading: boolean;
  saving: boolean;
  prompts: AiModelConfig['prompts'];
  onChangePrompt: <K extends keyof AiModelConfig['prompts']>(
    key: K,
    value: AiModelConfig['prompts'][K]
  ) => void;
};

export default function PromptEditorCard({
  loading,
  saving,
  prompts,
  onChangePrompt,
}: Props) {
  return (
    <Card className="pins-card" data-testid="model-settings-prompt-editor-card">
      <CardTitle>Prompt Templates</CardTitle>
      <CardText className="pins-muted">
        System prompts used by AI Copilot, Reply Studio, and Quote Copilot.
      </CardText>

      <div className="pins-grid">
        <div>
          <AisFieldLabel>Copilot System Prompt</AisFieldLabel>
          <textarea
            className="dg-input pins-input dg-min-h-[110px]"
            value={prompts.copilotSystem}
            onChange={(event) => onChangePrompt('copilotSystem', event.target.value)}
            disabled={loading || saving}
            data-testid="model-settings-copilot-prompt-input"
          />
        </div>

        <div>
          <AisFieldLabel>Reply Studio System Prompt</AisFieldLabel>
          <textarea
            className="dg-input pins-input dg-min-h-[110px]"
            value={prompts.replyStudioSystem}
            onChange={(event) => onChangePrompt('replyStudioSystem', event.target.value)}
            disabled={loading || saving}
            data-testid="model-settings-reply-prompt-input"
          />
        </div>

        <div>
          <AisFieldLabel>Quote Copilot System Prompt</AisFieldLabel>
          <textarea
            className="dg-input pins-input dg-min-h-[110px]"
            value={prompts.quoteCopilotSystem}
            onChange={(event) => onChangePrompt('quoteCopilotSystem', event.target.value)}
            disabled={loading || saving}
            data-testid="model-settings-quote-prompt-input"
          />
        </div>
      </div>
    </Card>
  );
}
