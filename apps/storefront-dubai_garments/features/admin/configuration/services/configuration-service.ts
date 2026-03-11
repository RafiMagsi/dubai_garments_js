import { apiClient } from '@/lib/api/axios';
import {
  ConfigurationScriptsResponse,
  RunConfigurationScriptPayload,
  RunConfigurationScriptResponse,
} from '@/features/admin/configuration/types/configuration.types';

export async function getConfigurationScripts(): Promise<ConfigurationScriptsResponse> {
  const response = await apiClient.get<ConfigurationScriptsResponse>('/admin/config/scripts');
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
