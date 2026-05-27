'use client';
import { useState, useRef, useEffect } from 'react';
import type { FilterState } from '../../../lib/listings/filters';

interface Props {
  state: FilterState;
  patch: (p: Partial<FilterState>) => void;
}

export function ChipPrice({ state, patch }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const minStr = state.priceMin > 0 ? String(state.priceMin) : '';
  const maxStr = Number.isFinite(state.priceMax) ? String(state.priceMax) : '';

  const active = state.priceMin > 0 || Number.isFinite(state.priceMax);

  const setMin = (v: string) => {
    const n = v === '' ? 0 : Number(v);
    if (!Number.isNaN(n)) patch({ priceMin: n });
  };
  const setMax = (v: string) => {
    const n = v === '' ? Number.POSITIVE_INFINITY : Number(v);
    if (!Number.isNaN(n)) patch({ priceMax: n });
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`px-3 py-1.5 text-sm rounded-pill border ${
          active ? 'border-ink bg-cream' : 'border-line'
        }`}
      >
        Price
      </button>
      {open && (
        <div className="absolute top-full mt-2 left-0 bg-paper rounded-card shadow-md border border-line p-4 w-64 z-40">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-muted mb-1">Min</label>
              <input
                type="number"
                value={minStr}
                onChange={(e) => setMin(e.target.value)}
                placeholder="0"
                className="w-full px-2 py-1.5 text-sm border border-line rounded-pill focus:outline-none focus:border-ink"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-muted mb-1">Max</label>
              <input
                type="number"
                value={maxStr}
                onChange={(e) => setMax(e.target.value)}
                placeholder="Any"
                className="w-full px-2 py-1.5 text-sm border border-line rounded-pill focus:outline-none focus:border-ink"
              />
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button
              onClick={() => patch({ priceMin: 0, priceMax: Number.POSITIVE_INFINITY })}
              className="text-xs text-muted hover:text-ink"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
