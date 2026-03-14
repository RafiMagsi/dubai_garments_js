import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/auth/require-admin';
import { ProductCategory } from '@/features/products/types/product.types';

const ALLOWED_CATEGORIES: ProductCategory[] = [
  'tshirts',
  'hoodies',
  'uniforms',
  'jerseys',
  'caps',
  'jackets',
];

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizePriceTiers(value: unknown): Array<{ minQty: number; maxQty?: number; unitPriceAED: number }> {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Record<string, unknown>;
      const minQty = Number(candidate.minQty ?? candidate.min_qty);
      const maxQtyRaw = candidate.maxQty ?? candidate.max_qty;
      const unitPriceAED = Number(
        candidate.unitPriceAED ?? candidate.unit_price ?? candidate.unitPrice
      );
      if (!Number.isFinite(minQty) || !Number.isFinite(unitPriceAED)) return null;
      const maxQty = Number(maxQtyRaw);
      return {
        minQty,
        maxQty: Number.isFinite(maxQty) ? maxQty : undefined,
        unitPriceAED,
      };
    })
    .filter((item): item is { minQty: number; maxQty?: number; unitPriceAED: number } => item !== null);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  const sessionOrResponse = await requireAdminSession();
  if (sessionOrResponse instanceof Response) return sessionOrResponse;

  const { productId } = await context.params;
  const body = await request.json().catch(() => null);

  const updates: Record<string, unknown> = {};

  if (body?.name !== undefined) updates.name = String(body.name).trim();
  if (body?.slug !== undefined) updates.slug = toSlug(String(body.slug));
  if (body?.category !== undefined) {
    const category = String(body.category).trim();
    if (!ALLOWED_CATEGORIES.includes(category as ProductCategory)) {
      return NextResponse.json({ message: 'Invalid category.' }, { status: 422 });
    }
    updates.category = category;
  }
  if (body?.shortDescription !== undefined) updates.shortDescription = String(body.shortDescription || '').trim() || null;
  if (body?.description !== undefined) updates.description = String(body.description || '').trim() || null;
  if (body?.material !== undefined) updates.material = String(body.material || '').trim() || null;
  if (body?.minOrderQty !== undefined) updates.minOrderQty = Number(body.minOrderQty || 1);
  if (body?.leadTimeDays !== undefined) updates.leadTimeDays = Number(body.leadTimeDays || 7);
  if (body?.isActive !== undefined) updates.isActive = Boolean(body.isActive);
  if (body?.featured !== undefined) updates.featured = Boolean(body.featured);
  if (body?.sizes !== undefined) updates.sizes = normalizeStringArray(body.sizes);
  if (body?.colors !== undefined) updates.colors = normalizeStringArray(body.colors);
  if (body?.brandingOptions !== undefined) updates.brandingOptions = normalizeStringArray(body.brandingOptions);
  if (body?.tags !== undefined) updates.tags = normalizeStringArray(body.tags);
  if (body?.image !== undefined) updates.image = String(body.image || '').trim();
  if (body?.gallery !== undefined) updates.gallery = normalizeStringArray(body.gallery);
  if (body?.priceTiers !== undefined) updates.priceTiers = normalizePriceTiers(body.priceTiers);

  if (updates.slug) {
    const existing = await prisma.product.findFirst({
      where: {
        slug: String(updates.slug),
        NOT: { id: productId },
      },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ message: 'Slug already exists.' }, { status: 409 });
    }
  }

  const item = await prisma.product.update({
    where: { id: productId },
    data: updates,
  });

  return NextResponse.json({ item });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  const sessionOrResponse = await requireAdminSession();
  if (sessionOrResponse instanceof Response) return sessionOrResponse;

  const { productId } = await context.params;

  const item = await prisma.product.update({
    where: { id: productId },
    data: {
      isActive: false,
      featured: false,
    },
  });

  return NextResponse.json({ item, message: 'Product archived successfully.' });
}
