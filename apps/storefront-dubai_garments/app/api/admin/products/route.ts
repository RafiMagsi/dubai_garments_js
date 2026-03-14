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
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
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
  return value.reduce<Array<{ minQty: number; maxQty?: number; unitPriceAED: number }>>((acc, item) => {
    if (!item || typeof item !== 'object') return acc;
    const candidate = item as Record<string, unknown>;
    const minQty = Number(candidate.minQty ?? candidate.min_qty);
    const maxQtyRaw = candidate.maxQty ?? candidate.max_qty;
    const unitPriceAED = Number(
      candidate.unitPriceAED ?? candidate.unit_price ?? candidate.unitPrice
    );

    if (!Number.isFinite(minQty) || !Number.isFinite(unitPriceAED)) return acc;

    const maxQty = Number(maxQtyRaw);
    acc.push({
      minQty,
      maxQty: Number.isFinite(maxQty) ? maxQty : undefined,
      unitPriceAED,
    });
    return acc;
  }, []);
}

function normalizeVariants(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.reduce<
    Array<{
      sku: string;
      variantName: string;
      size?: string | null;
      color?: string | null;
      unitPrice: number;
      moq: number;
      isActive: boolean;
    }>
  >((acc, item) => {
    if (!item || typeof item !== 'object') return acc;
    const candidate = item as Record<string, unknown>;
    const sku = String(candidate.sku || '').trim();
    const variantName = String(candidate.variantName || candidate.variant_name || '').trim();
    const unitPrice = Number(candidate.unitPrice ?? candidate.unit_price);
    const moq = Number(candidate.moq ?? 1);
    if (!sku || !variantName || !Number.isFinite(unitPrice)) return acc;

    acc.push({
      sku,
      variantName,
      size: String(candidate.size || '').trim() || null,
      color: String(candidate.color || '').trim() || null,
      unitPrice,
      moq: Number.isFinite(moq) && moq > 0 ? moq : 1,
      isActive: candidate.isActive === undefined ? true : Boolean(candidate.isActive),
    });
    return acc;
  }, []);
}

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireAdminSession();
  if (sessionOrResponse instanceof Response) return sessionOrResponse;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.trim();
  const category = searchParams.get('category')?.trim();
  const includeInactive = searchParams.get('includeInactive') === 'true';

  const products = await prisma.product.findMany({
    where: {
      ...(includeInactive ? {} : { isActive: true }),
      ...(category && ALLOWED_CATEGORIES.includes(category as ProductCategory)
        ? { category }
        : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { slug: { contains: search, mode: 'insensitive' } },
              { shortDescription: { contains: search, mode: 'insensitive' } },
              { tags: { has: search.toLowerCase() } },
            ],
          }
        : {}),
    },
    orderBy: [{ updatedAt: 'desc' }],
    include: {
      variants: {
        orderBy: [{ createdAt: 'asc' }],
      },
    },
  });

  return NextResponse.json({ items: products });
}

export async function POST(request: NextRequest) {
  const sessionOrResponse = await requireAdminSession();
  if (sessionOrResponse instanceof Response) return sessionOrResponse;

  const body = await request.json().catch(() => null);
  const name = String(body?.name || '').trim();
  const category = String(body?.category || '').trim();
  const slugInput = String(body?.slug || '').trim();
  const slug = toSlug(slugInput || name);

  if (!name || !slug || !category) {
    return NextResponse.json({ message: 'name, slug, and category are required.' }, { status: 422 });
  }
  if (!ALLOWED_CATEGORIES.includes(category as ProductCategory)) {
    return NextResponse.json({ message: 'Invalid category.' }, { status: 422 });
  }

  const existing = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
  if (existing) {
    return NextResponse.json({ message: 'Slug already exists.' }, { status: 409 });
  }

  const variants = normalizeVariants(body?.variants);

  const created = await prisma.product.create({
    data: {
      name,
      slug,
      category,
      shortDescription: String(body?.shortDescription || '').trim() || null,
      description: String(body?.description || '').trim() || null,
      material: String(body?.material || '').trim() || null,
      minOrderQty: Number(body?.minOrderQty || 1),
      leadTimeDays: Number(body?.leadTimeDays || 7),
      isActive: body?.isActive === undefined ? true : Boolean(body.isActive),
      featured: Boolean(body?.featured),
      sizes: normalizeStringArray(body?.sizes),
      colors: normalizeStringArray(body?.colors),
      brandingOptions: normalizeStringArray(body?.brandingOptions),
      tags: normalizeStringArray(body?.tags),
      image: String(body?.image || '').trim(),
      gallery: normalizeStringArray(body?.gallery),
      priceTiers: normalizePriceTiers(body?.priceTiers),
      variants: variants.length
        ? {
            create: variants,
          }
        : undefined,
    },
    include: {
      variants: {
        orderBy: [{ createdAt: 'asc' }],
      },
    },
  });

  return NextResponse.json({ item: created }, { status: 201 });
}
