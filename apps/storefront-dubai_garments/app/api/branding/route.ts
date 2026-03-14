import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type BrandingPayload = {
  brandName: string;
  brandTagline: string;
  logoUrl: string;
  faviconUrl: string;
};

type DbSettingRow = {
  key: string;
  value: string;
};

const DEFAULT_BRANDING: BrandingPayload = {
  brandName: process.env.BRAND_NAME || 'Dubai Garments',
  brandTagline: process.env.BRAND_TAGLINE || 'Revenue OS',
  logoUrl: process.env.BRAND_LOGO_URL || '',
  faviconUrl: process.env.BRAND_FAVICON_URL || '',
};

async function readDbBranding() {
  try {
    const defaultTenantSlug = String(process.env.DEFAULT_TENANT_SLUG || 'default').trim() || 'default';

    const tenantRows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id::text
      FROM tenants
      WHERE slug = ${defaultTenantSlug}
      LIMIT 1
    `;

    const tenantId = tenantRows[0]?.id;
    if (!tenantId) return null;

    const rows = await prisma.$queryRaw<DbSettingRow[]>`
      SELECT key, value
      FROM system_settings
      WHERE tenant_id = ${tenantId}::uuid
        AND is_active = TRUE
        AND scope IN ('storefront', 'global')
        AND key IN ('BRAND_NAME', 'BRAND_TAGLINE', 'BRAND_LOGO_URL', 'BRAND_FAVICON_URL')
    `;

    const map = new Map(rows.map((row) => [row.key, row.value || '']));

    return {
      brandName: map.get('BRAND_NAME') || '',
      brandTagline: map.get('BRAND_TAGLINE') || '',
      logoUrl: map.get('BRAND_LOGO_URL') || '',
      faviconUrl: map.get('BRAND_FAVICON_URL') || '',
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const dbBranding = await readDbBranding();

  const payload: BrandingPayload = {
    brandName: dbBranding?.brandName || DEFAULT_BRANDING.brandName,
    brandTagline: dbBranding?.brandTagline || DEFAULT_BRANDING.brandTagline,
    logoUrl: dbBranding?.logoUrl || DEFAULT_BRANDING.logoUrl,
    faviconUrl: dbBranding?.faviconUrl || DEFAULT_BRANDING.faviconUrl,
  };

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
