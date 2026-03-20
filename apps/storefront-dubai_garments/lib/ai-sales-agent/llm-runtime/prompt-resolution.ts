type PromptFeature = 'copilot' | 'reply_studio' | 'quote_copilot';

type PromptSet = {
  copilotSystem: string;
  replyStudioSystem: string;
  quoteCopilotSystem: string;
};

type PromptOverride = {
  prompts?: Partial<PromptSet>;
};

export function resolveSystemPrompt(
  feature: PromptFeature,
  savedPrompts: PromptSet,
  configOverride?: PromptOverride
) {
  if (feature === 'copilot') {
    return configOverride?.prompts?.copilotSystem ?? savedPrompts.copilotSystem;
  }
  if (feature === 'reply_studio') {
    return configOverride?.prompts?.replyStudioSystem ?? savedPrompts.replyStudioSystem;
  }
  return configOverride?.prompts?.quoteCopilotSystem ?? savedPrompts.quoteCopilotSystem;
}

