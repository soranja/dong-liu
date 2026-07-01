import { memo, useEffect, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { DEFAULT_SECTION_WIDTH_PERCENT } from "../../../entities/track/model/layout";
import { resolveIllustrationKind, type TrackTuningAdapter } from "../../../entities/track/model/tuning";
import type {
  CustomIllustrationRenderer,
  LyricsIllustration,
  LyricsSection,
} from "../../../entities/track/model/types";
import { TextIllustration } from "../../../shared/ui/illustration-animations/TextIllustration";

type GeneralTimelineSectionProps = {
  index: number;
  isOverlay?: boolean;
  lyrics: readonly LyricsSection[];
  onWordCloudReady: (sectionId: number) => void;
  renderCustomIllustration: CustomIllustrationRenderer<unknown>;
  section: LyricsSection;
  sectionWidthPercent?: number;
  slideRefs: RefObject<Array<HTMLElement | null>>;
  tuningAdapter?: TrackTuningAdapter;
};

type StructuredLyricsIllustration = Exclude<LyricsIllustration, string>;

function isStructuredIllustration(illustration: LyricsIllustration): illustration is StructuredLyricsIllustration {
  return typeof illustration === "object" && illustration !== null && "mediaType" in illustration;
}

function renderIllustration(
  illustration: LyricsIllustration,
  renderCustomIllustration: CustomIllustrationRenderer<unknown>,
): ReactNode {
  if (!isStructuredIllustration(illustration)) return null;

  if (illustration.mediaType === "custom") {
    return renderCustomIllustration(illustration.descriptor);
  }

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
    lyrics,
    onWordCloudReady,
    renderCustomIllustration,
    section,
    sectionWidthPercent = DEFAULT_SECTION_WIDTH_PERCENT,
    slideRefs,
    tuningAdapter,
  }: GeneralTimelineSectionProps) => {
    const text = typeof section.illustrateWith === "string" ? section.illustrateWith : null;
    const isText = text !== null;
    const isFullBleed = Boolean(section.fullBleedIllustration);
    const [illustrationKind, setIllustrationKind] = useState(() =>
      resolveIllustrationKind(lyrics, section, tuningAdapter),
    );
    const contentClassName = isFullBleed
      ? "h-full w-full overflow-hidden"
      : isText
        ? "h-full w-full overflow-hidden [font-family:var(--font-unbounded)]"
        : "flex h-full w-full items-center justify-center overflow-hidden py-6 transition-opacity duration-150";

    useEffect(
      () =>
        tuningAdapter?.subscribe(() => {
          setIllustrationKind(resolveIllustrationKind(lyrics, section, tuningAdapter));
        }),
      [lyrics, section, tuningAdapter],
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
          data-illustration-kind={illustrationKind}
          data-size-level={section.sizeLevel}
          data-timeline-content
        >
          {illustrationKind !== "generic" && isText ? (
            <TextIllustration
              kind={illustrationKind}
              onReady={onWordCloudReady}
              sectionId={section.sectionId}
              text={text}
            />
          ) : (
            renderIllustration(section.illustrateWith, renderCustomIllustration)
          )}
        </div>
      </section>
    );
  },
);
