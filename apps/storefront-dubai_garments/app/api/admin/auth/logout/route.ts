import { buildLogoutResponse } from '@/lib/auth/http';
import { requireBackofficeSession } from '@/lib/auth/require-admin';

export async function POST() {
  const sessionOrResponse = await requireBackofficeSession();
  if (sessionOrResponse instanceof Response) {
    return sessionOrResponse;
  }
  return buildLogoutResponse();
}
