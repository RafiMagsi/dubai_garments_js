import type { ZodError } from 'zod';

function hasPath(error: ZodError, key: string): boolean {
  return error.issues.some((issue) => issue.path.includes(key));
}

export function getAiPayloadValidationMessage(error: ZodError, fallback: string): string {
  if (hasPath(error, 'leadId')) {
    const leadIdIssue = error.issues.find((issue) => issue.path.includes('leadId'));
    if (leadIdIssue?.code === 'invalid_type') return 'Insert Lead ID.';
    return 'Lead ID must be a valid UUID.';
  }

  if (hasPath(error, 'dealId')) {
    return 'Deal ID must be a valid UUID.';
  }

  if (hasPath(error, 'intent')) {
    return 'Select a valid copilot intent.';
  }

  if (hasPath(error, 'action')) {
    return 'Select a valid copilot action.';
  }

  if (hasPath(error, 'mode')) {
    return 'Select a valid reply mode.';
  }

  if (hasPath(error, 'channel')) {
    return 'Select a valid channel.';
  }

  if (hasPath(error, 'tone')) {
    return 'Select a valid tone.';
  }

  return fallback;
}

