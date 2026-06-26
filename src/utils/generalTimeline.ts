import { RAM_BOX_LYRICS } from "../lyrics/ram-box-lyrics";
import { getLyricsSectionStart } from "./lyrics";

const CENTER_SPEED_FACTOR = 0.08;
const HIGHLIGHT_END_POSITION = 0.25;
const HIGHLIGHT_START_POSITION = -0.25;
const SLOW_END_POSITION = 0.1;
const SLOW_START_POSITION = -0.1;
const SECTION_BOUNDARY_EPSILON_SECONDS = 0.001;

const FLOW_SECTION_INDEXES = RAM_BOX_LYRICS.map(
  (_, index) => RAM_BOX_LYRICS.slice(0, index).filter((candidate) => !candidate.isOverlay).length,
);

function getVisualSectionStart(index: number) {
  return getLyricsSectionStart(index) + RAM_BOX_LYRICS[index].offsetEnter / 1000;
}

function getPlayableSectionBounds(index: number, duration: number) {
  const visualStart = getVisualSectionStart(index);
  const visualEnd = index < RAM_BOX_LYRICS.length - 1 ? getVisualSectionStart(index + 1) : duration;
  const start = Math.min(duration, Math.max(0, visualStart));
  const end = Math.min(duration, Math.max(start, visualEnd));

  return { end, start };
}

export function getTimelineSectionProgress(index: number, currentTime: number, duration: number) {
  if (!duration || !Number.isFinite(duration)) return 0;

  const { end: sectionEnd, start: sectionStart } = getPlayableSectionBounds(index, duration);
  const sectionDuration = Math.max(0, sectionEnd - sectionStart);
  if (!sectionDuration) return currentTime >= sectionStart ? 1 : 0;

  return Math.min(1, Math.max(0, (currentTime - sectionStart) / sectionDuration));
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
  return FLOW_SECTION_INDEXES[index] ?? 0;
}

function getActiveVisualSectionIndex(currentTime: number) {
  for (let index = RAM_BOX_LYRICS.length - 1; index >= 0; index -= 1) {
    if (currentTime >= getVisualSectionStart(index)) return index;
  }

  return 0;
}

function getSectionTiming(index: number, duration: number) {
  const section = RAM_BOX_LYRICS[index];
  const hasNextSection = index < RAM_BOX_LYRICS.length - 1;
  const previousSectionIsOverlay = index > 0 && RAM_BOX_LYRICS[index - 1].isOverlay;
  const nextSectionIsOverlay = hasNextSection && RAM_BOX_LYRICS[index + 1].isOverlay;
  const nextSectionSlidesBy = hasNextSection && !nextSectionIsOverlay && RAM_BOX_LYRICS[index + 1].slideBy;
  const sectionStart = getVisualSectionStart(index);
  const sectionDuration = Math.max(0, (hasNextSection ? getVisualSectionStart(index + 1) : duration) - sectionStart);
  const desiredEntryDuration = previousSectionIsOverlay ? 0 : section.enterDuration / 1000;
  const desiredExitDuration =
    nextSectionSlidesBy || nextSectionIsOverlay || !hasNextSection ? 0 : section.exitDuration / 1000;
  const desiredMotionDuration = desiredEntryDuration + desiredExitDuration;
  const timingScale = desiredMotionDuration > sectionDuration ? sectionDuration / desiredMotionDuration : 1;
  const entryDuration = desiredEntryDuration * timingScale;
  const exitDuration = desiredExitDuration * timingScale;
  const slowDuration = sectionDuration - entryDuration - exitDuration;
  const hasSlowPhase = slowDuration > 0;

  return {
    entryDuration,
    entryEndPosition: previousSectionIsOverlay ? 0 : hasSlowPhase ? SLOW_START_POSITION : 0,
    exitDuration,
    exitStartPosition: nextSectionSlidesBy ? 0.5 : nextSectionIsOverlay ? 0 : hasSlowPhase ? SLOW_END_POSITION : 0,
    flowIndex: getFlowSectionIndex(index),
    sectionDuration,
    sectionStart,
    slideBy: Boolean(section.slideBy) && !previousSectionIsOverlay && !nextSectionIsOverlay,
    slowDuration,
  };
}

function getSegmentSpeed(distance: number, duration: number) {
  return duration > 0 ? distance / duration : 0;
}

function getBoundarySpeed(index: number, duration: number) {
  if (RAM_BOX_LYRICS[index]?.isOverlay) return 0;

  const current = getSectionTiming(index, duration);
  const entrySpeed = getSegmentSpeed(current.entryEndPosition + 0.5, current.entryDuration);
  if (index === 0) return entrySpeed;

  const previous = getSectionTiming(index - 1, duration);
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
  let overlayStartIndex = activeIndex;
  let nextFlowIndex = activeIndex + 1;

  while (overlayStartIndex > 0 && RAM_BOX_LYRICS[overlayStartIndex - 1].isOverlay) {
    overlayStartIndex -= 1;
  }
  while (nextFlowIndex < RAM_BOX_LYRICS.length && RAM_BOX_LYRICS[nextFlowIndex].isOverlay) {
    nextFlowIndex += 1;
  }

  const previousFlowIndex = overlayStartIndex - 1;
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
  if (RAM_BOX_LYRICS[activeIndex].isOverlay) {
    return {
      activeIndex,
      isHighlighted: true,
      position: getOverlayTrackPosition(activeIndex, currentTime, duration),
    };
  }

  const timing = getSectionTiming(activeIndex, duration);
  const flowIndex = timing.flowIndex;

  if (timing.sectionDuration === 0) return { activeIndex, isHighlighted: true, position: flowIndex };

  const sectionTime = Math.min(timing.sectionDuration, Math.max(0, currentTime - timing.sectionStart));
  if (timing.slideBy) {
    const position = flowIndex - 0.5 + sectionTime / timing.sectionDuration;

    return {
      activeIndex,
      isHighlighted: position >= flowIndex + HIGHLIGHT_START_POSITION && position <= flowIndex + HIGHLIGHT_END_POSITION,
      position,
    };
  }

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
      getBoundarySpeed(activeIndex, duration),
      entryEndSpeed,
      timing.entryDuration,
      sectionTime,
    );

    return { activeIndex, isHighlighted: position >= flowIndex + HIGHLIGHT_START_POSITION, position };
  }

  if (sectionTime < timing.entryDuration + timing.slowDuration || activeIndex === RAM_BOX_LYRICS.length - 1) {
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
    };
  }

  const position = interpolateHermite(
    flowIndex + timing.exitStartPosition,
    flowIndex + 0.5,
    exitStartSpeed,
    getBoundarySpeed(activeIndex + 1, duration),
    timing.exitDuration,
    sectionTime - timing.entryDuration - timing.slowDuration,
  );

  return { activeIndex, isHighlighted: position <= flowIndex + HIGHLIGHT_END_POSITION, position };
}
