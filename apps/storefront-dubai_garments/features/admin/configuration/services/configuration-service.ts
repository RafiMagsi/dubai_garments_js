import { apiClient } from '@/lib/api/axios';
import {
  ConfigurationAuditResponse,
  ConfigurationEnvResponse,
  ConfigurationScriptsResponse,
  SaveConfigEnvPayload,
  SaveConfigEnvResponse,
  RunConfigurationScriptPayload,
  RunConfigurationScriptResponse,
} from '@/features/admin/configuration/types/configuration.types';

export async function getConfigurationScripts(): Promise<ConfigurationScriptsResponse> {
  const response = await apiClient.get<ConfigurationScriptsResponse>('/admin/config/scripts');
  return response.data;
}

export async function getConfigurationAudit(limit = 50): Promise<ConfigurationAuditResponse> {
  const response = await apiClient.get<ConfigurationAuditResponse>('/admin/config/audit', {
    params: { limit },
  });
  return response.data;
}

export async function runConfigurationScript(
  scriptKey: string,
  payload?: RunConfigurationScriptPayload
): Promise<RunConfigurationScriptResponse> {
  const response = await apiClient.post<RunConfigurationScriptResponse>(
    `/admin/config/scripts/${scriptKey}/run`,
    payload || {}
  );
  return response.data;
}

export async function getConfigurationEnv(): Promise<ConfigurationEnvResponse> {
  const response = await apiClient.get<ConfigurationEnvResponse>('/admin/config/env');
  return response.data;
}

export async function saveConfigurationEnv(
  payload: SaveConfigEnvPayload
): Promise<SaveConfigEnvResponse> {
  const response = await apiClient.post<SaveConfigEnvResponse>('/admin/config/env', payload);
  return response.data;
}
