const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type AppRole = 'admin' | 'customer';

export type SessionPayload = {
  sub: string;
  email: string;
  displayName: string;
  role: AppRole;
  tenantId?: string;
  tenantSlug: string;
  exp: number;
};

function getSecret(): string {
  return process.env.AUTH_SESSION_SECRET || 'dev-insecure-session-secret-change-me';
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function getSigningKey() {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function createSessionToken(
  payload: Omit<SessionPayload, 'exp'>,
  maxAgeSeconds: number
): Promise<string> {
  const fullPayload: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
  };
  const payloadBytes = encoder.encode(JSON.stringify(fullPayload));
  const payloadPart = toBase64Url(payloadBytes);

  const key = await getSigningKey();
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadPart));
  const signaturePart = toBase64Url(new Uint8Array(signature));

  return `${payloadPart}.${signaturePart}`;
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  const [payloadPart, signaturePart] = token.split('.');
  if (!payloadPart || !signaturePart) {
    return null;
  }

  const key = await getSigningKey();
  const isValid = await crypto.subtle.verify(
    'HMAC',
    key,
    fromBase64Url(signaturePart),
    encoder.encode(payloadPart)
  );
  if (!isValid) {
    return null;
  }

  try {
    const payload = JSON.parse(decoder.decode(fromBase64Url(payloadPart))) as SessionPayload;
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp <= now) {
      return null;
    }
    if (payload.role !== 'admin' && payload.role !== 'customer') {
      return null;
    }
    if (!payload.sub || !payload.email || !payload.displayName) {
      return null;
    }
    if (!payload.tenantSlug) {
      payload.tenantSlug = String(process.env.DEFAULT_TENANT_SLUG || 'default').trim() || 'default';
    }
    return payload;
  } catch {
    return null;
  }
}
