import { prisma } from './prisma';

/**
 * Lazy expiry cleanup: releases all PENDING reservations past expiresAt.
 * Called at the start of GET /api/products so stock is always fresh on read.
 */
export async function releaseExpiredReservations(): Promise<number> {
  const now = new Date();

  const expired = await prisma.reservation.findMany({
    where: {
      status: 'PENDING',
      expiresAt: { lt: now },
    },
    select: { id: true, stockId: true, quantity: true },
  });

  if (expired.length === 0) return 0;

  // Release all expired reservations
  await prisma.$transaction(
    expired.map((r) =>
      prisma.reservation.update({
        where: { id: r.id },
        data: { status: 'RELEASED' },
      })
    )
  );

  // Decrement reserved counts per stock (grouped to avoid double updates)
  const grouped: Record<string, number> = {};
  for (const r of expired) {
    grouped[r.stockId] = (grouped[r.stockId] || 0) + r.quantity;
  }

  await prisma.$transaction(
    Object.entries(grouped).map(([stockId, qty]) =>
      prisma.stock.update({
        where: { id: stockId },
        data: { reserved: { decrement: qty } },
      })
    )
  );

  console.log(`[expiry] Released ${expired.length} expired reservation(s)`);
  return expired.length;
}
