import { memo, type CSSProperties, type RefObject } from "react";
import { useGeneralTimeline } from "../hooks/useGeneralTimeline";
import { RAM_BOX_LYRICS } from "../lyrics/ram-box-lyrics";
import { GeneralTimelineSection } from "./GeneralTimelineSection";

type GeneralTimelineProps = {
  audioRef: RefObject<HTMLAudioElement | null>;
  duration: number;
  footerHeight: number;
  hasStarted: boolean;
  headerHeight: number;
  replayPromptVisible: boolean;
  replaySequence: number | null;
  sectionHeight: number;
  shouldPrewarm: boolean;
  timelineRef: RefObject<HTMLDivElement | null>;
  onPrewarmProgress: (progress: number) => void;
  onReplay: (autoplay: boolean) => void;
  onTimelinePrepared: () => void;
  onWordCloudReady: (sectionId: number) => void;
};

const FLOW_SECTIONS = RAM_BOX_LYRICS.filter((section) => !section.isOverlay);
const OVERLAY_SECTIONS = RAM_BOX_LYRICS.map((section, index) => ({ index, section })).filter(
  ({ section }) => section.isOverlay,
);
const HORIZONTAL_TRAVEL_VW = Math.max(0, FLOW_SECTIONS.length - 1) * 90;
const VERTICAL_TRAVEL_VH = Math.max(0, FLOW_SECTIONS.length - 1) * 50;

export const GeneralTimeline = memo(
  ({
    audioRef,
    duration,
    footerHeight,
    hasStarted,
    headerHeight,
    onPrewarmProgress,
    onReplay,
    onTimelinePrepared,
    onWordCloudReady,
    replayPromptVisible,
    replaySequence,
    sectionHeight,
    shouldPrewarm,
    timelineRef,
  }: GeneralTimelineProps) => {
    const isVisible = hasStarted && !replayPromptVisible;
    const { slideRefs, trackRef, viewportRef } = useGeneralTimeline({
      audioRef,
      duration,
      isVisible,
      onPrewarmProgress,
      onTimelinePrepared,
      shouldPrewarm,
    });

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
          data-prewarming={shouldPrewarm ? "true" : undefined}
          style={{ bottom: footerHeight, opacity: isVisible || shouldPrewarm ? 1 : 0, top: headerHeight }}
        >
          <div
            ref={trackRef}
            aria-hidden="true"
            className="general-timeline-track flex h-full w-max will-change-transform max-sm:h-max max-sm:w-full max-sm:flex-col"
          >
            {RAM_BOX_LYRICS.map((section, index) =>
              section.isOverlay ? null : (
                <GeneralTimelineSection
                  key={section.sectionId}
                  index={index}
                  onWordCloudReady={onWordCloudReady}
                  section={section}
                  slideRefs={slideRefs}
                />
              ),
            )}
          </div>

          {OVERLAY_SECTIONS.map(({ index, section }) => (
            <GeneralTimelineSection
              key={section.sectionId}
              index={index}
              isOverlay
              onWordCloudReady={onWordCloudReady}
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
  },
  (previous, next) =>
    previous.duration === next.duration &&
    previous.footerHeight === next.footerHeight &&
    previous.hasStarted === next.hasStarted &&
    previous.headerHeight === next.headerHeight &&
    previous.replayPromptVisible === next.replayPromptVisible &&
    previous.replaySequence === next.replaySequence &&
    previous.sectionHeight === next.sectionHeight &&
    previous.shouldPrewarm === next.shouldPrewarm,
);
