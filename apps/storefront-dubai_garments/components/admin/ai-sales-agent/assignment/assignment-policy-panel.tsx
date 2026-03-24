'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Card, CardText, CardTitle, SelectField, TextField } from '@/components/ui';
import {
  executeAssignmentPolicy,
  getAssignmentPolicy,
  updateAssignmentPolicy,
} from '@/features/admin/ai-sales-agent/api';
import type {
  AssignmentMode,
  AssignmentPolicyAgent,
  AssignmentPolicyConfig,
  AssignmentPolicyExecuteEnvelope,
} from '@/features/admin/ai-sales-agent/types';
import { AisFieldLabel } from '@/components/admin/ai-sales-agent/reusable';

const modeOptions: Array<{ value: AssignmentMode; label: string }> = [
  { value: 'round_robin', label: 'Round Robin' },
  { value: 'weighted_capacity', label: 'Weighted Capacity' },
  { value: 'skill_tag_based', label: 'Skill/Tag Based' },
  { value: 'manual_override', label: 'Manual Override' },
];

function parseCapacityMap(input: string): Record<string, number> {
  const result: Record<string, number> = {};
  input
    .split(',')
    .map((row) => row.trim())
    .filter(Boolean)
    .forEach((row) => {
      const [userId, weightRaw] = row.split(':').map((x) => x.trim());
      const weight = Number(weightRaw);
      if (userId && Number.isFinite(weight) && weight > 0) {
        result[userId] = Math.round(weight);
      }
    });
  return result;
}

function parseSkillsMap(input: string): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  input
    .split(';')
    .map((row) => row.trim())
    .filter(Boolean)
    .forEach((row) => {
      const [userId, tagsRaw] = row.split(':').map((x) => x.trim());
      if (!userId || !tagsRaw) return;
      const tags = tagsRaw
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
      if (tags.length > 0) {
        result[userId] = tags;
      }
    });
  return result;
}

function formatCapacityMap(map: Record<string, number>) {
  return Object.entries(map)
    .map(([key, value]) => `${key}:${value}`)
    .join(', ');
}

function formatSkillsMap(map: Record<string, string[]>) {
  return Object.entries(map)
    .map(([key, values]) => `${key}:${values.join(',')}`)
    .join('; ');
}

export default function AssignmentPolicyPanel() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [config, setConfig] = useState<AssignmentPolicyConfig | null>(null);
  const [agents, setAgents] = useState<AssignmentPolicyAgent[]>([]);

  const [fallbackAssigneeUserId, setFallbackAssigneeUserId] = useState('');
  const [capacityInput, setCapacityInput] = useState('');
  const [skillsInput, setSkillsInput] = useState('');

  const [leadId, setLeadId] = useState('');
  const [dealId, setDealId] = useState('');
  const [manualAssigneeUserId, setManualAssigneeUserId] = useState('');
  const [reason, setReason] = useState('');
  const [executeResult, setExecuteResult] = useState<AssignmentPolicyExecuteEnvelope | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const result = await getAssignmentPolicy();
      setConfig(result.config);
      setAgents(result.availableAgents);
      setFallbackAssigneeUserId(result.config.fallbackAssigneeUserId ?? '');
      setCapacityInput(formatCapacityMap(result.config.capacityByUserId));
      setSkillsInput(formatSkillsMap(result.config.skillsByUserId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assignment policy.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const sortedAgents = useMemo(
    () => [...agents].sort((a, b) => a.weightedLoad - b.weightedLoad),
    [agents]
  );

  async function handleSave() {
    if (!config) return;
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const payload: AssignmentPolicyConfig = {
        ...config,
        fallbackAssigneeUserId: fallbackAssigneeUserId.trim() || null,
        capacityByUserId: parseCapacityMap(capacityInput),
        skillsByUserId: parseSkillsMap(skillsInput),
      };

      const result = await updateAssignmentPolicy({ config: payload });
      setConfig(result.config);
      setAgents(result.availableAgents);
      setSuccess('Assignment policy updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save assignment policy.');
    } finally {
      setSaving(false);
    }
  }

  async function handleExecute() {
    try {
      setExecuting(true);
      setError(null);
      setSuccess(null);
      setExecuteResult(null);
      const result = await executeAssignmentPolicy({
        leadId: leadId.trim() || undefined,
        dealId: dealId.trim() || undefined,
        manualAssigneeUserId: manualAssigneeUserId.trim() || undefined,
        reason: reason.trim() || undefined,
        dry_run: false,
      });
      setExecuteResult(result);
      setSuccess(`Assignment executed using ${result.mode} mode.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute assignment policy.');
    } finally {
      setExecuting(false);
    }
  }

  return (
    <Card className="asgn-card">
      <div className="asgn-head">
        <div>
          <p className="aflow-kicker">Assignment Policy Engine</p>
          <CardTitle>Sales Agent Assignment Management</CardTitle>
          <CardText>Configure routing rules and assign leads/deals with deterministic manager controls.</CardText>
        </div>
      </div>

      {loading || !config ? (
        <p className="aflow-empty">Loading assignment policy...</p>
      ) : (
        <>
          <div className="asgn-grid">
            <div className="asgn-panel">
              <AisFieldLabel>Assignment Mode</AisFieldLabel>
              <SelectField
                className="dg-mt-1"
                value={config.mode}
                onChange={(event) =>
                  setConfig((prev) => (prev ? { ...prev, mode: event.target.value as AssignmentMode } : prev))
                }
                data-testid="assignment-policy-mode"
              >
                {modeOptions.map((mode) => (
                  <option key={`mode-${mode.value}`} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </SelectField>

              <div className="dg-mt-3">
                <AisFieldLabel>Fallback Assignee</AisFieldLabel>
              </div>
              <SelectField
                className="dg-mt-1"
                value={fallbackAssigneeUserId}
                onChange={(event) => setFallbackAssigneeUserId(event.target.value)}
              >
                <option value="">None</option>
                {agents.map((agent) => (
                  <option key={`fallback-${agent.id}`} value={agent.id}>
                    {agent.fullName} ({agent.role})
                  </option>
                ))}
              </SelectField>

              <div className="dg-mt-3">
                <AisFieldLabel>Weighted Lead Multiplier</AisFieldLabel>
              </div>
              <TextField
                className="dg-mt-1"
                value={String(config.weightedLeadMultiplier)}
                onChange={(event) =>
                  setConfig((prev) =>
                    prev ? { ...prev, weightedLeadMultiplier: Math.max(1, Number(event.target.value) || 1) } : prev
                  )
                }
              />

              <div className="dg-mt-3">
                <AisFieldLabel>Weighted Deal Multiplier</AisFieldLabel>
              </div>
              <TextField
                className="dg-mt-1"
                value={String(config.weightedDealMultiplier)}
                onChange={(event) =>
                  setConfig((prev) =>
                    prev ? { ...prev, weightedDealMultiplier: Math.max(1, Number(event.target.value) || 1) } : prev
                  )
                }
              />
            </div>

            <div className="asgn-panel">
              <AisFieldLabel>Capacity Weights</AisFieldLabel>
              <TextField
                className="dg-mt-1"
                value={capacityInput}
                onChange={(event) => setCapacityInput(event.target.value)}
                placeholder="userId:2, userId2:1"
              />
              <CardText>Format: `userId:weight`, comma separated.</CardText>

              <div className="dg-mt-3">
                <AisFieldLabel>Skill Tags</AisFieldLabel>
              </div>
              <TextField
                className="dg-mt-1"
                value={skillsInput}
                onChange={(event) => setSkillsInput(event.target.value)}
                placeholder="userId:uniform,jacket; userId2:cap,hoodie"
              />
              <CardText>Format: `userId:tag,tag; userId2:tag`</CardText>
            </div>

            <div className="asgn-panel">
              <AisFieldLabel>Execute Assignment (Lead ID / Deal ID)</AisFieldLabel>
              <TextField
                className="dg-mt-1"
                value={leadId}
                onChange={(event) => setLeadId(event.target.value)}
                placeholder="Lead ID"
              />
              <TextField
                className="dg-mt-2"
                value={dealId}
                onChange={(event) => setDealId(event.target.value)}
                placeholder="Deal ID"
              />
              <SelectField
                className="dg-mt-2"
                value={manualAssigneeUserId}
                onChange={(event) => setManualAssigneeUserId(event.target.value)}
              >
                <option value="">No manual assignee</option>
                {agents.map((agent) => (
                  <option key={`manual-${agent.id}`} value={agent.id}>
                    {agent.fullName}
                  </option>
                ))}
              </SelectField>
              <TextField
                className="dg-mt-2"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Optional reason"
              />
              <div className="asgn-actions">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void handleSave()}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Policy'}
                </Button>
                <Button type="button" size="sm" onClick={() => void handleExecute()} disabled={executing}>
                  {executing ? 'Assigning...' : 'Run Assignment'}
                </Button>
              </div>
            </div>
          </div>

          {success ? <p className="asgn-success">{success}</p> : null}
          {error ? <p className="asgn-error">{error}</p> : null}

          {executeResult ? (
            <div className="asgn-result">
              <p className="aflow-mini-title">Execution Result</p>
              <p className="aflow-empty">
                Mode: <strong>{executeResult.mode}</strong> · Selected: <strong>{executeResult.selectedAssigneeName ?? 'n/a'}</strong> · Applied:{' '}
                <strong>{executeResult.assignmentApplied ? 'Yes' : 'No'}</strong>
              </p>
              <ul className="aflow-mini-list">
                {executeResult.reasoning.map((line, index) => (
                  <li key={`reasoning-${index}`}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="asgn-agent-grid">
            {sortedAgents.map((agent) => (
              <div className="asgn-agent-card" key={`agent-${agent.id}`}>
                <p className="asgn-agent-name">{agent.fullName}</p>
                <p className="asgn-agent-meta">
                  {agent.role} · Load {agent.weightedLoad}
                </p>
                <p className="asgn-agent-meta">
                  Leads {agent.openLeadCount} · Deals {agent.openDealCount} · Capacity {agent.capacityWeight}
                </p>
                <p className="asgn-agent-tags">
                  {agent.skillTags.length > 0 ? agent.skillTags.join(', ') : 'No skill tags'}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
