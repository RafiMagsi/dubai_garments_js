import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const products = [
  {
    slug: 'premium-corporate-tshirt',
    name: 'Premium Corporate T-Shirt',
    category: 'tshirts',
    shortDescription: 'Soft premium cotton t-shirt for branding and events.',
    description:
      'A premium corporate t-shirt designed for bulk orders, events, staff uniforms, and branded campaigns.',
    minOrderQty: 50,
    leadTimeDays: 10,
    material: '100% Cotton',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Black', 'White', 'Navy', 'Gray'],
    brandingOptions: ['Screen Printing', 'Embroidery', 'DTF Printing'],
    tags: ['corporate', 'events', 'best-seller'],
    priceTiers: [
      { minQty: 50, maxQty: 149, unitPrice: 36 },
      { minQty: 150, maxQty: 499, unitPrice: 33 },
      { minQty: 500, unitPrice: 30 },
    ],
    image: '/images/products/tshirt.jpg',
    featured: true,
    variants: [
      { sku: 'TS-CORP-BLK-M', variantName: 'Black / M', size: 'M', color: 'Black', unitPrice: '36.00', moq: 50 },
      { sku: 'TS-CORP-WHT-L', variantName: 'White / L', size: 'L', color: 'White', unitPrice: '36.00', moq: 50 },
    ],
  },
  {
    slug: 'custom-event-hoodie',
    name: 'Custom Event Hoodie',
    category: 'hoodies',
    shortDescription: 'Heavyweight hoodie for team wear and corporate campaigns.',
    description:
      'A comfortable hoodie suitable for event teams, internal branding, and premium merchandise.',
    minOrderQty: 30,
    leadTimeDays: 12,
    material: 'Cotton Fleece',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Black', 'Beige', 'Maroon'],
    brandingOptions: ['Embroidery', 'Screen Printing'],
    tags: ['winter', 'events', 'merch'],
    priceTiers: [
      { minQty: 30, maxQty: 99, unitPrice: 78 },
      { minQty: 100, maxQty: 299, unitPrice: 72 },
      { minQty: 300, unitPrice: 68 },
    ],
    image: '/images/products/hoodie.jpg',
    featured: true,
    variants: [
      { sku: 'HD-EVT-BLK-M', variantName: 'Black / M', size: 'M', color: 'Black', unitPrice: '78.00', moq: 30 },
      { sku: 'HD-EVT-MRN-L', variantName: 'Maroon / L', size: 'L', color: 'Maroon', unitPrice: '78.00', moq: 30 },
    ],
  },
  {
    slug: 'hospitality-staff-uniform',
    name: 'Hospitality Staff Uniform Set',
    category: 'uniforms',
    shortDescription: 'Durable smart-fit uniform set for hotels and restaurants.',
    description:
      'Professional uniform set with breathable fabric and stain-resistant treatment for daily operations.',
    minOrderQty: 40,
    leadTimeDays: 14,
    material: 'Poly-Cotton Blend',
    sizes: ['S', 'M', 'L', 'XL', 'XXL', '3XL'],
    colors: ['Charcoal', 'Navy', 'White'],
    brandingOptions: ['Embroidery', 'Woven Patches'],
    tags: ['hospitality', 'uniform', 'staff'],
    priceTiers: [
      { minQty: 40, maxQty: 149, unitPrice: 89 },
      { minQty: 150, maxQty: 399, unitPrice: 83 },
      { minQty: 400, unitPrice: 79 },
    ],
    image: '/images/products/uniform.jpg',
    featured: false,
    variants: [
      { sku: 'UF-HSP-CHR-M', variantName: 'Charcoal / M', size: 'M', color: 'Charcoal', unitPrice: '89.00', moq: 40 },
      { sku: 'UF-HSP-NVY-L', variantName: 'Navy / L', size: 'L', color: 'Navy', unitPrice: '89.00', moq: 40 },
    ],
  },
  {
    slug: 'team-performance-jersey',
    name: 'Team Performance Jersey',
    category: 'jerseys',
    shortDescription: 'Moisture-wicking team jersey with full sublimation support.',
    description:
      'High-performance jersey for sports clubs, school leagues, and corporate tournaments.',
    minOrderQty: 25,
    leadTimeDays: 9,
    material: 'Polyester Mesh',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Custom Palette'],
    brandingOptions: ['Sublimation', 'Heat Transfer'],
    tags: ['sports', 'team', 'custom-colors'],
    priceTiers: [
      { minQty: 25, maxQty: 99, unitPrice: 54 },
      { minQty: 100, maxQty: 249, unitPrice: 49 },
      { minQty: 250, unitPrice: 45 },
    ],
    image: '/images/products/jersey.jpg',
    featured: true,
    variants: [
      { sku: 'JR-PRF-CUS-M', variantName: 'Custom / M', size: 'M', color: 'Custom', unitPrice: '54.00', moq: 25 },
      { sku: 'JR-PRF-CUS-L', variantName: 'Custom / L', size: 'L', color: 'Custom', unitPrice: '54.00', moq: 25 },
    ],
  },
] as const;

async function main() {
  for (const product of products) {
    const saved = await prisma.product.upsert({
      where: { slug: product.slug },
      create: {
        slug: product.slug,
        name: product.name,
        category: product.category,
        shortDescription: product.shortDescription,
        description: product.description,
        minOrderQty: product.minOrderQty,
        leadTimeDays: product.leadTimeDays,
        material: product.material,
        sizes: product.sizes,
        colors: product.colors,
        brandingOptions: product.brandingOptions,
        tags: product.tags,
        priceTiers: product.priceTiers,
        image: product.image,
        featured: product.featured,
      },
      update: {
        name: product.name,
        category: product.category,
        shortDescription: product.shortDescription,
        description: product.description,
        minOrderQty: product.minOrderQty,
        leadTimeDays: product.leadTimeDays,
        material: product.material,
        sizes: product.sizes,
        colors: product.colors,
        brandingOptions: product.brandingOptions,
        tags: product.tags,
        priceTiers: product.priceTiers,
        image: product.image,
        featured: product.featured,
        isActive: true,
      },
    });

    await prisma.productVariant.deleteMany({ where: { productId: saved.id } });

    await prisma.productVariant.createMany({
      data: product.variants.map((variant) => ({
        productId: saved.id,
        sku: variant.sku,
        variantName: variant.variantName,
        size: variant.size,
        color: variant.color,
        unitPrice: variant.unitPrice,
        moq: variant.moq,
      })),
    });
  }

  console.log(`Seeded ${products.length} products.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
