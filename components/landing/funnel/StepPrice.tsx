'use client';
import { formatMoney } from '../../../lib/format';
import type { FunnelState } from './useFunnel';

interface Props {
  state: FunnelState;
  patch: (p: Partial<FunnelState>) => void;
}

const MONTHLY_MIN = 800;
const MONTHLY_MAX = 5000;
const MONTHLY_STEP = 50;

const PRICE_MIN = 200_000;
const PRICE_MAX = 1_000_000;
const PRICE_STEP = 10_000;

export function StepPrice({ state, patch }: Props) {
  return (
    <div>
      <div className="mb-1 text-xs uppercase tracking-wider font-semibold text-muted-2">
        Step 2 of 6
      </div>
      <h2 className="font-serif text-3xl md:text-4xl text-ink leading-tight">
        What&apos;s your ceiling?
      </h2>
      <p className="mt-2 text-sm text-muted-2">
        Monthly payment, purchase price, or both. We&apos;ll match either.
      </p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <label className="text-xs uppercase tracking-wider font-semibold text-muted-2">
            Max monthly payment
          </label>
          <div className="mt-4">
            <div className="font-serif font-normal leading-none tracking-tight text-[36px] md:text-[56px]">
              {formatMoney(state.monthlyMax)}
              <span className="text-[20px] text-muted-2">/mo</span>
            </div>
            <input
              type="range"
              min={MONTHLY_MIN}
              max={MONTHLY_MAX}
              step={MONTHLY_STEP}
              value={state.monthlyMax}
              onChange={(e) => patch({ monthlyMax: Number(e.target.value) })}
              className="mt-3 w-full accent-ink"
            />
            <div className="mt-2 flex justify-between text-[11px] text-muted">
              <span>$800</span>
              <span>$5,000+</span>
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wider font-semibold text-muted-2">
            Max purchase price
          </label>
          <div className="mt-4">
            <div className="font-serif font-normal leading-none tracking-tight text-[36px] md:text-[56px]">
              ${Math.round(state.priceMax / 1000)}K
            </div>
            <input
              type="range"
              min={PRICE_MIN}
              max={PRICE_MAX}
              step={PRICE_STEP}
              value={state.priceMax}
              onChange={(e) => patch({ priceMax: Number(e.target.value) })}
              className="mt-3 w-full accent-ink"
            />
            <div className="mt-2 flex justify-between text-[11px] text-muted">
              <span>$200K</span>
              <span>$1M+</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 flex items-center gap-2.5 rounded-card bg-cream px-4 py-3.5 text-[13px] text-muted-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted shrink-0"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <span>
            With assumption, you typically need{' '}
            <strong className="text-ink">8–15% down</strong> to cover the seller&apos;s equity —
            not 20%.
          </span>
        </div>
      </div>
    </div>
  );
}
