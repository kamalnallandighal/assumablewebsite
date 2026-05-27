'use client';
import { listings } from '../../../lib/listings/data';
import type { FunnelState } from './useFunnel';

const cities = [
  'Phoenix',
  'Mesa',
  'Chandler',
  'Scottsdale',
  'Gilbert',
  'Tempe',
  'Glendale',
  'Peoria'
] as const;

const counts: Record<string, number> = Object.fromEntries(
  cities.map((c) => [
    c,
    listings.filter((l) => l.address.toLowerCase().includes(c.toLowerCase())).length
  ])
);

interface Props {
  state: FunnelState;
  patch: (p: Partial<FunnelState>) => void;
}

export function StepCity({ state, patch }: Props) {
  return (
    <div>
      <div className="mb-1 text-xs uppercase tracking-wider font-semibold text-muted-2">
        Step 1 of 6
      </div>
      <h2 className="font-serif text-3xl md:text-4xl text-ink leading-tight">
        Where do you want to live?
      </h2>
      <p className="mt-2 text-sm text-muted-2">
        We&apos;ve got 331 assumable homes across the Valley. Skip any step you don&apos;t care
        about.
      </p>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {cities.map((city) => {
          const selected = state.city === city;
          return (
            <button
              key={city}
              type="button"
              onClick={() => patch({ city: selected ? null : city })}
              className={`flex flex-col items-start gap-1 rounded-card border px-4 py-3 text-left transition-colors ${
                selected
                  ? 'border-ink bg-cream'
                  : 'border-line bg-paper hover:border-ink'
              }`}
            >
              <span className="text-sm font-semibold text-ink">{city}</span>
              <span className="text-xs text-muted-2">{counts[city]} homes</span>
            </button>
          );
        })}
      </div>

      <label className="mt-4 flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={state.openToAnywhere}
          onChange={(e) => patch({ openToAnywhere: e.target.checked })}
          className="accent-ink"
        />
        <span className="text-sm text-muted-2">Open to anywhere in AZ</span>
      </label>
    </div>
  );
}
