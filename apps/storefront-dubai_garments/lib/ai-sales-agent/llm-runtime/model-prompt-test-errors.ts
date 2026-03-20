export class PromptTestConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PromptTestConfigError';
  }
}

export class PromptTestUpstreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PromptTestUpstreamError';
  }
}

export function classifyPromptTestErrorStatus(error: unknown) {
  if (error instanceof PromptTestConfigError) {
    return 400;
  }
  if (error instanceof PromptTestUpstreamError) {
    return 502;
  }
  return 500;
}
