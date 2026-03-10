import { buildLogoutResponse } from '@/lib/auth/http';

export async function POST() {
  return buildLogoutResponse();
}
