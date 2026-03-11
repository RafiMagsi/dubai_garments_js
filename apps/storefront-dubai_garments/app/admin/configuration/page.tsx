'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import axios from 'axios';
import AdminShell from '@/components/admin/admin-shell';
import {
  useConfigurationEnv,
  useConfigurationAudit,
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
  const auditQuery = useConfigurationAudit(10);
  const runMutation = useRunConfigurationScript();

  const scripts = scriptsQuery.data?.items ?? [];
  const envItems = envQuery.data?.items ?? [];
  const auditItems = auditQuery.data?.items ?? [];
  const [inputsByScript, setInputsByScript] = useState<Record<string, Record<string, string>>>({});
  const [lastResultByScript, setLastResultByScript] = useState<Record<string, string>>({});
  const [envDraft, setEnvDraft] = useState<Record<string, string>>({});
  const [envSaveMessage, setEnvSaveMessage] = useState<Record<string, string>>({});
  const [activeScriptKey, setActiveScriptKey] = useState<string | null>(null);
  const [isTerminalRunning, setIsTerminalRunning] = useState(false);
  const [allowedCommands, setAllowedCommands] = useState<string[]>([]);
  const [terminalCommand, setTerminalCommand] = useState('npm run db:tables');
  const [terminalMessage, setTerminalMessage] = useState('');
  const [auditOutputModal, setAuditOutputModal] = useState<{
    open: boolean;
    command: string;
    status: string;
    output: string;
    input: string;
    executedAt: string;
  }>({
    open: false,
    command: '',
    status: '',
    output: '',
    input: '',
    executedAt: '',
  });
  const [runLogModal, setRunLogModal] = useState<{
    open: boolean;
    scriptName: string;
    command: string;
    status: 'running' | 'success' | 'failed';
    output: string;
  }>({
    open: false,
    scriptName: '',
    command: '',
    status: 'running',
    output: '',
  });

  useEffect(() => {
    let mounted = true;
    async function loadTerminalCommands() {
      try {
        const response = await fetch('/api/admin/config/terminal', { cache: 'no-store' });
        const payload = (await response.json()) as { items?: string[] };
        if (!mounted) return;
        const items = payload.items || [];
        setAllowedCommands(items);
        if (items.length > 0) {
          setTerminalCommand(items[0]);
        }
      } catch {
        if (!mounted) return;
      }
    }
    void loadTerminalCommands();
    return () => {
      mounted = false;
    };
  }, []);

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
      let message = error instanceof Error ? error.message : 'Failed to save env variable.';
      if (axios.isAxiosError(error)) {
        const payload = error.response?.data as
          | { message?: string; detail?: string; output?: string; result?: unknown }
          | undefined;
        message =
          payload?.message ||
          payload?.detail ||
          (typeof payload?.output === 'string' ? payload.output.slice(0, 320) : message);
      }
      setEnvSaveMessage((prev) => ({ ...prev, [key]: message }));
    }
  }

  async function handleRun(script: ConfigScriptItem) {
    const commandLabel = script.commandLabel || script.workflowName || script.key;
    setActiveScriptKey(script.key);
    setRunLogModal({
      open: true,
      scriptName: script.name,
      command: commandLabel,
      status: 'running',
      output: `Starting: ${commandLabel}\nPlease wait...`,
    });

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
      const resultText = response.output
        ? response.output
        : response.result
          ? JSON.stringify(response.result, null, 2)
          : response.message;
      setLastResultByScript((prev) => ({
        ...prev,
        [script.key]: resultText.slice(0, 320),
      }));
      setRunLogModal({
        open: true,
        scriptName: script.name,
        command: commandLabel,
        status: 'success',
        output: resultText || response.message || 'Completed.',
      });
    } catch (error) {
      let message = error instanceof Error ? error.message : 'Script execution failed.';
      let details = '';
      if (axios.isAxiosError(error)) {
        const payload = error.response?.data as
          | { message?: string; detail?: string; output?: string; result?: unknown }
          | undefined;
        details =
          typeof payload?.output === 'string'
            ? payload.output
            : payload?.result
              ? JSON.stringify(payload.result, null, 2)
              : '';
        message = payload?.message || payload?.detail || details || message;
      }
      setLastResultByScript((prev) => ({
        ...prev,
        [script.key]: message,
      }));
      setRunLogModal({
        open: true,
        scriptName: script.name,
        command: commandLabel,
        status: 'failed',
        output: [message, details].filter(Boolean).join('\n\n') || 'Execution failed.',
      });
    } finally {
      setActiveScriptKey(null);
    }
  }

  async function handleRunTerminalCommand() {
    const command = terminalCommand.trim();
    if (!command) {
      setTerminalMessage('Select or enter a command first.');
      return;
    }

    setIsTerminalRunning(true);
    setTerminalMessage('');
    setRunLogModal({
      open: true,
      scriptName: 'Admin Terminal',
      command,
      status: 'running',
      output: `Starting terminal command: ${command}\nPlease wait...`,
    });

    try {
      const response = await axios.post('/api/admin/config/terminal', { command });
      const payload = response.data as {
        ok?: boolean;
        message?: string;
        output?: string;
      };
      const output = payload.output || payload.message || 'Command completed.';
      setRunLogModal({
        open: true,
        scriptName: 'Admin Terminal',
        command,
        status: payload.ok ? 'success' : 'failed',
        output,
      });
      setTerminalMessage(payload.message || 'Command executed.');
    } catch (error) {
      let message = error instanceof Error ? error.message : 'Terminal command failed.';
      let output = '';
      if (axios.isAxiosError(error)) {
        const payload = error.response?.data as { message?: string; output?: string } | undefined;
        message = payload?.message || message;
        output = payload?.output || '';
      }
      setRunLogModal({
        open: true,
        scriptName: 'Admin Terminal',
        command,
        status: 'failed',
        output: [message, output].filter(Boolean).join('\n\n'),
      });
      setTerminalMessage(message);
    } finally {
      setIsTerminalRunning(false);
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
        <article className="dg-card dg-panel">
          <div className="dg-admin-head">
            <h2 className="dg-title-sm">Terminal</h2>
            <span className="dg-badge">Restricted</span>
          </div>
          <p className="dg-muted-sm mb-3">
            Run allowlisted operational commands directly from admin and inspect full logs.
          </p>
          <div className="dg-form-row">
            <select
              className="dg-select dg-col-fill"
              value={terminalCommand}
              onChange={(event) => setTerminalCommand(event.target.value)}
            >
              {allowedCommands.length > 0 ? (
                allowedCommands.map((command) => (
                  <option key={command} value={command}>
                    {command}
                  </option>
                ))
              ) : (
                <option value="">No terminal commands available</option>
              )}
            </select>
            <button
              type="button"
              className="dg-btn-primary"
              onClick={handleRunTerminalCommand}
              disabled={isTerminalRunning || !terminalCommand}
            >
              {isTerminalRunning ? 'Running...' : 'Run Command'}
            </button>
          </div>
          {terminalMessage ? <p className="dg-list-meta mt-2">{terminalMessage}</p> : null}
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
                              disabled={Boolean(activeScriptKey)}
                            >
                              {activeScriptKey === script.key ? 'Running...' : 'Run'}
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
      <section className="dg-admin-page">
        <article className="dg-card dg-panel">
          <div className="dg-admin-head">
            <h2 className="dg-title-sm">Execution Audit</h2>
            <div className="flex items-center gap-2">
              <span className="dg-badge">{auditItems.length} recent runs</span>
              <Link href="/admin/configuration/audit" className="dg-btn-secondary">
                View All
              </Link>
            </div>
          </div>
          <p className="dg-muted-sm mb-3">
            Recent script and terminal executions from admin configuration.
          </p>
          {auditQuery.isLoading && <p className="dg-muted-sm">Loading execution audit...</p>}
          {auditQuery.isError && (
            <p className="dg-alert-error">
              {auditQuery.error instanceof Error
                ? auditQuery.error.message
                : 'Failed to load execution audit records.'}
            </p>
          )}
          {!auditQuery.isLoading && !auditQuery.isError && (
            <div className="dg-table-wrap">
              <table className="dg-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>User</th>
                    <th>Type</th>
                    <th>Command</th>
                    <th>Status</th>
                    <th>Input</th>
                    <th>Output</th>
                  </tr>
                </thead>
                <tbody>
                  {auditItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center">
                        No audit records yet.
                      </td>
                    </tr>
                  ) : (
                    auditItems.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <p className="dg-list-title">{formatDate(item.started_at)}</p>
                          <p className="dg-list-meta">Finished: {formatDate(item.finished_at)}</p>
                        </td>
                        <td>
                          <p className="dg-list-title">{item.user_email || 'Unknown user'}</p>
                          <p className="dg-list-meta">{item.user_id || '-'}</p>
                        </td>
                        <td>{titleCase(item.execution_type || 'unknown')}</td>
                        <td>
                          <p className="dg-list-title">{item.command_label || item.command_key}</p>
                          <p className="dg-list-meta">{item.command_key}</p>
                        </td>
                        <td>
                          <span className={statusBadgeClass(item.status)}>{titleCase(item.status)}</span>
                        </td>
                        <td className="max-w-72">
                          <pre className="whitespace-pre-wrap break-words text-xs text-slate-600">
                            {Object.keys(item.input_payload || {}).length > 0
                              ? JSON.stringify(item.input_payload, null, 2)
                              : '-'}
                          </pre>
                        </td>
                        <td>
                          {item.error_message || item.output_log ? (
                            <button
                              type="button"
                              className="dg-btn-secondary"
                              onClick={() =>
                                setAuditOutputModal({
                                  open: true,
                                  command: item.command_label || item.command_key,
                                  status: item.status,
                                  output: item.error_message || item.output_log || '-',
                                  input:
                                    Object.keys(item.input_payload || {}).length > 0
                                      ? JSON.stringify(item.input_payload, null, 2)
                                      : '-',
                                  executedAt: item.started_at,
                                })
                              }
                            >
                              View Output
                            </button>
                          ) : (
                            <span className="dg-list-meta">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
      {auditOutputModal.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
          <div className="w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-600">Execution Output</p>
                <h3 className="text-lg font-bold text-slate-900">{auditOutputModal.command}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Executed: {formatDate(auditOutputModal.executedAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={statusBadgeClass(auditOutputModal.status)}>
                  {titleCase(auditOutputModal.status || 'unknown')}
                </span>
                <button
                  type="button"
                  className="dg-btn-secondary"
                  onClick={() => setAuditOutputModal((prev) => ({ ...prev, open: false }))}
                >
                  Close
                </button>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Input</p>
                <pre className="max-h-[50vh] overflow-auto rounded-xl bg-slate-100 p-3 text-xs text-slate-700">
                  {auditOutputModal.input}
                </pre>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Output</p>
                <pre className="max-h-[50vh] overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">
                  {auditOutputModal.output}
                </pre>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {runLogModal.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
          <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-600">Execution Log</p>
                <h3 className="text-lg font-bold text-slate-900">{runLogModal.scriptName}</h3>
                <p className="mt-1 text-xs text-slate-500">Command/Workflow: {runLogModal.command}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={
                    runLogModal.status === 'success'
                      ? 'dg-status-pill'
                      : runLogModal.status === 'failed'
                        ? 'dg-status-pill dg-status-pill-LOST'
                        : 'dg-status-pill dg-status-pill-NEW'
                  }
                >
                  {titleCase(runLogModal.status)}
                </span>
                <button
                  type="button"
                  className="dg-btn-secondary"
                  onClick={() => setRunLogModal((prev) => ({ ...prev, open: false }))}
                >
                  Close
                </button>
              </div>
            </div>
            <pre className="max-h-[65vh] overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">
              {runLogModal.output || 'No output yet.'}
            </pre>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
