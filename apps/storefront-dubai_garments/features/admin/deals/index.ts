export {
  useDealById,
  useConvertLeadToDeal,
  useCreateDeal,
  useDeals,
  usePipeline,
  useSendDealEmail,
  useUpdateDeal,
  useUpdateDealStage,
} from '@/features/admin/deals/hooks/use-deals';
export type {
  ConvertLeadToDealInput,
  Deal,
  DealCommunication,
  DealCreateInput,
  DealDetailResponse,
  DealSendEmailInput,
  DealsResponse,
  DealStage,
  DealStageUpdateInput,
  DealUpdateInput,
  PipelineResponse,
  PipelineStage,
} from '@/features/admin/deals/types/deal.types';
