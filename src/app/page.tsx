'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ProductWithStock } from '@/types';
import ProductCard from '@/components/ProductCard';

export default function HomePage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [reservingId, setReservingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'error' | 'success'; msg: string } | null>(null);
  const [filter, setFilter] = useState('All');

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data);
    } catch {
      setError('Failed to load products. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    const interval = setInterval(fetchProducts, 30000);
    return () => clearInterval(interval);
  }, [fetchProducts]);

  const showToast = (type: 'error' | 'success', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const handleReserve = async (stockId: string, quantity: number) => {
    setReservingId(stockId);
    try {
      const idempotencyKey = `reserve-${stockId}-${Date.now()}`;
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({ stockId, quantity }),
      });

      const data = await res.json();

      if (res.status === 409) {
        showToast('error', `Not enough stock: ${data.error}`);
        await fetchProducts();
        return;
      }

      if (!res.ok) {
        showToast('error', data.error || 'Reservation failed. Try again.');
        return;
      }

      router.push(`/checkout/${data.id}`);
    } catch {
      showToast('error', 'Network error. Please try again.');
    } finally {
      setReservingId(null);
    }
  };

  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];
  const filtered = filter === 'All' ? products : products.filter((p) => p.category === filter);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-20 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium max-w-sm transition-all ${
            toast.type === 'error'
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          <div className="flex items-start gap-2">
            <span className="mt-0.5">{toast.type === 'error' ? '⚠️' : '✅'}</span>
            <span>{toast.msg}</span>
          </div>
        </div>
      )}

      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Product Catalog</h1>
        <p className="text-slate-500">
          Reserve products from multiple warehouses. Reservations hold for{' '}
          <span className="font-semibold text-slate-700">10 minutes</span> while you complete checkout.
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 mb-8 flex items-start gap-3">
        <svg className="w-5 h-5 text-brand-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-brand-800">
          Select a warehouse and click <strong>Reserve Now</strong> to hold units for 10 minutes. If two
          customers try to reserve the last unit simultaneously, only one will succeed — the other will
          see a "not enough stock" error.
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
              filter === cat
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300'
            }`}
          >
            {cat}
          </button>
        ))}
        <button
          onClick={fetchProducts}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-700 mb-6">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse">
              <div className="h-52 bg-slate-200" />
              <div className="p-5 space-y-3">
                <div className="h-3 bg-slate-200 rounded w-1/3" />
                <div className="h-5 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-200 rounded w-full" />
                <div className="h-7 bg-slate-200 rounded w-1/3" />
                <div className="h-20 bg-slate-100 rounded" />
                <div className="h-10 bg-slate-200 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Products Grid */}
      {!loading && (
        <>
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-500">No products found.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onReserve={handleReserve}
                  loading={reservingId !== null}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Stats */}
      {!loading && products.length > 0 && (
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Products', value: products.length },
            { label: 'In Stock', value: products.filter((p) => p.totalAvailable > 0).length },
            { label: 'Out of Stock', value: products.filter((p) => p.totalAvailable === 0).length },
            { label: 'Categories', value: categories.length - 1 },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <div className="text-2xl font-bold text-brand-700">{stat.value}</div>
              <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
