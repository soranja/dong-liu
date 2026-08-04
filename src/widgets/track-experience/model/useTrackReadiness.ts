import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LyricsSection } from '@entities/track/model/types';
import { TIMELINE_WINDOW_SIZE } from './timelineWindow';

const AUDIO_PROGRESS_WEIGHT = 10;
const CLOUD_PROGRESS_WEIGHT = 35;
const FONT_PROGRESS_WEIGHT = 5;
const PREWARM_PROGRESS_WEIGHT = 50;

export function useTrackReadiness(lyrics: readonly LyricsSection[]) {
  const readyCloudIdsRef = useRef(new Set<number>());
  const [audioReady, setAudioReady] = useState(false);
  const [fontReady, setFontReady] = useState(false);
  const [prewarmProgress, setPrewarmProgress] = useState(0);
  const [readyCloudCount, setReadyCloudCount] = useState(0);
  const [timelinePrepared, setTimelinePrepared] = useState(false);
  const wordCloudCount = useMemo(
    () =>
      lyrics
        .slice(0, TIMELINE_WINDOW_SIZE)
        .filter((section, index) => typeof section.illustrateWith === 'string' && !lyrics[index - 1]?.continuing)
        .length,
    [lyrics],
  );
  const cloudLayoutsReady = readyCloudCount >= wordCloudCount;
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
    setReadyCloudCount(readyCloudIdsRef.current.size);
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
