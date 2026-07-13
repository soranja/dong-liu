import type { RamBoxIllustrationDescriptor } from "../model/types";

type RamBoxIllustrationProps = {
  descriptor: RamBoxIllustrationDescriptor;
};

export const RamBoxIllustration = ({ descriptor }: RamBoxIllustrationProps) => {
  const isLooping = descriptor.kind === "looping-video";

  return (
    <div className="h-full w-full overflow-hidden bg-(--color-bg)">
      <video
        className={`h-full w-full ${isLooping ? "object-fill" : "object-cover"}`}
        data-timeline-loop-start={isLooping ? descriptor.loopStartTimeSeconds : undefined}
        data-timeline-looping-video={isLooping ? "" : undefined}
        data-timeline-synced-video={isLooping ? undefined : ""}
        muted
        playsInline
        preload="auto"
        src={descriptor.src}
      />
    </div>
  );
};
