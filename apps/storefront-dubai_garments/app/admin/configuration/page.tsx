'use client';
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import AdminPageHeader from '@/components/admin/common/page-header';
import AdminShell from '@/components/admin/admin-shell';
import CommandRunLogModal, {
  CommandRunLogModalState,
} from '@/components/admin/configuration/command-run-log-modal';
import ExecutionAuditTable from '@/components/admin/configuration/execution-audit-table';
import ExecutionOutputModal, {
  ExecutionOutputModalState,
} from '@/components/admin/configuration/execution-output-modal';
import { PageShell, Panel, Toolbar } from '@/components/ui';
import {
  ConfigExecutionAuditItem,
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
import {
  formatDate,
  statusBadgeClass,
  titleCase,
} from '@/features/admin/configuration/utils/view-format';

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
  const envItems = useMemo(() => envQuery.data?.items ?? [], [envQuery.data?.items]);
  const storefrontEnvMap = useMemo(() => {
    const map = new Map<string, string>();
    envItems.forEach((item) => {
      if (item.target !== 'storefront') return;
      map.set(item.key, item.value || '');
    });
    return map;
  }, [envItems]);
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
  const [brandingDraft, setBrandingDraft] = useState({
    brandName: '',
    brandTagline: '',
    logoUrl: '',
    faviconUrl: '',
  });
  const [brandingMessage, setBrandingMessage] = useState('');
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);
  const [auditOutputModal, setAuditOutputModal] = useState<ExecutionOutputModalState>({
    open: false,
    command: '',
    status: '',
    output: '',
    input: '',
    executedAt: '',
  });
  const [runLogModal, setRunLogModal] = useState<CommandRunLogModalState>({
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

  useEffect(() => {
    setBrandingDraft((prev) => ({
      ...prev,
      brandName: storefrontEnvMap.get('BRAND_NAME') || '',
      brandTagline: storefrontEnvMap.get('BRAND_TAGLINE') || '',
      logoUrl: storefrontEnvMap.get('BRAND_LOGO_URL') || '',
      faviconUrl: storefrontEnvMap.get('BRAND_FAVICON_URL') || '',
    }));
  }, [storefrontEnvMap]);


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

  function openAuditOutputModal(item: ConfigExecutionAuditItem) {
    setAuditOutputModal({
      open: true,
      command: item.command_label || item.command_key,
      status: item.status,
      output: item.error_message || item.output_log || '-',
      input:
        Object.keys(item.input_payload || {}).length > 0 ? JSON.stringify(item.input_payload, null, 2) : '-',
      executedAt: item.started_at,
    });
  }

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

  async function handleUploadBrandAsset(kind: 'logo' | 'favicon') {
    const file = kind === 'logo' ? logoFile : faviconFile;
    if (!file) {
      setBrandingMessage(`Select a ${kind} file first.`);
      return;
    }

    if (kind === 'logo') setIsUploadingLogo(true);
    if (kind === 'favicon') setIsUploadingFavicon(true);
    setBrandingMessage('');

    try {
      const formData = new FormData();
      formData.append('kind', kind);
      formData.append('file', file);

      const response = await fetch('/api/admin/config/branding/upload', {
        method: 'POST',
        body: formData,
      });
      const payload = (await response.json()) as { message?: string; url?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.message || `Failed to upload ${kind}.`);
      }

      setBrandingDraft((prev) => ({
        ...prev,
        ...(kind === 'logo' ? { logoUrl: payload.url || '' } : { faviconUrl: payload.url || '' }),
      }));
      setBrandingMessage(`${titleCase(kind)} uploaded. Save branding to persist settings.`);
    } catch (error) {
      setBrandingMessage(error instanceof Error ? error.message : `Failed to upload ${kind}.`);
    } finally {
      if (kind === 'logo') setIsUploadingLogo(false);
      if (kind === 'favicon') setIsUploadingFavicon(false);
    }
  }

  async function handleSaveBrandingSettings() {
    const updates = [
      { key: 'BRAND_NAME', value: brandingDraft.brandName.trim() },
      { key: 'BRAND_TAGLINE', value: brandingDraft.brandTagline.trim() },
      { key: 'BRAND_LOGO_URL', value: brandingDraft.logoUrl.trim() },
      { key: 'BRAND_FAVICON_URL', value: brandingDraft.faviconUrl.trim() },
    ];

    setIsSavingBranding(true);
    setBrandingMessage('');
    try {
      for (const update of updates) {
        await saveEnvMutation.mutateAsync({
          target: 'storefront',
          key: update.key,
          value: update.value,
        });
      }
      setBrandingMessage('Branding settings saved successfully. Restart services to apply globally.');
    } catch (error) {
      setBrandingMessage(error instanceof Error ? error.message : 'Failed to save branding settings.');
    } finally {
      setIsSavingBranding(false);
    }
  }


  return (
    <AdminShell>
      <PageShell density="compact">
      <Panel>
        <AdminPageHeader
          title="Configuration Center"
          subtitle="Run operational scripts, scheduler tasks, and data jobs from one controlled admin interface."
          actions={
            <Toolbar>
              <Link href="/admin/observability" className="ui-btn ui-btn-secondary ui-btn-md">
                Observability
              </Link>
            </Toolbar>
          }
        />

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
      </Panel>

      <Panel>
          <div className="dg-admin-head">
            <h2 className="dg-title-sm">Branding Assets</h2>
            <span className="dg-badge">Logo Workflow</span>
          </div>
          <p className="dg-muted-sm mb-3">
            Upload logo/favicon assets and persist branding URLs + labels. These values power storefront and admin branding.
          </p>

          <div className="dg-config-grid">
            <div className="dg-card">
              <h3 className="dg-title-sm">Identity</h3>
              <div className="dg-field">
                <label className="dg-label" htmlFor="brand-name">Brand Name</label>
                <input
                  id="brand-name"
                  className="dg-input"
                  value={brandingDraft.brandName}
                  onChange={(event) =>
                    setBrandingDraft((prev) => ({ ...prev, brandName: event.target.value }))
                  }
                />
              </div>
              <div className="dg-field">
                <label className="dg-label" htmlFor="brand-tagline">Tagline</label>
                <input
                  id="brand-tagline"
                  className="dg-input"
                  value={brandingDraft.brandTagline}
                  onChange={(event) =>
                    setBrandingDraft((prev) => ({ ...prev, brandTagline: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="dg-card">
              <h3 className="dg-title-sm">Logo Upload</h3>
              {brandingDraft.logoUrl ? (
                <img
                  src={brandingDraft.logoUrl}
                  alt="Current brand logo"
                  className="h-16 w-auto rounded border border-[var(--color-border)] bg-white p-2"
                />
              ) : (
                <p className="dg-muted-sm">No logo uploaded yet.</p>
              )}
              <div className="dg-field">
                <label className="dg-label" htmlFor="logo-file">Select Logo</label>
                <input
                  id="logo-file"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(event) => setLogoFile(event.target.files?.[0] || null)}
                />
              </div>
              <div className="dg-field">
                <label className="dg-label" htmlFor="logo-url">Logo URL</label>
                <input
                  id="logo-url"
                  className="dg-input"
                  value={brandingDraft.logoUrl}
                  onChange={(event) =>
                    setBrandingDraft((prev) => ({ ...prev, logoUrl: event.target.value }))
                  }
                />
              </div>
              <button
                type="button"
                className="ui-btn ui-btn-secondary ui-btn-md"
                disabled={isUploadingLogo}
                onClick={() => void handleUploadBrandAsset('logo')}
              >
                {isUploadingLogo ? 'Uploading Logo...' : 'Upload Logo'}
              </button>
            </div>

            <div className="dg-card">
              <h3 className="dg-title-sm">Favicon Upload</h3>
              {brandingDraft.faviconUrl ? (
                <img
                  src={brandingDraft.faviconUrl}
                  alt="Current favicon"
                  className="h-10 w-10 rounded border border-[var(--color-border)] bg-white p-1"
                />
              ) : (
                <p className="dg-muted-sm">No favicon uploaded yet.</p>
              )}
              <div className="dg-field">
                <label className="dg-label" htmlFor="favicon-file">Select Favicon</label>
                <input
                  id="favicon-file"
                  type="file"
                  accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml"
                  onChange={(event) => setFaviconFile(event.target.files?.[0] || null)}
                />
              </div>
              <div className="dg-field">
                <label className="dg-label" htmlFor="favicon-url">Favicon URL</label>
                <input
                  id="favicon-url"
                  className="dg-input"
                  value={brandingDraft.faviconUrl}
                  onChange={(event) =>
                    setBrandingDraft((prev) => ({ ...prev, faviconUrl: event.target.value }))
                  }
                />
              </div>
              <button
                type="button"
                className="ui-btn ui-btn-secondary ui-btn-md"
                disabled={isUploadingFavicon}
                onClick={() => void handleUploadBrandAsset('favicon')}
              >
                {isUploadingFavicon ? 'Uploading Favicon...' : 'Upload Favicon'}
              </button>
            </div>
          </div>
          <div className="dg-form-row mt-3">
            <button
              type="button"
              className="ui-btn ui-btn-primary ui-btn-md"
              disabled={isSavingBranding || saveEnvMutation.isPending}
              onClick={() => void handleSaveBrandingSettings()}
            >
              {isSavingBranding ? 'Saving Branding...' : 'Save Branding Settings'}
            </button>
            {brandingMessage ? <p className="dg-list-meta">{brandingMessage}</p> : null}
          </div>
      </Panel>

      <Panel>
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
                <article key={target} className="dg-card">
                  <div className="dg-admin-head">
                    <h3 className="dg-title-sm">{titleCase(target)} Environment</h3>
                    <span className="dg-badge">{items.length}</span>
                  </div>
                  <div className="ui-table-wrap">
                    <table className="ui-table ui-table-density-compact">
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
                                  className="ui-btn ui-btn-primary ui-btn-md"
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
      </Panel>

      <Panel>
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
              className="ui-btn ui-btn-primary ui-btn-md"
              onClick={handleRunTerminalCommand}
              disabled={isTerminalRunning || !terminalCommand}
            >
              {isTerminalRunning ? 'Running...' : 'Run Command'}
            </button>
          </div>
          {terminalMessage ? <p className="dg-list-meta mt-2">{terminalMessage}</p> : null}
      </Panel>

      <Panel>
          <div className="dg-admin-head">
            <div>
              <h2 className="dg-title-sm">Observability Workspace</h2>
              <p className="dg-muted-sm">Use the dedicated observability page for service health and metric probes.</p>
            </div>
            <Link href="/admin/observability" className="ui-btn ui-btn-primary ui-btn-md">
              Open Observability
            </Link>
          </div>
      </Panel>

      <Panel>
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
              <article key={categoryName} className="dg-card">
                <div className="dg-admin-head">
                  <h2 className="dg-title-sm">{categoryName} Scripts</h2>
                  <span className="dg-badge">{categoryScripts.length}</span>
                </div>
                <div className="ui-table-wrap">
                  <table className="ui-table ui-table-density-compact">
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
                              className="ui-btn ui-btn-primary ui-btn-md"
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
      </Panel>
      <Panel>
          <div className="dg-admin-head">
            <h2 className="dg-title-sm">Command Execution Audit</h2>
            <div className="flex items-center gap-2">
              <span className="dg-badge">{auditItems.length} recent runs</span>
              <Link href="/admin/configuration/audit" className="ui-btn ui-btn-secondary ui-btn-md">
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
                : 'Failed to load command execution audit records.'}
            </p>
          )}
          {!auditQuery.isLoading && !auditQuery.isError && (
            <ExecutionAuditTable
              items={auditItems}
              emptyMessage="No audit records yet."
              onViewOutput={openAuditOutputModal}
            />
          )}
      </Panel>
      <ExecutionOutputModal
        state={auditOutputModal}
        onClose={() => setAuditOutputModal((prev) => ({ ...prev, open: false }))}
      />
      <CommandRunLogModal
        state={runLogModal}
        onClose={() => setRunLogModal((prev) => ({ ...prev, open: false }))}
      />
      </PageShell>
    </AdminShell>
  );
}
