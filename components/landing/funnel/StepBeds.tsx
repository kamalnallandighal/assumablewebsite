'use client';
import type { FunnelState } from './useFunnel';

interface Props {
  state: FunnelState;
  patch: (p: Partial<FunnelState>) => void;
}

const BEDS_OPTS: { label: string; value: number }[] = [
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4', value: 4 },
  { label: '5+', value: 5 }
];

const BATHS_OPTS: { label: string; value: number }[] = [
  { label: '1', value: 1 },
  { label: '1.5', value: 1.5 },
  { label: '2', value: 2 },
  { label: '2.5', value: 2.5 },
  { label: '3+', value: 3 }
];

export function StepBeds({ state, patch }: Props) {
  return (
    <div>
      <div className="mb-1 text-xs uppercase tracking-wider font-semibold text-muted-2">
        Step 3 of 6
      </div>
      <h2 className="font-serif text-3xl md:text-4xl text-ink leading-tight">
        How much space do you need?
      </h2>
      <p className="mt-2 text-sm text-muted-2">Rough is fine — you can refine later.</p>

      <div className="mt-6">
        <label className="text-xs uppercase tracking-wider font-semibold text-muted-2">
          Minimum bedrooms
        </label>
        <div className="mt-3 flex gap-2">
          {BEDS_OPTS.map((o) => {
            const sel = state.bedsMin === o.value;
            return (
              <button
                key={o.label}
                type="button"
                onClick={() => patch({ bedsMin: sel ? 0 : o.value })}
                className={`flex-1 py-4 rounded-card border font-serif text-2xl font-normal tracking-tight transition-colors ${
                  sel ? 'border-ink bg-cream text-ink' : 'border-line bg-paper text-ink hover:border-ink'
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>

        <label className="mt-7 block text-xs uppercase tracking-wider font-semibold text-muted-2">
          Minimum bathrooms
        </label>
        <div className="mt-3 flex gap-2">
          {BATHS_OPTS.map((o) => {
            const sel = state.bathsMin === o.value;
            return (
              <button
                key={o.label}
                type="button"
                onClick={() => patch({ bathsMin: sel ? 0 : o.value })}
                className={`flex-1 py-4 rounded-card border font-serif text-2xl font-normal tracking-tight transition-colors ${
                  sel ? 'border-ink bg-cream text-ink' : 'border-line bg-paper text-ink hover:border-ink'
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
