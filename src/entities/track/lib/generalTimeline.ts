import type { LyricsSection } from '../model/types';
import { resolveSectionOverlay, type TrackTuningAdapter } from '../model/tuning';
import { getNextVisualSectionIndex, getVisualSectionIndex, isContinuedSection } from './continuing';
import { getLyricsSectionStart } from './lyrics';

const CENTER_SPEED_FACTOR = 0.08;
const SECTION_BOUNDARY_EPSILON_SECONDS = 0.001;

function getVisualSectionStart(lyrics: readonly LyricsSection[], index: number, tuningAdapter?: TrackTuningAdapter) {
  return getLyricsSectionStart(lyrics, index, tuningAdapter);
}

function isTimelineOverlay(lyrics: readonly LyricsSection[], index: number, tuningAdapter?: TrackTuningAdapter) {
  const section = lyrics[getVisualSectionIndex(lyrics, index, tuningAdapter)];

  return section ? resolveSectionOverlay(section, tuningAdapter) : false;
}

function getPlayableSectionBounds(
  lyrics: readonly LyricsSection[],
  index: number,
  duration: number,
  tuningAdapter?: TrackTuningAdapter,
) {
  const visualStart = getVisualSectionStart(lyrics, index, tuningAdapter);
  const visualEnd = index < lyrics.length - 1 ? getVisualSectionStart(lyrics, index + 1, tuningAdapter) : duration;
  const start = Math.min(duration, Math.max(0, visualStart));
  const end = Math.min(duration, Math.max(start, visualEnd));

  return { end, start };
}

function getPlayableVisualSectionBounds(
  lyrics: readonly LyricsSection[],
  index: number,
  duration: number,
  tuningAdapter?: TrackTuningAdapter,
) {
  const visualIndex = getVisualSectionIndex(lyrics, index, tuningAdapter);
  const nextVisualIndex = getNextVisualSectionIndex(lyrics, visualIndex, tuningAdapter);
  const visualStart = getVisualSectionStart(lyrics, visualIndex, tuningAdapter);
  const visualEnd =
    nextVisualIndex < lyrics.length ? getVisualSectionStart(lyrics, nextVisualIndex, tuningAdapter) : duration;
  const start = Math.min(duration, Math.max(0, visualStart));
  const end = Math.min(duration, Math.max(start, visualEnd));

  return { end, start, visualIndex };
}

export function getTimelineSectionDuration(
  lyrics: readonly LyricsSection[],
  index: number,
  duration: number,
  tuningAdapter?: TrackTuningAdapter,
) {
  if (!duration || !Number.isFinite(duration)) return 0;

  const { end, start } = getPlayableSectionBounds(lyrics, index, duration, tuningAdapter);

  return Math.max(0, end - start);
}

export function getTimelineSectionProgress(
  lyrics: readonly LyricsSection[],
  index: number,
  currentTime: number,
  duration: number,
  tuningAdapter?: TrackTuningAdapter,
) {
  if (!duration || !Number.isFinite(duration)) return 0;

  const { end: sectionEnd, start: sectionStart } = getPlayableSectionBounds(lyrics, index, duration, tuningAdapter);
  const sectionDuration = Math.max(0, sectionEnd - sectionStart);
  if (!sectionDuration) return currentTime >= sectionStart ? 1 : 0;

  return Math.min(1, Math.max(0, (currentTime - sectionStart) / sectionDuration));
}

export function getTimelineVisualSectionDuration(
  lyrics: readonly LyricsSection[],
  index: number,
  duration: number,
  tuningAdapter?: TrackTuningAdapter,
) {
  if (!duration || !Number.isFinite(duration)) return 0;

  const { end, start } = getPlayableVisualSectionBounds(lyrics, index, duration, tuningAdapter);

  return Math.max(0, end - start);
}

export function getTimelineVisualSectionProgress(
  lyrics: readonly LyricsSection[],
  index: number,
  currentTime: number,
  duration: number,
  tuningAdapter?: TrackTuningAdapter,
) {
  if (!duration || !Number.isFinite(duration)) return 0;

  const { end, start } = getPlayableVisualSectionBounds(lyrics, index, duration, tuningAdapter);
  const sectionDuration = Math.max(0, end - start);
  if (!sectionDuration) return currentTime >= start ? 1 : 0;

  return Math.min(1, Math.max(0, (currentTime - start) / sectionDuration));
}

export function getTimelineSectionTime(
  lyrics: readonly LyricsSection[],
  index: number,
  progress: number,
  duration: number,
  tuningAdapter?: TrackTuningAdapter,
) {
  if (!duration || !Number.isFinite(duration)) return 0;

  const { end: sectionEnd, start: sectionStart } = getPlayableSectionBounds(lyrics, index, duration, tuningAdapter);
  const sectionDuration = Math.max(0, sectionEnd - sectionStart);
  const sectionTime = sectionStart + sectionDuration * Math.min(1, Math.max(0, progress));
  const boundedSectionTime =
    index < lyrics.length - 1 && progress >= 1
      ? Math.max(sectionStart, sectionEnd - SECTION_BOUNDARY_EPSILON_SECONDS)
      : sectionTime;

  return Math.min(duration, Math.max(0, boundedSectionTime));
}

function getFlowSectionIndex(lyrics: readonly LyricsSection[], index: number, tuningAdapter?: TrackTuningAdapter) {
  return lyrics
    .slice(0, getVisualSectionIndex(lyrics, index, tuningAdapter))
    .filter(
      (_, sectionIndex) =>
        !isContinuedSection(lyrics, sectionIndex, tuningAdapter) &&
        !isTimelineOverlay(lyrics, sectionIndex, tuningAdapter),
    ).length;
}

function getActiveVisualSectionIndex(
  lyrics: readonly LyricsSection[],
  currentTime: number,
  tuningAdapter?: TrackTuningAdapter,
) {
  for (let index = lyrics.length - 1; index >= 0; index -= 1) {
    if (currentTime >= getVisualSectionStart(lyrics, index, tuningAdapter)) return index;
  }

  return 0;
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
  tuningAdapter?: TrackTuningAdapter,
) {
  let overlayStartIndex = getVisualSectionIndex(lyrics, activeIndex, tuningAdapter);
  let nextFlowIndex = getNextVisualSectionIndex(lyrics, overlayStartIndex, tuningAdapter);

  while (overlayStartIndex > 0) {
    const previousVisualIndex = getVisualSectionIndex(lyrics, overlayStartIndex - 1, tuningAdapter);
    if (!isTimelineOverlay(lyrics, previousVisualIndex, tuningAdapter)) break;
    overlayStartIndex = previousVisualIndex;
  }
  while (nextFlowIndex < lyrics.length && isTimelineOverlay(lyrics, nextFlowIndex, tuningAdapter)) {
    nextFlowIndex = getNextVisualSectionIndex(lyrics, nextFlowIndex, tuningAdapter);
  }

  const previousFlowIndex =
    overlayStartIndex > 0 ? getVisualSectionIndex(lyrics, overlayStartIndex - 1, tuningAdapter) : -1;
  const startPosition =
    previousFlowIndex >= 0
      ? getFlowSectionIndex(lyrics, previousFlowIndex, tuningAdapter)
      : nextFlowIndex < lyrics.length
        ? getFlowSectionIndex(lyrics, nextFlowIndex, tuningAdapter)
        : 0;
  const endPosition =
    nextFlowIndex < lyrics.length ? getFlowSectionIndex(lyrics, nextFlowIndex, tuningAdapter) : startPosition;
  const overlayStart = getVisualSectionStart(lyrics, overlayStartIndex, tuningAdapter);
  const overlayEnd =
    nextFlowIndex < lyrics.length ? getVisualSectionStart(lyrics, nextFlowIndex, tuningAdapter) : duration;
  const overlayDuration = Math.max(0, overlayEnd - overlayStart);
  const progress = overlayDuration ? Math.min(1, Math.max(0, (currentTime - overlayStart) / overlayDuration)) : 1;

  return interpolateCenterSlowdown(startPosition, endPosition, progress);
}

export function getTimelineTrackState(
  lyrics: readonly LyricsSection[],
  currentTime: number,
  duration: number,
  tuningAdapter?: TrackTuningAdapter,
) {
  const activeIndex = getActiveVisualSectionIndex(lyrics, currentTime, tuningAdapter);
  const visualIndex = getVisualSectionIndex(lyrics, activeIndex, tuningAdapter);
  if (isTimelineOverlay(lyrics, visualIndex, tuningAdapter)) {
    return {
      activeIndex,
      isHighlighted: true,
      position: getOverlayTrackPosition(lyrics, visualIndex, currentTime, duration, tuningAdapter),
      visualIndex,
    };
  }

  return {
    activeIndex,
    isHighlighted: true,
    position: getFlowSectionIndex(lyrics, visualIndex, tuningAdapter),
    visualIndex,
  };
}
