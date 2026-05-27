import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFunnel } from '../../../components/landing/funnel/useFunnel';

describe('useFunnel', () => {
  it('starts on step 1', () => {
    const { result } = renderHook(() => useFunnel());
    expect(result.current.state.step).toBe(1);
  });

  it('next advances, back rewinds, clamped at edges', () => {
    const { result } = renderHook(() => useFunnel());
    act(() => result.current.next());
    expect(result.current.state.step).toBe(2);
    act(() => result.current.back());
    expect(result.current.state.step).toBe(1);
    act(() => result.current.back());
    expect(result.current.state.step).toBe(1);
  });

  it('next does not exceed step 6', () => {
    const { result } = renderHook(() => useFunnel());
    for (let i = 0; i < 10; i++) act(() => result.current.next());
    expect(result.current.state.step).toBe(6);
  });

  it('skip behaves like next', () => {
    const { result } = renderHook(() => useFunnel());
    act(() => result.current.skip());
    expect(result.current.state.step).toBe(2);
  });

  it('setStep jumps to any valid step', () => {
    const { result } = renderHook(() => useFunnel());
    act(() => result.current.setStep(4));
    expect(result.current.state.step).toBe(4);
  });

  it('patch merges partial state', () => {
    const { result } = renderHook(() => useFunnel());
    act(() => result.current.patch({ city: 'Phoenix', bedsMin: 3 }));
    expect(result.current.state.city).toBe('Phoenix');
    expect(result.current.state.bedsMin).toBe(3);
  });

  it('initial defaults match spec', () => {
    const { result } = renderHook(() => useFunnel());
    expect(result.current.state.loanType).toBe('VA');
    expect(result.current.state.monthlyMax).toBe(4000);
    expect(result.current.state.priceMax).toBe(750_000);
    expect(result.current.state.useCase).toBeNull();
  });
});
