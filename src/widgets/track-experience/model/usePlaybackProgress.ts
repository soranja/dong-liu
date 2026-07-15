import { useEffect, useRef, useState, type RefObject } from 'react';

const PLAYBACK_UI_UPDATE_INTERVAL_MS = 100;

export function usePlaybackProgress(audioRef: RefObject<HTMLAudioElement | null>) {
  const [currentTime, setCurrentTime] = useState(0);
  const [progress, setProgress] = useState(0);
  const frameRef = useRef<number | null>(null);
  const lastUpdateRef = useRef(0);

  function sync() {
    const audio = audioRef.current;
    if (!audio) return;

    setCurrentTime(audio.currentTime);
    if (audio.duration && Number.isFinite(audio.duration)) setProgress((audio.currentTime / audio.duration) * 100);
  }

  function scheduleFrame() {
    if (frameRef.current === null) frameRef.current = requestAnimationFrame(updateFrame);
  }

  function updateFrame(timestamp: number) {
    frameRef.current = null;
    if (timestamp - lastUpdateRef.current >= PLAYBACK_UI_UPDATE_INTERVAL_MS) {
      lastUpdateRef.current = timestamp;
      sync();
    }
    if (!audioRef.current?.paused) scheduleFrame();
  }

  function start() {
    sync();
    lastUpdateRef.current = performance.now();
    scheduleFrame();
  }

  function stop() {
    lastUpdateRef.current = 0;
    if (frameRef.current === null) return;

    cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }

  useEffect(() => stop, []);

  return { currentTime, progress, setCurrentTime, setProgress, start, stop, sync };
}
