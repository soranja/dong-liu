import type { LyricsSection } from "../model/types";
import { resolveSectionContinuing, type TrackTuningAdapter } from "../model/tuning";

export function getVisualSectionIndex(
  lyrics: readonly LyricsSection[],
  index: number,
  tuningAdapter?: TrackTuningAdapter,
) {
  let visualIndex = index;

  while (visualIndex > 0 && resolveSectionContinuing(lyrics[visualIndex - 1], tuningAdapter)) {
    visualIndex -= 1;
  }

  return visualIndex;
}

export function getNextVisualSectionIndex(
  lyrics: readonly LyricsSection[],
  index: number,
  tuningAdapter?: TrackTuningAdapter,
) {
  let nextIndex = getVisualSectionIndex(lyrics, index, tuningAdapter) + 1;

  while (nextIndex < lyrics.length && resolveSectionContinuing(lyrics[nextIndex - 1], tuningAdapter)) {
    nextIndex += 1;
  }

  return nextIndex;
}

export function isContinuedSection(
  lyrics: readonly LyricsSection[],
  index: number,
  tuningAdapter?: TrackTuningAdapter,
) {
  return getVisualSectionIndex(lyrics, index, tuningAdapter) !== index;
}
