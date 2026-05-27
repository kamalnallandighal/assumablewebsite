'use client';
import { useReducer, useCallback } from 'react';
import type { LoanType } from '../../../lib/listings/types';

export interface FunnelState {
  step: 1 | 2 | 3 | 4 | 5 | 6;
  city: string | null;
  openToAnywhere: boolean;
  monthlyMax: number;       // dollars
  priceMax: number;
  bedsMin: number;
  bathsMin: number;
  loanType: LoanType | 'both';
  useCase: 'primary' | 'investment' | null;
  email: string;
}

export const initialFunnelState: FunnelState = {
  step: 1,
  city: null,
  openToAnywhere: false,
  monthlyMax: 4000,
  priceMax: 750_000,
  bedsMin: 0,
  bathsMin: 0,
  loanType: 'VA',
  useCase: null,
  email: ''
};

export type FunnelAction =
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'skip' }
  | { type: 'setStep'; step: FunnelState['step'] }
  | { type: 'patch'; patch: Partial<FunnelState> };

function reducer(state: FunnelState, action: FunnelAction): FunnelState {
  switch (action.type) {
    case 'next':
    case 'skip':
      return state.step < 6 ? { ...state, step: (state.step + 1) as FunnelState['step'] } : state;
    case 'back':
      return state.step > 1 ? { ...state, step: (state.step - 1) as FunnelState['step'] } : state;
    case 'setStep':
      return { ...state, step: action.step };
    case 'patch':
      return { ...state, ...action.patch };
  }
}

export function useFunnel() {
  const [state, dispatch] = useReducer(reducer, initialFunnelState);
  const next = useCallback(() => dispatch({ type: 'next' }), []);
  const back = useCallback(() => dispatch({ type: 'back' }), []);
  const skip = useCallback(() => dispatch({ type: 'skip' }), []);
  const setStep = useCallback((step: FunnelState['step']) => dispatch({ type: 'setStep', step }), []);
  const patch = useCallback((p: Partial<FunnelState>) => dispatch({ type: 'patch', patch: p }), []);
  return { state, next, back, skip, setStep, patch };
}
