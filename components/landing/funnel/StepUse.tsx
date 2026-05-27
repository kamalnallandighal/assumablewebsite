'use client';
import type { FunnelState } from './useFunnel';

interface Props {
  state: FunnelState;
  patch: (p: Partial<FunnelState>) => void;
}

const OPTS: { value: 'primary' | 'investment'; label: string; desc: string }[] = [
  {
    value: 'primary',
    label: 'Primary residence',
    desc: "I'll live there. Both VA and FHA assumables work."
  },
  {
    value: 'investment',
    label: 'Investment / rental',
    desc: 'I plan to rent it. Only VA assumables qualify — Jeff will share ROI numbers too.'
  }
];

export function StepUse({ state, patch }: Props) {
  return (
    <div>
      <div className="mb-1 text-xs uppercase tracking-wider font-semibold text-muted-2">
        Step 5 of 6
      </div>
      <h2 className="font-serif text-3xl md:text-4xl text-ink leading-tight">
        What&apos;s this home for?
      </h2>
      <p className="mt-2 text-sm text-muted-2">
        We&apos;ll show you the right inventory for your situation.
      </p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
        {OPTS.map((o) => {
          const sel = state.useCase === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => patch({ useCase: o.value })}
              className={`text-left rounded-card border p-6 transition-colors ${
                sel ? 'border-ink bg-cream' : 'border-line bg-paper hover:border-ink'
              }`}
            >
              <div className="font-serif text-2xl tracking-tight text-ink">{o.label}</div>
              <div className="mt-2.5 text-[13px] text-muted-2 leading-relaxed">{o.desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
