import type { LyricsSection } from "../entities/track/model/types";
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

function getVisualSectionStart(lyrics: readonly LyricsSection[], index: number) {
  return getLyricsSectionStart(lyrics, index);
}

function isTimelineOverlay(lyrics: readonly LyricsSection[], index: number) {
  const section = lyrics[getVisualSectionIndex(lyrics, index)];

  return section ? getEffectiveSectionOverlay(section) : false;
}

function getPlayableSectionBounds(lyrics: readonly LyricsSection[], index: number, duration: number) {
  const visualStart = getVisualSectionStart(lyrics, index);
  const visualEnd = index < lyrics.length - 1 ? getVisualSectionStart(lyrics, index + 1) : duration;
  const start = Math.min(duration, Math.max(0, visualStart));
  const end = Math.min(duration, Math.max(start, visualEnd));

  return { end, start };
}

function getPlayableVisualSectionBounds(lyrics: readonly LyricsSection[], index: number, duration: number) {
  const visualIndex = getVisualSectionIndex(lyrics, index);
  const nextVisualIndex = getNextVisualSectionIndex(lyrics, visualIndex);
  const visualStart = getVisualSectionStart(lyrics, visualIndex);
  const visualEnd = nextVisualIndex < lyrics.length ? getVisualSectionStart(lyrics, nextVisualIndex) : duration;
  const start = Math.min(duration, Math.max(0, visualStart));
  const end = Math.min(duration, Math.max(start, visualEnd));

  return { end, start, visualIndex };
}

export function getTimelineSectionDuration(lyrics: readonly LyricsSection[], index: number, duration: number) {
  if (!duration || !Number.isFinite(duration)) return 0;

  const { end, start } = getPlayableSectionBounds(lyrics, index, duration);

  return Math.max(0, end - start);
}

export function getTimelineSectionProgress(
  lyrics: readonly LyricsSection[],
  index: number,
  currentTime: number,
  duration: number,
) {
  if (!duration || !Number.isFinite(duration)) return 0;

  const { end: sectionEnd, start: sectionStart } = getPlayableSectionBounds(lyrics, index, duration);
  const sectionDuration = Math.max(0, sectionEnd - sectionStart);
  if (!sectionDuration) return currentTime >= sectionStart ? 1 : 0;

  return Math.min(1, Math.max(0, (currentTime - sectionStart) / sectionDuration));
}

export function getTimelineVisualSectionDuration(lyrics: readonly LyricsSection[], index: number, duration: number) {
  if (!duration || !Number.isFinite(duration)) return 0;

  const { end, start } = getPlayableVisualSectionBounds(lyrics, index, duration);

  return Math.max(0, end - start);
}

export function getTimelineVisualSectionProgress(
  lyrics: readonly LyricsSection[],
  index: number,
  currentTime: number,
  duration: number,
) {
  if (!duration || !Number.isFinite(duration)) return 0;

  const { end, start } = getPlayableVisualSectionBounds(lyrics, index, duration);
  const sectionDuration = Math.max(0, end - start);
  if (!sectionDuration) return currentTime >= start ? 1 : 0;

  return Math.min(1, Math.max(0, (currentTime - start) / sectionDuration));
}

export function getTimelineSectionTime(
  lyrics: readonly LyricsSection[],
  index: number,
  progress: number,
  duration: number,
) {
  if (!duration || !Number.isFinite(duration)) return 0;

  const { end: sectionEnd, start: sectionStart } = getPlayableSectionBounds(lyrics, index, duration);
  const sectionDuration = Math.max(0, sectionEnd - sectionStart);
  const sectionTime = sectionStart + sectionDuration * Math.min(1, Math.max(0, progress));
  const boundedSectionTime =
    index < lyrics.length - 1 && progress >= 1
      ? Math.max(sectionStart, sectionEnd - SECTION_BOUNDARY_EPSILON_SECONDS)
      : sectionTime;

  return Math.min(duration, Math.max(0, boundedSectionTime));
}

function getFlowSectionIndex(lyrics: readonly LyricsSection[], index: number) {
  return lyrics
    .slice(0, getVisualSectionIndex(lyrics, index))
    .filter((_, sectionIndex) => !isContinuedSection(lyrics, sectionIndex) && !isTimelineOverlay(lyrics, sectionIndex))
    .length;
}

function getActiveVisualSectionIndex(lyrics: readonly LyricsSection[], currentTime: number) {
  for (let index = lyrics.length - 1; index >= 0; index -= 1) {
    if (currentTime >= getVisualSectionStart(lyrics, index)) return index;
  }

  return 0;
}

function getSectionTiming(lyrics: readonly LyricsSection[], index: number, duration: number) {
  const visualIndex = getVisualSectionIndex(lyrics, index);
  const section = lyrics[visualIndex];
  const nextVisualIndex = getNextVisualSectionIndex(lyrics, visualIndex);
  const hasNextSection = nextVisualIndex < lyrics.length;
  const previousVisualIndex = visualIndex > 0 ? getVisualSectionIndex(lyrics, visualIndex - 1) : -1;
  const previousSectionIsOverlay = previousVisualIndex >= 0 && isTimelineOverlay(lyrics, previousVisualIndex);
  const nextSectionIsOverlay = hasNextSection && isTimelineOverlay(lyrics, nextVisualIndex);
  const sectionStart = getVisualSectionStart(lyrics, visualIndex);
  const sectionDuration = Math.max(
    0,
    (hasNextSection ? getVisualSectionStart(lyrics, nextVisualIndex) : duration) - sectionStart,
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
    flowIndex: getFlowSectionIndex(lyrics, visualIndex),
    nextVisualIndex,
    sectionDuration,
    sectionStart,
    slowDuration,
  };
}

function getSegmentSpeed(distance: number, duration: number) {
  return duration > 0 ? distance / duration : 0;
}

function getBoundarySpeed(lyrics: readonly LyricsSection[], index: number, duration: number) {
  const visualIndex = getVisualSectionIndex(lyrics, index);
  if (isTimelineOverlay(lyrics, visualIndex)) return 0;

  const current = getSectionTiming(lyrics, visualIndex, duration);
  const entrySpeed = getSegmentSpeed(current.entryEndPosition + 0.5, current.entryDuration);
  if (visualIndex === 0) return entrySpeed;

  const previous = getSectionTiming(lyrics, getVisualSectionIndex(lyrics, visualIndex - 1), duration);
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

function getOverlayTrackPosition(
  lyrics: readonly LyricsSection[],
  activeIndex: number,
  currentTime: number,
  duration: number,
) {
  let overlayStartIndex = getVisualSectionIndex(lyrics, activeIndex);
  let nextFlowIndex = getNextVisualSectionIndex(lyrics, overlayStartIndex);

  while (overlayStartIndex > 0) {
    const previousVisualIndex = getVisualSectionIndex(lyrics, overlayStartIndex - 1);
    if (!isTimelineOverlay(lyrics, previousVisualIndex)) break;
    overlayStartIndex = previousVisualIndex;
  }
  while (nextFlowIndex < lyrics.length && isTimelineOverlay(lyrics, nextFlowIndex)) {
    nextFlowIndex = getNextVisualSectionIndex(lyrics, nextFlowIndex);
  }

  const previousFlowIndex = overlayStartIndex > 0 ? getVisualSectionIndex(lyrics, overlayStartIndex - 1) : -1;
  const startPosition =
    previousFlowIndex >= 0
      ? getFlowSectionIndex(lyrics, previousFlowIndex)
      : nextFlowIndex < lyrics.length
        ? getFlowSectionIndex(lyrics, nextFlowIndex)
        : 0;
  const endPosition = nextFlowIndex < lyrics.length ? getFlowSectionIndex(lyrics, nextFlowIndex) : startPosition;
  const overlayStart = getVisualSectionStart(lyrics, overlayStartIndex);
  const overlayEnd = nextFlowIndex < lyrics.length ? getVisualSectionStart(lyrics, nextFlowIndex) : duration;
  const overlayDuration = Math.max(0, overlayEnd - overlayStart);
  const progress = overlayDuration ? Math.min(1, Math.max(0, (currentTime - overlayStart) / overlayDuration)) : 1;

  return interpolateCenterSlowdown(startPosition, endPosition, progress);
}

export function getTimelineTrackState(lyrics: readonly LyricsSection[], currentTime: number, duration: number) {
  const activeIndex = getActiveVisualSectionIndex(lyrics, currentTime);
  const visualIndex = getVisualSectionIndex(lyrics, activeIndex);
  if (isTimelineOverlay(lyrics, visualIndex)) {
    return {
      activeIndex,
      isHighlighted: true,
      position: getOverlayTrackPosition(lyrics, visualIndex, currentTime, duration),
      visualIndex,
    };
  }

  const timing = getSectionTiming(lyrics, visualIndex, duration);
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
      getBoundarySpeed(lyrics, visualIndex, duration),
      entryEndSpeed,
      timing.entryDuration,
      sectionTime,
    );

    return { activeIndex, isHighlighted: position >= flowIndex + HIGHLIGHT_START_POSITION, position, visualIndex };
  }

  if (sectionTime < timing.entryDuration + timing.slowDuration || timing.nextVisualIndex >= lyrics.length) {
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
    getBoundarySpeed(lyrics, timing.nextVisualIndex, duration),
    timing.exitDuration,
    sectionTime - timing.entryDuration - timing.slowDuration,
  );

  return { activeIndex, isHighlighted: position <= flowIndex + HIGHLIGHT_END_POSITION, position, visualIndex };
}
