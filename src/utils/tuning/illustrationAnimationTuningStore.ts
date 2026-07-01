import type { IllustrationAnimation, IllustrationVisibility, LyricsSection } from "../../lyrics/types";
import {
  clampSectionWidthPercent,
  clampSlideMotionDurationMs,
  getSavedEnterDurationMs,
  getSavedExitDurationMs,
  getSavedNoSlideBy,
  getSavedSectionWidthPercent,
} from "./sectionLayout";

type DraftAnimation = IllustrationAnimation | null;
type TuningListener = () => void;

const draftAnimations = new Map<number, DraftAnimation>();
const draftContinuing = new Map<number, boolean>();
const draftEnterDurationMs = new Map<number, number>();
const draftExitDurationMs = new Map<number, number>();
const draftFadeInMs = new Map<number, number>();
const draftFadeOutMs = new Map<number, number>();
const draftNoSlideBys = new Map<number, boolean>();
const draftOverlays = new Map<number, boolean>();
const draftSectionWidthPercents = new Map<number, number>();
const draftVisibilities = new Map<number, IllustrationVisibility>();
const listeners = new Set<TuningListener>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getEffectiveIllustrationAnimation(section: LyricsSection) {
  if (!draftAnimations.has(section.sectionId)) return section.illustrationAnimation;

  return draftAnimations.get(section.sectionId) ?? undefined;
}

export function getEffectiveSectionContinuing(section: LyricsSection) {
  return draftContinuing.get(section.sectionId) ?? Boolean(section.continuing);
}

export function getEffectiveSectionOverlay(section: LyricsSection) {
  return draftOverlays.get(section.sectionId) ?? Boolean(section.isOverlay);
}

export function getEffectiveSectionEnterDurationMs(section: LyricsSection) {
  return draftEnterDurationMs.get(section.sectionId) ?? getSavedEnterDurationMs(section);
}

export function getEffectiveSectionExitDurationMs(section: LyricsSection) {
  return draftExitDurationMs.get(section.sectionId) ?? getSavedExitDurationMs(section);
}

export function getEffectiveSectionNoSlideBy(section: LyricsSection) {
  return draftNoSlideBys.get(section.sectionId) ?? getSavedNoSlideBy(section);
}

export function getEffectiveSectionWidthPercent(section: LyricsSection) {
  return draftSectionWidthPercents.get(section.sectionId) ?? getSavedSectionWidthPercent(section);
}

export function getEffectiveIllustrationFadeInMs(section: LyricsSection) {
  return draftFadeInMs.get(section.sectionId) ?? section.illustrationFadeInMs ?? 0;
}

export function getEffectiveIllustrationFadeOutMs(section: LyricsSection) {
  return draftFadeOutMs.get(section.sectionId) ?? section.illustrationFadeOutMs ?? 0;
}

export function getEffectiveIllustrationVisibility(section: LyricsSection): IllustrationVisibility {
  if (getEffectiveSectionOverlay(section)) return "only-active";
  if (!draftVisibilities.has(section.sectionId)) return section.illustrationVisibility ?? "adjacent";

  return draftVisibilities.get(section.sectionId) ?? "adjacent";
}

export function setDraftIllustrationAnimation(sectionId: number, animation: DraftAnimation) {
  draftAnimations.set(sectionId, animation);
  emit();
}

export function setDraftSectionContinuing(sectionId: number, continuing: boolean) {
  draftContinuing.set(sectionId, continuing);
  emit();
}

export function setDraftSectionEnterDurationMs(sectionId: number, enterDurationMs: number) {
  draftEnterDurationMs.set(sectionId, clampSlideMotionDurationMs(enterDurationMs));
  emit();
}

export function setDraftSectionExitDurationMs(sectionId: number, exitDurationMs: number) {
  draftExitDurationMs.set(sectionId, clampSlideMotionDurationMs(exitDurationMs));
  emit();
}

export function setDraftSectionNoSlideBy(sectionId: number, noSlideBy: boolean) {
  draftNoSlideBys.set(sectionId, noSlideBy);
  emit();
}

export function setDraftIllustrationFadeInMs(sectionId: number, fadeInMs: number) {
  draftFadeInMs.set(sectionId, fadeInMs);
  emit();
}

export function setDraftIllustrationFadeOutMs(sectionId: number, fadeOutMs: number) {
  draftFadeOutMs.set(sectionId, fadeOutMs);
  emit();
}

export function setDraftSectionOverlay(sectionId: number, isOverlay: boolean) {
  draftOverlays.set(sectionId, isOverlay);
  emit();
}

export function setDraftSectionWidthPercent(sectionId: number, sectionWidthPercent: number) {
  draftSectionWidthPercents.set(sectionId, clampSectionWidthPercent(sectionWidthPercent));
  emit();
}

export function setDraftIllustrationVisibility(sectionId: number, visibility: IllustrationVisibility) {
  draftVisibilities.set(sectionId, visibility);
  emit();
}

export function subscribeIllustrationAnimationTuning(listener: TuningListener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
