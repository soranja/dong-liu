import "../../styles/backgrounds/ambient.css";
import { getActiveLyricsSectionIndex } from "../../utils/lyrics";

type AmbientBackgroundProps = {
  currentTime: number;
  isPlaying: boolean;
};

const AMBIENT_PALETTE_COUNT = 4;

export const AmbientBackground = ({ currentTime, isPlaying }: AmbientBackgroundProps) => {
  const activeSectionIndex = getActiveLyricsSectionIndex(currentTime);

  return (
    <div
      aria-hidden="true"
      className="ambient-background"
      data-palette={activeSectionIndex % AMBIENT_PALETTE_COUNT}
      data-playing={isPlaying}
    >
      <div className="ambient-background__orb ambient-background__orb--one" />
      <div className="ambient-background__orb ambient-background__orb--two" />
      <div className="ambient-background__orb ambient-background__orb--three" />
      <div className="ambient-background__grain" />
    </div>
  );
};
