'use client';

import { FormEvent, useEffect, useState } from 'react';
import type { Deal, DealStage, DealUpdateInput } from '@/features/admin/deals/types/deal.types';
import { titleCase } from '@/features/admin/shared/view-format';

type UpdateDealCardProps = {
  deal: Deal;
  stageOptions: DealStage[];
  sessionUserId: string;
  isPending: boolean;
  success: string | null;
  error: string | null;
  onSubmit: (payload: DealUpdateInput) => Promise<void>;
};

export default function UpdateDealCard({
  deal,
  stageOptions,
  sessionUserId,
  isPending,
  success,
  error,
  onSubmit,
}: UpdateDealCardProps) {
  const [ownerDraft, setOwnerDraft] = useState('');
  const [ownerMode, setOwnerMode] = useState<'self' | 'unassigned' | 'custom'>('unassigned');

  useEffect(() => {
    if (deal.owner_user_id) {
      if (sessionUserId && deal.owner_user_id === sessionUserId) {
        setOwnerMode('self');
        setOwnerDraft(sessionUserId);
      } else {
        setOwnerMode('custom');
        setOwnerDraft(deal.owner_user_id);
      }
      return;
    }
    if (sessionUserId) {
      setOwnerMode('self');
      setOwnerDraft(sessionUserId);
      return;
    }
    setOwnerMode('unassigned');
    setOwnerDraft('');
  }, [deal.id, deal.owner_user_id, sessionUserId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const stage = String(formData.get('stage') || '').toLowerCase() as DealStage;
    const valueEstimate = Number(formData.get('value_estimate') || 0);
    const probability = Number(formData.get('probability_pct') || 0);
    const ownerUserIdRaw = String(formData.get('owner_user_id') || '').trim();
    const ownerModeRaw = String(formData.get('owner_mode') || ownerMode);
    const notes = String(formData.get('notes') || '').trim();

    const ownerUserId =
      ownerModeRaw === 'self'
        ? sessionUserId || ownerUserIdRaw || undefined
        : ownerModeRaw === 'unassigned'
          ? undefined
          : ownerUserIdRaw || undefined;

    await onSubmit({
      stage,
      owner_user_id: ownerUserId,
      expected_value: Number.isNaN(valueEstimate) ? undefined : valueEstimate,
      probability_pct: Number.isNaN(probability) ? undefined : probability,
      notes: notes || undefined,
    });
  }

  return (
    <div className="dg-card">
      <h2 className="dg-title-sm">Update Deal</h2>
      {success ? <div className="dg-alert-success">{success}</div> : null}
      {error ? <div className="dg-alert-error">{error}</div> : null}
      <form className="dg-config-form" onSubmit={(event) => void handleSubmit(event)}>
        <div className="dg-config-grid aflow-deal-grid">
          <div className="dg-field">
            <label htmlFor="stage" className="dg-label">
              Stage
            </label>
            <select id="stage" name="stage" className="dg-select" defaultValue={deal.stage} required>
              {stageOptions.map((stage) => (
                <option key={stage} value={stage}>
                  {titleCase(stage)}
                </option>
              ))}
            </select>
          </div>
          <div className="dg-field">
            <label htmlFor="probability_pct" className="dg-label">
              Priority (Probability %)
            </label>
            <input
              id="probability_pct"
              name="probability_pct"
              type="number"
              min={0}
              max={100}
              className="dg-input"
              defaultValue={deal.probability_pct}
            />
          </div>
          <div className="dg-field">
            <label htmlFor="value_estimate" className="dg-label">
              Value Estimate
            </label>
            <input
              id="value_estimate"
              name="value_estimate"
              type="number"
              step="0.01"
              min={0}
              className="dg-input aflow-deal-control"
              defaultValue={deal.expected_value}
            />
          </div>
          <div className="dg-field">
            <label htmlFor="owner_mode" className="dg-label">
              Owner Assignment
            </label>
            <select
              id="owner_mode"
              name="owner_mode"
              className="dg-select aflow-deal-control"
              value={ownerMode}
              onChange={(event) => {
                const nextMode = event.target.value as 'self' | 'unassigned' | 'custom';
                setOwnerMode(nextMode);
                if (nextMode === 'self') setOwnerDraft(sessionUserId);
                if (nextMode === 'unassigned') setOwnerDraft('');
              }}
            >
              <option value="self">Assign to me (recommended)</option>
              <option value="unassigned">Leave unassigned</option>
              <option value="custom">Assign by user ID</option>
            </select>
            <p className="dg-help">Sales default keeps deal ownership on current signed-in user.</p>
          </div>
          <div className="dg-field">
            <label htmlFor="owner_user_id" className="dg-label">
              Owner User ID (for custom assignment)
            </label>
            <input
              id="owner_user_id"
              name="owner_user_id"
              type="text"
              className="dg-input"
              value={ownerDraft}
              onChange={(event) => setOwnerDraft(event.target.value)}
              placeholder="Enter owner user UUID"
              disabled={ownerMode !== 'custom'}
            />
            <div className="dg-form-row mt-2">
              <button
                type="button"
                className="ui-btn ui-btn-secondary ui-btn-sm"
                onClick={() => {
                  setOwnerMode('self');
                  setOwnerDraft(sessionUserId);
                }}
                disabled={!sessionUserId}
              >
                Assign to me
              </button>
              <button
                type="button"
                className="ui-btn ui-btn-secondary ui-btn-sm"
                onClick={() => {
                  setOwnerMode('unassigned');
                  setOwnerDraft('');
                }}
              >
                Unassign
              </button>
            </div>
          </div>
        </div>
        <div className="dg-field">
          <label htmlFor="notes" className="dg-label">
            Notes
          </label>
          <textarea id="notes" name="notes" className="dg-textarea" rows={5} defaultValue={deal.notes || ''} />
        </div>
        <button type="submit" className="ui-btn ui-btn-primary ui-btn-md" disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Deal'}
        </button>
      </form>
    </div>
  );
}

