import { useQuery } from '@tanstack/react-query';
import { getActivities, getActivityById, getRelatedActivities } from '@/features/admin/activities/services/activity-service';
import { ActivityType } from '@/features/admin/activities/types/activity.types';

export function useActivities(filters?: {
  activity_type?: ActivityType | 'all';
  lead_id?: string;
  deal_id?: string;
  quote_id?: string;
}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['activities', filters],
    queryFn: () => getActivities(filters),
    enabled: options?.enabled ?? true,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 5000,
  });
}

export function useRelatedActivities(filters?: {
  activity_type?: ActivityType | 'all';
  lead_id?: string;
  deal_id?: string;
  quote_id?: string;
}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['activities-related', filters],
    queryFn: () => getRelatedActivities(filters),
    enabled: options?.enabled ?? true,
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
