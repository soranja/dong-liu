import { useEffect, useState } from "react";

export function useReplayCountdown(isVisible: boolean) {
  const REPLAY_PROMPT_DELAY_MS = 1000;
  // Controls how long the final replay choice waits before showing actions.
  const REPLAY_SEQUENCE_SECONDS = 3;
  const [replaySequence, setReplaySequence] = useState<number | null>(null);

  useEffect(() => {
    if (!isVisible) {
      setReplaySequence(null);
      return;
    }

    setReplaySequence(null);
    let interval = 0;
    const delay = window.setTimeout(() => {
      setReplaySequence(REPLAY_SEQUENCE_SECONDS);
      interval = window.setInterval(() => {
        setReplaySequence((current) => (current === null ? current : Math.max(0, current - 1)));
      }, 1000);
    }, REPLAY_PROMPT_DELAY_MS);

    return () => {
      window.clearTimeout(delay);
      window.clearInterval(interval);
    };
  }, [isVisible]);

  return replaySequence;
}
