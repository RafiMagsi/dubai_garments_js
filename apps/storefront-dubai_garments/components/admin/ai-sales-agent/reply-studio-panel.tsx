'use client';

import { useState } from 'react';
import { Button, Card, CardText, CardTitle, SelectField, TextField } from '@/components/ui';
import { runReplyStudio } from '@/features/admin/ai-sales-agent/api';
import type { ReplyStudioEnvelope } from '@/features/admin/ai-sales-agent/types';

type ReplyStudioPanelProps = {
  showHeading?: boolean;
};

export default function ReplyStudioPanel({ showHeading = true }: ReplyStudioPanelProps) {
  const [leadId, setLeadId] = useState('');
  const [mode, setMode] = useState<'first_reply' | 'followup_reply' | 'clarification_questions'>('first_reply');
  const [tone, setTone] = useState<'concise' | 'formal' | 'persuasive'>('formal');
  const [channel, setChannel] = useState<'email' | 'whatsapp'>('email');
  const [dryRun, setDryRun] = useState(true);
  const [userNotes, setUserNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ReplyStudioEnvelope | null>(null);

  async function handleRun() {
    if (!leadId.trim()) {
      setResponse(null);
      setError('Insert Lead ID.');
      return;
    }

    try {
      setError(null);
      setLoading(true);

      const result = await runReplyStudio({
        leadId: leadId.trim(),
        mode,
        tone,
        channel,
        userNotes: userNotes.trim() || undefined,
        dry_run: dryRun,
      });

      setResponse(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run Reply Studio.');
      setResponse(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ars-stack">
      <Card className="ars-card ars-composer-card">
        {showHeading ? (
          <>
            <CardTitle>Reply Studio</CardTitle>
            <CardText>
              Generate first reply drafts, follow-up drafts, clarification questions, and rewrite tones.
            </CardText>
          </>
        ) : null}

        <div className="ars-grid">
          <div>
            <label className="dg-text-xs dg-font-semibold dg-uppercase dg-tracking-wide dg-text-neutral-500">
              Lead ID
            </label>
            <TextField
              value={leadId}
              onChange={(event) => setLeadId(event.target.value)}
              placeholder="Lead UUID"
              className="dg-mt-2"
            />
          </div>

          <div>
            <label className="dg-text-xs dg-font-semibold dg-uppercase dg-tracking-wide dg-text-neutral-500">
              Mode
            </label>
            <SelectField
              value={mode}
              onChange={(event) =>
                setMode(event.target.value as 'first_reply' | 'followup_reply' | 'clarification_questions')
              }
              className="dg-mt-2"
            >
              <option value="first_reply">First Reply</option>
              <option value="followup_reply">Follow-up Reply</option>
              <option value="clarification_questions">Clarification Questions</option>
            </SelectField>
          </div>

          <div>
            <label className="dg-text-xs dg-font-semibold dg-uppercase dg-tracking-wide dg-text-neutral-500">
              Tone
            </label>
            <SelectField
              value={tone}
              onChange={(event) =>
                setTone(event.target.value as 'concise' | 'formal' | 'persuasive')
              }
              className="dg-mt-2"
            >
              <option value="concise">Concise</option>
              <option value="formal">Formal</option>
              <option value="persuasive">Persuasive</option>
            </SelectField>
          </div>

          <div>
            <label className="dg-text-xs dg-font-semibold dg-uppercase dg-tracking-wide dg-text-neutral-500">
              Channel
            </label>
            <SelectField
              value={channel}
              onChange={(event) =>
                setChannel(event.target.value as 'email' | 'whatsapp')
              }
              className="dg-mt-2"
            >
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
            </SelectField>
          </div>
        </div>

        <div className="ars-notes">
          <label className="dg-text-xs dg-font-semibold dg-uppercase dg-tracking-wide dg-text-neutral-500">
            Notes
          </label>
          <textarea
            value={userNotes}
            onChange={(event) => setUserNotes(event.target.value)}
            placeholder="Optional instructions for rewrite or context"
            className="dg-input dg-mt-2"
            rows={2}
          />
        </div>

        <div className="ars-actions">
          <label className="dg-flex dg-items-center dg-gap-2 dg-text-sm">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(event) => setDryRun(event.target.checked)}
            />
            Dry run
          </label>

          <Button type="button" onClick={handleRun} disabled={loading}>
            {loading ? 'Generating...' : 'Run Reply Studio'}
          </Button>
        </div>
      </Card>

      {error ? (
        <Card className="ars-card ars-card-error">
          <CardTitle>Reply Studio Error</CardTitle>
          <CardText>{error}</CardText>
        </Card>
      ) : null}

      {response?.ok ? (
        <div className="ars-output-area">
          <Card className="ars-card ars-output-card">
            <CardTitle>Draft Output</CardTitle>
            <CardText>
              Source: {response.source} · Provider: {response.provider} ·
              {response.fallbackUsed ? ' Fallback' : ' Primary'}
            </CardText>

            {response.data.subject ? (
              <div className="ars-subject-block">
                <div className="ars-label">
                  Subject
                </div>
                <div className="ars-subject-box">
                  {response.data.subject}
                </div>
              </div>
            ) : null}

            <div className="ars-output-block">
              <div className="ars-label">
                Message
              </div>
              <div className="ars-message-box">
                <pre className="ars-pre">
                  {response.data.message}
                </pre>
              </div>
            </div>

            <div className="ars-meta-grid">
              <div className="ars-meta-card is-rationale">
                <div className="ars-label">
                  Rationale
                </div>
                <div className="dg-mt-2 dg-text-sm dg-text-neutral-800">
                  {response.data.rationale}
                </div>
              </div>

              <div className="ars-meta-card is-next">
                <div className="ars-label">
                  Suggested Next Action
                </div>
                <div className="dg-mt-2 dg-text-sm dg-text-neutral-800">
                  {response.data.suggestedNextAction}
                </div>
              </div>
            </div>

            <div className="ars-badges">
              <span className="dg-badge">Mode: {response.data.mode}</span>
              <span className="dg-badge">Tone: {response.data.tone}</span>
              <span className="dg-badge">Confidence: {response.data.confidence}%</span>
            </div>
          </Card>

          {response.data.questions?.length > 0 ? (
            <Card className="ars-card ars-output-card">
              <CardTitle>Clarification Questions</CardTitle>
              <ul className="dg-mt-3 dg-list-disc dg-pl-5 dg-text-sm dg-text-neutral-800">
                {response.data.questions.map((question: string, index: number) => (
                  <li key={`${question}-${index}`}>{question}</li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
