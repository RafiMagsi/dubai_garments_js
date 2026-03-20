import { NextResponse } from 'next/server';

type Bucket = {
  windowStartedAt: number;
  count: number;
  inFlight: number;
};

const WINDOW_MS = 60_000;
const buckets = new Map<string, Bucket>();

type AcquireOptions = {
  endpoint: string;
  identity: string;
  maxPerMinute: number;
  maxInFlight: number;
  requestId?: string | null;
};

type AcquireResult =
  | {
      ok: true;
      release: () => void;
    }
  | {
      ok: false;
      response: NextResponse;
    };

export function acquireApiRateLimitSlot(options: AcquireOptions): AcquireResult {
  const now = Date.now();
  const key = `${options.endpoint}:${options.identity}`;
  const existing = buckets.get(key);
  const bucket: Bucket =
    existing && now - existing.windowStartedAt < WINDOW_MS
      ? existing
      : { windowStartedAt: now, count: 0, inFlight: 0 };

  if (bucket.inFlight >= options.maxInFlight) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          message: 'Backpressure active. Too many concurrent AI requests. Please retry shortly.',
          requestId: options.requestId ?? null,
        },
        { status: 429, headers: { 'Retry-After': '2' } }
      ),
    };
  }

  if (bucket.count >= options.maxPerMinute) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((WINDOW_MS - (now - bucket.windowStartedAt)) / 1000)
    );
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          message: 'Rate limit exceeded for AI endpoint. Please retry after a short wait.',
          requestId: options.requestId ?? null,
        },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      ),
    };
  }

  bucket.count += 1;
  bucket.inFlight += 1;
  buckets.set(key, bucket);

  return {
    ok: true,
    release: () => {
      const current = buckets.get(key);
      if (!current) return;
      current.inFlight = Math.max(0, current.inFlight - 1);
      buckets.set(key, current);
    },
  };
}
