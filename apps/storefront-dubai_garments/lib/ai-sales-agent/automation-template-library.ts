export async function getAutomationTemplateLibrary() {
  return {
    templates: [
      {
        key: 'followup_sequence',
        name: 'Follow-up Sequence',
        category: 'sales_followup',
        description: 'Runs staged follow-up touchpoints after lead inactivity.',
        inputs: ['leadId', 'channel', 'urgency'],
        outputs: ['activity log', 'draft follow-up', 'queue update'],
        guardrails: ['skip if lead is closed', 'skip if owner missing'],
      },
      {
        key: 'smart_owner_routing',
        name: 'Smart Owner Routing',
        category: 'routing',
        description: 'Assigns or confirms owner based on role and SLA state.',
        inputs: ['leadId', 'dealId', 'owner availability'],
        outputs: ['assigned owner', 'routing note'],
        guardrails: ['do not overwrite active owner without admin review'],
      },
      {
        key: 'quote_check',
        name: 'Quote Check',
        category: 'quote_quality',
        description: 'Runs quote readiness and margin/discount guardrails.',
        inputs: ['quoteId', 'accepted recommendations'],
        outputs: ['quote intelligence summary', 'risk flags'],
        guardrails: ['block if missing quantity or variant'],
      },
    ],
  };
}