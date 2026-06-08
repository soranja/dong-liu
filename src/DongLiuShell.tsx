import { useRef } from "react";
import audioSrc from "./audio/ram_box.mp3";
import { CaptionsFooter } from "./components/CaptionsFooter";
import { PageTimeline } from "./components/PageTimeline";
import { PlaybackHeader } from "./components/playback/PlaybackHeader";
import { ShapeTimeline } from "./components/ShapeTimeline";
import { useLayoutHeights } from "./hooks/useLayoutHeights";
import { usePlaybackController } from "./hooks/usePlaybackController";

export const DongLiuShell = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const playback = usePlaybackController({ audioRef, canvasRef, playbackRef: headerRef, timelineRef });
  const layoutHeights = useLayoutHeights({
    footerRef,
    hasStarted: playback.hasStarted,
    headerRef,
    replayPromptVisible: playback.replayPromptVisible,
  });

  return (
    <main
      className="min-h-screen bg-(--color-bg) text-(--color-panel)"
      style={{ paddingBottom: layoutHeights.footer, paddingTop: layoutHeights.header }}
    >
      <audio
        ref={audioRef}
        src={audioSrc}
        preload="auto"
        onDurationChange={(event) => playback.setDuration(event.currentTarget.duration)}
        onEnded={playback.handleEnded}
        onTimeUpdate={playback.handleTimeUpdate}
      />

      <PlaybackHeader
        canvasRef={canvasRef}
        duration={playback.duration}
        headerRef={headerRef}
        isPlaying={playback.isPlaying}
        onSeek={playback.seek}
        onTogglePlayback={() => void playback.togglePlayback()}
        onVolumeChange={playback.setVolume}
        progress={playback.progress}
        volume={playback.volume}
      />
      <ShapeTimeline
        currentTime={playback.currentTime}
        isVisible={playback.hasStarted && !playback.replayPromptVisible}
      />
      <CaptionsFooter
        currentTime={playback.currentTime}
        footerRef={footerRef}
        isVisible={playback.hasStarted && !playback.replayPromptVisible}
      />
      <PageTimeline
        footerHeight={layoutHeights.footer}
        hasStarted={playback.hasStarted}
        headerHeight={layoutHeights.header}
        onReplay={(autoplay) => void playback.replayFromStart(autoplay)}
        replayPromptVisible={playback.replayPromptVisible}
        replaySequence={playback.replaySequence}
        sectionHeight={layoutHeights.section}
        timelineRef={timelineRef}
      />
    </main>
  );
};
