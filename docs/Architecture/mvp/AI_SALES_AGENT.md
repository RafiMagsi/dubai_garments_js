# AI Sales Agent

## Lead Details Page Audit and Professionalization Plan

### Current Assessment
Lead Details is already useful because it centralizes:
- lead profile context
- lead-to-close execution flow
- AI intelligence
- communication + timeline history

The main issue is not missing capability. The main issue is duplicate control paths for lifecycle actions, which makes the page feel less deterministic and less professional.

### What Is Useful (Keep)
- Lead Profile as the source context for sales reps.
- Lead-to-Close Execution Board as the primary orchestration surface.
- AI Intelligence cards as analysis visibility and confidence context.
- Lead Timeline for audit trail and chronology.
- Email Communication panel for direct follow-up execution.
- Create Quote modal from lead context when flow reaches quote stages.

### What Is Not Useful / Duplicated
- Lifecycle actions are duplicated between Execution Board and Intelligence cards.
- Lead status can be updated from generic status form and also from flow stage actions.
- Multiple stage transitions can be triggered from different UI areas without a single authority.
- Synthetic/system timeline entries can duplicate real activity signals.
- Dead code/import/state in Lead Details indicates implementation drift.

### Known Drift Points in Lead Details
- Unused import: `formatDateTime`
- Unused import: `DealLinkCard`
- Unused helper: `statusPillClass`
- Unused deal conversion states/handler in this page (`dealSuccess`, `dealError`, `handleCreateDeal`) while conversion is handled in flow/intelligence paths.
- `sessionUserId` is loaded but not used in the current Lead Details surface.

### Target Professional UX Model
- Single lifecycle authority:
  - Execution Board is the only place that mutates lifecycle stages.
- Intelligence as analysis layer:
  - keep triage insights, confidence, rationale, and suggested action
  - remove direct lifecycle mutation actions from Intelligence panel
- Manual override safety:
  - status dropdown remains available only under explicit override mode with required reason
- Clear record linkage:
  - compact linked-record summary (Lead/Deal/Quote IDs, status chips, deep links)
- Audit-first timeline:
  - prioritize canonical activity events, reduce synthetic duplicates

### Recommended Implementation Priorities
1. P0: Remove duplicate lifecycle mutation actions from Intelligence panel and keep Execution Board as sole stage-action surface.
2. P0: Gate generic lead status update behind explicit manual override mode + reason capture.
3. P1: Add Linked Records Snapshot card near top of Lead Details.
4. P1: Improve timeline dedup strategy to avoid synthetic and canonical event overlap.
5. P2: Refactor page sections into clear professional zones:
   - Record Context
   - Lifecycle Orchestration
   - Intelligence
   - Communications and Audit

### Completion Criteria
- Each lifecycle stage has one clear action owner in UI.
- No duplicate CTA for the same stage mutation.
- Stage transitions are explainable and auditable from timeline + board evidence.
- Lead status remains consistent with lifecycle stage outcomes.
- Page remains reactive without requiring manual refresh after stage actions.
