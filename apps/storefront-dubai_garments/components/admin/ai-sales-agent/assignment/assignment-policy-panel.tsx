'use client';

import { useEffect, useState } from 'react';
import { Button, Card, CardText, CardTitle, SelectField, TextField } from '@/components/ui';
import { getAssignmentPolicy, updateAssignmentPolicy } from '@/features/admin/ai-sales-agent/api';
import type { AssignmentMode, AssignmentPolicyAgent, AssignmentPolicyConfig } from '@/features/admin/ai-sales-agent/types';
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [config, setConfig] = useState<AssignmentPolicyConfig | null>(null);
  const [agents, setAgents] = useState<AssignmentPolicyAgent[]>([]);

  const [fallbackAssigneeUserId, setFallbackAssigneeUserId] = useState('');
  const [capacityInput, setCapacityInput] = useState('');
  const [skillsInput, setSkillsInput] = useState('');

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

  return (
    <Card className="asgn-card">
      <div className="asgn-head">
        <div>
          <p className="aflow-kicker">Assignment Policy</p>
          <CardTitle>Routing Defaults and Capacity Rules</CardTitle>
          <CardText>
            Configure how new ownership is assigned. Live reassignment actions are handled in Operations Board.
          </CardText>
        </div>
      </div>

      {loading || !config ? (
        <p className="aflow-empty">Loading assignment policy...</p>
      ) : (
        <>
          <div className="asgn-grid asgn-grid--policy">
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
              <p className="aflow-mini-title">Advanced Rules (Optional)</p>
              <CardText>
                Use only when you need explicit per-agent capacity weights or skill tags. Leave empty for default behavior.
              </CardText>

              <div className="dg-mt-3">
                <AisFieldLabel>Capacity Weights</AisFieldLabel>
              </div>
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
              <CardText>Format: `userId:tag,tag; userId2:tag`.</CardText>
            </div>
          </div>

          <div className="asgn-actions">
            <Button type="button" size="sm" variant="secondary" onClick={() => void load()} disabled={loading || saving}>
              Reload
            </Button>
            <Button type="button" size="sm" onClick={() => void handleSave()} disabled={saving}>
              {saving ? 'Saving...' : 'Save Policy'}
            </Button>
          </div>

          {success ? <p className="asgn-success">{success}</p> : null}
          {error ? <p className="asgn-error">{error}</p> : null}
        </>
      )}
    </Card>
  );
}
