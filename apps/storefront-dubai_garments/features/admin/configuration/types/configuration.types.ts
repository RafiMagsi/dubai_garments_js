export type ConfigScriptStatus = 'queued' | 'running' | 'success' | 'failed' | 'cancelled' | 'unknown';

export type ConfigScriptExecutionType = 'fastapi' | 'local';

export type ConfigScriptInputFieldType = 'number' | 'text' | 'email';

export interface ConfigScriptInputField {
  key: string;
  label: string;
  type: ConfigScriptInputFieldType;
  placeholder?: string;
  min?: number;
  max?: number;
  defaultValue?: string | number;
}

export interface ConfigScriptLastRun {
  runId?: string;
  status: ConfigScriptStatus;
  startedAt?: string | null;
  finishedAt?: string | null;
  errorMessage?: string | null;
}

export interface ConfigScriptItem {
  key: string;
  name: string;
  category: string;
  description: string;
  executionType: ConfigScriptExecutionType;
  commandLabel?: string;
  workflowName?: string;
  inputs?: ConfigScriptInputField[];
  lastRun?: ConfigScriptLastRun | null;
}

export interface ConfigurationScriptsResponse {
  generatedAt: string;
  items: ConfigScriptItem[];
}

export interface RunConfigurationScriptPayload {
  input?: Record<string, unknown>;
}

export interface RunConfigurationScriptResponse {
  ok: boolean;
  scriptKey: string;
  message: string;
  executedAt: string;
  output?: string;
  result?: Record<string, unknown>;
}

export type ConfigEnvTarget = 'storefront' | 'fastapi';

export interface ConfigEnvItem {
  key: string;
  target: ConfigEnvTarget;
  description: string;
  secret: boolean;
  hasValue: boolean;
  value: string;
  maskedValue: string;
}

export interface ConfigurationEnvResponse {
  generatedAt: string;
  items: ConfigEnvItem[];
}

export interface SaveConfigEnvPayload {
  target: ConfigEnvTarget;
  key: string;
  value: string;
}

export interface SaveConfigEnvResponse {
  ok: boolean;
  target: ConfigEnvTarget;
  key: string;
  message: string;
  requiresRestart: boolean;
  savedAt: string;
}
