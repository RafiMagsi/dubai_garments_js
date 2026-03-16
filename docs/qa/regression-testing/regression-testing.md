
# AI Sales Agent — Regression Checklist

## Scope
Validate the full path from lead intake to intelligence rendering and actionability.

---

## Flow A — Lead intake to lead detail intelligence

### Preconditions
- A valid lead can be created through the current lead intake flow.
- AI triage is available and persisted.
- User is logged in as a backoffice role.

### Steps
1. Submit a new lead through the current intake flow.
2. Confirm lead record exists in admin.
3. Open `/admin/leads/<leadId>`.
4. Confirm the section `data-testid="lead-detail-intelligence-section"` is visible.
5. Confirm `data-testid="lead-intelligence-cards"` is visible.
6. Confirm these badges are visible:
   - `lead-intelligence-classification-badge`
   - `lead-intelligence-fallback-badge`
   - `lead-intelligence-last-analyzed-badge`
   - `lead-intelligence-provider-badge`
7. Confirm the explainability blocks are visible:
   - `lead-intelligence-confidence-block`
   - `lead-intelligence-reason-block`

### Expected
- Lead intelligence renders without error.
- Score/classification/provider/fallback/last analyzed are visible.
- Summary and next-best-action are visible.

---

## Flow B — Manual retrigger

### Steps
1. Open a lead detail page.
2. Click `data-testid="lead-intelligence-triage-btn"`.

### Expected
- Triage completes successfully.
- Intelligence remains visible after retrigger.
- Last analyzed timestamp updates.
- Provider/fallback badges still render correctly.

---

## Flow C — Draft reply from intelligence

### Steps
1. Open a lead detail page.
2. Click `data-testid="lead-intelligence-draft-reply-btn"`.

### Expected
- Draft preview renders.
- `data-testid="lead-intelligence-draft-preview"` becomes visible.
- A timeline/audit event is written for success or failure.

---

## Flow D — Convert from intelligence

### Steps
1. Open a lead detail page.
2. Click `data-testid="lead-intelligence-convert-btn"`.

### Expected
- Lead converts to deal successfully.
- A timeline/audit event is written.

---

## Flow E — Prioritize from intelligence

### Steps
1. Open a lead detail page.
2. Click `data-testid="lead-intelligence-prioritize-btn"`.

### Expected
- Lead status is updated to qualified.
- A timeline/audit event is written.

---

## Flow F — AI Sales Agent mirror

### Steps
1. Open `/admin/ai-sales-agent`.
2. Confirm `data-testid="ai-sales-agent-lead-intelligence-preview"` is visible.
3. Enter a lead ID into `data-testid="ai-sales-agent-lead-preview-input"`.
4. Confirm `data-testid="ai-sales-agent-lead-preview-cards"` is visible.

### Expected
- The same intelligence cards render as on the lead detail page.
- Provider/fallback/last analyzed/confidence/reason are visible here too.

---

## Pass Criteria
- All 6 flows complete without UI breakage.
- No critical console/runtime errors.
- Intelligence actions remain auditable.