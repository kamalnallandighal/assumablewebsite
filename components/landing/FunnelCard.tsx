'use client';
import { useFunnel } from './funnel/useFunnel';
import { StepCity } from './funnel/StepCity';
import { StepPrice } from './funnel/StepPrice';
import { StepBeds } from './funnel/StepBeds';
import { StepLoan } from './funnel/StepLoan';
import { StepUse } from './funnel/StepUse';
import { StepResult } from './funnel/StepResult';

const steps = [1, 2, 3, 4, 5, 6] as const;

export function FunnelCard() {
  const { state, next, back, skip, patch } = useFunnel();

  return (
    <div className="bg-paper rounded-card shadow-md p-6 md:p-8">
      <div className="inline-block bg-terra text-white text-xs uppercase tracking-wider px-3 py-1 rounded-pill mb-6">
        Find your home
      </div>

      <div>
        {state.step === 1 && <StepCity state={state} patch={patch} />}
        {state.step === 2 && <StepPrice state={state} patch={patch} />}
        {state.step === 3 && <StepBeds state={state} patch={patch} />}
        {state.step === 4 && <StepLoan state={state} patch={patch} />}
        {state.step === 5 && <StepUse state={state} patch={patch} />}
        {state.step === 6 && <StepResult state={state} patch={patch} />}
      </div>

      <div className="mt-8 flex items-center gap-2">
        {steps.map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-pill ${s <= state.step ? 'bg-ink' : 'bg-line-2'}`}
          />
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={back}
          disabled={state.step === 1}
          className="text-sm text-muted disabled:opacity-40"
        >
          Back
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={skip}
            disabled={state.step === 6}
            className="text-sm text-muted disabled:opacity-40"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={next}
            disabled={state.step === 6}
            className="bg-ink text-white text-sm px-5 py-2 rounded-pill disabled:opacity-40"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
