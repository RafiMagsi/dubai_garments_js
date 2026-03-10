import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  convertLeadToDeal,
  createDeal,
  getDealById,
  getDeals,
  getPipeline,
  sendDealEmail,
  updateDeal,
  updateDealStage,
} from '@/features/admin/deals/services/deal-service';
import {
  ConvertLeadToDealInput,
  DealCreateInput,
  DealSendEmailInput,
  DealStageUpdateInput,
  DealUpdateInput,
} from '@/features/admin/deals/types/deal.types';

export function usePipeline() {
  return useQuery({
    queryKey: ['pipeline'],
    queryFn: getPipeline,
    refetchInterval: 10000,
  });
}

export function useDeals(filters?: { stage?: string; search?: string }) {
  return useQuery({
    queryKey: ['deals', filters],
    queryFn: () => getDeals(filters),
  });
}

export function useDealById(dealId?: string) {
  return useQuery({
    queryKey: ['deal', dealId],
    queryFn: () => getDealById(dealId as string),
    enabled: Boolean(dealId),
  });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DealCreateInput) => createDeal(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

export function useUpdateDealStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      dealId,
      payload,
    }: {
      dealId: string;
      payload: DealStageUpdateInput;
    }) => updateDealStage(dealId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

export function useUpdateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dealId, payload }: { dealId: string; payload: DealUpdateInput }) =>
      updateDeal(dealId, payload),
    onSuccess: (_, { dealId }) => {
      queryClient.invalidateQueries({ queryKey: ['deal', dealId] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

export function useConvertLeadToDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      leadId,
      payload,
    }: {
      leadId: string;
      payload: ConvertLeadToDealInput;
    }) => convertLeadToDeal(leadId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

export function useSendDealEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dealId, payload }: { dealId: string; payload: DealSendEmailInput }) =>
      sendDealEmail(dealId, payload),
    onSuccess: (_, { dealId }) => {
      queryClient.invalidateQueries({ queryKey: ['deal', dealId] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}
