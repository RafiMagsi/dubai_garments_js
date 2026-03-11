import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getConfigurationAudit,
  getConfigurationEnv,
  getConfigurationScripts,
  saveConfigurationEnv,
  runConfigurationScript,
} from '@/features/admin/configuration/services/configuration-service';
import {
  RunConfigurationScriptPayload,
  SaveConfigEnvPayload,
} from '@/features/admin/configuration/types/configuration.types';

export function useConfigurationScripts() {
  return useQuery({
    queryKey: ['admin-configuration-scripts'],
    queryFn: getConfigurationScripts,
    refetchInterval: 5000,
    staleTime: 0,
  });
}

export function useRunConfigurationScript() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ scriptKey, payload }: { scriptKey: string; payload?: RunConfigurationScriptPayload }) =>
      runConfigurationScript(scriptKey, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-configuration-scripts'] });
      queryClient.invalidateQueries({ queryKey: ['automation-runs'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

export function useConfigurationEnv() {
  return useQuery({
    queryKey: ['admin-configuration-env'],
    queryFn: getConfigurationEnv,
    refetchInterval: 5000,
    staleTime: 0,
  });
}

export function useSaveConfigurationEnv() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SaveConfigEnvPayload) => saveConfigurationEnv(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-configuration-env'] });
    },
  });
}

export function useConfigurationAudit(limit = 50) {
  return useQuery({
    queryKey: ['admin-configuration-audit', limit],
    queryFn: () => getConfigurationAudit(limit),
    refetchInterval: 5000,
    staleTime: 0,
  });
}
