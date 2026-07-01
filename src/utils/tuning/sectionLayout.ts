import { isAnimationShell } from "../../components/illustrations/AnimationShell";
import type { LyricsSection } from "../../lyrics/types";

export const DEFAULT_SECTION_WIDTH_PERCENT = 90;
export const SECTION_WIDTH_STEP_PERCENT = 5;
export const DEFAULT_SLIDE_MOTION_DURATION_MS = 150;
export const SLIDE_MOTION_DURATION_MAX_MS = 1000;
export const SLIDE_MOTION_DURATION_STEP_MS = 50;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundToStep(value: number, step: number) {
  return Math.round(value / step) * step;
}

export function clampSectionWidthPercent(sectionWidthPercent: number) {
  return clamp(roundToStep(sectionWidthPercent, SECTION_WIDTH_STEP_PERCENT), 0, 100);
}

export function clampSlideMotionDurationMs(durationMs: number) {
  return clamp(Math.round(durationMs), 0, SLIDE_MOTION_DURATION_MAX_MS);
}

export function getSavedSectionWidthPercent(section: LyricsSection) {
  return clampSectionWidthPercent(section.sectionWidthPercent ?? DEFAULT_SECTION_WIDTH_PERCENT);
}

export function getSavedEnterDurationMs(section: LyricsSection) {
  return clampSlideMotionDurationMs(section.enterDuration ?? DEFAULT_SLIDE_MOTION_DURATION_MS);
}

export function getSavedExitDurationMs(section: LyricsSection) {
  return clampSlideMotionDurationMs(section.exitDuration ?? DEFAULT_SLIDE_MOTION_DURATION_MS);
}

export function getSavedNoSlideBy(section: LyricsSection) {
  return section.noSlideBy ?? isAnimationShell(section.illustrateWith);
}
