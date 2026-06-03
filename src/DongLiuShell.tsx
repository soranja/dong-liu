import { useRef } from "react";
import audioSrc from "./audio/pisse_fahrradsattel.mp3";
import { AppHeader } from "./components/AppHeader";
import { PageTimeline } from "./components/PageTimeline";
import { PlaybackDock } from "./components/PlaybackDock";
import { PlaybackProgressMeter } from "./components/PlaybackProgressMeter";
import { useLayoutHeights } from "./hooks/useLayoutHeights";
import { usePlaybackController } from "./hooks/usePlaybackController";

export const DongLiuShell = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const playbackRef = useRef<HTMLElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const playback = usePlaybackController({ audioRef, canvasRef, playbackRef, timelineRef });
  const layoutHeights = useLayoutHeights({
    hasStarted: playback.hasStarted,
    headerRef,
    playbackRef,
    replayPromptVisible: playback.replayPromptVisible,
  });

  return (
    <>
      <main
        className="min-h-screen bg-(--color-bg) text-(--color-panel)"
        style={{ paddingBottom: layoutHeights.playback, paddingTop: layoutHeights.header }}
      >
        <audio
          ref={audioRef}
          src={audioSrc}
          preload="auto"
          onDurationChange={(event) => playback.setDuration(event.currentTarget.duration)}
          onEnded={playback.handleEnded}
          onTimeUpdate={playback.handleTimeUpdate}
        />

        <AppHeader headerRef={headerRef} />
        <PlaybackProgressMeter
          isVisible={playback.hasStarted && !playback.replayPromptVisible}
          progress={playback.progress}
        />
        <PageTimeline
          hasStarted={playback.hasStarted}
          onReplay={(autoplay) => void playback.replayFromStart(autoplay)}
          replayPromptVisible={playback.replayPromptVisible}
          replaySequence={playback.replaySequence}
          sectionHeight={layoutHeights.section}
          timelineRef={timelineRef}
        />
      </main>

      <PlaybackDock
        canvasRef={canvasRef}
        duration={playback.duration}
        isPlaying={playback.isPlaying}
        onSeek={playback.seek}
        onTogglePlayback={() => void playback.togglePlayback()}
        onVolumeChange={playback.setVolume}
        playbackRef={playbackRef}
        progress={playback.progress}
        volume={playback.volume}
      />
    </>
  );
};
