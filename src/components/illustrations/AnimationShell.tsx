import { isValidElement } from "react";

type AnimationShellProps = {
  src: string;
};

export const AnimationShell = ({ src }: AnimationShellProps) => (
  <div className="h-full w-full overflow-hidden bg-(--color-bg)">
    <video
      className="h-full w-full object-cover"
      data-timeline-synced-video
      muted
      playsInline
      preload="auto"
      src={src}
    />
  </div>
);

export function isAnimationShell(illustration: unknown) {
  return isValidElement(illustration) && illustration.type === AnimationShell;
}
