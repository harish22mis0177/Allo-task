import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { releaseExpiredReservations } from '@/lib/expiry';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Lazy cleanup of expired reservations before returning stock data
    await releaseExpiredReservations();

    const products = await prisma.product.findMany({
      include: {
        stock: {
          include: {
            warehouse: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const result = products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      imageUrl: product.imageUrl,
      price: Number(product.price),
      sku: product.sku,
      category: product.category,
      stock: product.stock.map((s) => ({
        id: s.id,
        warehouseId: s.warehouseId,
        warehouseName: s.warehouse.name,
        warehouseLocation: s.warehouse.location,
        totalUnits: s.totalUnits,
        reserved: s.reserved,
        available: Math.max(0, s.totalUnits - s.reserved),
      })),
      totalAvailable: product.stock.reduce(
        (sum, s) => sum + Math.max(0, s.totalUnits - s.reserved),
        0
      ),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('[GET /api/products]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
