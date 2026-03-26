'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { Modal, SelectField, TextField } from '@/components/ui';
import { shortCode, titleCase } from '@/features/admin/shared/view-format';
import type { Lead, LeadDetailResponse } from '@/features/admin/leads/types/lead.types';
import type { ConvertLeadToDealInput } from '@/features/admin/deals/types/deal.types';

type DealLinkCardProps = {
  lead: Lead;
  deal?: LeadDetailResponse['deal'] | null;
  dealSuccess: string | null;
  dealError: string | null;
  isCreating: boolean;
  sessionUserId: string;
  onCreateDeal: (payload: ConvertLeadToDealInput) => Promise<void>;
};

export default function DealLinkCard({
  lead,
  deal,
  dealSuccess,
  dealError,
  isCreating,
  sessionUserId,
  onCreateDeal,
}: DealLinkCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [ownerMode, setOwnerMode] = useState<'self' | 'unassigned'>('self');
  const [valueEstimate, setValueEstimate] = useState('');
  const [notes, setNotes] = useState('');

  const probability = useMemo(() => {
    if (priority === 'high') return 75;
    if (priority === 'low') return 30;
    return 50;
  }, [priority]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ownerUserId = ownerMode === 'self' ? sessionUserId || undefined : undefined;
    await onCreateDeal({
      title: `${lead.company_name || lead.contact_name || 'Company'} Opportunity`,
      owner_user_id: ownerUserId,
      expected_value: valueEstimate ? Number(valueEstimate) : 0,
      probability_pct: probability,
      notes: notes.trim() || undefined,
    });
    if (!isCreating) {
      setModalOpen(false);
    }
  }

  return (
    <>
      <div className="dg-card" data-testid="lead-detail-deal-link-card">
        <div className="dg-admin-head">
          <h2 className="dg-title-sm">Deal Link</h2>
          <span className={`dg-badge ${deal ? 'dg-badge-success' : ''}`}>{deal ? 'Linked' : 'No Deal'}</span>
        </div>

        {deal ? (
          <>
            <p className="dg-help">Deal connected to this lead and ready for execution.</p>
            <div className="dg-detail-list">
              <div className="dg-detail-item">
                <span>Deal ID</span>
                <strong>#{shortCode(deal.id)}</strong>
              </div>
              <div className="dg-detail-item">
                <span>Stage</span>
                <strong>{titleCase(deal.stage)}</strong>
              </div>
            </div>
            <div className="dg-hero-actions">
              <Link href={`/admin/deals/${deal.id}`} className="ui-btn ui-btn-primary ui-btn-md">
                Open Deal
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="dg-muted-sm">
              No deal exists for this lead yet. Create one to move into pipeline execution.
            </p>
            <div className="dg-hero-actions">
              <button
                type="button"
                className="ui-btn ui-btn-primary ui-btn-md"
                onClick={() => setModalOpen(true)}
                disabled={isCreating}
              >
                {isCreating ? 'Creating...' : 'Create Deal'}
              </button>
            </div>
          </>
        )}

        {dealSuccess ? <div className="dg-alert-success">{dealSuccess}</div> : null}
        {dealError ? <div className="dg-alert-error">{dealError}</div> : null}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="dg-card p-5 sm:p-6">
          <div className="dg-admin-head">
            <h2 className="dg-title-sm">Create Deal</h2>
            <span className="dg-badge">Lead #{shortCode(lead.id)}</span>
          </div>
          <p className="dg-help mt-2 mb-4">Set priority, owner, and value before creating the deal.</p>

          <form className="dg-config-form" onSubmit={(event) => void handleSubmit(event)}>
            <div className="dg-config-grid aflow-deal-grid">
              <div className="dg-field">
                <label htmlFor="deal-priority" className="dg-label">
                  Priority
                </label>
                <SelectField
                  id="deal-priority"
                  className="aflow-deal-control"
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as 'low' | 'medium' | 'high')}
                >
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="low">Low</option>
                </SelectField>
              </div>
              <div className="dg-field">
                <label htmlFor="deal-owner-mode" className="dg-label">
                  Owner Assignment
                </label>
                <SelectField
                  id="deal-owner-mode"
                  className="aflow-deal-control"
                  value={ownerMode}
                  onChange={(event) => setOwnerMode(event.target.value as 'self' | 'unassigned')}
                >
                  <option value="self">Assign to me (recommended)</option>
                  <option value="unassigned">Leave unassigned</option>
                </SelectField>
                <p className="dg-help">Current probability: {probability}%</p>
              </div>
              <div className="dg-field">
                <label htmlFor="deal-value-estimate" className="dg-label">
                  Value Estimate
                </label>
                <TextField
                  id="deal-value-estimate"
                  className="aflow-deal-control"
                  type="number"
                  min={0}
                  step={0.01}
                  value={valueEstimate}
                  onChange={(event) => setValueEstimate(event.target.value)}
                />
              </div>
            </div>

            <div className="dg-field">
              <label htmlFor="deal-notes" className="dg-label">
                Notes
              </label>
              <textarea
                id="deal-notes"
                className="dg-textarea"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>

            <div className="dg-form-row mt-4 pt-2 border-t border-[var(--color-border)]">
              <button
                type="submit"
                className="ui-btn ui-btn-primary ui-btn-md"
                disabled={isCreating}
              >
                {isCreating ? 'Creating...' : 'Create Deal'}
              </button>
              <button
                type="button"
                className="ui-btn ui-btn-secondary ui-btn-md"
                onClick={() => setModalOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
