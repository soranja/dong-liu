import type { CSSProperties, ReactNode, RefObject } from "react";
import { useGeneralTimeline } from "../hooks/useGeneralTimeline";
import { RAM_BOX_LYRICS } from "../lyrics/ram-box-lyrics";
import type { LyricsIllustration, LyricsMedia, LyricsSection } from "../lyrics/types";
import { getActiveLyricsSectionIndex } from "../utils/lyrics";

type GeneralTimelineProps = {
  audioRef: RefObject<HTMLAudioElement | null>;
  currentTime: number;
  duration: number;
  footerHeight: number;
  hasStarted: boolean;
  headerHeight: number;
  replayPromptVisible: boolean;
  replaySequence: number | null;
  sectionHeight: number;
  timelineRef: RefObject<HTMLDivElement | null>;
  onReplay: (autoplay: boolean) => void;
};

type SectionProps = {
  contentRefs: RefObject<Array<HTMLDivElement | null>>;
  index: number;
  isOverlay?: boolean;
  section: LyricsSection;
  slideRefs: RefObject<Array<HTMLElement | null>>;
};

const FLOW_SECTIONS = RAM_BOX_LYRICS.filter((section) => !section.isOverlay);
const OVERLAY_SECTIONS = RAM_BOX_LYRICS.map((section, index) => ({ index, section })).filter(
  ({ section }) => section.isOverlay,
);
const HORIZONTAL_TRAVEL_VW = Math.max(0, FLOW_SECTIONS.length - 1) * 90;
const VERTICAL_TRAVEL_VH = Math.max(0, FLOW_SECTIONS.length - 1) * 50;

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

const Section = ({ contentRefs, index, isOverlay = false, section, slideRefs }: SectionProps) => {
  const isText = typeof section.illustrateWith === "string";
  const inactiveOpacityClass = isOverlay
    ? "opacity-0 group-data-[active=true]:opacity-100"
    : "opacity-[0.22] group-data-[active=true]:opacity-100";
  const contentClassName = isText
    ? `inline-block whitespace-nowrap font-bold leading-[1.15] tracking-normal text-(--color-text) transition-opacity duration-150 [font-family:var(--font-unbounded)] ${inactiveOpacityClass}`
    : `flex h-full w-full items-center justify-center overflow-hidden py-6 transition-opacity duration-150 ${inactiveOpacityClass}`;

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
        ref={(content) => {
          contentRefs.current[index] = content;
        }}
        className={contentClassName}
        data-size-level={section.sizeLevel}
        data-timeline-content
        style={isText ? { fontSize: 48 } : undefined}
      >
        {renderIllustration(section.illustrateWith)}
      </div>
    </section>
  );
};

export const GeneralTimeline = (props: GeneralTimelineProps) => {
  const {
    audioRef,
    currentTime,
    duration,
    footerHeight,
    hasStarted,
    headerHeight,
    onReplay,
    replayPromptVisible,
    replaySequence,
    sectionHeight,
    timelineRef,
  } = props;
  const isVisible = hasStarted && !replayPromptVisible;
  const { contentRefs, slideRefs, trackRef, viewportRef } = useGeneralTimeline({
    audioRef,
    currentTime,
    duration,
    isVisible,
  });
  const activeSection = RAM_BOX_LYRICS[getActiveLyricsSectionIndex(currentTime)];

  return (
    <div
      ref={timelineRef}
      className="general-timeline-spacer relative"
      data-audio-timeline
      style={
        {
          "--timeline-horizontal-travel": `${HORIZONTAL_TRAVEL_VW}vw`,
          "--timeline-section-height": `${sectionHeight}px`,
          "--timeline-vertical-travel": `${VERTICAL_TRAVEL_VH}vh`,
        } as CSSProperties
      }
    >
      <div
        ref={viewportRef}
        aria-hidden={!isVisible}
        className="pointer-events-none fixed inset-x-0 z-10 overflow-hidden"
        data-general-timeline
        style={{ bottom: footerHeight, opacity: isVisible ? 1 : 0, top: headerHeight }}
      >
        <span className="sr-only" aria-live="polite">
          {isVisible ? activeSection.line : ""}
        </span>

        <div
          ref={trackRef}
          aria-hidden="true"
          className="general-timeline-track flex h-full w-max will-change-transform max-sm:h-max max-sm:w-full max-sm:flex-col"
        >
          {RAM_BOX_LYRICS.map((section, index) =>
            section.isOverlay ? null : (
              <Section
                key={section.sectionId}
                contentRefs={contentRefs}
                index={index}
                section={section}
                slideRefs={slideRefs}
              />
            ),
          )}
        </div>

        {OVERLAY_SECTIONS.map(({ index, section }) => (
          <Section
            key={section.sectionId}
            contentRefs={contentRefs}
            index={index}
            isOverlay
            section={section}
            slideRefs={slideRefs}
          />
        ))}
      </div>

      {!hasStarted ? (
        <div
          className="pointer-events-none fixed inset-x-0 z-10 flex items-center justify-center px-6 text-center"
          style={{ bottom: footerHeight, top: headerHeight }}
        >
          <div className="max-w-lg p-6 text-(--color-text)">
            <p className="font-mono text-xs uppercase text-(--color-text-muted)">Timeline locked</p>
            <h2 className="mt-3 font-mono text-3xl font-bold uppercase leading-tight">Press play to start</h2>
          </div>
        </div>
      ) : null}

      {replayPromptVisible && replaySequence !== null ? (
        <div
          className="fixed inset-x-0 z-10 flex items-center justify-center px-6 text-center"
          style={{ bottom: footerHeight, top: headerHeight }}
        >
          <div className="max-w-md p-6 text-(--color-text)">
            <p className="font-mono text-xs uppercase text-(--color-text-muted)">
              {replaySequence > 0 ? `Replay prompt in ${replaySequence}` : "Timeline complete"}
            </p>
            {replaySequence === 0 ? (
              <>
                <h2 className="mt-3 font-mono text-2xl font-bold uppercase">Play again?</h2>
                <div className="mt-5 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => onReplay(true)}
                    className="h-11 border border-(--color-control) bg-(--color-control) px-6 font-mono text-sm font-bold uppercase text-(--color-panel) transition hover:bg-(--color-control-hover)"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => onReplay(false)}
                    className="h-11 border border-(--color-border-strong) bg-(--color-panel-raised) px-6 font-mono text-sm font-bold uppercase text-(--color-text) transition hover:bg-(--color-panel-hover)"
                  >
                    No
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};
