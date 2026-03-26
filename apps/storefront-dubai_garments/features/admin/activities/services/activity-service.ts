import { apiClient } from '@/lib/api/axios';
import {
  Activity,
  ActivitiesResponse,
  ActivityDetailResponse,
  ActivityType,
} from '@/features/admin/activities/types/activity.types';

export async function getActivities(filters?: {
  activity_type?: ActivityType | 'all';
  lead_id?: string;
  deal_id?: string;
  quote_id?: string;
}): Promise<ActivitiesResponse> {
  const response = await apiClient.get<ActivitiesResponse>('/admin/activities', {
    params: {
      activity_type:
        filters?.activity_type && filters.activity_type !== 'all'
          ? filters.activity_type
          : undefined,
      lead_id: filters?.lead_id || undefined,
      deal_id: filters?.deal_id || undefined,
      quote_id: filters?.quote_id || undefined,
    },
  });
  return response.data;
}

export async function getActivityById(activityId: string): Promise<ActivityDetailResponse> {
  const response = await apiClient.get<ActivityDetailResponse>(`/admin/activities/${activityId}`);
  return response.data;
}

export async function getRelatedActivities(filters?: {
  activity_type?: ActivityType | 'all';
  lead_id?: string;
  deal_id?: string;
  quote_id?: string;
}): Promise<ActivitiesResponse> {
  const activityType =
    filters?.activity_type && filters.activity_type !== 'all'
      ? filters.activity_type
      : undefined;

  const requests: Array<Promise<ActivitiesResponse>> = [];

  if (filters?.lead_id) {
    requests.push(getActivities({ activity_type: activityType, lead_id: filters.lead_id }));
  }
  if (filters?.deal_id) {
    requests.push(getActivities({ activity_type: activityType, deal_id: filters.deal_id }));
  }
  if (filters?.quote_id) {
    requests.push(getActivities({ activity_type: activityType, quote_id: filters.quote_id }));
  }

  if (requests.length === 0) {
    return getActivities({ activity_type: activityType });
  }

  const responses = await Promise.all(requests);
  const deduped = new Map<string, Activity>();
  responses.forEach((response) => {
    response.items.forEach((item) => {
      deduped.set(item.id, item);
    });
  });

  const items = Array.from(deduped.values()).sort(
    (a, b) =>
      new Date(b.occurred_at || b.created_at).getTime() -
      new Date(a.occurred_at || a.created_at).getTime()
  );

  return { items };
}
