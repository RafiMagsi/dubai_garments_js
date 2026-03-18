'use client';

import { useState } from 'react';
import { Button, Card, CardText, CardTitle, SelectField, TextField } from '@/components/ui';
import { approveAndSendReplyStudio, runReplyStudio } from '@/features/admin/ai-sales-agent/api';
import type { ReplyStudioEnvelope } from '@/features/admin/ai-sales-agent/types';
import { AisBadge, AisFieldLabel, AisTrustBadges } from './reusable';

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
  const [dealId, setDealId] = useState('');
  const [quoteId, setQuoteId] = useState('');
  const [editableSubject, setEditableSubject] = useState('');
  const [editableMessage, setEditableMessage] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [sendStatus, setSendStatus] = useState<string | null>(null);

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
        dealId: dealId.trim() || undefined,
        quoteId: quoteId.trim() || undefined,
        mode,
        tone,
        channel,
        userNotes: userNotes.trim() || undefined,
        dry_run: dryRun,
      });

      setResponse(result);
      setEditableSubject(result.data.subject ?? '');
      setEditableMessage(result.data.message ?? '');
      setSendStatus(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run Reply Studio.');
      setResponse(null);
    } finally {
      setLoading(false);
    }
  }
  
  async function handleRegenerate() {
    await handleRun();
  }

  async function handleApproveAndSend() {
    if (!response?.ok) {
        setError('Generate a draft before approving and sending.');
        return;
    }

    if (!leadId.trim() || !editableMessage.trim()) {
        setError('Lead ID and message are required.');
        return;
    }

    try {
        setError(null);
        setSendStatus(null);
        setSendLoading(true);

        await approveAndSendReplyStudio({
        leadId: leadId.trim(),
        subject: editableSubject.trim() || null,
        message: editableMessage.trim(),
        channel,
        });

        setSendStatus('Draft approved and sent successfully.');
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to approve and send.');
    } finally {
        setSendLoading(false);
    }
  }

  return (
    <div className="ars-stack" data-testid="reply-studio-panel">
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
            <AisFieldLabel>Lead ID</AisFieldLabel>
            <TextField
              value={leadId}
              onChange={(event) => setLeadId(event.target.value)}
              placeholder="Lead UUID"
              className="dg-mt-2"
              data-testid="reply-studio-lead-id-input"
            />
          </div>

          <div>
            <AisFieldLabel>Mode</AisFieldLabel>
            <SelectField
              value={mode}
              onChange={(event) =>
                setMode(event.target.value as 'first_reply' | 'followup_reply' | 'clarification_questions')
              }
              className="dg-mt-2"
              data-testid="reply-studio-mode-select"
            >
              <option value="first_reply">First Reply</option>
              <option value="followup_reply">Follow-up Reply</option>
              <option value="clarification_questions">Clarification Questions</option>
            </SelectField>
          </div>

          <div>
            <AisFieldLabel>Tone</AisFieldLabel>
            <SelectField
              value={tone}
              onChange={(event) =>
                setTone(event.target.value as 'concise' | 'formal' | 'persuasive')
              }
              className="dg-mt-2"
              data-testid="reply-studio-tone-select"
            >
              <option value="concise">Concise</option>
              <option value="formal">Formal</option>
              <option value="persuasive">Persuasive</option>
            </SelectField>
          </div>

          <div>
            <AisFieldLabel>Channel</AisFieldLabel>
            <SelectField
              value={channel}
              onChange={(event) =>
                setChannel(event.target.value as 'email' | 'whatsapp')
              }
              className="dg-mt-2"
              data-testid="reply-studio-channel-select"
            >
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
            </SelectField>
          </div>
          <div>
            <AisFieldLabel>Deal ID</AisFieldLabel>
            <TextField
                value={dealId}
                onChange={(event) => setDealId(event.target.value)}
                placeholder="Optional Deal UUID"
                className="dg-mt-2"
                data-testid="reply-studio-deal-id-input"
            />
            </div>

            <div>
            <AisFieldLabel>Quote ID</AisFieldLabel>
            <TextField
                value={quoteId}
                onChange={(event) => setQuoteId(event.target.value)}
                placeholder="Optional Quote UUID"
                className="dg-mt-2"
                data-testid="reply-studio-quote-id-input"
            />
          </div>
        </div>

        <div className="ars-notes">
          <AisFieldLabel>Notes</AisFieldLabel>
          <textarea
            value={userNotes}
            onChange={(event) => setUserNotes(event.target.value)}
            placeholder="Optional instructions for rewrite or context"
            className="dg-input dg-mt-2"
            rows={2}
            data-testid="reply-studio-notes-input"
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
            {loading ? 'Generating trusted draft...' : 'Run Reply Studio'}
          </Button>
        </div>
      </Card>

      {error ? (
        <Card className="ars-card ars-card-error" data-testid="reply-studio-error-card">
          <CardTitle>Reply Studio Error</CardTitle>
          <CardText>{error}</CardText>
        </Card>
      ) : null}

      {response?.ok ? (
        <div className="ars-output-area">
            <Card className="ars-card ars-output-card" data-testid="reply-studio-draft-output-card">
            <CardTitle>Draft Output</CardTitle>
            <AisTrustBadges
              processingMs={response.processingMs}
              fallbackUsed={response.fallbackUsed}
              provider={response.provider}
              source={response.source}
            />

            <div
            className="dg-mt-4 dg-rounded-xl dg-border dg-p-4"
            style={{
                borderColor: response.fallbackUsed ? '#fed7aa' : '#bfdbfe',
                background: response.fallbackUsed ? '#fff7ed' : '#eff6ff',
            }}
            >
            <div className="dg-text-xs dg-font-semibold dg-uppercase dg-tracking-wide">
                Draft Trust Status
            </div>
            <div className="dg-mt-2 dg-text-sm">
                Provider: {response.provider} · Source: {response.source} ·
                {response.fallbackUsed ? ' Fallback mode used.' : ' Primary path used.'}
            </div>
            {response.failureReason ? (
                <div className="dg-mt-2 dg-text-sm dg-text-neutral-600">
                Reason: {response.failureReason}
                </div>
            ) : null}
            </div>

            {response.data.subject ? (
                <div className="ars-subject-block">
                <div className="ars-label">Subject</div>
                <TextField
                    value={editableSubject}
                    onChange={(event) => setEditableSubject(event.target.value)}
                    placeholder="Optional subject"
                    className="ars-subject-input"
                    data-testid="reply-studio-subject-input"
                />
                </div>            
            ) : null}

            <div className="ars-output-block">
                <div className="ars-label">Message</div>
                <div className="ars-message-box ars-message-box-editable">
                  <textarea
                      value={editableMessage}
                      onChange={(event) => setEditableMessage(event.target.value)}
                      className="ars-message-editor"
                      rows={8}
                      data-testid="reply-studio-message-input"
                  />
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
              <AisBadge tone="slate">Mode: {response.data.mode}</AisBadge>
              <AisBadge tone="slate">Tone: {response.data.tone}</AisBadge>
              <AisBadge tone="blue">Confidence: {response.data.confidence}%</AisBadge>
            </div>

            <div className="ars-send-actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleRegenerate}
                  disabled={loading}
                  data-testid="reply-studio-regenerate-btn"
                  className="ars-send-btn"
                >
                    {loading ? 'Regenerating...' : 'Regenerate'}
                </Button>

                <Button
                  type="button"
                  onClick={handleApproveAndSend}
                  disabled={sendLoading}
                  data-testid="reply-studio-approve-send-btn"
                  className="ars-send-btn ars-send-btn-primary"
                >
                    {sendLoading ? 'Sending...' : 'Approve and Send'}
                </Button>
            </div>

            {sendStatus ? (
                <div className="ars-send-status" data-testid="reply-studio-send-status">
                    {sendStatus}
                </div>
            ) : null}
            
          </Card>

          {response.data.questions?.length > 0 ? (
            <Card className="ars-card ars-output-card ars-questions-card">
              <CardTitle>Clarification Questions</CardTitle>
              <ul className="ars-question-list">
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
