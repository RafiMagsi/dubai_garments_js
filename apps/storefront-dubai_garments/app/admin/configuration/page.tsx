'use client';

import { useState } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import {
  useConfigurationEnv,
  useConfigurationScripts,
  useRunConfigurationScript,
  useSaveConfigurationEnv,
} from '@/features/admin/configuration';
import {
  ConfigEnvItem,
  ConfigScriptItem,
} from '@/features/admin/configuration/types/configuration.types';

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function titleCase(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusBadgeClass(status?: string | null) {
  if (!status) return 'dg-status-pill';
  if (status === 'success') return 'dg-status-pill';
  if (status === 'failed') return 'dg-status-pill dg-status-pill-LOST';
  if (status === 'running') return 'dg-status-pill dg-status-pill-NEW';
  if (status === 'queued') return 'dg-status-pill dg-status-pill-QUALIFIED';
  return 'dg-status-pill';
}

function defaultInputMap(script: ConfigScriptItem) {
  const map: Record<string, string> = {};
  (script.inputs || []).forEach((field) => {
    map[field.key] = String(field.defaultValue ?? '');
  });
  return map;
}

export default function AdminConfigurationPage() {
  const envQuery = useConfigurationEnv();
  const saveEnvMutation = useSaveConfigurationEnv();
  const scriptsQuery = useConfigurationScripts();
  const runMutation = useRunConfigurationScript();

  const scripts = scriptsQuery.data?.items ?? [];
  const envItems = envQuery.data?.items ?? [];
  const [inputsByScript, setInputsByScript] = useState<Record<string, Record<string, string>>>({});
  const [lastResultByScript, setLastResultByScript] = useState<Record<string, string>>({});
  const [envDraft, setEnvDraft] = useState<Record<string, string>>({});
  const [envSaveMessage, setEnvSaveMessage] = useState<Record<string, string>>({});

  const categories = scripts.reduce<Record<string, number>>((acc, script) => {
    acc[script.category] = (acc[script.category] || 0) + 1;
    return acc;
  }, {});
  const scriptsByCategory = scripts.reduce<Record<string, ConfigScriptItem[]>>((acc, script) => {
    if (!acc[script.category]) {
      acc[script.category] = [];
    }
    acc[script.category].push(script);
    return acc;
  }, {});
  const envByTarget = envItems.reduce<Record<string, ConfigEnvItem[]>>((acc, item) => {
    if (!acc[item.target]) {
      acc[item.target] = [];
    }
    acc[item.target].push(item);
    return acc;
  }, {});

  function getScriptInput(script: ConfigScriptItem, key: string) {
    if (inputsByScript[script.key]?.[key] !== undefined) {
      return inputsByScript[script.key][key];
    }
    const field = (script.inputs || []).find((item) => item.key === key);
    return String(field?.defaultValue ?? '');
  }

  function handleInputChange(scriptKey: string, key: string, value: string) {
    setInputsByScript((prev) => ({
      ...prev,
      [scriptKey]: {
        ...(prev[scriptKey] || {}),
        [key]: value,
      },
    }));
  }

  function envDraftKey(item: ConfigEnvItem) {
    return `${item.target}:${item.key}`;
  }

  function getEnvValue(item: ConfigEnvItem) {
    const key = envDraftKey(item);
    if (envDraft[key] !== undefined) {
      return envDraft[key];
    }
    return item.value || '';
  }

  function handleEnvChange(item: ConfigEnvItem, value: string) {
    const key = envDraftKey(item);
    setEnvDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSaveEnv(item: ConfigEnvItem) {
    const key = envDraftKey(item);
    const value = envDraft[key] !== undefined ? envDraft[key] : item.value || '';
    try {
      const response = await saveEnvMutation.mutateAsync({
        target: item.target,
        key: item.key,
        value,
      });
      setEnvSaveMessage((prev) => ({
        ...prev,
        [key]: `${response.message} Restart required.`,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save env variable.';
      setEnvSaveMessage((prev) => ({ ...prev, [key]: message }));
    }
  }

  async function handleRun(script: ConfigScriptItem) {
    const source = inputsByScript[script.key] || defaultInputMap(script);
    const parsedInput: Record<string, unknown> = {};

    (script.inputs || []).forEach((field) => {
      const raw = String(source[field.key] ?? '').trim();
      if (!raw) {
        return;
      }
      if (field.type === 'number') {
        parsedInput[field.key] = Number(raw);
        return;
      }
      parsedInput[field.key] = raw;
    });

    try {
      const response = await runMutation.mutateAsync({
        scriptKey: script.key,
        payload: { input: parsedInput },
      });
      const resultText = response.result
        ? JSON.stringify(response.result).slice(0, 320)
        : response.output || response.message;
      setLastResultByScript((prev) => ({
        ...prev,
        [script.key]: resultText,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Script execution failed.';
      setLastResultByScript((prev) => ({
        ...prev,
        [script.key]: message,
      }));
    }
  }

  return (
    <AdminShell>
      <section className="dg-admin-page">
        <div className="dg-admin-page-head">
          <div>
            <h1 className="dg-page-title">Configuration Center</h1>
            <p className="dg-page-subtitle">
              Run operational scripts, scheduler tasks, and data jobs from one controlled admin interface.
            </p>
          </div>
        </div>

        <div className="dg-kpi-grid">
          <article className="dg-card dg-kpi-card">
            <p className="dg-kpi-label">Total Scripts</p>
            <p className="dg-kpi-value">{scripts.length}</p>
            <p className="dg-kpi-meta">Automations, data, and maintenance controls</p>
          </article>
          <article className="dg-card dg-kpi-card">
            <p className="dg-kpi-label">Categories</p>
            <p className="dg-kpi-value">{Object.keys(categories).length}</p>
            <p className="dg-kpi-meta">
              {Object.entries(categories)
                .map(([name, count]) => `${name}: ${count}`)
                .join(' • ') || '-'}
            </p>
          </article>
          <article className="dg-card dg-kpi-card">
            <p className="dg-kpi-label">FastAPI Jobs</p>
            <p className="dg-kpi-value">{scripts.filter((item) => item.executionType === 'fastapi').length}</p>
            <p className="dg-kpi-meta">Tracked through automation runs</p>
          </article>
          <article className="dg-card dg-kpi-card">
            <p className="dg-kpi-label">Local Commands</p>
            <p className="dg-kpi-value">{scripts.filter((item) => item.executionType === 'local').length}</p>
            <p className="dg-kpi-meta">Executed from admin server runtime</p>
          </article>
        </div>
      </section>

      <section className="dg-admin-page">
        <article className="dg-card dg-panel">
          <div className="dg-admin-head">
            <h2 className="dg-title-sm">Environment Variables</h2>
            <span className="dg-badge">{envItems.length} keys</span>
          </div>
          <p className="dg-muted-sm mb-3">
            Edit local env values from admin. Secret values are masked. Changes require service restart.
          </p>

          {envQuery.isLoading && <p className="dg-muted-sm">Loading environment settings...</p>}
          {envQuery.isError && (
            <p className="dg-alert-error">
              {envQuery.error instanceof Error ? envQuery.error.message : 'Failed to load env settings.'}
            </p>
          )}

          {!envQuery.isLoading && !envQuery.isError && (
            <div className="dg-side-stack">
              {Object.entries(envByTarget).map(([target, items]) => (
                <article key={target} className="dg-card dg-panel">
                  <div className="dg-admin-head">
                    <h3 className="dg-title-sm">{titleCase(target)} Environment</h3>
                    <span className="dg-badge">{items.length}</span>
                  </div>
                  <div className="dg-table-wrap">
                    <table className="dg-table">
                      <thead>
                        <tr>
                          <th>Key</th>
                          <th>Description</th>
                          <th>Value</th>
                          <th>Save</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => {
                          const key = envDraftKey(item);
                          const isSecret = item.secret;
                          return (
                            <tr key={`${item.target}-${item.key}`}>
                              <td>
                                <p className="dg-list-title">{item.key}</p>
                                <p className="dg-list-meta">
                                  {isSecret
                                    ? item.hasValue
                                      ? `Saved: ${item.maskedValue}`
                                      : 'No value set'
                                    : 'Plain text'}
                                </p>
                              </td>
                              <td>{item.description}</td>
                              <td>
                                <input
                                  type={isSecret ? 'password' : 'text'}
                                  className="dg-input"
                                  placeholder={isSecret ? 'Enter new secret value' : 'Value'}
                                  value={getEnvValue(item)}
                                  onChange={(event) => handleEnvChange(item, event.target.value)}
                                />
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="dg-btn-primary"
                                  onClick={() => handleSaveEnv(item)}
                                  disabled={saveEnvMutation.isPending}
                                >
                                  {saveEnvMutation.isPending ? 'Saving...' : 'Save'}
                                </button>
                                {envSaveMessage[key] ? (
                                  <p className="dg-list-meta mt-2 max-w-72 truncate">{envSaveMessage[key]}</p>
                                ) : null}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="dg-admin-page">
        {scriptsQuery.isLoading && <p className="dg-muted-sm">Loading script registry...</p>}
        {scriptsQuery.isError && (
          <p className="dg-alert-error">
            {scriptsQuery.error instanceof Error
              ? scriptsQuery.error.message
              : 'Failed to load configuration scripts.'}
          </p>
        )}

        {!scriptsQuery.isLoading && !scriptsQuery.isError && (
          <div className="dg-side-stack">
            {Object.entries(scriptsByCategory).map(([categoryName, categoryScripts]) => (
              <article key={categoryName} className="dg-card dg-panel">
                <div className="dg-admin-head">
                  <h2 className="dg-title-sm">{categoryName} Scripts</h2>
                  <span className="dg-badge">{categoryScripts.length}</span>
                </div>
                <div className="dg-table-wrap">
                  <table className="dg-table">
                    <thead>
                      <tr>
                        <th>Script</th>
                        <th>Inputs</th>
                        <th>Execution</th>
                        <th>Last Status</th>
                        <th>Last Executed</th>
                        <th>Run</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryScripts.map((script) => (
                        <tr key={script.key}>
                          <td>
                            <p className="dg-list-title">{script.name}</p>
                            <p className="dg-list-meta">{script.description}</p>
                          </td>
                          <td>
                            {script.inputs && script.inputs.length > 0 ? (
                              <div className="dg-config-grid">
                                {script.inputs.map((field) => (
                                  <input
                                    key={field.key}
                                    type={field.type === 'number' ? 'number' : field.type}
                                    className="dg-input"
                                    min={field.min}
                                    max={field.max}
                                    placeholder={field.placeholder || field.label}
                                    value={getScriptInput(script, field.key)}
                                    onChange={(event) =>
                                      handleInputChange(script.key, field.key, event.target.value)
                                    }
                                  />
                                ))}
                              </div>
                            ) : (
                              <span className="dg-muted-sm">No inputs</span>
                            )}
                          </td>
                          <td>
                            <p>{titleCase(script.executionType)}</p>
                            {script.commandLabel ? (
                              <p className="dg-list-meta">{script.commandLabel}</p>
                            ) : script.workflowName ? (
                              <p className="dg-list-meta">{script.workflowName}</p>
                            ) : (
                              <p className="dg-list-meta">Managed action</p>
                            )}
                          </td>
                          <td>
                            <span className={statusBadgeClass(script.lastRun?.status)}>
                              {script.lastRun?.status ? titleCase(script.lastRun.status) : 'Not Tracked'}
                            </span>
                            {script.lastRun?.errorMessage ? (
                              <p className="dg-list-meta max-w-60 truncate">{script.lastRun.errorMessage}</p>
                            ) : null}
                          </td>
                          <td>{formatDate(script.lastRun?.finishedAt || script.lastRun?.startedAt)}</td>
                          <td>
                            <button
                              type="button"
                              className="dg-btn-primary"
                              onClick={() => handleRun(script)}
                              disabled={runMutation.isPending}
                            >
                              {runMutation.isPending ? 'Running...' : 'Run'}
                            </button>
                            {lastResultByScript[script.key] ? (
                              <p className="dg-list-meta mt-2 max-w-72 truncate">
                                {lastResultByScript[script.key]}
                              </p>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AdminShell>
  );
}
