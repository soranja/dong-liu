import type { CSSProperties } from "react";

type PlaybackIconName = "mute" | "pause" | "play" | "volume";

const playbackIconSources: Record<PlaybackIconName, string> = {
  mute: "/icons/mute.svg",
  pause: "/icons/pause.svg",
  play: "/icons/play.svg",
  volume: "/icons/volume.svg",
};

type PlaybackIconsProps = {
  className?: string;
  icon: PlaybackIconName;
};

export const PlaybackIcons = ({ className = "h-8 w-8 text-(--color-accent)", icon }: PlaybackIconsProps) => {
  const iconUrl = playbackIconSources[icon];
  const maskStyle = {
    WebkitMaskImage: `url("${iconUrl}")`,
    WebkitMaskPosition: "center",
    WebkitMaskRepeat: "no-repeat",
    WebkitMaskSize: "contain",
    maskImage: `url("${iconUrl}")`,
    maskPosition: "center",
    maskRepeat: "no-repeat",
    maskSize: "contain",
  } satisfies CSSProperties;

  return <span aria-hidden="true" className={`inline-block shrink-0 bg-current ${className}`} style={maskStyle} />;
};
