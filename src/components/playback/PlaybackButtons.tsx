import { PlaybackIcons } from "./PlaybackIcons";

interface PlaybackButtonProps {
  isPlaying: boolean;
  onTogglePlayback: () => void;
}

export const PlaybackButtons = ({ isPlaying, onTogglePlayback }: PlaybackButtonProps) => {
  return (
    <button
      type="button"
      aria-label={isPlaying ? "Pause" : "Play"}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onTogglePlayback}
      className="h-[72px] w-[72px] shrink-0 flex items-center justify-center bg-(--color-panel) transition hover:bg-(--color-control-hover)"
    >
      <PlaybackIcons icon={isPlaying ? "pause" : "play"} />
    </button>
  );
};
