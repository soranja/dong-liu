import { memo, useEffect, useState, type ReactNode, type RefObject } from "react";
import type { LyricsIllustration, LyricsMedia, LyricsSection } from "../lyrics/types";
import {
  getEffectiveTimelineIllustrationKind,
  subscribeIllustrationKindTuning,
} from "../utils/tuning/illustrationKind";
import { KineticWarpTextAnimation } from "./illustrations/KineticWarpTextAnimation";
import { LyricsWordCloud } from "./illustrations/LyricsWordCloud";

type GeneralTimelineSectionProps = {
  index: number;
  isOverlay?: boolean;
  onWordCloudReady: (sectionId: number) => void;
  section: LyricsSection;
  slideRefs: RefObject<Array<HTMLElement | null>>;
};

function isLyricsMedia(illustration: LyricsIllustration): illustration is LyricsMedia {
  return typeof illustration === "object" && illustration !== null && "mediaType" in illustration;
}

function renderIllustration(illustration: LyricsIllustration): ReactNode {
  if (!isLyricsMedia(illustration)) return illustration;

  if (illustration.mediaType === "image") {
    return <img alt={illustration.alt} className="max-h-full max-w-full object-contain" src={illustration.src} />;
  }

  return (
    <video
      autoPlay
      className="max-h-full max-w-full object-contain"
      loop
      muted
      playsInline
      poster={illustration.poster}
      src={illustration.src}
    />
  );
}

export const GeneralTimelineSection = memo(
  ({ index, isOverlay = false, onWordCloudReady, section, slideRefs }: GeneralTimelineSectionProps) => {
    const text = typeof section.illustrateWith === "string" ? section.illustrateWith : null;
    const isText = text !== null;
    const [illustrationKind, setIllustrationKind] = useState(() => getEffectiveTimelineIllustrationKind(section));
    const contentClassName = isText
      ? "h-full w-full overflow-hidden [font-family:var(--font-unbounded)]"
      : "flex h-full w-full items-center justify-center overflow-hidden py-6 transition-opacity duration-150";

    useEffect(
      () =>
        subscribeIllustrationKindTuning(() => {
          setIllustrationKind(getEffectiveTimelineIllustrationKind(section));
        }),
      [section],
    );

    return (
      <section
        ref={(slide) => {
          slideRefs.current[index] = slide;
        }}
        className={
          isOverlay
            ? "group absolute inset-0 z-10 flex h-full w-full items-center justify-center px-2 text-center sm:px-6"
            : "group relative flex h-full w-[90vw] shrink-0 items-center justify-center border-r-[50px] border-(--color-border) px-2 text-center max-sm:h-(--timeline-mobile-slide-height) max-sm:w-full max-sm:border-r-0 max-sm:border-b-[50px] sm:px-6"
        }
        aria-hidden="true"
        data-active="false"
        data-overlay={isOverlay ? "true" : undefined}
        data-section-id={section.sectionId}
        data-timeline-section
        data-timestamp={section.timestamp}
      >
        <div
          className={contentClassName}
          data-illustration-kind={illustrationKind}
          data-size-level={section.sizeLevel}
          data-timeline-content
        >
          {illustrationKind === "kinetic-warp" && isText ? (
            <KineticWarpTextAnimation onReady={onWordCloudReady} sectionId={section.sectionId} text={text} />
          ) : isText ? (
            <LyricsWordCloud onReady={onWordCloudReady} sectionId={section.sectionId} text={text} />
          ) : (
            renderIllustration(section.illustrateWith)
          )}
        </div>
      </section>
    );
  },
);
