'use client';

import { useEffect, useState } from 'react';

interface Props {
  expiresAt: string;
  onExpire?: () => void;
}

export default function CountdownTimer({ expiresAt, onExpire }: Props) {
  const [remaining, setRemaining] = useState(0);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const calc = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining(0);
        setExpired(true);
        onExpire?.();
        return false;
      }
      setRemaining(Math.floor(diff / 1000));
      return true;
    };

    if (!calc()) return;
    const interval = setInterval(() => {
      if (!calc()) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const pct = Math.min(100, (remaining / 600) * 100);

  const color =
    expired || remaining < 60
      ? { bar: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' }
      : remaining < 180
      ? { bar: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' }
      : { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' };

  return (
    <div className={`rounded-xl border ${color.border} ${color.bg} p-4`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Reservation expires in
        </span>
        <span className={`text-2xl font-bold tabular-nums ${color.text}`}>
          {expired
            ? 'Expired'
            : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`}
        </span>
      </div>
      <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden border border-white/40">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${color.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {expired && (
        <p className="text-xs text-red-600 mt-2 font-medium">
          This reservation has expired. The hold has been released.
        </p>
      )}
    </div>
  );
}
