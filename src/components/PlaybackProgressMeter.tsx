type PlaybackProgressMeterProps = {
  isVisible: boolean;
  progress: number;
};

export const PlaybackProgressMeter = ({ isVisible, progress }: PlaybackProgressMeterProps) => {
  const percent = Math.round(Math.min(100, Math.max(0, progress)));

  return (
    <div
      className="pointer-events-none fixed left-1/2 top-[47%] z-10 -translate-x-1/2 -translate-y-1/2 select-none font-mono text-[clamp(4rem,13vw,12rem)] font-bold leading-none text-(--color-progress-meter) mix-blend-difference transition-opacity duration-300"
      aria-hidden={!isVisible}
      style={{ opacity: isVisible ? 1 : 0 }}
    >
      {percent}%
    </div>
  );
};
