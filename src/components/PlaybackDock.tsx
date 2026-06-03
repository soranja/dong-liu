import type { RefObject } from "react";
import { formatTime } from "../utils/time";

type PlaybackDockProps = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  duration: number;
  isPlaying: boolean;
  playbackRef: RefObject<HTMLElement | null>;
  progress: number;
  volume: number;
  onSeek: (value: number) => void;
  onTogglePlayback: () => void;
  onVolumeChange: (value: number) => void;
};

export const PlaybackDock = (props: PlaybackDockProps) => {
  const { canvasRef, duration, isPlaying, onSeek, onTogglePlayback, onVolumeChange, playbackRef, progress, volume } = props;

  return (
    <footer
      ref={playbackRef}
      className="fixed inset-x-0 bottom-0 z-20 border-t border-(--color-border) bg-(--color-panel) p-4 text-(--color-text) sm:p-5"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-col gap-4 lg:w-[80%]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onTogglePlayback}
              className="grid h-11 w-28 shrink-0 place-items-center border border-(--color-control) bg-(--color-control) font-mono text-sm font-bold uppercase text-(--color-panel) transition hover:bg-(--color-control-hover)"
            >
              {isPlaying ? "Pause" : "Play"}
            </button>

            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="w-12 shrink-0 text-right font-mono text-xs text-(--color-text)">{formatTime((progress / 100) * duration)}</span>
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={(event) => onSeek(Number(event.target.value))}
                className="wave-slider min-w-0 flex-1"
                aria-label="Seek"
              />
              <span className="w-12 shrink-0 font-mono text-xs text-(--color-text-muted)">{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="w-28 shrink-0 font-mono text-xs uppercase text-(--color-text-muted)">Volume</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(event) => onVolumeChange(Number(event.target.value))}
              className="wave-slider min-w-0 flex-1"
              aria-label="Volume"
            />
          </div>
        </div>

        <div className="h-24 min-w-0 overflow-hidden border border-(--color-border) bg-(--color-bg) lg:w-[20%] lg:shrink-0">
          <canvas ref={canvasRef} className="h-full w-full" aria-label="Audio frequency waveform" />
        </div>
      </div>
    </footer>
  );
};
