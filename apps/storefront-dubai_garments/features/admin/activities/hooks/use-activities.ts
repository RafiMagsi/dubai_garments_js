import { useQuery } from '@tanstack/react-query';
import { getActivities, getActivityById } from '@/features/admin/activities/services/activity-service';
import { ActivityType } from '@/features/admin/activities/types/activity.types';

export function useActivities(filters?: {
  activity_type?: ActivityType | 'all';
  lead_id?: string;
  deal_id?: string;
  quote_id?: string;
}) {
  return useQuery({
    queryKey: ['activities', filters],
    queryFn: () => getActivities(filters),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 5000,
  });
}

export function useActivityById(activityId?: string) {
  return useQuery({
    queryKey: ['activity', activityId],
    queryFn: () => getActivityById(activityId as string),
    enabled: Boolean(activityId),
  });
}
