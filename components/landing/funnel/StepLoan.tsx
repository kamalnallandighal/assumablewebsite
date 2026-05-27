'use client';
import type { FunnelState } from './useFunnel';

interface Props {
  state: FunnelState;
  patch: (p: Partial<FunnelState>) => void;
}

type LoanOpt = {
  value: FunnelState['loanType'];
  tag: string;
  label: string;
  desc: string;
  count: number;
};

const OPTS: LoanOpt[] = [
  {
    value: 'VA',
    tag: 'VA',
    label: 'VA assumables',
    desc: 'Lowest rates. Open to any qualified buyer — no military status required. Can be rented.',
    count: 184
  },
  {
    value: 'FHA',
    tag: 'FHA',
    label: 'FHA assumables',
    desc: 'Slightly higher rates but smaller down. Must be your primary residence.',
    count: 147
  },
  {
    value: 'both',
    tag: 'Any',
    label: 'Show me both',
    desc: "Surface everything, I'll filter later.",
    count: 331
  }
];

export function StepLoan({ state, patch }: Props) {
  return (
    <div>
      <div className="mb-1 text-xs uppercase tracking-wider font-semibold text-muted-2">
        Step 4 of 6
      </div>
      <h2 className="font-serif text-3xl md:text-4xl text-ink leading-tight">
        Loan preferences?
      </h2>
      <p className="mt-2 text-sm text-muted-2">
        VA assumables work for anyone, even non-veterans. FHA requires you to live there.
      </p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        {OPTS.map((o) => {
          const sel = state.loanType === o.value;
          return (
            <button
              key={o.tag}
              type="button"
              onClick={() => patch({ loanType: o.value })}
              className={`text-left rounded-card border p-5 transition-colors ${
                sel ? 'border-ink bg-cream' : 'border-line bg-paper hover:border-ink'
              }`}
            >
              <span
                className={`inline-block text-[10px] font-semibold uppercase tracking-wider rounded-pill px-2.5 py-1 ${
                  o.value === 'VA'
                    ? 'bg-navy text-white'
                    : o.value === 'FHA'
                    ? 'bg-terra text-white'
                    : 'bg-line text-muted-2'
                }`}
              >
                {o.tag}
              </span>
              <div className="mt-3.5 font-serif text-[22px] tracking-tight text-ink">
                {o.label}
              </div>
              <div className="mt-2 text-xs text-muted-2 leading-relaxed">{o.desc}</div>
              <div className="mt-3.5 text-[11px] text-muted">{o.count} listings</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
