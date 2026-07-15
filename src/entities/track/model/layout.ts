import type { LyricsSection } from './types';
import {
  DEFAULT_SECTION_WIDTH_PERCENT,
  SECTION_WIDTH_STEP_PERCENT,
  TUNING_PERCENT_MAX,
  TUNING_PERCENT_MIN,
} from '@shared/config/tuning';

export { DEFAULT_SECTION_WIDTH_PERCENT, SECTION_WIDTH_STEP_PERCENT } from '@shared/config/tuning';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundToStep(value: number, step: number) {
  return Math.round(value / step) * step;
}

export function clampSectionWidthPercent(sectionWidthPercent: number) {
  return clamp(roundToStep(sectionWidthPercent, SECTION_WIDTH_STEP_PERCENT), TUNING_PERCENT_MIN, TUNING_PERCENT_MAX);
}

export function getSavedSectionWidthPercent(section: LyricsSection) {
  return clampSectionWidthPercent(section.sectionWidthPercent ?? DEFAULT_SECTION_WIDTH_PERCENT);
}
