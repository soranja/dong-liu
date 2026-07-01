import type { LyricsSection } from "../entities/track/model/types";
import { getEffectiveSectionContinuing } from "./tuning/illustrationAnimationTuningStore";

export function getVisualSectionIndex(lyrics: readonly LyricsSection[], index: number) {
  let visualIndex = index;

  while (visualIndex > 0 && getEffectiveSectionContinuing(lyrics[visualIndex - 1])) {
    visualIndex -= 1;
  }

  return visualIndex;
}

export function getNextVisualSectionIndex(lyrics: readonly LyricsSection[], index: number) {
  let nextIndex = getVisualSectionIndex(lyrics, index) + 1;

  while (nextIndex < lyrics.length && getEffectiveSectionContinuing(lyrics[nextIndex - 1])) {
    nextIndex += 1;
  }

  return nextIndex;
}

export function isContinuedSection(lyrics: readonly LyricsSection[], index: number) {
  return getVisualSectionIndex(lyrics, index) !== index;
}
