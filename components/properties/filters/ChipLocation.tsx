'use client';
import { useState, useRef, useEffect } from 'react';
import type { FilterState } from '../../../lib/listings/filters';

interface Props {
  state: FilterState;
  patch: (p: Partial<FilterState>) => void;
}

export function ChipLocation({ state, patch }: Props) {
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

  const active = !!state.city;

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`px-3 py-1.5 text-sm rounded-pill border ${
          active ? 'border-ink bg-cream' : 'border-line'
        }`}
      >
        {active ? `Location: ${state.city}` : 'Location'}
      </button>
      {open && (
        <div className="absolute top-full mt-2 left-0 bg-paper rounded-card shadow-md border border-line p-4 w-64 z-40">
          <label className="block text-xs font-medium text-muted mb-2">City</label>
          <input
            type="text"
            value={state.city ?? ''}
            onChange={(e) => patch({ city: e.target.value || null })}
            placeholder="e.g. Phoenix"
            className="w-full px-3 py-2 text-sm border border-line rounded-pill focus:outline-none focus:border-ink"
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={() => patch({ city: null })}
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
