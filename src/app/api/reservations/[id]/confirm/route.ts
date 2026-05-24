export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
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

    const result = await prisma.$transaction(async (tx) => {
      // Use quoted camelCase column names as Prisma created them in Postgres
      const reservations = await tx.$queryRaw<
        Array<{
          id: string;
          status: string;
          expiresAt: Date;
          quantity: number;
          stockId: string;
        }>
      >`
        SELECT id, status, "expiresAt", quantity, "stockId"
        FROM "Reservation"
        WHERE id = ${id}
        FOR UPDATE
      `;

      if (reservations.length === 0) {
        return { error: 'Reservation not found', status: 404 };
      }

      const reservation = reservations[0];

      if (reservation.status === 'CONFIRMED') {
        return { message: 'Already confirmed', status: 200 };
      }

      if (reservation.status === 'RELEASED') {
        return { error: 'Reservation has been released', status: 410 };
      }

      if (new Date(reservation.expiresAt) < new Date()) {
        // Auto-release expired reservation and restore stock
        await tx.$executeRaw`
          UPDATE "Reservation" SET status = 'RELEASED', "updatedAt" = NOW()
          WHERE id = ${id}
        `;
        await tx.$executeRaw`
          UPDATE "Stock"
          SET reserved = GREATEST(0, reserved - ${reservation.quantity}), "updatedAt" = NOW()
          WHERE id = ${reservation.stockId}
        `;
        return { error: 'Reservation has expired', status: 410 };
      }

      // Confirm: permanently decrement totalUnits and clear the reserved hold
      await tx.$executeRaw`
        UPDATE "Stock"
        SET
          reserved = GREATEST(0, reserved - ${reservation.quantity}),
          "totalUnits" = GREATEST(0, "totalUnits" - ${reservation.quantity}),
          "updatedAt" = NOW()
        WHERE id = ${reservation.stockId}
      `;

      const updated = await tx.reservation.update({
        where: { id },
        data: { status: 'CONFIRMED' },
        include: {
          stock: {
            include: { product: true, warehouse: true },
          },
        },
      });

      return { reservation: updated, status: 200 };
    });

    if ('error' in result) {
      const body = { error: result.error };
      if (idempotencyKey) {
        await prisma.idempotencyRecord.create({
          data: { key: idempotencyKey, responseBody: body, statusCode: result.status },
        }).catch(() => {});
      }
      return NextResponse.json(body, { status: result.status });
    }

    const body =
      'message' in result
        ? { message: result.message }
        : {
            id: result.reservation!.id,
            status: result.reservation!.status,
            quantity: result.reservation!.quantity,
            expiresAt: result.reservation!.expiresAt.toISOString(),
            product: {
              id: result.reservation!.stock.product.id,
              name: result.reservation!.stock.product.name,
              price: Number(result.reservation!.stock.product.price),
            },
            warehouse: {
              id: result.reservation!.stock.warehouse.id,
              name: result.reservation!.stock.warehouse.name,
            },
          };

    if (idempotencyKey) {
      await prisma.idempotencyRecord.create({
        data: {
          key: idempotencyKey,
          reservationId: 'reservation' in result ? result.reservation!.id : undefined,
          responseBody: body,
          statusCode: result.status,
        },
      }).catch(() => {});
    }

    return NextResponse.json(body, { status: result.status });
  } catch (error) {
    console.error('[POST /api/reservations/:id/confirm]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
