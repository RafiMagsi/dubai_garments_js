## Day 27 Plan — `AIA-017` Model & Prompt Settings UI (Decision Complete)

### Summary
Build a production-ready Model Settings experience inside AI Sales Agent that adds:
1. Live prompt test panel (real provider call),
2. Structured output preview,
3. Fallback enable/disable toggle,
4. Temperature + style presets (`balanced`, `concise`, `persuasive`),
while keeping the current `pins-*` spacing/visual system and reusable component approach.

### Key Changes
1. **Extend model settings contract + persistence**
- Add `fallbackEnabled: boolean` and `stylePreset: 'balanced' | 'concise' | 'persuasive'` to model config contract and UI types.
- Persist these in `system_settings` (storefront scope), with safe defaults:
  - `fallbackEnabled = true`
  - `stylePreset = balanced`
- Keep strict provider key checks from Day 26; if fallback is enabled and fallback provider is `openai`, fallback key check remains required.

2. **Add prompt test API (live model call)**
- Add new admin endpoint (under `/api/admin/ai-sales-agent/model-config/...`) for prompt testing.
- Request shape includes:
  - selected feature (`copilot | reply_studio | quote_copilot`),
  - test input text,
  - optional context (`leadId`, `dealId`, tone/channel),
  - optional override for prompt/model settings from current unsaved UI state.
- Endpoint flow:
  - validate payload,
  - resolve effective config (saved + overrides),
  - execute live provider path,
  - parse into feature-specific schema,
  - return raw output + structured parse result + schema validity + latency + provider/fallback metadata.
- If provider call fails and fallback is enabled, auto-run fallback and mark `fallbackUsed=true`; if disabled, return explicit failure.

3. **Model Settings UI redesign pass (componentized + compact)**
- Keep existing `ModelSettingsPanel` as base and split into reusable subcomponents:
  - `ModelConfigFormCard` (provider/model/fallback/toggle/presets),
  - `PromptEditorCard` (system prompts),
  - `PromptTestCard` (test form + run action),
  - `StructuredPreviewCard` (parsed output + raw response accordion),
  - `ProviderChecksCard` (existing strict checks).
- Use only existing shared classes/patterns (`pins-*`, `AisBadge`, `AisFieldLabel`) and wrap subcomponents with spacing containers where needed; no ad-hoc one-off inline styling except minimal animation hooks.

4. **Fallback toggles + presets behavior**
- **Fallback toggle**: single global toggle in Model Settings.
  - ON: fallback provider/model can be used in test runs and runtime behavior.
  - OFF: fallback path disabled; failed primary test returns direct error.
- **Style presets (3)**:
  - `balanced` → default temperature, neutral style instruction,
  - `concise` → lower temperature + concise instruction,
  - `persuasive` → slightly higher temperature + persuasive instruction.
- Preset selection auto-updates temperature and style hint in test payload; users can still manually adjust temperature.

5. **Structured output preview UX**
- Preview card must show:
  - `Schema status` badge (`valid`/`invalid`),
  - `Provider`, `Model`, `Fallback used`, `Latency`,
  - parsed JSON block (pretty-printed),
  - invalid case with highlighted parse issues and raw text.
- Add clear empty/loading/error states for test panel and preview panel.

### Public/API/Type Changes
1. Extend existing model config types/contracts with:
- `fallbackEnabled`
- `stylePreset`
2. Add test prompt request/response contracts:
- `AiPromptTestRequest`
- `AiPromptTestResponse`
3. Add frontend API client methods:
- `runAiPromptTest(...)`
- update `getAiModelConfig`/`updateAiModelConfig` envelopes with new fields.

### Test Plan
1. **Config UI**
- Load existing settings, update fields, save successfully, reload reflects persisted values.
- Toggle fallback ON/OFF and verify persisted state.
- Switch style preset and verify temperature/style hint auto-update.

2. **Strict key checks**
- `openai` selected without key -> save blocked with clear message.
- deterministic provider -> save allowed.
- fallback enabled + fallback openai without key -> blocked.

3. **Prompt test panel (live)**
- Valid test request returns parsed structured output (`schemaValid=true`) for each feature mode.
- Invalid/partial output returns `schemaValid=false` with parse issues + raw output visible.
- Primary failure with fallback enabled triggers fallback and marks metadata.
- Primary failure with fallback disabled returns explicit error.

4. **UX/spacing regression**
- Desktop and mobile verify no cramped sections, consistent card spacing, and no style drift from other AI tabs.
- Check test IDs for automation: panel, run button, schema status badge, parsed output block, raw output block.

### Assumptions / Defaults Locked
1. Prompt test mode is **live model call** (not mock-only).
2. Fallback control is a **single global enable/disable toggle**.
3. Presets are exactly **3**: `balanced`, `concise`, `persuasive`.
4. Day 27 includes minimal backend additions needed to support the frontend test panel and new toggles/presets.
