import 'server-only';
import { prisma } from '@/lib/prisma';
import { serializeProduct } from '@/features/products/utils/serialize-product';

export async function getFeaturedProducts(limit = 4) {
  try {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        featured: true,
      },
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return products.map(serializeProduct);
  } catch (error) {
    console.error('Failed to load featured products from database.', error);
    return [];
  }
}
