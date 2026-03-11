import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ProductCategory } from '@/features/products/types/product.types';
import { serializeProduct } from '@/features/products/utils/serialize-product';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const allowedCategories: ProductCategory[] = [
  'tshirts',
  'hoodies',
  'uniforms',
  'jerseys',
  'caps',
  'jackets',
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search')?.trim();
    const category = searchParams.get('category');
    const featuredOnly = searchParams.get('featuredOnly') === 'true';
    const minQtyRaw = searchParams.get('minQty');
    const minQty = minQtyRaw ? Number(minQtyRaw) : undefined;

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        ...(featuredOnly ? { featured: true } : {}),
        ...(category && category !== 'all' && allowedCategories.includes(category as ProductCategory)
          ? { category }
          : {}),
        ...(Number.isFinite(minQty) ? { minOrderQty: { lte: minQty } } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { shortDescription: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { tags: { has: search.toLowerCase() } },
              ],
            }
          : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(products.map(serializeProduct), {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Failed to fetch products from database.', error);
    return NextResponse.json({ message: 'Database connection error' }, { status: 503 });
  }
}
