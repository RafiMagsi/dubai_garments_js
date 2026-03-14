import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/require-admin';

export const runtime = 'nodejs';

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]);

function extFromMime(mime: string) {
  switch (mime) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'image/svg+xml':
      return 'svg';
    case 'image/x-icon':
    case 'image/vnd.microsoft.icon':
      return 'ico';
    default:
      return 'bin';
  }
}

export async function POST(request: NextRequest) {
  const sessionOrResponse = await requireAdminSession();
  if (sessionOrResponse instanceof Response) {
    return sessionOrResponse;
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const kind = String(formData.get('kind') || 'logo').toLowerCase();

  if (!(file instanceof File)) {
    return NextResponse.json({ message: 'No file uploaded.' }, { status: 422 });
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json({ message: `Unsupported file type: ${file.type}` }, { status: 422 });
  }

  const maxBytes = kind === 'favicon' ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json({ message: `File too large. Max ${Math.floor(maxBytes / (1024 * 1024))}MB.` }, { status: 422 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = extFromMime(file.type);
  const filename = `${kind}-${Date.now()}-${randomUUID().slice(0, 8)}.${extension}`;
  const relativeDir = path.join('branding-assets');
  const publicDir = path.join(process.cwd(), 'public', relativeDir);
  const destination = path.join(publicDir, filename);

  fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(destination, buffer);

  const url = `/${relativeDir}/${filename}`;

  return NextResponse.json({
    ok: true,
    kind,
    fileName: filename,
    size: file.size,
    mimeType: file.type,
    url,
    message: 'Branding asset uploaded successfully.',
  });
}
