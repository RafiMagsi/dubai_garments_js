import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serializeProduct } from '@/features/products/utils/serialize-product';

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const params = await context.params;

    const product = await prisma.product.findFirst({
      where: {
        slug: params.slug,
        isActive: true,
      },
    });

    if (!product) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(serializeProduct(product));
  } catch (error) {
    console.error('Failed to fetch product by slug from database.', error);
    return NextResponse.json({ message: 'Database connection error' }, { status: 503 });
  }
}
