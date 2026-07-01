import { PlaybackIcons } from "./PlaybackIcons";

interface PlaybackButtonProps {
  isPlaying: boolean;
  isReady: boolean;
  onTogglePlayback: () => void;
}

export const PlaybackButtons = ({ isPlaying, isReady, onTogglePlayback }: PlaybackButtonProps) => {
  return (
    <button
      type="button"
      aria-label={isPlaying ? "Pause" : "Play"}
      disabled={!isReady}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onTogglePlayback}
      className="h-[72px] w-[72px] shrink-0 flex items-center justify-center bg-(--color-panel) transition hover:bg-(--color-control-hover) disabled:cursor-wait disabled:opacity-50"
    >
      <PlaybackIcons icon={isPlaying ? "pause" : "play"} />
    </button>
  );
};
