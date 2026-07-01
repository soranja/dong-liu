import type { RamBoxIllustrationDescriptor } from "../model/types";

type RamBoxIllustrationProps = {
  descriptor: RamBoxIllustrationDescriptor;
};

export const RamBoxIllustration = ({ descriptor }: RamBoxIllustrationProps) => (
  <div className="h-full w-full overflow-hidden bg-(--color-bg)">
    <video
      className="h-full w-full object-cover"
      data-timeline-synced-video
      muted
      playsInline
      preload="auto"
      src={descriptor.src}
    />
  </div>
);
