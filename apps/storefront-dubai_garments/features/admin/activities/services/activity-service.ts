import { apiClient } from '@/lib/api/axios';
import {
  ActivitiesResponse,
  ActivityDetailResponse,
  ActivityType,
} from '@/features/admin/activities/types/activity.types';

export async function getActivities(filters?: {
  activity_type?: ActivityType | 'all';
  lead_id?: string;
  deal_id?: string;
}): Promise<ActivitiesResponse> {
  const response = await apiClient.get<ActivitiesResponse>('/admin/activities', {
    params: {
      activity_type:
        filters?.activity_type && filters.activity_type !== 'all'
          ? filters.activity_type
          : undefined,
      lead_id: filters?.lead_id || undefined,
      deal_id: filters?.deal_id || undefined,
    },
  });
  return response.data;
}

export async function getActivityById(activityId: string): Promise<ActivityDetailResponse> {
  const response = await apiClient.get<ActivityDetailResponse>(`/admin/activities/${activityId}`);
  return response.data;
}
