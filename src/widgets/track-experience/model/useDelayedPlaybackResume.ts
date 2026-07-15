import { useEffect, useRef } from 'react';
import { useSyncedRef } from './useSyncedRef';

export function useDelayedPlaybackResume(onResume: (sequence: number) => void) {
  const activeRef = useRef(false);
  const sequenceRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);
  const onResumeRef = useSyncedRef(onResume);

  function clear() {
    sequenceRef.current += 1;
    activeRef.current = false;
    if (timeoutRef.current === null) return;

    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }

  function schedule(delayMs: number) {
    clear();
    const sequence = ++sequenceRef.current;
    activeRef.current = true;
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      onResumeRef.current(sequence);
    }, delayMs);
  }

  useEffect(() => clear, []);

  return {
    clear,
    finish: (sequence: number) => {
      if (sequence === sequenceRef.current) activeRef.current = false;
    },
    isActive: () => activeRef.current,
    isCurrent: (sequence: number) => sequence === sequenceRef.current,
    schedule,
  };
}
