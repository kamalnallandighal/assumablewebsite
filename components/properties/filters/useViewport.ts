'use client';
import { useCallback } from 'react';
import { useQueryStates, parseAsFloat, parseAsBoolean, parseAsArrayOf } from 'nuqs';
import type { Bbox } from '../../../lib/listings/filters';

const parsers = {
  bbox: parseAsArrayOf(parseAsFloat),   // null until set; 4 floats [w,s,e,n]
  lock: parseAsBoolean.withDefault(false)
};

export function useViewport() {
  const [state, setState] = useQueryStates(parsers, {
    history: 'replace',
    clearOnDefault: true
  });

  const bbox: Bbox | null =
    state.bbox && state.bbox.length === 4
      ? (state.bbox as Bbox)
      : null;

  const setBbox = useCallback(
    (b: Bbox | null) => {
      setState({ bbox: b ? Array.from(b) : null });
    },
    [setState]
  );

  const setLock = useCallback(
    (lock: boolean) => {
      setState({ lock });
    },
    [setState]
  );

  return { bbox, lock: state.lock, setBbox, setLock };
}
