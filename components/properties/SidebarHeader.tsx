'use client';
import { useState, useRef, useEffect } from 'react';
import { SORTS, SORT_LABELS, type Sort } from './filters/useSort';

interface Props {
  count: number;
  rateRange: string;
  sort: Sort;
  onSortChange: (s: Sort) => void;
}

export function SidebarHeader({ count, rateRange, sort, onSortChange }: Props) {
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

  return (
    <div className="flex items-center justify-between px-2 py-2 mb-2">
      <div className="text-sm text-ink">
        <span className="font-medium">{count}</span>
        <span className="text-muted"> {count === 1 ? 'home' : 'homes'} · rates </span>
        <span>{rateRange}</span>
      </div>
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="px-3 py-1.5 text-sm rounded-pill border border-line hover:border-ink bg-paper"
        >
          Sort: {SORT_LABELS[sort]} ▾
        </button>
        {open && (
          <ul className="absolute top-full mt-1 right-0 bg-paper border border-line rounded-card shadow-md z-40 overflow-hidden min-w-[200px]">
            {SORTS.map((s) => (
              <li key={s}>
                <button
                  onClick={() => {
                    onSortChange(s);
                    setOpen(false);
                  }}
                  className={`block w-full text-left px-3 py-2 text-sm ${
                    s === sort ? 'bg-cream font-medium' : 'hover:bg-cream'
                  }`}
                >
                  {SORT_LABELS[s]}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
