import { prisma } from '@/lib/prisma';

type TemplateDefinition = {
  key: string;
  name: string;
  category: string;
  description: string;
  inputs: string[];
  outputs: string[];
  guardrails: string[];
  defaultEnabled: boolean;
};

const TEMPLATE_DEFINITIONS: TemplateDefinition[] = [
  {
    key: 'followup_sequence',
    name: 'Follow-up Sequence',
    category: 'sales_followup',
    description: 'Runs staged follow-up touchpoints after lead inactivity.',
    inputs: ['leadId', 'channel', 'urgency'],
    outputs: ['activity log', 'draft follow-up', 'queue update'],
    guardrails: ['skip if lead is closed', 'skip if owner missing'],
    defaultEnabled: true,
  },
  {
    key: 'smart_owner_routing',
    name: 'Smart Owner Routing',
    category: 'routing',
    description: 'Assigns or confirms owner based on role and SLA state.',
    inputs: ['leadId', 'dealId', 'owner availability'],
    outputs: ['assigned owner', 'routing note'],
    guardrails: ['do not overwrite active owner without admin review'],
    defaultEnabled: true,
  },
  {
    key: 'quote_check',
    name: 'Quote Check',
    category: 'quote_quality',
    description: 'Runs quote readiness and margin/discount guardrails.',
    inputs: ['quoteId', 'accepted recommendations'],
    outputs: ['quote intelligence summary', 'risk flags'],
    guardrails: ['block if missing quantity or variant'],
    defaultEnabled: false,
  },
];

function settingKeyForTemplate(key: string) {
  return `AI_AUTOMATION_TEMPLATE_${key.toUpperCase()}`;
}

async function readTemplateEnabledMap() {
  const keys = TEMPLATE_DEFINITIONS.map((item) => settingKeyForTemplate(item.key));
  const rows = await prisma.$queryRaw<Array<{ key: string; value: string }>>`
    SELECT key, value
    FROM system_settings
    WHERE scope = 'storefront'
      AND is_active = TRUE
      AND key = ANY(${keys})
  `;

  const map = new Map<string, boolean>();
  rows.forEach((row) => {
    map.set(row.key, String(row.value).toLowerCase() === 'true');
  });

  return map;
}

export async function getAutomationTemplateLibrary() {
  const enabledMap = await readTemplateEnabledMap();

  return {
    templates: TEMPLATE_DEFINITIONS.map((item) => ({
      key: item.key,
      name: item.name,
      category: item.category,
      description: item.description,
      inputs: item.inputs,
      outputs: item.outputs,
      guardrails: item.guardrails,
      enabled: enabledMap.get(settingKeyForTemplate(item.key)) ?? item.defaultEnabled,
    })),
  };
}

export async function setAutomationTemplateEnabled(input: {
  key: string;
  enabled: boolean;
  updatedByUserId: string;
}) {
  const template = TEMPLATE_DEFINITIONS.find((item) => item.key === input.key);
  if (!template) {
    throw new Error('Unknown automation template key.');
  }

  const settingKey = settingKeyForTemplate(input.key);
  const settingValue = input.enabled ? 'true' : 'false';

  await prisma.$executeRaw`
    WITH updated AS (
      UPDATE system_settings
      SET
        value = ${settingValue},
        is_secret = FALSE,
        is_active = TRUE,
        description = ${`Automation template toggle for ${template.name}`},
        updated_by_user_id = ${input.updatedByUserId}::uuid,
        updated_at = NOW()
      WHERE scope = 'storefront'
        AND key = ${settingKey}
      RETURNING id
    )
    INSERT INTO system_settings (
      scope,
      key,
      value,
      is_secret,
      is_active,
      description,
      updated_by_user_id
    )
    SELECT
      'storefront',
      ${settingKey},
      ${settingValue},
      FALSE,
      TRUE,
      ${`Automation template toggle for ${template.name}`},
      ${input.updatedByUserId}::uuid
    WHERE NOT EXISTS (SELECT 1 FROM updated)
  `;

  return {
    key: template.key,
    enabled: input.enabled,
  };
}
