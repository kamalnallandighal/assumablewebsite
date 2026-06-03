'use client';
import { useState, useRef, useEffect } from 'react';
import type { FilterState } from '../../../lib/listings/filters';

interface Props {
  state: FilterState;
  patch: (p: Partial<FilterState>) => void;
}

export function ChipDown({ state, patch }: Props) {
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

  const active = state.downMax !== null;
  const v = state.downMax !== null ? String(state.downMax) : '';

  const setMax = (s: string) => {
    if (s === '') {
      patch({ downMax: null });
      return;
    }
    const n = Number(s);
    if (!Number.isNaN(n)) patch({ downMax: n });
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`px-3 py-1.5 text-sm rounded-pill border ${
          active ? 'border-ink bg-cream' : 'border-line'
        }`}
      >
        Max down{active ? `: $${state.downMax!.toLocaleString()}` : ''}
      </button>
      {open && (
        <div className="absolute top-full mt-2 left-0 bg-paper rounded-card shadow-md border border-line p-4 w-64 z-40">
          <label className="block text-xs font-medium text-muted mb-1">
            Max down payment ($)
          </label>
          <input
            type="number"
            value={v}
            onChange={(e) => setMax(e.target.value)}
            placeholder="Any"
            className="w-full px-2 py-1.5 text-sm border border-line rounded-pill focus:outline-none focus:border-ink"
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={() => patch({ downMax: null })}
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
