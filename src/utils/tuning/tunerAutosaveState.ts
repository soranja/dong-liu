import type { IllustrationVisibility } from "../../entities/track/model/types";
import { RAM_BOX_LYRICS } from "../../pages/ram-box/model/lyrics";
import type { TextIllustrationKind } from "../../shared/ui/illustration-animations/types";
import { formatLyricsTimestamp, parseLyricsTimestamp } from "../lyrics";
import {
  areDirtyAnimationsEqual,
  getDirtyAnimation,
  getSavedAnimation,
  type DirtyAnimation,
  type DirtyAnimations,
} from "./animationSelection";
import { getSavedTimelineIllustrationKind, type TimelineIllustrationKind } from "./illustrationKind";
import {
  clampSectionWidthPercent,
  clampSlideMotionDurationMs,
  DEFAULT_SLIDE_MOTION_DURATION_MS,
  getSavedEnterDurationMs as getSavedEnterDurationMsForSection,
  getSavedExitDurationMs as getSavedExitDurationMsForSection,
  getSavedNoSlideBy as getSavedNoSlideByForSection,
  getSavedSectionWidthPercent as getSavedSectionWidthPercentForSection,
} from "./sectionLayout";

export { getSavedAnimation } from "./animationSelection";

export type DraftIllustrationKinds = Record<number, TextIllustrationKind>;
export type DraftIllustrationVisibilities = Record<number, IllustrationVisibility>;
export type DraftContinuings = Record<number, boolean>;
export type DraftFadeDurations = Record<number, number>;
export type DraftMotionDurations = Record<number, number>;
export type DraftNoSlideBys = Record<number, boolean>;
export type DraftOverlays = Record<number, boolean>;
export type DraftSectionWidthPercents = Record<number, number>;
export type DraftStartTimes = Record<number, number>;
export type PendingChange = {
  animation?: DirtyAnimation;
  enterDuration?: number;
  exitDuration?: number;
  fadeInMs?: number;
  fadeOutMs?: number;
  continuing?: boolean;
  hasAnimation?: boolean;
  hasEnterDuration?: boolean;
  hasExitDuration?: boolean;
  hasFadeInMs?: boolean;
  hasFadeOutMs?: boolean;
  hasContinuing?: boolean;
  hasIllustrationKind?: boolean;
  hasIllustrationVisibility?: boolean;
  hasNoSlideBy?: boolean;
  hasOverlay?: boolean;
  hasSectionWidthPercent?: boolean;
  illustrationKind?: TextIllustrationKind;
  illustrationVisibility?: IllustrationVisibility;
  isOverlay?: boolean;
  noSlideBy?: boolean;
  sectionWidthPercent?: number;
  timestamp?: number;
};
export type PendingChanges = Record<number, PendingChange>;
export type Snapshot = {
  animation: DirtyAnimation;
  continuing: boolean;
  endTime: number | null;
  enterDuration: number;
  exitDuration: number;
  fadeInMs: number;
  fadeOutMs: number;
  illustrationKind: TimelineIllustrationKind;
  illustrationVisibility: IllustrationVisibility;
  isOverlay: boolean;
  noSlideBy: boolean;
  sectionWidthPercent: number;
  startTime: number;
};
export type Snapshots = Record<number, Snapshot>;
export type SaveStatus =
  | "Autosave failed"
  | "Autosaved"
  | "Autosaving"
  | "Cached value"
  | "Pending autosave"
  | "Resetting";
export type StatusState = {
  label: SaveStatus;
  sectionId: number | null;
};

export const SAVE_ENDPOINT = "/__dong-liu/illustration-animation-settings";
export const AUTOSAVE_DELAY_MS = 300;
export const CACHED_SNAPSHOTS_STORAGE_KEY = "dong-liu:tuner-cached-snapshots";
export const FADE_TIMING_MAX_MS = 1000;
export const LINE_TIMING_STEP_SECONDS = 0.005;

export function clampFadeDuration(durationMs: number) {
  return Math.min(FADE_TIMING_MAX_MS, Math.max(0, Math.round(durationMs)));
}

export function getSavedStartTime(sectionId: number) {
  const timestamp = RAM_BOX_LYRICS.find((section) => section.sectionId === sectionId)?.timestamp;

  return timestamp ? parseLyricsTimestamp(timestamp) : 0;
}

export function getSavedIllustrationKind(sectionId: number) {
  const section = RAM_BOX_LYRICS.find((candidate) => candidate.sectionId === sectionId);

  return section ? getSavedTimelineIllustrationKind(RAM_BOX_LYRICS, section) : "generic";
}

export function getSavedContinuing(sectionId: number) {
  return Boolean(RAM_BOX_LYRICS.find((section) => section.sectionId === sectionId)?.continuing);
}

export function getSavedIllustrationVisibility(sectionId: number): IllustrationVisibility {
  return RAM_BOX_LYRICS.find((section) => section.sectionId === sectionId)?.illustrationVisibility ?? "adjacent";
}

export function getSavedOverlay(sectionId: number) {
  return Boolean(RAM_BOX_LYRICS.find((section) => section.sectionId === sectionId)?.isOverlay);
}

export function getSavedNoSlideBy(sectionId: number) {
  const section = RAM_BOX_LYRICS.find((candidate) => candidate.sectionId === sectionId);

  return section ? getSavedNoSlideByForSection(section) : false;
}

export function getSavedFadeInMs(sectionId: number) {
  return clampFadeDuration(
    RAM_BOX_LYRICS.find((section) => section.sectionId === sectionId)?.illustrationFadeInMs ?? 0,
  );
}

export function getSavedFadeOutMs(sectionId: number) {
  return clampFadeDuration(
    RAM_BOX_LYRICS.find((section) => section.sectionId === sectionId)?.illustrationFadeOutMs ?? 0,
  );
}

export function getSavedEnterDurationMs(sectionId: number) {
  const section = RAM_BOX_LYRICS.find((candidate) => candidate.sectionId === sectionId);

  return section ? getSavedEnterDurationMsForSection(section) : DEFAULT_SLIDE_MOTION_DURATION_MS;
}

export function getSavedExitDurationMs(sectionId: number) {
  const section = RAM_BOX_LYRICS.find((candidate) => candidate.sectionId === sectionId);

  return section ? getSavedExitDurationMsForSection(section) : DEFAULT_SLIDE_MOTION_DURATION_MS;
}

export function getSavedSectionWidthPercent(sectionId: number) {
  const section = RAM_BOX_LYRICS.find((candidate) => candidate.sectionId === sectionId);

  return section ? getSavedSectionWidthPercentForSection(section) : 90;
}

export function getCurrentAnimation(draftAnimations: DirtyAnimations, sectionId: number) {
  const draftAnimation = getDirtyAnimation(draftAnimations, sectionId);

  return draftAnimation !== undefined ? draftAnimation : getSavedAnimation(sectionId);
}

export function getCurrentContinuing(draftContinuings: DraftContinuings, sectionId: number) {
  return draftContinuings[sectionId] ?? getSavedContinuing(sectionId);
}

export function getCurrentIllustrationVisibility(
  draftIllustrationVisibilities: DraftIllustrationVisibilities,
  sectionId: number,
) {
  return draftIllustrationVisibilities[sectionId] ?? getSavedIllustrationVisibility(sectionId);
}

export function getCurrentIllustrationKind(draftIllustrationKinds: DraftIllustrationKinds, sectionId: number) {
  const section = RAM_BOX_LYRICS.find((candidate) => candidate.sectionId === sectionId);
  if (!section || typeof section.illustrateWith !== "string") return "generic";

  return draftIllustrationKinds[sectionId] ?? getSavedTimelineIllustrationKind(RAM_BOX_LYRICS, section);
}

export function getCurrentOverlay(draftOverlays: DraftOverlays, sectionId: number) {
  return draftOverlays[sectionId] ?? getSavedOverlay(sectionId);
}

export function getCurrentNoSlideBy(draftNoSlideBys: DraftNoSlideBys, sectionId: number) {
  return draftNoSlideBys[sectionId] ?? getSavedNoSlideBy(sectionId);
}

export function getCurrentEnterDurationMs(draftEnterDurationMs: DraftMotionDurations, sectionId: number) {
  return draftEnterDurationMs[sectionId] ?? getSavedEnterDurationMs(sectionId);
}

export function getCurrentExitDurationMs(draftExitDurationMs: DraftMotionDurations, sectionId: number) {
  return draftExitDurationMs[sectionId] ?? getSavedExitDurationMs(sectionId);
}

export function getCurrentSectionWidthPercent(draftSectionWidthPercents: DraftSectionWidthPercents, sectionId: number) {
  return draftSectionWidthPercents[sectionId] ?? getSavedSectionWidthPercent(sectionId);
}

export function getCurrentFadeInMs(draftFadeInMs: DraftFadeDurations, sectionId: number) {
  return draftFadeInMs[sectionId] ?? getSavedFadeInMs(sectionId);
}

export function getCurrentFadeOutMs(draftFadeOutMs: DraftFadeDurations, sectionId: number) {
  return draftFadeOutMs[sectionId] ?? getSavedFadeOutMs(sectionId);
}

export function getDraftStartTime(draftStartTimes: DraftStartTimes, index: number) {
  const sectionId = RAM_BOX_LYRICS[index]?.sectionId;
  if (!sectionId) return 0;

  return draftStartTimes[sectionId] ?? getSavedStartTime(sectionId);
}

export function readCachedSnapshots() {
  if (typeof window === "undefined") return {};

  try {
    return JSON.parse(window.sessionStorage.getItem(CACHED_SNAPSHOTS_STORAGE_KEY) ?? "{}") as Snapshots;
  } catch {
    return {};
  }
}

export function writeCachedSnapshots(snapshots: Snapshots) {
  window.sessionStorage.setItem(CACHED_SNAPSHOTS_STORAGE_KEY, JSON.stringify(snapshots));
}

function normalizeCachedAnimation(animation: DirtyAnimation) {
  const cachedVariant = (animation as { variant?: string } | null)?.variant;

  return cachedVariant === "static" ? ({ variant: "instant" } satisfies DirtyAnimation) : animation;
}

function normalizeIllustrationVisibility(value: unknown): IllustrationVisibility {
  if (value === "adjacent" || value === "only-active" || value === "start-active" || value === "active-end") {
    return value;
  }
  if (value === "active-trailing") return "active-end";

  return "adjacent";
}

export function normalizeCachedSnapshot(sectionId: number, cachedSnapshot: Snapshot): Snapshot {
  const snapshot = cachedSnapshot as Partial<Snapshot> & { illustrationVisibility?: unknown };
  const animation = normalizeCachedAnimation(snapshot.animation ?? getSavedAnimation(sectionId));

  return {
    animation,
    continuing: typeof snapshot.continuing === "boolean" ? snapshot.continuing : getSavedContinuing(sectionId),
    endTime: typeof snapshot.endTime === "number" ? snapshot.endTime : null,
    enterDuration: clampSlideMotionDurationMs(snapshot.enterDuration ?? getSavedEnterDurationMs(sectionId)),
    exitDuration: clampSlideMotionDurationMs(snapshot.exitDuration ?? getSavedExitDurationMs(sectionId)),
    fadeInMs: clampFadeDuration(snapshot.fadeInMs ?? getSavedFadeInMs(sectionId)),
    fadeOutMs: clampFadeDuration(snapshot.fadeOutMs ?? getSavedFadeOutMs(sectionId)),
    illustrationKind: snapshot.illustrationKind ?? getSavedIllustrationKind(sectionId),
    illustrationVisibility: normalizeIllustrationVisibility(snapshot.illustrationVisibility),
    isOverlay: typeof snapshot.isOverlay === "boolean" ? snapshot.isOverlay : getSavedOverlay(sectionId),
    noSlideBy: typeof snapshot.noSlideBy === "boolean" ? snapshot.noSlideBy : getSavedNoSlideBy(sectionId),
    sectionWidthPercent: clampSectionWidthPercent(
      snapshot.sectionWidthPercent ?? getSavedSectionWidthPercent(sectionId),
    ),
    startTime: typeof snapshot.startTime === "number" ? snapshot.startTime : getSavedStartTime(sectionId),
  };
}

function roundToStep(time: number) {
  return Math.round(time / LINE_TIMING_STEP_SECONDS) * LINE_TIMING_STEP_SECONDS;
}

export function clampTime(time: number, min: number, max: number) {
  return Math.min(max, Math.max(min, roundToStep(time)));
}

export function arePendingChangesEqual(left: PendingChange | undefined, right: PendingChange | undefined) {
  if (!left || !right) return left === right;
  if (left.timestamp !== right.timestamp) return false;
  if (left.hasContinuing !== right.hasContinuing) return false;
  if (left.hasContinuing && left.continuing !== right.continuing) return false;
  if (left.hasEnterDuration !== right.hasEnterDuration) return false;
  if (left.hasEnterDuration && left.enterDuration !== right.enterDuration) return false;
  if (left.hasExitDuration !== right.hasExitDuration) return false;
  if (left.hasExitDuration && left.exitDuration !== right.exitDuration) return false;
  if (left.hasFadeInMs !== right.hasFadeInMs) return false;
  if (left.hasFadeInMs && left.fadeInMs !== right.fadeInMs) return false;
  if (left.hasFadeOutMs !== right.hasFadeOutMs) return false;
  if (left.hasFadeOutMs && left.fadeOutMs !== right.fadeOutMs) return false;
  if (left.hasOverlay !== right.hasOverlay) return false;
  if (left.hasOverlay && left.isOverlay !== right.isOverlay) return false;
  if (left.hasAnimation !== right.hasAnimation) return false;
  if (left.hasIllustrationKind !== right.hasIllustrationKind) return false;
  if (left.hasIllustrationKind && left.illustrationKind !== right.illustrationKind) return false;
  if (left.hasIllustrationVisibility !== right.hasIllustrationVisibility) return false;
  if (left.hasIllustrationVisibility && left.illustrationVisibility !== right.illustrationVisibility) return false;
  if (left.hasNoSlideBy !== right.hasNoSlideBy) return false;
  if (left.hasNoSlideBy && left.noSlideBy !== right.noSlideBy) return false;
  if (left.hasSectionWidthPercent !== right.hasSectionWidthPercent) return false;
  if (left.hasSectionWidthPercent && left.sectionWidthPercent !== right.sectionWidthPercent) return false;
  if (!left.hasAnimation) return true;

  return areDirtyAnimationsEqual(left.animation, right.animation);
}

export function createSaveBody(changes: Array<[string, PendingChange]>) {
  return JSON.stringify({
    changes: changes.map(([sectionId, change]) => ({
      ...(change.hasAnimation ? { illustrationAnimation: change.animation } : {}),
      ...(change.hasContinuing ? { continuing: change.continuing } : {}),
      ...(change.hasEnterDuration ? { enterDuration: change.enterDuration } : {}),
      ...(change.hasExitDuration ? { exitDuration: change.exitDuration } : {}),
      ...(change.hasFadeInMs ? { illustrationFadeInMs: change.fadeInMs } : {}),
      ...(change.hasFadeOutMs ? { illustrationFadeOutMs: change.fadeOutMs } : {}),
      ...(change.hasIllustrationKind ? { illustrationKind: change.illustrationKind } : {}),
      ...(change.hasIllustrationVisibility ? { illustrationVisibility: change.illustrationVisibility } : {}),
      ...(change.hasNoSlideBy ? { noSlideBy: change.noSlideBy } : {}),
      ...(change.hasOverlay ? { isOverlay: change.isOverlay } : {}),
      ...(change.hasSectionWidthPercent ? { sectionWidthPercent: change.sectionWidthPercent } : {}),
      ...(change.timestamp !== undefined ? { timestamp: formatLyricsTimestamp(change.timestamp) } : {}),
      sectionId: Number(sectionId),
    })),
  });
}
