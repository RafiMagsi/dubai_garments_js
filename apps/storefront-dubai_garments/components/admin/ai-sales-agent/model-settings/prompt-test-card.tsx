'use client';

import { Button, Card, CardText, CardTitle, SelectField, TextField } from '@/components/ui';
import { AisFieldLabel } from '@/components/admin/ai-sales-agent/reusable';
import type { AiPromptTestRequest } from '@/features/admin/ai-sales-agent/types';

type Props = {
  loading: boolean;
  testInput: AiPromptTestRequest;
  onChange: (next: AiPromptTestRequest) => void;
  onRun: () => Promise<void> | void;
};

export default function PromptTestCard({
  loading,
  testInput,
  onChange,
  onRun,
}: Props) {
  return (
    <Card className="pins-card" data-testid="model-settings-prompt-test-card">
      <CardTitle>Test Prompt Panel</CardTitle>
      <CardText className="pins-muted">
        Run a live prompt test with current unsaved settings and preview structured parsing.
      </CardText>

      <div className="pins-grid">
        <div>
          <AisFieldLabel>Feature</AisFieldLabel>
          <SelectField
            className="pins-input"
            value={testInput.feature}
            onChange={(event) =>
              onChange({ ...testInput, feature: event.target.value as AiPromptTestRequest['feature'] })
            }
            data-testid="model-settings-test-feature-select"
          >
            <option value="copilot">Copilot</option>
            <option value="reply_studio">Reply Studio</option>
            <option value="quote_copilot">Quote Copilot</option>
          </SelectField>
        </div>

        <div>
          <AisFieldLabel>Lead ID (optional)</AisFieldLabel>
          <TextField
            className="pins-input"
            value={testInput.context?.leadId ?? ''}
            onChange={(event) =>
              onChange({
                ...testInput,
                context: {
                  ...testInput.context,
                  leadId: event.target.value || undefined,
                },
              })
            }
            placeholder="Lead UUID"
            data-testid="model-settings-test-lead-id-input"
          />
        </div>

        <div>
          <AisFieldLabel>Deal ID (optional)</AisFieldLabel>
          <TextField
            className="pins-input"
            value={testInput.context?.dealId ?? ''}
            onChange={(event) =>
              onChange({
                ...testInput,
                context: {
                  ...testInput.context,
                  dealId: event.target.value || undefined,
                },
              })
            }
            placeholder="Deal UUID"
            data-testid="model-settings-test-deal-id-input"
          />
        </div>

        <div>
          <AisFieldLabel>Channel (optional)</AisFieldLabel>
          <SelectField
            className="pins-input"
            value={testInput.context?.channel ?? ''}
            onChange={(event) =>
              onChange({
                ...testInput,
                context: {
                  ...testInput.context,
                  channel:
                    event.target.value === ''
                      ? undefined
                      : (event.target.value as 'email' | 'whatsapp'),
                },
              })
            }
            data-testid="model-settings-test-channel-select"
          >
            <option value="">Auto</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
          </SelectField>
        </div>

        <div>
          <AisFieldLabel>Tone (optional)</AisFieldLabel>
          <SelectField
            className="pins-input"
            value={testInput.context?.tone ?? ''}
            onChange={(event) =>
              onChange({
                ...testInput,
                context: {
                  ...testInput.context,
                  tone:
                    event.target.value === ''
                      ? undefined
                      : (event.target.value as 'professional' | 'friendly' | 'persuasive'),
                },
              })
            }
            data-testid="model-settings-test-tone-select"
          >
            <option value="">Auto</option>
            <option value="professional">Professional</option>
            <option value="friendly">Friendly</option>
            <option value="persuasive">Persuasive</option>
          </SelectField>
        </div>
      </div>

      <div>
        <AisFieldLabel>Test Input</AisFieldLabel>
        <textarea
          className="dg-input pins-input dg-min-h-[120px]"
          value={testInput.input}
          onChange={(event) => onChange({ ...testInput, input: event.target.value })}
          placeholder="Enter test prompt input..."
          data-testid="model-settings-test-input-textarea"
        />
      </div>

      <div className="pins-actions">
        <Button
          type="button"
          onClick={onRun}
          disabled={loading}
          data-testid="model-settings-run-test-btn"
        >
          {loading ? 'Running prompt test...' : 'Run Prompt Test'}
        </Button>
      </div>
    </Card>
  );
}
