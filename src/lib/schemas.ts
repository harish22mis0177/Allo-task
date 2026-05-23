import { z } from 'zod';

export const CreateReservationSchema = z.object({
  stockId: z.string().min(1, 'Stock ID is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
});

export const ReservationIdSchema = z.object({
  id: z.string().min(1, 'Reservation ID is required'),
});

export type CreateReservationInput = z.infer<typeof CreateReservationSchema>;
