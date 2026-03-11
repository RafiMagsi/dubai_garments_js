import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getConfigurationScripts,
  runConfigurationScript,
} from '@/features/admin/configuration/services/configuration-service';
import { RunConfigurationScriptPayload } from '@/features/admin/configuration/types/configuration.types';

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
