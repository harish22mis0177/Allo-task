import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  await prisma.idempotencyRecord.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  const w1 = await prisma.warehouse.create({
    data: {
      name: 'Delhi Central Hub',
      location: 'New Delhi, India',
      imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600',
    },
  });
  const w2 = await prisma.warehouse.create({
    data: {
      name: 'Mumbai Fulfillment Center',
      location: 'Mumbai, India',
      imageUrl: 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=600',
    },
  });
  const w3 = await prisma.warehouse.create({
    data: {
      name: 'Bangalore South Depot',
      location: 'Bangalore, India',
      imageUrl: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600',
    },
  });

  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: 'Sony WH-1000XM5 Headphones',
        description: 'Industry-leading noise cancelling wireless headphones with 30-hour battery life.',
        price: 29990,
        sku: 'SONY-WH1000XM5',
        category: 'Audio',
        imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Apple AirPods Pro (2nd Gen)',
        description: 'Active Noise Cancellation, Adaptive Transparency, and Personalized Spatial Audio.',
        price: 24900,
        sku: 'APPLE-AIRPODS-PRO2',
        category: 'Audio',
        imageUrl: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=500',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Samsung 27" 4K UHD Monitor',
        description: '4K IPS panel with HDR10, 99% sRGB, USB-C connectivity.',
        price: 34999,
        sku: 'SAM-4K-27-IPS',
        category: 'Displays',
        imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Keychron Q3 Mechanical Keyboard',
        description: 'TKL hot-swappable mechanical keyboard with aluminum body and RGB backlight.',
        price: 12999,
        sku: 'KEYCHRON-Q3-RGB',
        category: 'Peripherals',
        imageUrl: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=500',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Logitech MX Master 3S Mouse',
        description: 'Advanced wireless mouse with 8K DPI, silent clicks, and MagSpeed scrolling.',
        price: 9995,
        sku: 'LOGI-MX-MASTER3S',
        category: 'Peripherals',
        imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500',
      },
    }),
    prisma.product.create({
      data: {
        name: 'LG UltraWide 34" Monitor',
        description: '34" WQHD IPS Ultrawide curved monitor for immersive productivity.',
        price: 49999,
        sku: 'LG-UW34-WQHD',
        category: 'Displays',
        imageUrl: 'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=500',
      },
    }),
  ]);

  const stockData = [
    { productId: products[0].id, warehouseId: w1.id, totalUnits: 15, reserved: 0 },
    { productId: products[0].id, warehouseId: w2.id, totalUnits: 8, reserved: 0 },
    { productId: products[0].id, warehouseId: w3.id, totalUnits: 3, reserved: 0 },
    { productId: products[1].id, warehouseId: w1.id, totalUnits: 20, reserved: 0 },
    { productId: products[1].id, warehouseId: w2.id, totalUnits: 12, reserved: 0 },
    { productId: products[2].id, warehouseId: w1.id, totalUnits: 5, reserved: 0 },
    { productId: products[2].id, warehouseId: w3.id, totalUnits: 2, reserved: 0 },
    { productId: products[3].id, warehouseId: w1.id, totalUnits: 25, reserved: 0 },
    { productId: products[3].id, warehouseId: w2.id, totalUnits: 18, reserved: 0 },
    { productId: products[3].id, warehouseId: w3.id, totalUnits: 10, reserved: 0 },
    { productId: products[4].id, warehouseId: w1.id, totalUnits: 1, reserved: 0 },
    { productId: products[4].id, warehouseId: w2.id, totalUnits: 7, reserved: 0 },
    { productId: products[5].id, warehouseId: w1.id, totalUnits: 4, reserved: 0 },
    { productId: products[5].id, warehouseId: w3.id, totalUnits: 6, reserved: 0 },
  ];

  await prisma.stock.createMany({ data: stockData });

  console.log('✅ Seed complete!');
  console.log(`   3 warehouses, ${products.length} products, ${stockData.length} stock entries`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
