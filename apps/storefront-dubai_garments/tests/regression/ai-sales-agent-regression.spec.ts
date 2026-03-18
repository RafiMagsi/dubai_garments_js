import { expect, test, type Page } from '@playwright/test';

type RoleKey = 'admin' | 'sales_manager' | 'sales_rep' | 'ops';

const creds: Record<RoleKey, { email: string; password: string }> = {
  admin: {
    email: process.env.QA_ADMIN_EMAIL || 'admin@dubaigarments.me',
    password: process.env.QA_ADMIN_PASSWORD || 'test@1234',
  },
  sales_manager: {
    email: process.env.QA_SALES_MANAGER_EMAIL || 'sales.manager@dubaigarments.me',
    password: process.env.QA_SALES_MANAGER_PASSWORD || 'test@1234',
  },
  sales_rep: {
    email: process.env.QA_SALES_REP_EMAIL || 'sales.rep@dubaigarments.me',
    password: process.env.QA_SALES_REP_PASSWORD || 'test@1234',
  },
  ops: {
    email: process.env.QA_OPS_EMAIL || 'ops@dubaigarments.me',
    password: process.env.QA_OPS_PASSWORD || 'test@1234',
  },
};

async function login(page: Page, role: RoleKey) {
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(creds[role].email);
  await page.getByLabel('Password').fill(creds[role].password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard/);
}

async function expectVisibleByTestId(page: Page, testId: string) {
  const locator = page.getByTestId(testId);
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeVisible();
}

async function createLeadViaIntake(page: Page) {
  const productsResponse = await page.request.get('/api/products');
  expect(productsResponse.ok()).toBeTruthy();
  const products = (await productsResponse.json()) as Array<{ id: string }>;
  expect(products.length).toBeGreaterThan(0);

  const runId = Date.now();
  const company = `QA-${runId}`;
  const name = `Regression ${runId}`;
  const email = `qa+${runId}@example.com`;

  const intakeResponse = await page.request.post('/api/quote-requests', {
    multipart: {
      name,
      company,
      email,
      product: products[0].id,
      quantity: '120',
      delivery_date: '2026-04-15',
      message: `Regression lead ${runId} for AI Day 10 checks`,
    },
  });
  expect(intakeResponse.ok()).toBeTruthy();

  const listResponse = await page.request.get(`/api/admin/leads?search=${encodeURIComponent(company)}`);
  expect(listResponse.ok()).toBeTruthy();
  const listPayload = (await listResponse.json()) as { items?: Array<{ id: string; company_name?: string }> };
  const leadId = listPayload.items?.[0]?.id;
  expect(leadId).toBeTruthy();
  return leadId as string;
}

async function convertLeadToDeal(page: Page, leadId: string) {
  const response = await page.request.post(`/api/admin/leads/${leadId}/convert-to-deal`, {
    data: {},
  });
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as { item?: { id?: string } };
  return payload.item?.id ?? null;
}

let leadId = '';

test.describe.serial('AI Sales Agent regression', () => {
  test('Flow A/B/C/D/E/F from checklist (AI Sales Agent first)', async ({ page }) => {
    await login(page, 'admin');
    leadId = await createLeadViaIntake(page);

    // Start from AI Sales Agent page (primary workflow for this regression)
    await page.goto('/admin/ai-sales-agent');
    await expectVisibleByTestId(page, 'ai-sales-agent-lead-preview-input');
    await page.getByTestId('ai-sales-agent-lead-preview-input').fill(leadId);
    await expectVisibleByTestId(page, 'ai-sales-agent-lead-preview-cards');
    await expectVisibleByTestId(page, 'ai-sales-agent-lead-intelligence-preview');

    // Then validate lead detail rendering + actions
    await page.goto(`/admin/leads/${leadId}`);
    await expectVisibleByTestId(page, 'lead-detail-intelligence-section');
    await expectVisibleByTestId(page, 'lead-intelligence-cards');
    await expectVisibleByTestId(page, 'lead-intelligence-classification-badge');
    await expectVisibleByTestId(page, 'lead-intelligence-fallback-badge');
    await expectVisibleByTestId(page, 'lead-intelligence-last-analyzed-badge');
    await expectVisibleByTestId(page, 'lead-intelligence-provider-badge');
    await expectVisibleByTestId(page, 'lead-intelligence-confidence-block');
    await expectVisibleByTestId(page, 'lead-intelligence-reason-block');

    await page.getByTestId('lead-intelligence-triage-btn').click();
    await expect(page.getByText(/Lead triage completed/i)).toBeVisible();

    await page.getByTestId('lead-intelligence-draft-reply-btn').click();
    await expect(page.getByTestId('lead-intelligence-draft-preview')).toBeVisible();

    await page.getByTestId('lead-intelligence-convert-btn').click();
    await expect(page.getByText(/converted/i)).toBeVisible();

    await page.getByTestId('lead-intelligence-prioritize-btn').click();
    await expect(page.getByText(/prioritized/i)).toBeVisible();

    await page.goto('/admin/ai-sales-agent');
    await expectVisibleByTestId(page, 'ai-sales-agent-lead-intelligence-preview');
    await page.getByTestId('ai-sales-agent-lead-preview-input').fill(leadId);
    await expectVisibleByTestId(page, 'ai-sales-agent-lead-preview-cards');
  });

  test('Role behavior matrix validation (API + page visibility)', async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { name: /Users/i })).toBeVisible();
    const adminUsersResponse = await page.request.get('/api/admin/users');
    expect(adminUsersResponse.status()).toBe(200);

    for (const role of ['sales_manager', 'sales_rep', 'ops'] as const) {
      await login(page, role);
      await page.goto('/admin/ai-sales-agent');
      await expect(page.getByRole('heading', { name: /Ai Sales Agent/i })).toBeVisible();

      const usersResponse = await page.request.get('/api/admin/users');
      expect([401, 403]).toContain(usersResponse.status());

      const copilotResponse = await page.request.post('/api/admin/ai-sales-agent/copilot', {
        data: {
          intent: 'followups_today',
        },
      });
      expect(copilotResponse.status()).toBe(200);
    }
  });

  test('Day 17 Reply Studio integration (context + edit/regenerate + approve/send audit)', async ({ page }) => {
    await login(page, 'admin');
    const leadId = await createLeadViaIntake(page);
    const dealId = await convertLeadToDeal(page, leadId);

    await page.goto('/admin/ai-sales-agent');
    await page.getByRole('button', { name: 'Reply Studio' }).click();

    await page.getByTestId('reply-studio-panel').scrollIntoViewIfNeeded();
    await page.getByTestId('reply-studio-lead-id-input').fill(leadId);
    if (dealId) {
      await page.getByTestId('reply-studio-deal-id-input').fill(dealId);
    }
    await page.getByTestId('reply-studio-notes-input').fill('Day 17 integration test notes');
    await page.getByRole('button', { name: 'Run Reply Studio' }).click();

    await expect(page.getByTestId('reply-studio-draft-output-card')).toBeVisible();
    const messageInput = page.getByTestId('reply-studio-message-input');
    await expect(messageInput).toBeVisible();

    const testSuffix = '\n\n[manual edit marker]';
    await messageInput.fill(`${await messageInput.inputValue()}${testSuffix}`);
    await page.getByTestId('reply-studio-regenerate-btn').click();

    await expect(page.getByTestId('reply-studio-draft-output-card')).toBeVisible();
    await expect(messageInput).not.toHaveValue(new RegExp('\\[manual edit marker\\]'));

    await page.getByTestId('reply-studio-approve-send-btn').click();
    await expect(page.getByTestId('reply-studio-send-status')).toContainText('Draft approved and sent');

    const currentMessage = await messageInput.inputValue();
    const directAuditResponse = await page.request.patch('/api/admin/ai-sales-agent/reply-studio', {
      data: {
        leadId,
        subject: 'Audit probe',
        message: currentMessage,
        channel: 'email',
      },
    });
    expect(directAuditResponse.ok()).toBeTruthy();
    const directAuditPayload = (await directAuditResponse.json()) as { activityId?: string };
    expect(!!directAuditPayload.activityId).toBeTruthy();
  });

  test('Day 18 Quote recommendation integration (endpoint + payload + missing-data detection)', async ({ page }) => {
    await login(page, 'admin');
    const leadId = await createLeadViaIntake(page);

    await page.goto('/admin/ai-sales-agent');
    await page.getByRole('button', { name: 'Quote Copilot' }).click();

    await expectVisibleByTestId(page, 'quote-recommendation-lead-id-input');
    await page.getByTestId('quote-recommendation-lead-id-input').fill(leadId);
    await page.getByRole('button', { name: 'Run Quote Recommendation' }).click();

    await expectVisibleByTestId(page, 'quote-recommendation-summary-card');
    await expectVisibleByTestId(page, 'quote-recommendation-products-card');
    await expectVisibleByTestId(page, 'quote-recommendation-missing-card');

    const response = await page.request.post('/api/admin/ai-sales-agent/quote-recommendation', {
      data: { leadId, dry_run: false },
    });
    expect(response.ok()).toBeTruthy();
    const payload = (await response.json()) as {
      ok?: boolean;
      data?: {
        recommendations?: Array<unknown>;
        missingData?: Array<{ field: string; reason: string }>;
        canCreateQuote?: boolean;
      };
    };
    expect(payload.ok).toBeTruthy();
    expect((payload.data?.recommendations?.length ?? 0) > 0).toBeTruthy();
    expect(Array.isArray(payload.data?.missingData)).toBeTruthy();
    expect(typeof payload.data?.canCreateQuote === 'boolean').toBeTruthy();
  });

  test('Day 20 end-to-end lead -> reply studio -> quote copilot path', async ({ page }) => {
    await login(page, 'admin');
    const leadId = await createLeadViaIntake(page);

    await page.goto('/admin/ai-sales-agent');
    await page.getByRole('button', { name: 'Reply Studio' }).click();

    await expectVisibleByTestId(page, 'reply-studio-lead-id-input');
    await page.getByTestId('reply-studio-lead-id-input').fill(leadId);
    await page.getByRole('button', { name: 'Run Reply Studio' }).click();
    await expectVisibleByTestId(page, 'reply-studio-draft-output-card');
    await expect(page.getByText(/Latency:/i)).toBeVisible();

    await page.getByRole('button', { name: 'Quote Copilot' }).click();
    await expectVisibleByTestId(page, 'quote-recommendation-lead-id-input');
    await page.getByTestId('quote-recommendation-lead-id-input').fill(leadId);
    await page.getByRole('button', { name: 'Run Quote Recommendation' }).click();

    await expectVisibleByTestId(page, 'quote-recommendation-summary-card');
    await page.getByRole('button', { name: 'Generate Quote Copilot Summary' }).click();
    await expectVisibleByTestId(page, 'quote-copilot-summary-card');
    await expectVisibleByTestId(page, 'quote-copilot-intelligence-card');
  });
});
