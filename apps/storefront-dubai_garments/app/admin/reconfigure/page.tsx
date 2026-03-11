'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import AdminShell from '@/components/admin/admin-shell';
import AdminPageHeader from '@/components/admin/common/page-header';

type WizardData = {
  database: { databaseUrl: string };
  tenant: { name: string; slug: string };
  admin: { fullName: string; email: string; password: string };
  ai: { openaiApiKey: string; openaiModel: string };
  email: {
    provider: 'log' | 'smtp' | 'sendgrid' | 'resend';
    fromName: string;
    fromAddress: string;
    smtpHost: string;
    smtpPort: string;
    smtpUsername: string;
    smtpPassword: string;
    sendgridApiKey: string;
    resendApiKey: string;
  };
  storage: {
    provider: 'local' | 's3' | 'r2';
    bucket: string;
    region: string;
    endpoint: string;
    accessKey: string;
    secretKey: string;
    publicUrlBase: string;
  };
  automation: {
    sharedSecret: string;
    n8nFollowupEnabled: boolean;
    n8nQuoteFollowupWebhookUrl: string;
  };
};

type ReconfigureStatus = {
  enabled: boolean;
  expiresAt: string | null;
};

const DEFAULT_PAYLOAD: WizardData = {
  database: { databaseUrl: '' },
  tenant: { name: 'Default Tenant', slug: 'default' },
  admin: { fullName: 'Admin User', email: 'admin@example.com', password: 'ChangeMe123!' },
  ai: { openaiApiKey: '', openaiModel: 'gpt-4o-mini' },
  email: {
    provider: 'log',
    fromName: 'Dubai Garments',
    fromAddress: 'no-reply@example.com',
    smtpHost: '',
    smtpPort: '587',
    smtpUsername: '',
    smtpPassword: '',
    sendgridApiKey: '',
    resendApiKey: '',
  },
  storage: {
    provider: 'local',
    bucket: '',
    region: 'auto',
    endpoint: '',
    accessKey: '',
    secretKey: '',
    publicUrlBase: '',
  },
  automation: {
    sharedSecret: '',
    n8nFollowupEnabled: true,
    n8nQuoteFollowupWebhookUrl: '',
  },
};

const STEPS = [
  'Database',
  'Admin User',
  'OpenAI',
  'Email',
  'Storage',
  'Automation',
];

export default function AdminReconfigurePage() {
  const [status, setStatus] = useState<ReconfigureStatus>({ enabled: false, expiresAt: null });
  const [stepIndex, setStepIndex] = useState(0);
  const [ttlMinutes, setTtlMinutes] = useState('30');
  const [form, setForm] = useState<WizardData>(DEFAULT_PAYLOAD);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const canProceed = useMemo(() => {
    if (stepIndex === 1) {
      return form.admin.fullName.trim() && form.admin.email.trim() && form.admin.password.trim().length >= 8;
    }
    return true;
  }, [stepIndex, form.admin]);

  async function loadStatus() {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/reconfigure', { cache: 'no-store' });
      const payload = (await response.json()) as {
        ok?: boolean;
        enabled?: boolean;
        expiresAt?: string | null;
        message?: string;
      };
      if (!response.ok || !payload.ok) {
        setMessage(payload.message || 'Unable to load reconfigure status.');
        return;
      }
      setStatus({
        enabled: Boolean(payload.enabled),
        expiresAt: payload.expiresAt || null,
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load reconfigure status.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  async function handleToggle(enable: boolean) {
    setMessage('');
    setIsSaving(true);
    try {
      const response = await axios.post('/api/admin/reconfigure', {
        action: enable ? 'enable' : 'disable',
        ttlMinutes: Number(ttlMinutes || 30),
      });
      setMessage(response.data?.message || (enable ? 'Reconfigure mode enabled.' : 'Reconfigure mode disabled.'));
      await loadStatus();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setMessage(error.response?.data?.message || 'Failed to update reconfigure mode.');
      } else {
        setMessage(error instanceof Error ? error.message : 'Failed to update reconfigure mode.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleApply() {
    setMessage('');
    setIsSaving(true);
    try {
      const response = await axios.post('/api/admin/reconfigure', {
        action: 'apply',
        payload: form,
      });
      setMessage(response.data?.message || 'Settings reconfigured successfully.');
      await loadStatus();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setMessage(error.response?.data?.message || 'Reconfiguration failed.');
      } else {
        setMessage(error instanceof Error ? error.message : 'Reconfiguration failed.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AdminShell>
      <div className="dg-admin-page">
        <AdminPageHeader
          title="Reconfigure Wizard"
          subtitle="Use a structured step-based flow to update installed system settings."
        />

        <div className="dg-kpi-grid">
          <div className="dg-card dg-kpi-card">
            <p className="dg-kpi-label">Mode Status</p>
            <p className="dg-kpi-value">{isLoading ? 'Loading...' : status.enabled ? 'Enabled' : 'Disabled'}</p>
            <p className="dg-kpi-meta">
              {status.expiresAt ? `Expires: ${new Date(status.expiresAt).toLocaleString()}` : 'No active expiry'}
            </p>
          </div>
          <div className="dg-card dg-kpi-card">
            <p className="dg-kpi-label">Mode Window</p>
            <p className="dg-kpi-value">{ttlMinutes} min</p>
            <p className="dg-kpi-meta">Enable mode before applying wizard changes.</p>
          </div>
        </div>

        <div className="dg-card dg-panel" style={{ marginTop: '1rem' }}>
          <div className="dg-form-row">
            <label className="dg-field">
              <span className="dg-label">TTL Minutes</span>
              <input className="dg-input" value={ttlMinutes} onChange={(event) => setTtlMinutes(event.target.value)} />
            </label>
            <button type="button" className="dg-btn-primary" onClick={() => void handleToggle(true)} disabled={isSaving}>
              Enable Mode
            </button>
            <button type="button" className="dg-btn-secondary" onClick={() => void handleToggle(false)} disabled={isSaving}>
              Disable Mode
            </button>
          </div>
        </div>

        <div className="dg-card dg-panel" style={{ marginTop: '1rem' }}>
          <div className="dg-chip-cloud" style={{ marginBottom: '1rem' }}>
            {STEPS.map((step, index) => (
              <span key={step} className={`dg-chip ${index === stepIndex ? 'dg-chip-active' : ''}`}>
                {index + 1}. {step}
              </span>
            ))}
          </div>

          {stepIndex === 0 ? (
            <div className="dg-config-grid">
              <label className="dg-field">
                <span className="dg-label">Database URL</span>
                <input
                  className="dg-input"
                  value={form.database.databaseUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, database: { databaseUrl: event.target.value } }))}
                  placeholder="postgresql://user:pass@host:5432/db"
                />
              </label>
              <label className="dg-field">
                <span className="dg-label">Tenant Name</span>
                <input
                  className="dg-input"
                  value={form.tenant.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, tenant: { ...prev.tenant, name: event.target.value } }))}
                />
              </label>
              <label className="dg-field">
                <span className="dg-label">Tenant Slug</span>
                <input
                  className="dg-input"
                  value={form.tenant.slug}
                  onChange={(event) => setForm((prev) => ({ ...prev, tenant: { ...prev.tenant, slug: event.target.value } }))}
                />
              </label>
            </div>
          ) : null}

          {stepIndex === 1 ? (
            <div className="dg-config-grid">
              <label className="dg-field">
                <span className="dg-label">Admin Full Name</span>
                <input
                  className="dg-input"
                  value={form.admin.fullName}
                  onChange={(event) => setForm((prev) => ({ ...prev, admin: { ...prev.admin, fullName: event.target.value } }))}
                />
              </label>
              <label className="dg-field">
                <span className="dg-label">Admin Email</span>
                <input
                  className="dg-input"
                  type="email"
                  value={form.admin.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, admin: { ...prev.admin, email: event.target.value } }))}
                />
              </label>
              <label className="dg-field">
                <span className="dg-label">Admin Password</span>
                <input
                  className="dg-input"
                  type="password"
                  value={form.admin.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, admin: { ...prev.admin, password: event.target.value } }))}
                />
              </label>
            </div>
          ) : null}

          {stepIndex === 2 ? (
            <div className="dg-config-grid">
              <label className="dg-field">
                <span className="dg-label">OpenAI API Key</span>
                <input
                  className="dg-input"
                  type="password"
                  value={form.ai.openaiApiKey}
                  onChange={(event) => setForm((prev) => ({ ...prev, ai: { ...prev.ai, openaiApiKey: event.target.value } }))}
                />
              </label>
              <label className="dg-field">
                <span className="dg-label">OpenAI Model</span>
                <input
                  className="dg-input"
                  value={form.ai.openaiModel}
                  onChange={(event) => setForm((prev) => ({ ...prev, ai: { ...prev.ai, openaiModel: event.target.value } }))}
                />
              </label>
            </div>
          ) : null}

          {stepIndex === 3 ? (
            <div className="dg-config-grid">
              <label className="dg-field">
                <span className="dg-label">Email Provider</span>
                <select
                  className="dg-select"
                  value={form.email.provider}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: { ...prev.email, provider: event.target.value as WizardData['email']['provider'] } }))}
                >
                  <option value="log">Log</option>
                  <option value="smtp">SMTP</option>
                  <option value="sendgrid">SendGrid</option>
                  <option value="resend">Resend</option>
                </select>
              </label>
              <label className="dg-field">
                <span className="dg-label">From Name</span>
                <input className="dg-input" value={form.email.fromName} onChange={(event) => setForm((prev) => ({ ...prev, email: { ...prev.email, fromName: event.target.value } }))} />
              </label>
              <label className="dg-field">
                <span className="dg-label">From Address</span>
                <input className="dg-input" value={form.email.fromAddress} onChange={(event) => setForm((prev) => ({ ...prev, email: { ...prev.email, fromAddress: event.target.value } }))} />
              </label>
              <label className="dg-field">
                <span className="dg-label">SMTP Host</span>
                <input className="dg-input" value={form.email.smtpHost} onChange={(event) => setForm((prev) => ({ ...prev, email: { ...prev.email, smtpHost: event.target.value } }))} />
              </label>
              <label className="dg-field">
                <span className="dg-label">SMTP Port</span>
                <input className="dg-input" value={form.email.smtpPort} onChange={(event) => setForm((prev) => ({ ...prev, email: { ...prev.email, smtpPort: event.target.value } }))} />
              </label>
              <label className="dg-field">
                <span className="dg-label">SMTP Username</span>
                <input className="dg-input" value={form.email.smtpUsername} onChange={(event) => setForm((prev) => ({ ...prev, email: { ...prev.email, smtpUsername: event.target.value } }))} />
              </label>
              <label className="dg-field">
                <span className="dg-label">SMTP Password</span>
                <input className="dg-input" type="password" value={form.email.smtpPassword} onChange={(event) => setForm((prev) => ({ ...prev, email: { ...prev.email, smtpPassword: event.target.value } }))} />
              </label>
              <label className="dg-field">
                <span className="dg-label">SendGrid API Key</span>
                <input className="dg-input" type="password" value={form.email.sendgridApiKey} onChange={(event) => setForm((prev) => ({ ...prev, email: { ...prev.email, sendgridApiKey: event.target.value } }))} />
              </label>
              <label className="dg-field">
                <span className="dg-label">Resend API Key</span>
                <input className="dg-input" type="password" value={form.email.resendApiKey} onChange={(event) => setForm((prev) => ({ ...prev, email: { ...prev.email, resendApiKey: event.target.value } }))} />
              </label>
            </div>
          ) : null}

          {stepIndex === 4 ? (
            <div className="dg-config-grid">
              <label className="dg-field">
                <span className="dg-label">Storage Provider</span>
                <select
                  className="dg-select"
                  value={form.storage.provider}
                  onChange={(event) => setForm((prev) => ({ ...prev, storage: { ...prev.storage, provider: event.target.value as WizardData['storage']['provider'] } }))}
                >
                  <option value="local">Local</option>
                  <option value="s3">S3</option>
                  <option value="r2">Cloudflare R2</option>
                </select>
              </label>
              <label className="dg-field">
                <span className="dg-label">Bucket</span>
                <input className="dg-input" value={form.storage.bucket} onChange={(event) => setForm((prev) => ({ ...prev, storage: { ...prev.storage, bucket: event.target.value } }))} />
              </label>
              <label className="dg-field">
                <span className="dg-label">Region</span>
                <input className="dg-input" value={form.storage.region} onChange={(event) => setForm((prev) => ({ ...prev, storage: { ...prev.storage, region: event.target.value } }))} />
              </label>
              <label className="dg-field">
                <span className="dg-label">Endpoint</span>
                <input className="dg-input" value={form.storage.endpoint} onChange={(event) => setForm((prev) => ({ ...prev, storage: { ...prev.storage, endpoint: event.target.value } }))} />
              </label>
              <label className="dg-field">
                <span className="dg-label">Access Key</span>
                <input className="dg-input" value={form.storage.accessKey} onChange={(event) => setForm((prev) => ({ ...prev, storage: { ...prev.storage, accessKey: event.target.value } }))} />
              </label>
              <label className="dg-field">
                <span className="dg-label">Secret Key</span>
                <input className="dg-input" type="password" value={form.storage.secretKey} onChange={(event) => setForm((prev) => ({ ...prev, storage: { ...prev.storage, secretKey: event.target.value } }))} />
              </label>
              <label className="dg-field">
                <span className="dg-label">Public URL Base</span>
                <input className="dg-input" value={form.storage.publicUrlBase} onChange={(event) => setForm((prev) => ({ ...prev, storage: { ...prev.storage, publicUrlBase: event.target.value } }))} />
              </label>
            </div>
          ) : null}

          {stepIndex === 5 ? (
            <div className="dg-config-grid">
              <label className="dg-field">
                <span className="dg-label">Automation Shared Secret</span>
                <input
                  className="dg-input"
                  type="password"
                  value={form.automation.sharedSecret}
                  onChange={(event) => setForm((prev) => ({ ...prev, automation: { ...prev.automation, sharedSecret: event.target.value } }))}
                />
              </label>
              <label className="dg-field">
                <span className="dg-label">n8n Follow-up Webhook URL</span>
                <input
                  className="dg-input"
                  value={form.automation.n8nQuoteFollowupWebhookUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, automation: { ...prev.automation, n8nQuoteFollowupWebhookUrl: event.target.value } }))}
                />
              </label>
              <label className="dg-checkbox-item" style={{ marginTop: '1.85rem' }}>
                <input
                  type="checkbox"
                  checked={form.automation.n8nFollowupEnabled}
                  onChange={(event) => setForm((prev) => ({ ...prev, automation: { ...prev.automation, n8nFollowupEnabled: event.target.checked } }))}
                />
                Enable n8n follow-up automation
              </label>
            </div>
          ) : null}

          <div className="dg-hero-actions" style={{ marginTop: '1rem' }}>
            <button
              type="button"
              className="dg-btn-secondary"
              onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))}
              disabled={stepIndex === 0 || isSaving}
            >
              Back
            </button>
            {stepIndex < STEPS.length - 1 ? (
              <button
                type="button"
                className="dg-btn-primary"
                onClick={() => setStepIndex((prev) => Math.min(STEPS.length - 1, prev + 1))}
                disabled={!canProceed || isSaving}
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                className="dg-btn-primary"
                onClick={() => void handleApply()}
                disabled={!status.enabled || isSaving}
              >
                {isSaving ? 'Applying...' : 'Apply Reconfiguration'}
              </button>
            )}
          </div>
        </div>

        {message ? (
          <div
            className={
              message.toLowerCase().includes('fail') || message.toLowerCase().includes('invalid')
                ? 'dg-alert-error'
                : 'dg-alert-success'
            }
          >
            {message}
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}
