import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { CaptionsFooter } from "./CaptionsFooter";
import { ExperienceLoadingScreen } from "./ExperienceLoadingScreen";
import { GeneralTimeline } from "./GeneralTimeline";
import { PlaybackHeader } from "./playback/PlaybackHeader";

import type { TrackTuningAdapter } from "@entities/track/model/tuning";
import type { CustomIllustrationRenderer, LyricsSection } from "@entities/track/model/types";
import { useLayoutHeights } from "../model/useLayoutHeights";
import { usePlaybackController } from "../model/usePlaybackController";
import { usePreloadedAudio } from "../model/usePreloadedAudio";

const AUDIO_PROGRESS_WEIGHT = 10;
const CLOUD_PROGRESS_WEIGHT = 35;
const FONT_PROGRESS_WEIGHT = 5;
const PREWARM_PROGRESS_WEIGHT = 50;
export type TrackExperienceProps<TCustomIllustration> = {
  audioSrc: string;
  headerTrailingContent?: ReactNode;
  lyrics: readonly LyricsSection<TCustomIllustration>[];
  renderCustomIllustration: CustomIllustrationRenderer<TCustomIllustration>;
  trackId: string;
  tuningAdapter?: TrackTuningAdapter;
};

export const TrackExperience = <TCustomIllustration,>({
  audioSrc,
  headerTrailingContent,
  lyrics,
  renderCustomIllustration,
  trackId,
  tuningAdapter,
}: TrackExperienceProps<TCustomIllustration>) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const readyCloudIdsRef = useRef(new Set<number>());
  const readyCloudUpdateFrameRef = useRef<number | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const wordCloudCount = useMemo(
    () =>
      lyrics.filter((section, index) => typeof section.illustrateWith === "string" && !lyrics[index - 1]?.continuing)
        .length,
    [lyrics],
  );
  const preloadedAudioSrc = usePreloadedAudio(audioSrc);
  const [audioReady, setAudioReady] = useState(false);
  const [fontReady, setFontReady] = useState(false);
  const [prewarmProgress, setPrewarmProgress] = useState(0);
  const [readyCloudCount, setReadyCloudCount] = useState(0);
  const [timelinePrepared, setTimelinePrepared] = useState(false);
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
  const playback = usePlaybackController({
    audioRef,
    canvasRef,
    isReady,
    playbackRef: headerRef,
    timelineRef,
  });
  const togglePlaybackRef = useRef(playback.togglePlayback);
  togglePlaybackRef.current = playback.togglePlayback;
  const handleTogglePlayback = useCallback(() => {
    void togglePlaybackRef.current();
  }, []);
  const layoutHeights = useLayoutHeights({
    footerRef,
    hasStarted: playback.hasStarted,
    headerRef,
    replayPromptVisible: playback.replayPromptVisible,
  });

  const handleWordCloudReady = useCallback((sectionId: number) => {
    if (readyCloudIdsRef.current.has(sectionId)) return;

    readyCloudIdsRef.current.add(sectionId);
    readyCloudUpdateFrameRef.current ??= window.requestAnimationFrame(() => {
      readyCloudUpdateFrameRef.current = null;
      setReadyCloudCount(readyCloudIdsRef.current.size);
    });
  }, []);

  const handlePrewarmProgress = useCallback((progress: number) => {
    setPrewarmProgress(progress);
  }, []);

  const handleTimelinePrepared = useCallback(() => {
    setPrewarmProgress(1);
    setTimelinePrepared(true);
  }, []);
  const renderIllustration = useCallback(
    (descriptor: unknown) => renderCustomIllustration(descriptor as TCustomIllustration),
    [renderCustomIllustration],
  );

  useEffect(() => {
    let disposed = false;

    void document.fonts.ready.then(() => {
      if (!disposed) setFontReady(true);
    });

    return () => {
      disposed = true;
      if (readyCloudUpdateFrameRef.current !== null) {
        window.cancelAnimationFrame(readyCloudUpdateFrameRef.current);
        readyCloudUpdateFrameRef.current = null;
      }
    };
  }, []);

  return (
    <main
      aria-busy={!isReady}
      className="relative isolate min-h-screen overflow-x-clip bg-(--color-bg) text-(--color-panel)"
      data-track-id={trackId}
      style={{ paddingBottom: layoutHeights.footer, paddingTop: layoutHeights.header }}
    >
      <audio
        ref={audioRef}
        src={preloadedAudioSrc}
        preload="auto"
        onCanPlay={() => setAudioReady(true)}
        onDurationChange={(event) => playback.setDuration(event.currentTarget.duration)}
        onEnded={playback.handleEnded}
        onTimeUpdate={playback.handleTimeUpdate}
      />

      <PlaybackHeader
        canvasRef={canvasRef}
        duration={playback.duration}
        trailingContent={headerTrailingContent}
        headerRef={headerRef}
        isPlaying={playback.isPlaying}
        isReady={isReady}
        onSeek={playback.scrub}
        onTogglePlayback={handleTogglePlayback}
        onVolumeChange={playback.setVolume}
        progress={playback.progress}
        volume={playback.volume}
      />

      <CaptionsFooter
        currentTime={playback.currentTime}
        footerRef={footerRef}
        isVisible={playback.hasStarted && !playback.replayPromptVisible}
        lyrics={lyrics}
        tuningAdapter={tuningAdapter}
      />

      <Suspense fallback={null}>
        <GeneralTimeline
          audioRef={audioRef}
          duration={playback.duration}
          footerHeight={layoutHeights.footer}
          hasStarted={playback.hasStarted}
          headerHeight={layoutHeights.header}
          lyrics={lyrics}
          onPrewarmProgress={handlePrewarmProgress}
          onReplay={(autoplay) => void playback.replayFromStart(autoplay)}
          onStart={handleTogglePlayback}
          onTimelinePrepared={handleTimelinePrepared}
          onWordCloudReady={handleWordCloudReady}
          renderCustomIllustration={renderIllustration}
          replayPromptVisible={playback.replayPromptVisible}
          replaySequence={playback.replaySequence}
          sectionHeight={layoutHeights.section}
          shouldPrewarm={shouldPrewarm}
          timelineRef={timelineRef}
          tuningAdapter={tuningAdapter}
        />
      </Suspense>

      {!isReady ? <ExperienceLoadingScreen progress={loadingProgress} /> : null}
      {tuningAdapter?.renderPanel?.({
        duration: playback.duration,
        isLoading: !isReady,
        isPlaying: playback.isPlaying,
        onSeek: (progress) => playback.seek(progress, { animatePage: false, continuePlaybackScroll: false }),
      })}
    </main>
  );
};
