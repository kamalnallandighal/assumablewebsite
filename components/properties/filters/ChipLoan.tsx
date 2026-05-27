'use client';
import { useState, useRef, useEffect } from 'react';
import type { FilterState } from '../../../lib/listings/filters';
import type { LoanType } from '../../../lib/listings/types';

interface Props {
  state: FilterState;
  patch: (p: Partial<FilterState>) => void;
}

const ALL: LoanType[] = ['VA', 'FHA', 'Conventional'];

export function ChipLoan({ state, patch }: Props) {
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

  const toggle = (t: LoanType) => {
    const set = new Set(state.loanTypes);
    if (set.has(t)) set.delete(t);
    else set.add(t);
    patch({ loanTypes: Array.from(set) });
  };

  const active = state.loanTypes.length > 0;

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`px-3 py-1.5 text-sm rounded-pill border ${
          active ? 'border-ink bg-cream' : 'border-line'
        }`}
      >
        Loan type{active ? ` (${state.loanTypes.length})` : ''}
      </button>
      {open && (
        <div className="absolute top-full mt-2 left-0 bg-paper rounded-card shadow-md border border-line p-4 w-56 z-40">
          <div className="flex flex-col gap-2">
            {ALL.map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.loanTypes.includes(t)}
                  onChange={() => toggle(t)}
                />
                {t}
              </label>
            ))}
          </div>
          <div className="flex justify-end mt-3">
            <button
              onClick={() => patch({ loanTypes: [] })}
              className="text-xs text-muted hover:text-ink"
            >
              Clear all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
