import { RAM_BOX_LYRICS } from "../lyrics/ram-box-lyrics";
import { getEffectiveSectionContinuing } from "./tuning/illustrationAnimationTuningStore";

export function getVisualSectionIndex(index: number) {
  let visualIndex = index;

  while (visualIndex > 0 && getEffectiveSectionContinuing(RAM_BOX_LYRICS[visualIndex - 1])) {
    visualIndex -= 1;
  }

  return visualIndex;
}

export function getNextVisualSectionIndex(index: number) {
  let nextIndex = getVisualSectionIndex(index) + 1;

  while (nextIndex < RAM_BOX_LYRICS.length && getEffectiveSectionContinuing(RAM_BOX_LYRICS[nextIndex - 1])) {
    nextIndex += 1;
  }

  return nextIndex;
}

export function isContinuedSection(index: number) {
  return getVisualSectionIndex(index) !== index;
}
