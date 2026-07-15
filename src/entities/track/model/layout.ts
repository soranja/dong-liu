import type { LyricsSection } from './types';

export const DEFAULT_SECTION_WIDTH_PERCENT = 100;
export const SECTION_WIDTH_STEP_PERCENT = 5;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundToStep(value: number, step: number) {
  return Math.round(value / step) * step;
}

export function clampSectionWidthPercent(sectionWidthPercent: number) {
  return clamp(roundToStep(sectionWidthPercent, SECTION_WIDTH_STEP_PERCENT), 0, 100);
}

export function getSavedSectionWidthPercent(section: LyricsSection) {
  return clampSectionWidthPercent(section.sectionWidthPercent ?? DEFAULT_SECTION_WIDTH_PERCENT);
}
