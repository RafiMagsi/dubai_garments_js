import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createLead,
  getLeadById,
  getLeads,
  updateLead,
  updateLeadStatus,
} from '@/features/admin/leads/services/lead-service';
import {
  LeadCreateInput,
  LeadStatus,
  LeadStatusUpdateInput,
  LeadUpdateInput,
} from '@/features/admin/leads/types/lead.types';

export function useLeads(filters?: { status?: LeadStatus | 'all'; search?: string }) {
  return useQuery({
    queryKey: ['leads', filters],
    queryFn: () => getLeads(filters),
  });
}

export function useLeadById(leadId?: string) {
  return useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => getLeadById(leadId as string),
    enabled: Boolean(leadId),
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: LeadCreateInput) => createLead(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leadId, payload }: { leadId: string; payload: LeadUpdateInput }) =>
      updateLead(leadId, payload),
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
    },
  });
}

export function useUpdateLeadStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      leadId,
      payload,
    }: {
      leadId: string;
      payload: LeadStatusUpdateInput;
    }) => updateLeadStatus(leadId, payload),
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
    },
  });
}
