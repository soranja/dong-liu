import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LyricsSection } from '@entities/track/model/types';

const AUDIO_PROGRESS_WEIGHT = 10;
const CLOUD_PROGRESS_WEIGHT = 35;
const FONT_PROGRESS_WEIGHT = 5;
const PREWARM_PROGRESS_WEIGHT = 50;

export function useTrackReadiness(lyrics: readonly LyricsSection[]) {
  const readyCloudIdsRef = useRef(new Set<number>());
  const readyCloudUpdateFrameRef = useRef<number | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const [fontReady, setFontReady] = useState(false);
  const [prewarmProgress, setPrewarmProgress] = useState(0);
  const [readyCloudCount, setReadyCloudCount] = useState(0);
  const [timelinePrepared, setTimelinePrepared] = useState(false);
  const wordCloudCount = useMemo(
    () =>
      lyrics.filter((section, index) => typeof section.illustrateWith === 'string' && !lyrics[index - 1]?.continuing)
        .length,
    [lyrics],
  );
  const cloudLayoutsReady = readyCloudCount === wordCloudCount;
  const shouldPrewarm = audioReady && fontReady && cloudLayoutsReady && !timelinePrepared;
  const isReady = audioReady && fontReady && cloudLayoutsReady && timelinePrepared;
  const loadingProgress = Math.min(
    100,
    Math.round(
      (audioReady ? AUDIO_PROGRESS_WEIGHT : 0) +
        (fontReady ? FONT_PROGRESS_WEIGHT : 0) +
        (wordCloudCount ? readyCloudCount / wordCloudCount : 1) * CLOUD_PROGRESS_WEIGHT +
        prewarmProgress * PREWARM_PROGRESS_WEIGHT,
    ),
  );

  const handleWordCloudReady = useCallback((sectionId: number) => {
    if (readyCloudIdsRef.current.has(sectionId)) return;

    readyCloudIdsRef.current.add(sectionId);
    readyCloudUpdateFrameRef.current ??= window.requestAnimationFrame(() => {
      readyCloudUpdateFrameRef.current = null;
      setReadyCloudCount(readyCloudIdsRef.current.size);
    });
  }, []);

  const handleTimelinePrepared = useCallback(() => {
    setPrewarmProgress(1);
    setTimelinePrepared(true);
  }, []);

  useEffect(() => {
    let disposed = false;
    void document.fonts.ready.then(() => {
      if (!disposed) setFontReady(true);
    });

    return () => {
      disposed = true;
      if (readyCloudUpdateFrameRef.current !== null) cancelAnimationFrame(readyCloudUpdateFrameRef.current);
    };
  }, []);

  return {
    handlePrewarmProgress: setPrewarmProgress,
    handleTimelinePrepared,
    handleWordCloudReady,
    isReady,
    loadingProgress,
    markAudioReady: () => setAudioReady(true),
    shouldPrewarm,
  };
}
