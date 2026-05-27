'use client';
import { useState, useRef, useEffect } from 'react';
import type { FilterState } from '../../../lib/listings/filters';

interface Props {
  state: FilterState;
  patch: (p: Partial<FilterState>) => void;
}

const BEDS = [1, 2, 3, 4, 5];
const BATHS = [1, 2, 3];

export function ChipBeds({ state, patch }: Props) {
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

  const active = state.bedsMin > 0 || state.bathsMin > 0;

  const Pill = ({ n, val, onClick, plus }: { n: number; val: number; onClick: () => void; plus?: boolean }) => (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-sm rounded-pill border ${
        val === n ? 'border-ink bg-ink text-paper' : 'border-line hover:border-ink'
      }`}
    >
      {n}{plus ? '+' : ''}
    </button>
  );

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`px-3 py-1.5 text-sm rounded-pill border ${
          active ? 'border-ink bg-cream' : 'border-line'
        }`}
      >
        Beds{active ? ` (${state.bedsMin || 0}+/${state.bathsMin || 0}+)` : ''}
      </button>
      {open && (
        <div className="absolute top-full mt-2 left-0 bg-paper rounded-card shadow-md border border-line p-4 w-64 z-40">
          <div className="mb-3">
            <label className="block text-xs font-medium text-muted mb-2">Min beds</label>
            <div className="flex gap-1.5 flex-wrap">
              {BEDS.map((n) => (
                <Pill
                  key={n}
                  n={n}
                  val={state.bedsMin}
                  onClick={() => patch({ bedsMin: state.bedsMin === n ? 0 : n })}
                  plus={n === 5}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-2">Min baths</label>
            <div className="flex gap-1.5 flex-wrap">
              {BATHS.map((n) => (
                <Pill
                  key={n}
                  n={n}
                  val={state.bathsMin}
                  onClick={() => patch({ bathsMin: state.bathsMin === n ? 0 : n })}
                  plus={n === 3}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button
              onClick={() => patch({ bedsMin: 0, bathsMin: 0 })}
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
