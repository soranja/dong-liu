import { RAM_BOX_LYRICS } from "../lyrics/ram-box-lyrics";
import { getNextVisualSectionIndex, getVisualSectionIndex, isContinuedSection } from "./continuing";
import {
  getEffectiveSectionEnterDurationMs,
  getEffectiveSectionExitDurationMs,
  getEffectiveSectionNoSlideBy,
  getEffectiveSectionOverlay,
} from "./tuning/illustrationAnimationTuningStore";
import { getLyricsSectionStart } from "./lyrics";

const CENTER_SPEED_FACTOR = 0.08;
const HIGHLIGHT_END_POSITION = 0.25;
const HIGHLIGHT_START_POSITION = -0.25;
const SLOW_END_POSITION = 0.1;
const SLOW_START_POSITION = -0.1;
const SECTION_BOUNDARY_EPSILON_SECONDS = 0.001;

function getVisualSectionStart(index: number) {
  return getLyricsSectionStart(index);
}

function isTimelineOverlay(index: number) {
  const section = RAM_BOX_LYRICS[getVisualSectionIndex(index)];

  return section ? getEffectiveSectionOverlay(section) : false;
}

function getPlayableSectionBounds(index: number, duration: number) {
  const visualStart = getVisualSectionStart(index);
  const visualEnd = index < RAM_BOX_LYRICS.length - 1 ? getVisualSectionStart(index + 1) : duration;
  const start = Math.min(duration, Math.max(0, visualStart));
  const end = Math.min(duration, Math.max(start, visualEnd));

  return { end, start };
}

function getPlayableVisualSectionBounds(index: number, duration: number) {
  const visualIndex = getVisualSectionIndex(index);
  const nextVisualIndex = getNextVisualSectionIndex(visualIndex);
  const visualStart = getVisualSectionStart(visualIndex);
  const visualEnd = nextVisualIndex < RAM_BOX_LYRICS.length ? getVisualSectionStart(nextVisualIndex) : duration;
  const start = Math.min(duration, Math.max(0, visualStart));
  const end = Math.min(duration, Math.max(start, visualEnd));

  return { end, start, visualIndex };
}

export function getTimelineSectionDuration(index: number, duration: number) {
  if (!duration || !Number.isFinite(duration)) return 0;

  const { end, start } = getPlayableSectionBounds(index, duration);

  return Math.max(0, end - start);
}

export function getTimelineSectionProgress(index: number, currentTime: number, duration: number) {
  if (!duration || !Number.isFinite(duration)) return 0;

  const { end: sectionEnd, start: sectionStart } = getPlayableSectionBounds(index, duration);
  const sectionDuration = Math.max(0, sectionEnd - sectionStart);
  if (!sectionDuration) return currentTime >= sectionStart ? 1 : 0;

  return Math.min(1, Math.max(0, (currentTime - sectionStart) / sectionDuration));
}

export function getTimelineVisualSectionDuration(index: number, duration: number) {
  if (!duration || !Number.isFinite(duration)) return 0;

  const { end, start } = getPlayableVisualSectionBounds(index, duration);

  return Math.max(0, end - start);
}

export function getTimelineVisualSectionProgress(index: number, currentTime: number, duration: number) {
  if (!duration || !Number.isFinite(duration)) return 0;

  const { end, start } = getPlayableVisualSectionBounds(index, duration);
  const sectionDuration = Math.max(0, end - start);
  if (!sectionDuration) return currentTime >= start ? 1 : 0;

  return Math.min(1, Math.max(0, (currentTime - start) / sectionDuration));
}

export function getTimelineSectionTime(index: number, progress: number, duration: number) {
  if (!duration || !Number.isFinite(duration)) return 0;

  const { end: sectionEnd, start: sectionStart } = getPlayableSectionBounds(index, duration);
  const sectionDuration = Math.max(0, sectionEnd - sectionStart);
  const sectionTime = sectionStart + sectionDuration * Math.min(1, Math.max(0, progress));
  const boundedSectionTime =
    index < RAM_BOX_LYRICS.length - 1 && progress >= 1
      ? Math.max(sectionStart, sectionEnd - SECTION_BOUNDARY_EPSILON_SECONDS)
      : sectionTime;

  return Math.min(duration, Math.max(0, boundedSectionTime));
}

function getFlowSectionIndex(index: number) {
  return RAM_BOX_LYRICS.slice(0, getVisualSectionIndex(index)).filter(
    (_, sectionIndex) => !isContinuedSection(sectionIndex) && !isTimelineOverlay(sectionIndex),
  ).length;
}

function getActiveVisualSectionIndex(currentTime: number) {
  for (let index = RAM_BOX_LYRICS.length - 1; index >= 0; index -= 1) {
    if (currentTime >= getVisualSectionStart(index)) return index;
  }

  return 0;
}

function getSectionTiming(index: number, duration: number) {
  const visualIndex = getVisualSectionIndex(index);
  const section = RAM_BOX_LYRICS[visualIndex];
  const nextVisualIndex = getNextVisualSectionIndex(visualIndex);
  const hasNextSection = nextVisualIndex < RAM_BOX_LYRICS.length;
  const previousVisualIndex = visualIndex > 0 ? getVisualSectionIndex(visualIndex - 1) : -1;
  const previousSectionIsOverlay = previousVisualIndex >= 0 && isTimelineOverlay(previousVisualIndex);
  const nextSectionIsOverlay = hasNextSection && isTimelineOverlay(nextVisualIndex);
  const sectionStart = getVisualSectionStart(visualIndex);
  const sectionDuration = Math.max(
    0,
    (hasNextSection ? getVisualSectionStart(nextVisualIndex) : duration) - sectionStart,
  );
  const desiredEntryDuration = previousSectionIsOverlay ? 0 : getEffectiveSectionEnterDurationMs(section) / 1000;
  const desiredExitDuration =
    nextSectionIsOverlay || !hasNextSection ? 0 : getEffectiveSectionExitDurationMs(section) / 1000;
  const desiredMotionDuration = desiredEntryDuration + desiredExitDuration;
  const timingScale = desiredMotionDuration > sectionDuration ? sectionDuration / desiredMotionDuration : 1;
  const entryDuration = desiredEntryDuration * timingScale;
  const exitDuration = desiredExitDuration * timingScale;
  const slowDuration = sectionDuration - entryDuration - exitDuration;
  const hasSlowPhase = slowDuration > 0;
  const noSlideBy = getEffectiveSectionNoSlideBy(section);

  return {
    entryDuration,
    entryEndPosition: previousSectionIsOverlay || noSlideBy ? 0 : hasSlowPhase ? SLOW_START_POSITION : 0,
    exitDuration,
    exitStartPosition: nextSectionIsOverlay || noSlideBy ? 0 : hasSlowPhase ? SLOW_END_POSITION : 0,
    flowIndex: getFlowSectionIndex(visualIndex),
    nextVisualIndex,
    sectionDuration,
    sectionStart,
    slowDuration,
  };
}

function getSegmentSpeed(distance: number, duration: number) {
  return duration > 0 ? distance / duration : 0;
}

function getBoundarySpeed(index: number, duration: number) {
  const visualIndex = getVisualSectionIndex(index);
  if (isTimelineOverlay(visualIndex)) return 0;

  const current = getSectionTiming(visualIndex, duration);
  const entrySpeed = getSegmentSpeed(current.entryEndPosition + 0.5, current.entryDuration);
  if (visualIndex === 0) return entrySpeed;

  const previous = getSectionTiming(getVisualSectionIndex(visualIndex - 1), duration);
  const exitSpeed = getSegmentSpeed(0.5 - previous.exitStartPosition, previous.exitDuration);

  return Math.min(exitSpeed || entrySpeed, entrySpeed || exitSpeed);
}

function interpolateHermite(
  start: number,
  end: number,
  startSpeed: number,
  endSpeed: number,
  duration: number,
  time: number,
) {
  if (duration === 0) return end;

  const progress = Math.min(1, Math.max(0, time / duration));
  const squared = progress * progress;
  const cubed = squared * progress;

  return (
    (2 * cubed - 3 * squared + 1) * start +
    (cubed - 2 * squared + progress) * duration * startSpeed +
    (-2 * cubed + 3 * squared) * end +
    (cubed - squared) * duration * endSpeed
  );
}

function interpolateCenterSlowdown(start: number, end: number, progress: number) {
  const curveStrength = (1 - CENTER_SPEED_FACTOR) / (1 + CENTER_SPEED_FACTOR);
  const curvedProgress = progress + (curveStrength / (2 * Math.PI)) * Math.sin(2 * Math.PI * progress);

  return start + (end - start) * curvedProgress;
}

function getOverlayTrackPosition(activeIndex: number, currentTime: number, duration: number) {
  let overlayStartIndex = getVisualSectionIndex(activeIndex);
  let nextFlowIndex = getNextVisualSectionIndex(overlayStartIndex);

  while (overlayStartIndex > 0) {
    const previousVisualIndex = getVisualSectionIndex(overlayStartIndex - 1);
    if (!isTimelineOverlay(previousVisualIndex)) break;
    overlayStartIndex = previousVisualIndex;
  }
  while (nextFlowIndex < RAM_BOX_LYRICS.length && isTimelineOverlay(nextFlowIndex)) {
    nextFlowIndex = getNextVisualSectionIndex(nextFlowIndex);
  }

  const previousFlowIndex = overlayStartIndex > 0 ? getVisualSectionIndex(overlayStartIndex - 1) : -1;
  const startPosition =
    previousFlowIndex >= 0
      ? getFlowSectionIndex(previousFlowIndex)
      : nextFlowIndex < RAM_BOX_LYRICS.length
        ? getFlowSectionIndex(nextFlowIndex)
        : 0;
  const endPosition = nextFlowIndex < RAM_BOX_LYRICS.length ? getFlowSectionIndex(nextFlowIndex) : startPosition;
  const overlayStart = getVisualSectionStart(overlayStartIndex);
  const overlayEnd = nextFlowIndex < RAM_BOX_LYRICS.length ? getVisualSectionStart(nextFlowIndex) : duration;
  const overlayDuration = Math.max(0, overlayEnd - overlayStart);
  const progress = overlayDuration ? Math.min(1, Math.max(0, (currentTime - overlayStart) / overlayDuration)) : 1;

  return interpolateCenterSlowdown(startPosition, endPosition, progress);
}

export function getTimelineTrackState(currentTime: number, duration: number) {
  const activeIndex = getActiveVisualSectionIndex(currentTime);
  const visualIndex = getVisualSectionIndex(activeIndex);
  if (isTimelineOverlay(visualIndex)) {
    return {
      activeIndex,
      isHighlighted: true,
      position: getOverlayTrackPosition(visualIndex, currentTime, duration),
      visualIndex,
    };
  }

  const timing = getSectionTiming(visualIndex, duration);
  const flowIndex = timing.flowIndex;

  if (timing.sectionDuration === 0) {
    return { activeIndex, isHighlighted: true, position: flowIndex, visualIndex };
  }

  const sectionTime = Math.min(timing.sectionDuration, Math.max(0, currentTime - timing.sectionStart));
  const entrySpeed = getSegmentSpeed(timing.entryEndPosition + 0.5, timing.entryDuration);
  const slowSpeed = getSegmentSpeed(timing.exitStartPosition - timing.entryEndPosition, timing.slowDuration);
  const exitSpeed = getSegmentSpeed(0.5 - timing.exitStartPosition, timing.exitDuration);
  const slowEdgeSpeed = slowSpeed * (2 / (1 + CENTER_SPEED_FACTOR));
  const entryEndSpeed = Math.min(entrySpeed, timing.slowDuration > 0 ? slowEdgeSpeed : exitSpeed);
  const exitStartSpeed = timing.slowDuration > 0 ? Math.min(slowEdgeSpeed, exitSpeed) : entryEndSpeed;

  if (sectionTime < timing.entryDuration) {
    const position = interpolateHermite(
      flowIndex - 0.5,
      flowIndex + timing.entryEndPosition,
      getBoundarySpeed(visualIndex, duration),
      entryEndSpeed,
      timing.entryDuration,
      sectionTime,
    );

    return { activeIndex, isHighlighted: position >= flowIndex + HIGHLIGHT_START_POSITION, position, visualIndex };
  }

  if (sectionTime < timing.entryDuration + timing.slowDuration || timing.nextVisualIndex >= RAM_BOX_LYRICS.length) {
    const progress = timing.slowDuration ? (sectionTime - timing.entryDuration) / timing.slowDuration : 1;
    const position = interpolateCenterSlowdown(
      flowIndex + timing.entryEndPosition,
      flowIndex + timing.exitStartPosition,
      progress,
    );

    return {
      activeIndex,
      isHighlighted: position >= flowIndex + HIGHLIGHT_START_POSITION && position <= flowIndex + HIGHLIGHT_END_POSITION,
      position,
      visualIndex,
    };
  }

  const position = interpolateHermite(
    flowIndex + timing.exitStartPosition,
    flowIndex + 0.5,
    exitStartSpeed,
    getBoundarySpeed(timing.nextVisualIndex, duration),
    timing.exitDuration,
    sectionTime - timing.entryDuration - timing.slowDuration,
  );

  return { activeIndex, isHighlighted: position <= flowIndex + HIGHLIGHT_END_POSITION, position, visualIndex };
}
