import { memo, useEffect, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import type { LyricsIllustration, LyricsMedia, LyricsSection } from "../lyrics/types";
import { DEFAULT_SECTION_WIDTH_PERCENT } from "../utils/tuning/sectionLayout";
import {
  getEffectiveTimelineIllustrationKind,
  subscribeIllustrationKindTuning,
} from "../utils/tuning/illustrationKind";
import { isAnimationShell } from "./illustrations/AnimationShell";
import { KineticWarpTextAnimation } from "./illustrations/KineticWarpTextAnimation";
import { LyricsWordCloud } from "./illustrations/LyricsWordCloud";

type GeneralTimelineSectionProps = {
  index: number;
  isOverlay?: boolean;
  onWordCloudReady: (sectionId: number) => void;
  section: LyricsSection;
  sectionWidthPercent?: number;
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
  ({
    index,
    isOverlay = false,
    onWordCloudReady,
    section,
    sectionWidthPercent = DEFAULT_SECTION_WIDTH_PERCENT,
    slideRefs,
  }: GeneralTimelineSectionProps) => {
    const text = typeof section.illustrateWith === "string" ? section.illustrateWith : null;
    const isText = text !== null;
    const hasAnimationShell = isAnimationShell(section.illustrateWith);
    const isFullBleed = hasAnimationShell || Boolean(section.fullBleedIllustration);
    const [illustrationKind, setIllustrationKind] = useState(() => getEffectiveTimelineIllustrationKind(section));
    const contentClassName = isFullBleed
      ? "h-full w-full overflow-hidden"
      : isText
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
          isFullBleed && isOverlay
            ? "group absolute inset-0 z-10 h-full w-full"
            : isOverlay
              ? "group absolute inset-0 z-10 flex h-full w-full items-center justify-center px-2 text-center"
              : "group relative flex h-full w-(--timeline-section-width) shrink-0 items-center justify-center text-center max-sm:h-(--timeline-mobile-slide-height) max-sm:w-full"
        }
        aria-hidden="true"
        data-active="false"
        data-overlay={isOverlay ? "true" : undefined}
        data-section-id={section.sectionId}
        data-timeline-section
        data-timestamp={section.timestamp}
        style={
          isOverlay
            ? undefined
            : ({
                "--timeline-section-width": `${sectionWidthPercent}vw`,
              } as CSSProperties)
        }
      >
        <div
          className={contentClassName}
          data-animation-shell={hasAnimationShell ? "true" : undefined}
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
