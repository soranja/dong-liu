import { memo, useEffect, useState, type CSSProperties, type RefObject } from "react";
import {
  resolveSectionOverlay,
  resolveSectionWidthPercent,
  type TrackTuningAdapter,
} from "@entities/track/model/tuning";
import type { CustomIllustrationRenderer, LyricsSection } from "@entities/track/model/types";
import { isContinuedSection } from "@entities/track/lib/continuing";
import { supportsBackground } from "@entities/track/lib/background";
import { useGeneralTimeline } from "../model/useGeneralTimeline";
import { isTimelineSectionResident } from "../model/timelineWindow";
import { GeneralTimelineSection } from "./GeneralTimelineSection";
import { TimelineBackground } from "./TimelineBackground";

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
  onStart: () => void;
  onTimelinePrepared: () => void;
  onWordCloudReady: (sectionId: number) => void;
  renderCustomIllustration: CustomIllustrationRenderer<unknown>;
  lyrics: readonly LyricsSection[];
  tuningAdapter?: TrackTuningAdapter;
};

function getHorizontalTravelVw(sectionWidthPercents: number[]) {
  if (sectionWidthPercents.length <= 1) return 0;

  const totalWidth = sectionWidthPercents.reduce((sum, width) => sum + width, 0);

  return totalWidth - sectionWidthPercents[0] / 2 - sectionWidthPercents[sectionWidthPercents.length - 1] / 2;
}

export const GeneralTimeline = memo(
  ({
    audioRef,
    duration,
    footerHeight,
    hasStarted,
    headerHeight,
    lyrics,
    onPrewarmProgress,
    onReplay,
    onStart,
    onTimelinePrepared,
    onWordCloudReady,
    renderCustomIllustration,
    replayPromptVisible,
    replaySequence,
    sectionHeight,
    shouldPrewarm,
    timelineRef,
    tuningAdapter,
  }: GeneralTimelineProps) => {
    const isVisible = !replayPromptVisible;
    const [activeSectionIndex, setActiveSectionIndex] = useState(0);
    const [tuningVersion, setTuningVersion] = useState(0);
    const { backgroundRefs, slideRefs, trackRef, viewportRef } = useGeneralTimeline({
      audioRef,
      duration,
      isVisible,
      lyrics,
      onActiveSectionChange: setActiveSectionIndex,
      onPrewarmProgress,
      onTimelinePrepared,
      shouldPrewarm,
      tuningAdapter,
    });
    const sectionRows = lyrics.map((section, index) => ({
      index,
      isContinued: isContinuedSection(lyrics, index, tuningAdapter),
      isOverlay: resolveSectionOverlay(section, tuningAdapter),
      section,
      sectionWidthPercent: resolveSectionWidthPercent(section, tuningAdapter),
    }));
    const flowSectionWidthPercents = sectionRows
      .filter(({ isContinued, isOverlay }) => !isContinued && !isOverlay)
      .map(({ sectionWidthPercent }) => sectionWidthPercent);
    const overlaySections = sectionRows.filter(({ isContinued, isOverlay }) => !isContinued && isOverlay);
    const isResident = (index: number) => isTimelineSectionResident(index, activeSectionIndex, lyrics.length);

    useEffect(() => {
      return tuningAdapter?.subscribe(() => setTuningVersion((version) => version + 1));
    }, [tuningAdapter]);

    return (
      <div
        ref={timelineRef}
        className="general-timeline-spacer relative"
        data-audio-timeline
        style={
          {
            "--timeline-horizontal-travel": `${getHorizontalTravelVw(flowSectionWidthPercents)}vw`,
            "--timeline-section-height": `${sectionHeight}px`,
          } as CSSProperties
        }
      >
        <div
          ref={viewportRef}
          aria-hidden={!isVisible}
          className="pointer-events-none fixed inset-x-0 z-10 overflow-hidden"
          data-general-timeline
          data-prewarming={shouldPrewarm ? "true" : undefined}
          data-tuning-version={tuningVersion || undefined}
          style={{ bottom: footerHeight, opacity: isVisible || shouldPrewarm ? 1 : 0, top: headerHeight }}
        >
          <div aria-hidden="true" className="absolute inset-0" data-timeline-backgrounds>
            {lyrics.map((section, index) =>
              supportsBackground(section) ? (
                <TimelineBackground
                  key={section.sectionId}
                  background={tuningAdapter?.getBackground(section) ?? section.background}
                  backgroundRefs={backgroundRefs}
                  index={index}
                  isResident={isResident(index)}
                  revision={tuningVersion}
                />
              ) : null,
            )}
          </div>

          <div
            ref={trackRef}
            aria-hidden="true"
            className="general-timeline-track relative z-10 flex h-full w-max will-change-transform"
          >
            {sectionRows.map(({ index, isContinued, isOverlay, section, sectionWidthPercent }) =>
              isContinued || isOverlay ? null : (
                <GeneralTimelineSection
                  key={section.sectionId}
                  index={index}
                  isResident={isResident(index)}
                  lyrics={lyrics}
                  onWordCloudReady={onWordCloudReady}
                  renderCustomIllustration={renderCustomIllustration}
                  section={section}
                  sectionWidthPercent={sectionWidthPercent}
                  slideRefs={slideRefs}
                  tuningAdapter={tuningAdapter}
                />
              ),
            )}
          </div>

          {overlaySections.map(({ index, section }) => (
            <GeneralTimelineSection
              key={section.sectionId}
              index={index}
              isOverlay
              isResident={isResident(index)}
              lyrics={lyrics}
              onWordCloudReady={onWordCloudReady}
              renderCustomIllustration={renderCustomIllustration}
              section={section}
              slideRefs={slideRefs}
              tuningAdapter={tuningAdapter}
            />
          ))}
        </div>

        {!hasStarted ? (
          <div
            className="pointer-events-none fixed inset-x-0 z-10 flex items-center justify-center px-6 text-center"
            style={{ bottom: footerHeight, top: headerHeight }}
          >
            <button
              className="timeline-start-prompt pointer-events-auto w-full max-w-lg"
              onClick={onStart}
              type="button"
            >
              <span className="timeline-start-prompt__visual">
                <span className="block font-mono text-xs uppercase text-text-muted">Timeline locked</span>
                <span className="mt-3 block font-mono text-3xl font-bold uppercase leading-tight text-cream-white">
                  Press play to start
                </span>
              </span>
            </button>
          </div>
        ) : null}

        {replayPromptVisible && replaySequence !== null ? (
          <div
            className="fixed inset-x-0 z-10 flex items-center justify-center px-6 text-center"
            style={{ bottom: footerHeight, top: headerHeight }}
          >
            <div className="max-w-md p-6 text-cream-white">
              <p className="font-mono text-xs uppercase text-text-muted">
                {replaySequence > 0 ? `Replay prompt in ${replaySequence}` : "Timeline complete"}
              </p>
              {replaySequence === 0 ? (
                <>
                  <h2 className="mt-3 font-mono text-2xl font-bold uppercase">Play again?</h2>
                  <div className="mt-5 flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => onReplay(true)}
                      className="h-11 border border-cream-white bg-cream-white px-6 font-mono text-sm font-bold uppercase text-panel transition hover:bg-control-hover"
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => onReplay(false)}
                      className="h-11 border border-border-strong bg-panel-raised px-6 font-mono text-sm font-bold uppercase text-cream-white transition hover:bg-panel-hover"
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
    previous.lyrics === next.lyrics &&
    previous.renderCustomIllustration === next.renderCustomIllustration &&
    previous.replayPromptVisible === next.replayPromptVisible &&
    previous.replaySequence === next.replaySequence &&
    previous.sectionHeight === next.sectionHeight &&
    previous.shouldPrewarm === next.shouldPrewarm &&
    previous.tuningAdapter === next.tuningAdapter,
);
