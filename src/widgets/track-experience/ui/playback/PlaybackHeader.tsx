import { useEffect, useRef } from "react";
import type { CSSProperties, ReactNode, RefObject } from "react";
import { blurControl, formatTime } from "@shared/lib/playback";
import { PlaybackButtons } from "./PlaybackButtons";
import { PlaybackIcons } from "./PlaybackIcons";

type PlaybackHeaderProps = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  duration: number;
  headerRef: RefObject<HTMLElement | null>;
  isPlaying: boolean;
  isReady: boolean;
  progress: number;
  trailingContent?: ReactNode;
  volume: number;
  onSeek: (value: number) => void;
  onTogglePlayback: () => void;
  onVolumeChange: (value: number) => void;
};

function getSliderStyle(value: number): CSSProperties {
  return { "--slider-progress": `${value}%` } as CSSProperties;
}

export const PlaybackHeader = (props: PlaybackHeaderProps) => {
  const {
    canvasRef,
    duration,
    headerRef,
    isPlaying,
    isReady,
    onSeek,
    onTogglePlayback,
    onVolumeChange,
    progress,
    trailingContent,
    volume,
  } = props;
  const volumeBeforeMuteRef = useRef(volume > 0 ? volume : 0.5);

  useEffect(() => {
    if (volume > 0) volumeBeforeMuteRef.current = volume;
  }, [volume]);

  const handleToggleVolume = () => {
    if (volume > 0) {
      volumeBeforeMuteRef.current = volume;
      onVolumeChange(0);
      return;
    }

    onVolumeChange(volumeBeforeMuteRef.current);
  };

  return (
    <header
      ref={headerRef}
      className="fixed inset-x-0 top-0 z-20 flex h-16 items-center bg-(--color-bg) text-(--color-text) pr-10 lg:pr-0 shadow-2xl"
    >
      <div className="flex h-full w-full max-w-7xl items-center gap-10 mx-auto">
        <PlaybackButtons isPlaying={isPlaying} isReady={isReady} onTogglePlayback={onTogglePlayback} />

        <div className="w-full flex items-center gap-8 text-[12px] text-(--color-text-muted) font-mono">
          <div className="flex w-full items-center gap-2">
            <span>{formatTime((progress / 100) * duration)}</span>

            <input
              type="range"
              min="0"
              max="100"
              step="any"
              value={progress}
              disabled={!isReady}
              style={getSliderStyle(progress)}
              onChange={(event) => onSeek(Number(event.target.value))}
              onPointerUp={(event) => blurControl(event.currentTarget)}
              className="wave-slider w-full"
            />
            <span>{formatTime(duration)}</span>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <button
              type="button"
              aria-label={volume === 0 ? "Restore volume" : "Mute"}
              disabled={!isReady}
              onMouseDown={(event) => event.preventDefault()}
              onClick={handleToggleVolume}
              className="flex h-7 w-7 shrink-0 items-center justify-center text-(--color-text-muted) transition hover:text-(--color-accent)"
            >
              <PlaybackIcons icon={volume === 0 ? "mute" : "volume"} className="h-5 w-5" />
            </button>
            <input
              aria-label="Volume"
              data-scroll-seek-ignore="true"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              disabled={!isReady}
              style={getSliderStyle(volume * 100)}
              onChange={(event) => onVolumeChange(Number(event.target.value))}
              onPointerUp={(event) => blurControl(event.currentTarget)}
              className="wave-slider"
            />
          </div>
        </div>

        <div className="hidden h-full w-54 shrink-0 overflow-hidden bg-(--color-panel) lg:block">
          <canvas ref={canvasRef} className="h-full w-full" />
        </div>

        {trailingContent}
      </div>
    </header>
  );
};
