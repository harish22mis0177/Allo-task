import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Use quoted camelCase column names as Prisma created them in Postgres
      const reservations = await tx.$queryRaw<
        Array<{
          id: string;
          status: string;
          quantity: number;
          stockId: string;
        }>
      >`
        SELECT id, status, quantity, "stockId"
        FROM "Reservation"
        WHERE id = ${id}
        FOR UPDATE
      `;

      if (reservations.length === 0) {
        return { error: 'Reservation not found', status: 404 };
      }

      const reservation = reservations[0];

      if (reservation.status === 'RELEASED') {
        return { message: 'Already released', status: 200 };
      }

      if (reservation.status === 'CONFIRMED') {
        return { error: 'Cannot release a confirmed reservation', status: 409 };
      }

      // Decrement reserved count to restore available stock
      await tx.$executeRaw`
        UPDATE "Stock"
        SET reserved = GREATEST(0, reserved - ${reservation.quantity}), "updatedAt" = NOW()
        WHERE id = ${reservation.stockId}
      `;

      const updated = await tx.reservation.update({
        where: { id },
        data: { status: 'RELEASED' },
        include: {
          stock: {
            include: { product: true, warehouse: true },
          },
        },
      });

      return { reservation: updated, status: 200 };
    });

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const body =
      'message' in result
        ? { message: result.message }
        : {
            id: result.reservation!.id,
            status: result.reservation!.status,
            quantity: result.reservation!.quantity,
            product: {
              id: result.reservation!.stock.product.id,
              name: result.reservation!.stock.product.name,
            },
            warehouse: {
              id: result.reservation!.stock.warehouse.id,
              name: result.reservation!.stock.warehouse.name,
            },
          };

    return NextResponse.json(body, { status: result.status });
  } catch (error) {
    console.error('[POST /api/reservations/:id/release]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
