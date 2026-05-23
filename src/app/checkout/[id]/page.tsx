'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import CountdownTimer from '@/components/CountdownTimer';
import { ReservationDetail } from '@/types';

export default function CheckoutPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;

  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<'confirm' | 'release' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finalState, setFinalState] = useState<'confirmed' | 'released' | 'expired' | null>(null);

  const fetchReservation = useCallback(async () => {
    try {
      const res = await fetch(`/api/reservations`);
      const all = await res.json();
      const found = all.find((r: ReservationDetail & { stock: { product: unknown; warehouse: unknown } }) => r.id === id);
      if (!found) {
        setError('Reservation not found.');
        return;
      }

      // Shape the data
      const shaped: ReservationDetail = {
        id: found.id,
        status: found.status,
        quantity: found.quantity,
        expiresAt: found.expiresAt,
        createdAt: found.createdAt,
        product: {
          id: found.stock.product.id,
          name: found.stock.product.name,
          imageUrl: found.stock.product.imageUrl,
          price: Number(found.stock.product.price),
          sku: found.stock.product.sku,
        },
        warehouse: {
          id: found.stock.warehouse.id,
          name: found.stock.warehouse.name,
          location: found.stock.warehouse.location,
        },
      };

      setReservation(shaped);

      if (shaped.status === 'CONFIRMED') setFinalState('confirmed');
      if (shaped.status === 'RELEASED') setFinalState('released');
      if (shaped.status === 'PENDING' && new Date(shaped.expiresAt) < new Date()) {
        setFinalState('expired');
      }
    } catch {
      setError('Failed to load reservation.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchReservation();
  }, [fetchReservation]);

  const handleConfirm = async () => {
    setActionLoading('confirm');
    setError(null);
    try {
      const idempotencyKey = `confirm-${id}-${Date.now()}`;
      const res = await fetch(`/api/reservations/${id}/confirm`, {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
      });
      const data = await res.json();

      if (res.status === 410) {
        setFinalState('expired');
        setError('This reservation expired before you could confirm it.');
        return;
      }
      if (!res.ok) {
        setError(data.error || 'Confirmation failed.');
        return;
      }
      setFinalState('confirmed');
      setReservation((prev) => prev ? { ...prev, status: 'CONFIRMED' } : prev);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRelease = async () => {
    setActionLoading('release');
    setError(null);
    try {
      const res = await fetch(`/api/reservations/${id}/release`, { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Release failed.');
        return;
      }
      setFinalState('released');
      setReservation((prev) => prev ? { ...prev, status: 'RELEASED' } : prev);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="inline-flex flex-col items-center gap-3">
          <svg className="w-8 h-8 animate-spin text-brand-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <p className="text-slate-500">Loading reservation…</p>
        </div>
      </div>
    );
  }

  if (error && !reservation) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8">
          <p className="text-red-700 font-medium">{error}</p>
          <button onClick={() => router.push('/')} className="mt-4 text-sm text-brand-600 hover:underline">
            ← Back to products
          </button>
        </div>
      </div>
    );
  }

  if (!reservation) return null;

  const total = reservation.product.price * reservation.quantity;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Back */}
      <button
        onClick={() => router.push('/')}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to products
      </button>

      <h1 className="text-2xl font-bold text-slate-900 mb-6">Checkout</h1>

      {/* Final State Banners */}
      {finalState === 'confirmed' && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-6 mb-6 text-center">
          <div className="text-4xl mb-2">✅</div>
          <h2 className="text-xl font-bold text-emerald-800">Order Confirmed!</h2>
          <p className="text-emerald-700 mt-1">Your purchase has been confirmed. Stock has been permanently decremented.</p>
          <button onClick={() => router.push('/')} className="mt-4 text-sm text-brand-600 hover:underline font-medium">
            Continue shopping →
          </button>
        </div>
      )}

      {finalState === 'released' && (
        <div className="bg-slate-50 border border-slate-300 rounded-2xl p-6 mb-6 text-center">
          <div className="text-4xl mb-2">🔓</div>
          <h2 className="text-xl font-bold text-slate-700">Reservation Cancelled</h2>
          <p className="text-slate-500 mt-1">The stock has been released back to the warehouse.</p>
          <button onClick={() => router.push('/')} className="mt-4 text-sm text-brand-600 hover:underline font-medium">
            Browse products →
          </button>
        </div>
      )}

      {finalState === 'expired' && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6 text-center">
          <div className="text-4xl mb-2">⏰</div>
          <h2 className="text-xl font-bold text-red-700">Reservation Expired</h2>
          <p className="text-red-600 mt-1">The 10-minute hold expired. Stock has been released for other customers.</p>
          <button onClick={() => router.push('/')} className="mt-4 text-sm text-brand-600 hover:underline font-medium">
            Try again →
          </button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 text-sm text-red-700 flex items-start gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Product Header */}
        <div className="flex gap-4 p-6 border-b border-slate-100">
          {reservation.product.imageUrl && (
            <img
              src={reservation.product.imageUrl}
              alt={reservation.product.name}
              className="w-24 h-24 object-cover rounded-xl border border-slate-100 flex-shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <div>
            <p className="text-xs text-slate-400 font-mono mb-1">{reservation.product.sku}</p>
            <h2 className="text-lg font-semibold text-slate-900">{reservation.product.name}</h2>
            <p className="text-slate-500 text-sm mt-1">{reservation.warehouse.name} · {reservation.warehouse.location}</p>
          </div>
        </div>

        {/* Details */}
        <div className="p-6 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Quantity</span>
            <span className="font-medium text-slate-900">{reservation.quantity} unit{reservation.quantity > 1 ? 's' : ''}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Unit Price</span>
            <span className="font-medium text-slate-900">₹{reservation.product.price.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Warehouse</span>
            <span className="font-medium text-slate-900">{reservation.warehouse.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Reservation ID</span>
            <span className="font-mono text-xs text-slate-400">{reservation.id}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Status</span>
            <span className={`font-semibold text-xs px-2 py-0.5 rounded-full ${
              reservation.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-700' :
              reservation.status === 'RELEASED' ? 'bg-slate-100 text-slate-600' :
              'bg-amber-100 text-amber-700'
            }`}>
              {reservation.status}
            </span>
          </div>
          <div className="border-t border-slate-100 pt-3 flex justify-between">
            <span className="font-semibold text-slate-900">Total</span>
            <span className="text-xl font-bold text-brand-700">₹{total.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Countdown - only for PENDING */}
        {reservation.status === 'PENDING' && !finalState && (
          <div className="px-6 pb-4">
            <CountdownTimer
              expiresAt={reservation.expiresAt}
              onExpire={() => setFinalState('expired')}
            />
          </div>
        )}

        {/* Actions - only for PENDING */}
        {reservation.status === 'PENDING' && !finalState && (
          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={handleRelease}
              disabled={actionLoading !== null}
              className="flex-1 border border-slate-300 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 text-sm"
            >
              {actionLoading === 'release' ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Cancelling…
                </span>
              ) : 'Cancel'}
            </button>
            <button
              onClick={handleConfirm}
              disabled={actionLoading !== null}
              className="flex-2 flex-[2] bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 text-sm"
            >
              {actionLoading === 'confirm' ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Confirming…
                </span>
              ) : '✓ Confirm Purchase'}
            </button>
          </div>
        )}
      </div>

      {/* Reservation Info */}
      <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500 space-y-1">
        <p>🔒 <strong>Concurrency-safe:</strong> This reservation was created using PostgreSQL row-level locking. Only one customer can hold this stock at a time.</p>
        <p>⏱️ <strong>Auto-expiry:</strong> If not confirmed within 10 minutes, the reservation is automatically released on next read.</p>
        <p>🔄 <strong>Idempotent:</strong> Retrying with the same Idempotency-Key will return the original response without side effects.</p>
      </div>
    </div>
  );
}
