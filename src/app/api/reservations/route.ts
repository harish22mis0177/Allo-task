import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CreateReservationSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

const EXPIRY_MINUTES = parseInt(process.env.RESERVATION_EXPIRY_MINUTES || '10', 10);

export async function GET() {
  try {
    const reservations = await prisma.reservation.findMany({
      include: {
        stock: {
          include: {
            product: true,
            warehouse: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(reservations);
  } catch (error) {
    console.error('[GET /api/reservations]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateReservationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { stockId, quantity } = parsed.data;

    // --- Idempotency ---
    const idempotencyKey = request.headers.get('Idempotency-Key');
    if (idempotencyKey) {
      const existing = await prisma.idempotencyRecord.findUnique({
        where: { key: idempotencyKey },
      });
      if (existing) {
        return NextResponse.json(existing.responseBody, { status: existing.statusCode });
      }
    }

    // Concurrency-safe: SELECT FOR UPDATE locks the row so two simultaneous
    // requests for the last unit cannot both succeed.
    const result = await prisma.$transaction(async (tx) => {
      // Postgres camelCase column names — must quote them exactly as Prisma created them
      const stocks = await tx.$queryRaw<
        Array<{
          id: string;
          totalUnits: number;
          reserved: number;
          productId: string;
          warehouseId: string;
        }>
      >`
        SELECT id, "totalUnits", reserved, "productId", "warehouseId"
        FROM "Stock"
        WHERE id = ${stockId}
        FOR UPDATE
      `;

      if (stocks.length === 0) {
        return { error: 'Stock not found', status: 404 };
      }

      const stock = stocks[0];
      const available = stock.totalUnits - stock.reserved;

      if (available < quantity) {
        return {
          error: `Not enough stock. Requested: ${quantity}, Available: ${available}`,
          status: 409,
        };
      }

      // Increment reserved count
      await tx.$executeRaw`
        UPDATE "Stock"
        SET reserved = reserved + ${quantity}, "updatedAt" = NOW()
        WHERE id = ${stockId}
      `;

      const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000);

      const reservation = await tx.reservation.create({
        data: {
          stockId,
          quantity,
          status: 'PENDING',
          expiresAt,
        },
        include: {
          stock: {
            include: {
              product: true,
              warehouse: true,
            },
          },
        },
      });

      return { reservation, status: 201 };
    });

    if ('error' in result) {
      const errorBody = { error: result.error };
      if (idempotencyKey && result.status === 409) {
        await prisma.idempotencyRecord.create({
          data: {
            key: idempotencyKey,
            responseBody: errorBody,
            statusCode: result.status,
          },
        }).catch(() => {});
      }
      return NextResponse.json(errorBody, { status: result.status });
    }

    const { reservation } = result;
    const responseBody = {
      id: reservation.id,
      status: reservation.status,
      quantity: reservation.quantity,
      expiresAt: reservation.expiresAt.toISOString(),
      createdAt: reservation.createdAt.toISOString(),
      product: {
        id: reservation.stock.product.id,
        name: reservation.stock.product.name,
        imageUrl: reservation.stock.product.imageUrl,
        price: Number(reservation.stock.product.price),
        sku: reservation.stock.product.sku,
      },
      warehouse: {
        id: reservation.stock.warehouse.id,
        name: reservation.stock.warehouse.name,
        location: reservation.stock.warehouse.location,
      },
    };

    if (idempotencyKey) {
      await prisma.idempotencyRecord.create({
        data: {
          key: idempotencyKey,
          reservationId: reservation.id,
          responseBody,
          statusCode: 201,
        },
      }).catch(() => {});
    }

    return NextResponse.json(responseBody, { status: 201 });
  } catch (error) {
    console.error('[POST /api/reservations]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
