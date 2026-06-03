'use client';
import { useEffect, useRef, useState } from 'react';
import type { Bbox } from '../../lib/listings/filters';

export interface GeocoderResult {
  id: string;
  place_name: string;
  bbox?: Bbox;
  center: [number, number]; // [lng, lat]
  place_type: string[];
}

interface Props {
  token: string;
  onSelect: (r: GeocoderResult) => void;
}

// Maricopa County rough bounding box: west, south, east, north.
const MARICOPA_BBOX = '-113.0,32.9,-111.5,33.9';
const TYPES = 'address,place,postcode,neighborhood,locality';

export function Geocoder({ token, onSelect }: Props) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<GeocoderResult[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      const url =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
        `?access_token=${token}&country=us&bbox=${MARICOPA_BBOX}&types=${TYPES}&limit=6`;
      try {
        const res = await fetch(url);
        if (!res.ok) {
          setResults([]);
          return;
        }
        const json = await res.json();
        setResults(json.features ?? []);
        setActive(0);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q, token]);

  const pick = (r: GeocoderResult) => {
    onSelect(r);
    setQ(r.place_name);
    setOpen(false);
  };

  return (
    <div className="relative w-full max-w-md">
      <input
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, results.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === 'Enter' && results[active]) {
            e.preventDefault();
            pick(results[active]);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        placeholder="City, address, neighborhood, or zip"
        aria-label="Search by location"
        className="w-full px-4 py-2 text-sm border border-line rounded-pill focus:outline-none focus:border-ink bg-paper"
      />
      {open && results.length > 0 && (
        <ul className="absolute top-full mt-1 left-0 right-0 bg-paper border border-line rounded-card shadow-md z-40 overflow-hidden">
          {results.map((r, i) => (
            <li key={r.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(r);
                }}
                onMouseEnter={() => setActive(i)}
                className={`w-full text-left px-3 py-2 text-sm ${
                  i === active ? 'bg-cream' : 'hover:bg-cream'
                }`}
              >
                {r.place_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
