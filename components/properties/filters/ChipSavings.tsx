'use client';
import { useState, useRef, useEffect } from 'react';
import type { FilterState } from '../../../lib/listings/filters';

interface Props {
  state: FilterState;
  patch: (p: Partial<FilterState>) => void;
}

export function ChipSavings({ state, patch }: Props) {
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

  const active = state.savingsMin > 0;
  const v = state.savingsMin > 0 ? String(state.savingsMin) : '';

  const setMin = (s: string) => {
    const n = s === '' ? 0 : Number(s);
    if (!Number.isNaN(n)) patch({ savingsMin: n });
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`px-3 py-1.5 text-sm rounded-pill border ${
          active ? 'border-ink bg-cream' : 'border-line'
        }`}
      >
        Min savings{active ? `: $${state.savingsMin.toLocaleString()}/mo` : ''}
      </button>
      {open && (
        <div className="absolute top-full mt-2 left-0 bg-paper rounded-card shadow-md border border-line p-4 w-64 z-40">
          <label className="block text-xs font-medium text-muted mb-1">
            Min monthly savings ($)
          </label>
          <input
            type="number"
            value={v}
            onChange={(e) => setMin(e.target.value)}
            placeholder="0"
            className="w-full px-2 py-1.5 text-sm border border-line rounded-pill focus:outline-none focus:border-ink"
          />
          <p className="mt-2 text-xs text-muted">
            Difference between market and assumed monthly payment.
          </p>
          <div className="flex justify-end mt-3">
            <button
              onClick={() => patch({ savingsMin: 0 })}
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
