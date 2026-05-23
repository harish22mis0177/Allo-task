'use client';

import { useState } from 'react';
import { ProductWithStock, StockEntry } from '@/types';

interface Props {
  product: ProductWithStock;
  onReserve: (stockId: string, quantity: number) => Promise<void>;
  loading: boolean;
}

export default function ProductCard({ product, onReserve, loading }: Props) {
  const [selectedStock, setSelectedStock] = useState<StockEntry | null>(
    product.stock.find((s) => s.available > 0) || null
  );
  const [quantity, setQuantity] = useState(1);

  const maxQty = selectedStock ? selectedStock.available : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col">
      {/* Product Image */}
      <div className="relative h-52 bg-slate-100 overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1556742400-b5b7c512d7a9?w=500';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <span className="absolute top-3 left-3 bg-white text-slate-600 text-xs font-medium px-2 py-1 rounded-full border border-slate-200">
          {product.category}
        </span>
        {product.totalAvailable === 0 && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="bg-red-100 text-red-700 font-semibold px-3 py-1 rounded-full text-sm">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-5 flex flex-col flex-1">
        <div className="mb-1">
          <span className="text-xs text-slate-400 font-mono">{product.sku}</span>
        </div>
        <h3 className="font-semibold text-slate-900 text-base leading-snug mb-1">
          {product.name}
        </h3>
        <p className="text-sm text-slate-500 line-clamp-2 mb-3">{product.description}</p>
        <div className="text-xl font-bold text-brand-700 mb-4">
          ₹{product.price.toLocaleString('en-IN')}
        </div>

        {/* Warehouse Stock */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Stock by Warehouse
          </p>
          <div className="space-y-1">
            {product.stock.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  if (s.available > 0) {
                    setSelectedStock(s);
                    setQuantity(1);
                  }
                }}
                disabled={s.available === 0}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all ${
                  selectedStock?.id === s.id
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : s.available === 0
                    ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
                    : 'border-slate-200 hover:border-brand-300 hover:bg-blue-50 cursor-pointer'
                }`}
              >
                <span className="font-medium truncate">{s.warehouseName}</span>
                <span
                  className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                    s.available === 0
                      ? 'bg-red-100 text-red-600'
                      : s.available <= 3
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {s.available === 0 ? 'No stock' : `${s.available} avail.`}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Quantity + Reserve */}
        {product.totalAvailable > 0 && selectedStock && (
          <div className="mt-auto">
            <div className="flex items-center gap-2 mb-3">
              <label className="text-sm text-slate-600 font-medium whitespace-nowrap">Qty:</label>
              <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  −
                </button>
                <span className="px-3 py-1.5 font-semibold text-slate-900 text-sm min-w-[2rem] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  +
                </button>
              </div>
            </div>
            <button
              onClick={() => onReserve(selectedStock.id, quantity)}
              disabled={loading || !selectedStock}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-semibold py-2.5 rounded-xl transition-colors duration-150 text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Reserving…
                </span>
              ) : (
                'Reserve Now'
              )}
            </button>
          </div>
        )}

        {product.totalAvailable === 0 && (
          <div className="mt-auto">
            <button
              disabled
              className="w-full bg-slate-100 text-slate-400 font-semibold py-2.5 rounded-xl text-sm cursor-not-allowed"
            >
              Out of Stock
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
