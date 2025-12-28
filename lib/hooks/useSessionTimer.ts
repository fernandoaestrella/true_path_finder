'use client';

import { useTimer } from '../contexts/TimerContext';

/**
 * Hook to manage the 21-minute daily session timer
 * Now uses TimerContext to ensure global persistence across navigations.
 */
export function useSessionTimer() {
  return useTimer();
}

