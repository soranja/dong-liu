import { formatLyricsTimestamp, parseLyricsTimestamp } from '@entities/track/lib/timestamp';
import { getSavedTimelineIllustrationKind, type TimelineIllustrationKind } from '@entities/track/model/tuning';
import type { IllustrationVisibility, LyricsBackground } from '@entities/track/model/types';
import type { TextIllustrationKind } from '@shared/ui/illustration-animations/types';
import { getDirtyAnimation, getSavedAnimation, type DirtyAnimation, type DirtyAnimations } from './animationSelection';
import {
  DEFAULT_SECTION_WIDTH_PERCENT,
  getSavedSectionWidthPercent as getSavedSectionWidthPercentForSection,
} from '@entities/track/model/layout';
import { FADE_TIMING_MAX_MS, TEXT_BACKGROUND_PADDING_MAX_PX } from '@shared/config/tuning';
import type { LyricsColorPreset } from '@shared/config/tuning';
import type { IllustrationTuningSession } from './session';

export type DraftIllustrationKinds = Record<number, TextIllustrationKind>;
export type DraftIllustrationVisibilities = Record<number, IllustrationVisibility>;
export type DraftBackgrounds = Record<number, LyricsBackground | null>;
export type DraftBackgroundShared = Record<number, boolean>;
export type DraftContinuings = Record<number, boolean>;
export type DraftFadeDurations = Record<number, number>;
export type DraftOverlays = Record<number, boolean>;
export type DraftSectionWidthPercents = Record<number, number>;
export type DraftStartTimes = Record<number, number>;
export type DraftTextBackgroundColors = Record<number, LyricsColorPreset | null>;
export type DraftTextBackgroundPaddingPx = Record<number, number>;
export type DraftTextColors = Record<number, LyricsColorPreset | null>;
export type PendingChange = {
  animation?: DirtyAnimation;
  background?: LyricsBackground | null;
  backgroundShared?: boolean;
  fadeInMs?: number;
  fadeOutMs?: number;
  continuing?: boolean;
  hasAnimation?: boolean;
  hasBackground?: boolean;
  hasBackgroundShared?: boolean;
  hasFadeInMs?: boolean;
  hasFadeOutMs?: boolean;
  hasContinuing?: boolean;
  hasIllustrationKind?: boolean;
  hasIllustrationVisibility?: boolean;
  hasOverlay?: boolean;
  hasSectionWidthPercent?: boolean;
  hasTextBackgroundColor?: boolean;
  hasTextBackgroundPaddingPx?: boolean;
  hasTextColor?: boolean;
  illustrationKind?: TextIllustrationKind;
  illustrationVisibility?: IllustrationVisibility;
  isOverlay?: boolean;
  sectionWidthPercent?: number;
  timestamp?: number;
  textBackgroundColor?: LyricsColorPreset | null;
  textBackgroundPaddingPx?: number;
  textColor?: LyricsColorPreset | null;
};
export type PendingChanges = Record<number, PendingChange>;
export type Snapshot = {
  animation: DirtyAnimation;
  background: LyricsBackground | null;
  backgroundShared: boolean;
  continuing: boolean;
  endTime: number | null;
  fadeInMs: number;
  fadeOutMs: number;
  illustrationKind: TimelineIllustrationKind;
  illustrationVisibility: IllustrationVisibility;
  isOverlay: boolean;
  sectionWidthPercent: number;
  startTime: number;
  textBackgroundColor: LyricsColorPreset | null;
  textBackgroundPaddingPx: number;
  textColor: LyricsColorPreset | null;
};
export type SaveStatus = 'Register failed' | 'Registering' | 'Registered' | 'Reset' | 'Unsaved changes';

export { FADE_TIMING_MAX_MS } from '@shared/config/tuning';
export const LINE_TIMING_STEP_SECONDS = 0.005;

export function clampFadeDuration(durationMs: number) {
  return Math.min(FADE_TIMING_MAX_MS, Math.max(0, Math.round(durationMs)));
}

export function clampTextBackgroundPaddingPx(paddingPx: number) {
  return Math.min(TEXT_BACKGROUND_PADDING_MAX_PX, Math.max(0, Math.round(paddingPx)));
}

export function getSavedStartTime(session: IllustrationTuningSession, sectionId: number) {
  const timestamp = session.lyrics.find((section) => section.sectionId === sectionId)?.timestamp;

  return timestamp ? parseLyricsTimestamp(timestamp) : 0;
}

export function getSavedBackground(session: IllustrationTuningSession, sectionId: number) {
  return session.lyrics.find((section) => section.sectionId === sectionId)?.background ?? null;
}

export function getSavedBackgroundShared(session: IllustrationTuningSession, sectionId: number) {
  return Boolean(session.lyrics.find((section) => section.sectionId === sectionId)?.backgroundShared);
}

export function getSavedTextColor(session: IllustrationTuningSession, sectionId: number) {
  return session.lyrics.find((section) => section.sectionId === sectionId)?.textColor ?? null;
}

export function getSavedTextBackgroundColor(session: IllustrationTuningSession, sectionId: number) {
  return session.lyrics.find((section) => section.sectionId === sectionId)?.textBackgroundColor ?? null;
}

export function getSavedTextBackgroundPaddingPx(session: IllustrationTuningSession, sectionId: number) {
  return clampTextBackgroundPaddingPx(
    session.lyrics.find((section) => section.sectionId === sectionId)?.textBackgroundPaddingPx ?? 0,
  );
}

export function areBackgroundsEqual(left: LyricsBackground | null, right: LyricsBackground | null) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function getSavedIllustrationKind(session: IllustrationTuningSession, sectionId: number) {
  const section = session.lyrics.find((candidate) => candidate.sectionId === sectionId);

  return section ? getSavedTimelineIllustrationKind(session.lyrics, section) : 'generic';
}

export function getSavedContinuing(session: IllustrationTuningSession, sectionId: number) {
  return Boolean(session.lyrics.find((section) => section.sectionId === sectionId)?.continuing);
}

export function getSavedIllustrationVisibility(
  session: IllustrationTuningSession,
  sectionId: number,
): IllustrationVisibility {
  return session.lyrics.find((section) => section.sectionId === sectionId)?.illustrationVisibility ?? 'adjacent';
}

export function getSavedOverlay(session: IllustrationTuningSession, sectionId: number) {
  return Boolean(session.lyrics.find((section) => section.sectionId === sectionId)?.isOverlay);
}

export function getSavedFadeInMs(session: IllustrationTuningSession, sectionId: number) {
  return clampFadeDuration(
    session.lyrics.find((section) => section.sectionId === sectionId)?.illustrationFadeInMs ?? 0,
  );
}

export function getSavedFadeOutMs(session: IllustrationTuningSession, sectionId: number) {
  return clampFadeDuration(
    session.lyrics.find((section) => section.sectionId === sectionId)?.illustrationFadeOutMs ?? 0,
  );
}

export function getSavedSectionWidthPercent(session: IllustrationTuningSession, sectionId: number) {
  const section = session.lyrics.find((candidate) => candidate.sectionId === sectionId);

  return section ? getSavedSectionWidthPercentForSection(section) : DEFAULT_SECTION_WIDTH_PERCENT;
}

export function getCurrentAnimation(
  session: IllustrationTuningSession,
  draftAnimations: DirtyAnimations,
  sectionId: number,
) {
  const draftAnimation = getDirtyAnimation(draftAnimations, sectionId);

  return draftAnimation !== undefined ? draftAnimation : getSavedAnimation(session.lyrics, sectionId);
}

export function getCurrentBackground(
  session: IllustrationTuningSession,
  draftBackgrounds: DraftBackgrounds,
  sectionId: number,
) {
  return Object.hasOwn(draftBackgrounds, sectionId)
    ? draftBackgrounds[sectionId]
    : getSavedBackground(session, sectionId);
}

export function getCurrentBackgroundShared(
  session: IllustrationTuningSession,
  draftBackgroundShared: DraftBackgroundShared,
  sectionId: number,
) {
  return draftBackgroundShared[sectionId] ?? getSavedBackgroundShared(session, sectionId);
}

export function getCurrentTextColor(
  session: IllustrationTuningSession,
  draftTextColors: DraftTextColors,
  sectionId: number,
) {
  return Object.hasOwn(draftTextColors, sectionId)
    ? draftTextColors[sectionId]
    : getSavedTextColor(session, sectionId);
}

export function getCurrentTextBackgroundColor(
  session: IllustrationTuningSession,
  drafts: DraftTextBackgroundColors,
  sectionId: number,
) {
  return Object.hasOwn(drafts, sectionId) ? drafts[sectionId] : getSavedTextBackgroundColor(session, sectionId);
}

export function getCurrentTextBackgroundPaddingPx(
  session: IllustrationTuningSession,
  drafts: DraftTextBackgroundPaddingPx,
  sectionId: number,
) {
  return drafts[sectionId] ?? getSavedTextBackgroundPaddingPx(session, sectionId);
}

export function getCurrentContinuing(
  session: IllustrationTuningSession,
  draftContinuings: DraftContinuings,
  sectionId: number,
) {
  return draftContinuings[sectionId] ?? getSavedContinuing(session, sectionId);
}

export function getCurrentIllustrationVisibility(
  session: IllustrationTuningSession,
  draftIllustrationVisibilities: DraftIllustrationVisibilities,
  sectionId: number,
) {
  return draftIllustrationVisibilities[sectionId] ?? getSavedIllustrationVisibility(session, sectionId);
}

export function getCurrentIllustrationKind(
  session: IllustrationTuningSession,
  draftIllustrationKinds: DraftIllustrationKinds,
  sectionId: number,
) {
  const section = session.lyrics.find((candidate) => candidate.sectionId === sectionId);
  if (!section || typeof section.illustrateWith !== 'string') return 'generic';

  return draftIllustrationKinds[sectionId] ?? getSavedTimelineIllustrationKind(session.lyrics, section);
}

export function getCurrentOverlay(session: IllustrationTuningSession, draftOverlays: DraftOverlays, sectionId: number) {
  return draftOverlays[sectionId] ?? getSavedOverlay(session, sectionId);
}

export function getCurrentSectionWidthPercent(
  session: IllustrationTuningSession,
  draftSectionWidthPercents: DraftSectionWidthPercents,
  sectionId: number,
) {
  return draftSectionWidthPercents[sectionId] ?? getSavedSectionWidthPercent(session, sectionId);
}

export function getCurrentFadeInMs(
  session: IllustrationTuningSession,
  draftFadeInMs: DraftFadeDurations,
  sectionId: number,
) {
  return draftFadeInMs[sectionId] ?? getSavedFadeInMs(session, sectionId);
}

export function getCurrentFadeOutMs(
  session: IllustrationTuningSession,
  draftFadeOutMs: DraftFadeDurations,
  sectionId: number,
) {
  return draftFadeOutMs[sectionId] ?? getSavedFadeOutMs(session, sectionId);
}

export function getDraftStartTime(session: IllustrationTuningSession, draftStartTimes: DraftStartTimes, index: number) {
  const sectionId = session.lyrics[index]?.sectionId;
  if (!sectionId) return 0;

  return draftStartTimes[sectionId] ?? getSavedStartTime(session, sectionId);
}

function roundToStep(time: number) {
  return Math.round(time / LINE_TIMING_STEP_SECONDS) * LINE_TIMING_STEP_SECONDS;
}

export function clampTime(time: number, min: number, max: number) {
  return Math.min(max, Math.max(min, roundToStep(time)));
}

export function createSaveBody(trackId: string, changes: Array<[string, PendingChange]>) {
  return JSON.stringify({
    changes: changes.map(([sectionId, change]) => ({
      ...(change.hasAnimation ? { illustrationAnimation: change.animation } : {}),
      ...(change.hasBackground ? { background: change.background } : {}),
      ...(change.hasBackgroundShared ? { backgroundShared: change.backgroundShared } : {}),
      ...(change.hasContinuing ? { continuing: change.continuing } : {}),
      ...(change.hasFadeInMs ? { illustrationFadeInMs: change.fadeInMs } : {}),
      ...(change.hasFadeOutMs ? { illustrationFadeOutMs: change.fadeOutMs } : {}),
      ...(change.hasIllustrationKind ? { illustrationKind: change.illustrationKind } : {}),
      ...(change.hasIllustrationVisibility ? { illustrationVisibility: change.illustrationVisibility } : {}),
      ...(change.hasOverlay ? { isOverlay: change.isOverlay } : {}),
      ...(change.hasSectionWidthPercent ? { sectionWidthPercent: change.sectionWidthPercent } : {}),
      ...(change.hasTextBackgroundColor ? { textBackgroundColor: change.textBackgroundColor } : {}),
      ...(change.hasTextBackgroundPaddingPx
        ? { textBackgroundPaddingPx: change.textBackgroundPaddingPx }
        : {}),
      ...(change.hasTextColor ? { textColor: change.textColor } : {}),
      ...(change.timestamp !== undefined ? { timestamp: formatLyricsTimestamp(change.timestamp) } : {}),
      sectionId: Number(sectionId),
    })),
    trackId,
  });
}
