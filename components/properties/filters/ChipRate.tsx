'use client';
import { useState, useRef, useEffect } from 'react';
import type { FilterState } from '../../../lib/listings/filters';

interface Props {
  state: FilterState;
  patch: (p: Partial<FilterState>) => void;
}

// User types percent (e.g. 4); we store decimal (0.04). null = no cap.
export function ChipRate({ state, patch }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const active = state.rateMax !== null;
  const maxStr = state.rateMax !== null ? String(+(state.rateMax * 100).toFixed(2)) : '';

  const setMax = (v: string) => {
    if (v === '') {
      patch({ rateMax: null });
      return;
    }
    const n = Number(v);
    if (!Number.isNaN(n)) patch({ rateMax: n / 100 });
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`px-3 py-1.5 text-sm rounded-pill border ${
          active ? 'border-ink bg-cream' : 'border-line'
        }`}
      >
        Max rate{active ? `: ${(state.rateMax! * 100).toFixed(2)}%` : ''}
      </button>
      {open && (
        <div className="absolute top-full mt-2 left-0 bg-paper rounded-card shadow-md border border-line p-4 w-56 z-40">
          <label className="block text-xs font-medium text-muted mb-1">
            Max rate (%)
          </label>
          <input
            type="number"
            step="0.01"
            value={maxStr}
            onChange={(e) => setMax(e.target.value)}
            placeholder="Any"
            className="w-full px-2 py-1.5 text-sm border border-line rounded-pill focus:outline-none focus:border-ink"
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={() => patch({ rateMax: null })}
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
