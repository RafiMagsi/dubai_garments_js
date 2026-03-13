'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type InstallStatus = {
  installed: boolean;
  tenantSlug: string;
  installedAt: string | null;
  tokenRequired: boolean;
  tokenConsumed: boolean;
  accessGranted: boolean;
};

type WizardData = {
  database: {
    databaseUrl: string;
  };
  tenant: {
    name: string;
    slug: string;
  };
  admin: {
    fullName: string;
    email: string;
    password: string;
  };
  ai: {
    openaiApiKey: string;
    openaiModel: string;
  };
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

const INITIAL_DATA: WizardData = {
  database: {
    databaseUrl: '',
  },
  tenant: {
    name: 'Default Tenant',
    slug: 'default',
  },
  admin: {
    fullName: '',
    email: '',
    password: '',
  },
  ai: {
    openaiApiKey: '',
    openaiModel: 'gpt-4o-mini',
  },
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
  'Database Connection',
  'Admin User Creation',
  'OpenAI API',
  'Email Provider',
  'Storage Configuration',
  'Automation Settings',
];

function InstallPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState<WizardData>(INITIAL_DATA);
  const [status, setStatus] = useState<InstallStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dbValidated, setDbValidated] = useState(false);
  const [installToken, setInstallToken] = useState(searchParams.get('token') || '');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const response = await fetch(`/api/install/status${installToken ? `?token=${encodeURIComponent(installToken)}` : ''}`, {
          cache: 'no-store',
          headers: installToken ? { 'x-install-token': installToken } : undefined,
        });
        const payload = (await response.json()) as InstallStatus & { message?: string };
        if (!mounted) return;
        if (response.ok) {
          setStatus({
            installed: Boolean(payload.installed),
            tenantSlug: payload.tenantSlug || 'default',
            installedAt: payload.installedAt || null,
            tokenRequired: Boolean(payload.tokenRequired),
            tokenConsumed: Boolean(payload.tokenConsumed),
            accessGranted: Boolean(payload.accessGranted),
          });
          if (payload.installed) {
            router.replace('/admin/login');
            return;
          }
        } else {
          setError(payload.message || 'Unable to load install status.');
        }
      } catch (requestError) {
        if (!mounted) return;
        setError(requestError instanceof Error ? requestError.message : 'Unable to load install status.');
      } finally {
        if (mounted) setIsLoadingStatus(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [installToken, router]);

  const canGoNext = useMemo(() => {
    if (stepIndex === 0) return dbValidated;
    if (stepIndex === 1) {
      return data.admin.fullName.trim() && data.admin.email.trim() && data.admin.password.trim().length >= 8;
    }
    return true;
  }, [stepIndex, dbValidated, data.admin]);

  async function handleValidateDb() {
    setError(null);
    setNotice(null);
    setDbValidated(false);
    try {
      const response = await fetch('/api/install/validate-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(installToken ? { 'x-install-token': installToken } : {}),
        },
        body: JSON.stringify({ databaseUrl: data.database.databaseUrl }),
      });
      const payload = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !payload.ok) {
        setError(payload.message || 'Database validation failed.');
        return;
      }
      setDbValidated(true);
      setNotice(payload.message || 'Database validation successful.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Database validation failed.');
    }
  }

  async function handleComplete(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/install/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(installToken ? { 'x-install-token': installToken } : {}),
        },
        body: JSON.stringify(data),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        tenant?: { slug?: string };
        completedAt?: string;
      };
      if (!response.ok || !payload.ok) {
        setError(payload.message || 'Installation failed.');
        return;
      }
      setStatus({
        installed: true,
        tenantSlug: payload.tenant?.slug || data.tenant.slug || 'default',
        installedAt: payload.completedAt || new Date().toISOString(),
        tokenRequired: true,
        tokenConsumed: true,
        accessGranted: false,
      });
      setNotice(payload.message || 'System ready.');
      router.replace('/admin/login');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Installation failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status?.tokenRequired && !status.accessGranted) {
    return (
      <main className="dg-main">
        <section className="dg-section">
          <div className="dg-container">
            <div className="dg-card dg-info-card">
              <p className="dg-badge">Install Lock</p>
              <h1 className="dg-section-title" style={{ marginTop: '0.75rem' }}>
                Enter one-time install token
              </h1>
              <p className="dg-section-copy" style={{ marginTop: '0.6rem' }}>
                This setup is protected. Use the marketplace install token to continue.
              </p>
              {error ? <div className="dg-alert-error">{error}</div> : null}
              <div className="dg-config-form" style={{ marginTop: '1rem' }}>
                <label className="dg-field">
                  <span className="dg-label">Install Token</span>
                  <input
                    className="dg-input"
                    type="password"
                    value={installToken}
                    onChange={(event) => setInstallToken(event.target.value)}
                  />
                </label>
                <div className="dg-hero-actions" style={{ marginTop: '0.2rem' }}>
                  <button
                    type="button"
                    className="dg-btn-primary"
                    onClick={() => {
                      const url = installToken ? `/install?token=${encodeURIComponent(installToken)}` : '/install';
                      router.replace(url);
                    }}
                  >
                    Validate Token
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (isLoadingStatus) {
    return (
      <main className="dg-main">
        <section className="dg-section">
          <div className="dg-container">
            <div className="dg-card dg-info-card">
              <p className="dg-section-copy">Checking installation status...</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (status?.installed) {
    return (
      <main className="dg-main">
        <section className="dg-section">
          <div className="dg-container">
            <div className="dg-card dg-info-card">
              <p className="dg-badge">System Ready</p>
              <h1 className="dg-section-title" style={{ marginTop: '0.75rem' }}>
                Installation complete
              </h1>
              <p className="dg-section-copy" style={{ marginTop: '0.6rem' }}>
                Tenant: <strong>{status.tenantSlug}</strong>
                {status.installedAt ? ` · Installed at ${new Date(status.installedAt).toLocaleString()}` : ''}
              </p>
              <div className="dg-hero-actions" style={{ marginTop: '1.2rem' }}>
                <Link href="/admin/login" className="dg-btn-primary">
                  Go to Admin Login
                </Link>
                <Link href="/" className="dg-btn-secondary">
                  Open Storefront
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="dg-main">
      <section className="dg-section">
        <div className="dg-container">
          <div className="dg-card dg-info-card">
            <p className="dg-badge">Installation Wizard</p>
            <h1 className="dg-section-title" style={{ marginTop: '0.75rem' }}>
              Set up your AI Sales System
            </h1>
            <p className="dg-section-copy" style={{ marginTop: '0.5rem' }}>
              Complete all 6 steps to finish setup for marketplace deployment.
            </p>

            <div className="dg-chip-cloud" style={{ marginTop: '1rem' }}>
              {STEPS.map((step, index) => (
                <span key={step} className={`dg-chip ${index === stepIndex ? 'dg-chip-active' : ''}`}>
                  {index + 1}. {step}
                </span>
              ))}
            </div>

            {error ? <div className="dg-alert-error">{error}</div> : null}
            {notice ? <div className="dg-alert-success">{notice}</div> : null}

            <form onSubmit={handleComplete} className="dg-config-form" style={{ marginTop: '1.1rem' }}>
              {stepIndex === 0 ? (
                <div className="dg-config-grid">
                  <label className="dg-field">
                    <span className="dg-label">Database URL (optional override)</span>
                    <input
                      className="dg-input"
                      value={data.database.databaseUrl}
                      onChange={(event) =>
                        setData((prev) => ({
                          ...prev,
                          database: { ...prev.database, databaseUrl: event.target.value },
                        }))
                      }
                      placeholder="postgresql://user:password@host:5432/db"
                    />
                    <span className="dg-help">
                      Wizard validates current runtime DB connection. URL here is stored in settings.
                    </span>
                  </label>
                  <label className="dg-field">
                    <span className="dg-label">Tenant Name</span>
                    <input
                      className="dg-input"
                      value={data.tenant.name}
                      onChange={(event) =>
                        setData((prev) => ({ ...prev, tenant: { ...prev.tenant, name: event.target.value } }))
                      }
                    />
                  </label>
                  <label className="dg-field">
                    <span className="dg-label">Tenant Slug</span>
                    <input
                      className="dg-input"
                      value={data.tenant.slug}
                      onChange={(event) =>
                        setData((prev) => ({ ...prev, tenant: { ...prev.tenant, slug: event.target.value } }))
                      }
                    />
                  </label>
                  <div className="dg-field" style={{ alignSelf: 'end' }}>
                    <button type="button" className="dg-btn-primary" onClick={handleValidateDb}>
                      Validate Database
                    </button>
                  </div>
                </div>
              ) : null}

              {stepIndex === 1 ? (
                <div className="dg-config-grid">
                  <label className="dg-field">
                    <span className="dg-label">Admin Full Name</span>
                    <input
                      className="dg-input"
                      value={data.admin.fullName}
                      onChange={(event) =>
                        setData((prev) => ({ ...prev, admin: { ...prev.admin, fullName: event.target.value } }))
                      }
                    />
                  </label>
                  <label className="dg-field">
                    <span className="dg-label">Admin Email</span>
                    <input
                      className="dg-input"
                      type="email"
                      value={data.admin.email}
                      onChange={(event) =>
                        setData((prev) => ({ ...prev, admin: { ...prev.admin, email: event.target.value } }))
                      }
                    />
                  </label>
                  <label className="dg-field">
                    <span className="dg-label">Admin Password</span>
                    <input
                      className="dg-input"
                      type="password"
                      value={data.admin.password}
                      onChange={(event) =>
                        setData((prev) => ({ ...prev, admin: { ...prev.admin, password: event.target.value } }))
                      }
                    />
                    <span className="dg-help">Minimum 8 characters.</span>
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
                      value={data.ai.openaiApiKey}
                      onChange={(event) =>
                        setData((prev) => ({ ...prev, ai: { ...prev.ai, openaiApiKey: event.target.value } }))
                      }
                    />
                  </label>
                  <label className="dg-field">
                    <span className="dg-label">OpenAI Model</span>
                    <input
                      className="dg-input"
                      value={data.ai.openaiModel}
                      onChange={(event) =>
                        setData((prev) => ({ ...prev, ai: { ...prev.ai, openaiModel: event.target.value } }))
                      }
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
                      value={data.email.provider}
                      onChange={(event) =>
                        setData((prev) => ({
                          ...prev,
                          email: { ...prev.email, provider: event.target.value as WizardData['email']['provider'] },
                        }))
                      }
                    >
                      <option value="log">Log</option>
                      <option value="smtp">SMTP</option>
                      <option value="sendgrid">SendGrid</option>
                      <option value="resend">Resend</option>
                    </select>
                  </label>
                  <label className="dg-field">
                    <span className="dg-label">From Name</span>
                    <input
                      className="dg-input"
                      value={data.email.fromName}
                      onChange={(event) =>
                        setData((prev) => ({ ...prev, email: { ...prev.email, fromName: event.target.value } }))
                      }
                    />
                  </label>
                  <label className="dg-field">
                    <span className="dg-label">From Email</span>
                    <input
                      className="dg-input"
                      type="email"
                      value={data.email.fromAddress}
                      onChange={(event) =>
                        setData((prev) => ({ ...prev, email: { ...prev.email, fromAddress: event.target.value } }))
                      }
                    />
                  </label>
                  <label className="dg-field">
                    <span className="dg-label">SMTP Host</span>
                    <input
                      className="dg-input"
                      value={data.email.smtpHost}
                      onChange={(event) =>
                        setData((prev) => ({ ...prev, email: { ...prev.email, smtpHost: event.target.value } }))
                      }
                    />
                  </label>
                  <label className="dg-field">
                    <span className="dg-label">SMTP Port</span>
                    <input
                      className="dg-input"
                      value={data.email.smtpPort}
                      onChange={(event) =>
                        setData((prev) => ({ ...prev, email: { ...prev.email, smtpPort: event.target.value } }))
                      }
                    />
                  </label>
                  <label className="dg-field">
                    <span className="dg-label">SMTP Username</span>
                    <input
                      className="dg-input"
                      value={data.email.smtpUsername}
                      onChange={(event) =>
                        setData((prev) => ({ ...prev, email: { ...prev.email, smtpUsername: event.target.value } }))
                      }
                    />
                  </label>
                  <label className="dg-field">
                    <span className="dg-label">SMTP Password</span>
                    <input
                      className="dg-input"
                      type="password"
                      value={data.email.smtpPassword}
                      onChange={(event) =>
                        setData((prev) => ({ ...prev, email: { ...prev.email, smtpPassword: event.target.value } }))
                      }
                    />
                  </label>
                  <label className="dg-field">
                    <span className="dg-label">SendGrid API Key</span>
                    <input
                      className="dg-input"
                      type="password"
                      value={data.email.sendgridApiKey}
                      onChange={(event) =>
                        setData((prev) => ({ ...prev, email: { ...prev.email, sendgridApiKey: event.target.value } }))
                      }
                    />
                  </label>
                  <label className="dg-field">
                    <span className="dg-label">Resend API Key</span>
                    <input
                      className="dg-input"
                      type="password"
                      value={data.email.resendApiKey}
                      onChange={(event) =>
                        setData((prev) => ({ ...prev, email: { ...prev.email, resendApiKey: event.target.value } }))
                      }
                    />
                  </label>
                </div>
              ) : null}

              {stepIndex === 4 ? (
                <div className="dg-config-grid">
                  <label className="dg-field">
                    <span className="dg-label">Storage Provider</span>
                    <select
                      className="dg-select"
                      value={data.storage.provider}
                      onChange={(event) =>
                        setData((prev) => ({
                          ...prev,
                          storage: { ...prev.storage, provider: event.target.value as WizardData['storage']['provider'] },
                        }))
                      }
                    >
                      <option value="local">Local</option>
                      <option value="s3">S3</option>
                      <option value="r2">Cloudflare R2</option>
                    </select>
                  </label>
                  <label className="dg-field">
                    <span className="dg-label">Bucket</span>
                    <input
                      className="dg-input"
                      value={data.storage.bucket}
                      onChange={(event) =>
                        setData((prev) => ({ ...prev, storage: { ...prev.storage, bucket: event.target.value } }))
                      }
                    />
                  </label>
                  <label className="dg-field">
                    <span className="dg-label">Region</span>
                    <input
                      className="dg-input"
                      value={data.storage.region}
                      onChange={(event) =>
                        setData((prev) => ({ ...prev, storage: { ...prev.storage, region: event.target.value } }))
                      }
                    />
                  </label>
                  <label className="dg-field">
                    <span className="dg-label">Endpoint</span>
                    <input
                      className="dg-input"
                      value={data.storage.endpoint}
                      onChange={(event) =>
                        setData((prev) => ({ ...prev, storage: { ...prev.storage, endpoint: event.target.value } }))
                      }
                    />
                  </label>
                  <label className="dg-field">
                    <span className="dg-label">Access Key</span>
                    <input
                      className="dg-input"
                      value={data.storage.accessKey}
                      onChange={(event) =>
                        setData((prev) => ({ ...prev, storage: { ...prev.storage, accessKey: event.target.value } }))
                      }
                    />
                  </label>
                  <label className="dg-field">
                    <span className="dg-label">Secret Key</span>
                    <input
                      className="dg-input"
                      type="password"
                      value={data.storage.secretKey}
                      onChange={(event) =>
                        setData((prev) => ({ ...prev, storage: { ...prev.storage, secretKey: event.target.value } }))
                      }
                    />
                  </label>
                  <label className="dg-field">
                    <span className="dg-label">Public URL Base</span>
                    <input
                      className="dg-input"
                      value={data.storage.publicUrlBase}
                      onChange={(event) =>
                        setData((prev) => ({ ...prev, storage: { ...prev.storage, publicUrlBase: event.target.value } }))
                      }
                    />
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
                      value={data.automation.sharedSecret}
                      onChange={(event) =>
                        setData((prev) => ({
                          ...prev,
                          automation: { ...prev.automation, sharedSecret: event.target.value },
                        }))
                      }
                    />
                  </label>
                  <label className="dg-field">
                    <span className="dg-label">n8n Quote Follow-up Webhook URL</span>
                    <input
                      className="dg-input"
                      value={data.automation.n8nQuoteFollowupWebhookUrl}
                      onChange={(event) =>
                        setData((prev) => ({
                          ...prev,
                          automation: { ...prev.automation, n8nQuoteFollowupWebhookUrl: event.target.value },
                        }))
                      }
                    />
                  </label>
                  <label className="dg-checkbox-item" style={{ marginTop: '1.85rem' }}>
                    <input
                      type="checkbox"
                      checked={data.automation.n8nFollowupEnabled}
                      onChange={(event) =>
                        setData((prev) => ({
                          ...prev,
                          automation: { ...prev.automation, n8nFollowupEnabled: event.target.checked },
                        }))
                      }
                    />
                    Enable n8n follow-up automation
                  </label>
                </div>
              ) : null}

              <div className="dg-hero-actions" style={{ marginTop: '0.4rem' }}>
                <button
                  type="button"
                  className="dg-btn-secondary"
                  onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
                  disabled={stepIndex === 0 || isSubmitting}
                >
                  Back
                </button>
                {stepIndex < STEPS.length - 1 ? (
                  <button
                    type="button"
                    className="dg-btn-primary"
                    onClick={() => setStepIndex((current) => Math.min(STEPS.length - 1, current + 1))}
                    disabled={!canGoNext || isSubmitting}
                  >
                    Next
                  </button>
                ) : (
                  <button type="submit" className="dg-btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Installing...' : 'Finish Installation'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}

function InstallPageFallback() {
  return (
    <main className="dg-main">
      <section className="dg-section">
        <div className="dg-container">
          <div className="dg-card dg-info-card">
            <p className="dg-section-copy">Loading installation wizard...</p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function InstallPage() {
  return (
    <Suspense fallback={<InstallPageFallback />}>
      <InstallPageInner />
    </Suspense>
  );
}
