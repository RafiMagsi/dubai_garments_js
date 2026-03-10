import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  convertLeadToDeal,
  createDeal,
  getDeals,
  getPipeline,
  updateDealStage,
} from '@/features/admin/deals/services/deal-service';
import {
  ConvertLeadToDealInput,
  DealCreateInput,
  DealStageUpdateInput,
} from '@/features/admin/deals/types/deal.types';

export function usePipeline() {
  return useQuery({
    queryKey: ['pipeline'],
    queryFn: getPipeline,
    refetchInterval: 10000,
  });
}

export function useDeals(stage?: string) {
  return useQuery({
    queryKey: ['deals', stage],
    queryFn: () => getDeals(stage),
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
