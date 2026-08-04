import { Suspense, useCallback, useRef, type ReactNode } from "react";

import { CaptionsFooter } from "./CaptionsFooter";
import { ExperienceLoadingScreen } from "./ExperienceLoadingScreen";
import { GeneralTimeline } from "./GeneralTimeline";
import { PlaybackHeader } from "./playback/PlaybackHeader";

import type { TrackTuningAdapter } from "@entities/track/model/tuning";
import type { CustomIllustrationRenderer, LyricsSection } from "@entities/track/model/types";
import { useLayoutHeights } from "../model/useLayoutHeights";
import { usePlaybackController } from "../model/usePlaybackController";
import { usePreloadedAudio } from "../model/usePreloadedAudio";
import { useTrackReadiness } from "../model/useTrackReadiness";

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
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const preloadedAudioSrc = usePreloadedAudio(audioSrc);
  const readiness = useTrackReadiness(lyrics);
  const playback = usePlaybackController({
    audioRef,
    canvasRef,
    isReady: readiness.isReady,
    lyrics,
    playbackRef: headerRef,
    timelineRef,
    tuningAdapter,
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

  const renderIllustration = useCallback(
    (descriptor: unknown) => renderCustomIllustration(descriptor as TCustomIllustration),
    [renderCustomIllustration],
  );

  return (
    <main
      aria-busy={!readiness.isReady}
      className="relative isolate min-h-screen overflow-x-clip bg-dark-gray text-panel"
      data-track-id={trackId}
      style={{ paddingBottom: layoutHeights.footer, paddingTop: layoutHeights.header }}
    >
      <audio
        ref={audioRef}
        src={preloadedAudioSrc}
        preload="auto"
        onCanPlay={readiness.markAudioReady}
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
        isReady={readiness.isReady}
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
          onPrewarmProgress={readiness.handlePrewarmProgress}
          onReplay={(autoplay) => void playback.replayFromStart(autoplay)}
          onStart={handleTogglePlayback}
          onTimelinePrepared={readiness.handleTimelinePrepared}
          onWordCloudReady={readiness.handleWordCloudReady}
          renderCustomIllustration={renderIllustration}
          replayPromptVisible={playback.replayPromptVisible}
          replaySequence={playback.replaySequence}
          sectionHeight={layoutHeights.section}
          shouldPrewarm={readiness.shouldPrewarm}
          timelineRef={timelineRef}
          tuningAdapter={tuningAdapter}
        />
      </Suspense>

      {!readiness.isReady ? <ExperienceLoadingScreen progress={readiness.loadingProgress} /> : null}
      {tuningAdapter?.renderPanel?.({
        duration: playback.duration,
        isLoading: !readiness.isReady,
        isPlaying: playback.isPlaying,
        onSeek: (progress) => playback.seek(progress, { animatePage: false, continuePlaybackScroll: false }),
      })}
    </main>
  );
};
