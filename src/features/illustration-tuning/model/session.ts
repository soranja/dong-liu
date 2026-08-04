import {
  getSavedTimelineIllustrationKind,
  type TimelineProgressDetail,
  type TrackTuningAdapter,
} from '@entities/track/model/tuning';
import { parseLyricsTimestamp } from '@entities/track/lib/timestamp';
import { clampSectionWidthPercent, getSavedSectionWidthPercent } from '@entities/track/model/layout';
import type {
  IllustrationAnimation,
  IllustrationVisibility,
  LyricsBackground,
  LyricsSection,
} from '@entities/track/model/types';
import type { LyricsColorPreset } from '@shared/config/tuning';
import type { TextIllustrationKind } from '@shared/ui/illustration-animations/types';

type DraftAnimation = IllustrationAnimation | null;
type SessionListener = () => void;
type ProgressListener = (detail: TimelineProgressDetail) => void;

export type IllustrationTuningSession = Omit<TrackTuningAdapter, 'renderPanel'> & {
  clearDrafts: () => void;
  lyrics: readonly LyricsSection[];
  setDraftBackground: (sectionId: number, background: LyricsBackground | null) => void;
  setDraftBackgroundShared: (sectionId: number, shared: boolean) => void;
  setDraftIllustrationAnimation: (sectionId: number, animation: DraftAnimation) => void;
  setDraftIllustrationFadeInMs: (sectionId: number, fadeInMs: number) => void;
  setDraftIllustrationFadeOutMs: (sectionId: number, fadeOutMs: number) => void;
  setDraftIllustrationKind: (sectionId: number, illustrationKind: TextIllustrationKind) => void;
  setDraftIllustrationVisibility: (sectionId: number, visibility: IllustrationVisibility) => void;
  setDraftSectionContinuing: (sectionId: number, continuing: boolean) => void;
  setDraftSectionOverlay: (sectionId: number, isOverlay: boolean) => void;
  setDraftSectionStart: (sectionId: number, startTime: number) => void;
  setDraftSectionWidthPercent: (sectionId: number, sectionWidthPercent: number) => void;
  setDraftTextBackgroundColor: (sectionId: number, color: LyricsColorPreset | null) => void;
  setDraftTextBackgroundPaddingPx: (sectionId: number, paddingPx: number) => void;
  setDraftTextColor: (sectionId: number, textColor: LyricsColorPreset | null) => void;
  subscribeProgress: (listener: ProgressListener) => () => void;
  trackId: string;
};

export function createIllustrationTuningSession(
  trackId: string,
  lyrics: readonly LyricsSection[],
): IllustrationTuningSession {
  const draftBackgrounds = new Map<number, LyricsBackground | null>();
  const draftBackgroundShared = new Map<number, boolean>();
  const draftAnimations = new Map<number, DraftAnimation>();
  const draftContinuing = new Map<number, boolean>();
  const draftFadeInMs = new Map<number, number>();
  const draftFadeOutMs = new Map<number, number>();
  const draftIllustrationKinds = new Map<number, TextIllustrationKind>();
  const draftOverlays = new Map<number, boolean>();
  const draftSectionStarts = new Map<number, number>();
  const draftSectionWidthPercents = new Map<number, number>();
  const draftVisibilities = new Map<number, IllustrationVisibility>();
  const draftTextBackgroundColors = new Map<number, LyricsColorPreset | null>();
  const draftTextBackgroundPaddingPx = new Map<number, number>();
  const draftTextColors = new Map<number, LyricsColorPreset | null>();
  const listeners = new Set<SessionListener>();
  const progressListeners = new Set<ProgressListener>();

  const emit = () => {
    listeners.forEach((listener) => listener());
  };
  const setDraft = <T>(drafts: Map<number, T>, sectionId: number, value: T) => {
    drafts.set(sectionId, value);
    emit();
  };

  return {
    clearDrafts() {
      draftBackgrounds.clear();
      draftBackgroundShared.clear();
      draftAnimations.clear();
      draftContinuing.clear();
      draftFadeInMs.clear();
      draftFadeOutMs.clear();
      draftIllustrationKinds.clear();
      draftOverlays.clear();
      draftSectionStarts.clear();
      draftSectionWidthPercents.clear();
      draftVisibilities.clear();
      draftTextBackgroundColors.clear();
      draftTextBackgroundPaddingPx.clear();
      draftTextColors.clear();
      emit();
    },
    getBackground(section) {
      if (!draftBackgrounds.has(section.sectionId)) return section.background;

      return draftBackgrounds.get(section.sectionId) ?? undefined;
    },
    getBackgroundShared(section) {
      return draftBackgroundShared.get(section.sectionId) ?? Boolean(section.backgroundShared);
    },
    getIllustrationAnimation(section) {
      if (!draftAnimations.has(section.sectionId)) return section.illustrationAnimation;

      return draftAnimations.get(section.sectionId) ?? undefined;
    },
    getIllustrationFadeInMs(section) {
      return draftFadeInMs.get(section.sectionId) ?? section.illustrationFadeInMs ?? 0;
    },
    getIllustrationFadeOutMs(section) {
      return draftFadeOutMs.get(section.sectionId) ?? section.illustrationFadeOutMs ?? 0;
    },
    getIllustrationKind(section) {
      if (typeof section.illustrateWith !== 'string') return 'generic';

      return draftIllustrationKinds.get(section.sectionId) ?? getSavedTimelineIllustrationKind(lyrics, section);
    },
    getIllustrationVisibility(section) {
      if (draftOverlays.get(section.sectionId) ?? Boolean(section.isOverlay)) return 'only-active';

      return draftVisibilities.get(section.sectionId) ?? section.illustrationVisibility ?? 'adjacent';
    },
    getSectionContinuing(section) {
      return draftContinuing.get(section.sectionId) ?? Boolean(section.continuing);
    },
    getSectionOverlay(section) {
      return draftOverlays.get(section.sectionId) ?? Boolean(section.isOverlay);
    },
    getSectionStart(section) {
      return draftSectionStarts.get(section.sectionId) ?? parseLyricsTimestamp(section.timestamp);
    },
    getSectionWidthPercent(section) {
      return draftSectionWidthPercents.get(section.sectionId) ?? getSavedSectionWidthPercent(section);
    },
    getTextBackgroundColor(section) {
      if (!draftTextBackgroundColors.has(section.sectionId)) return section.textBackgroundColor;

      return draftTextBackgroundColors.get(section.sectionId) ?? undefined;
    },
    getTextBackgroundPaddingPx(section) {
      return draftTextBackgroundPaddingPx.get(section.sectionId) ?? section.textBackgroundPaddingPx ?? 0;
    },
    getTextColor(section) {
      if (!draftTextColors.has(section.sectionId)) return section.textColor;

      return draftTextColors.get(section.sectionId) ?? undefined;
    },
    lyrics,
    publishTimelineProgress(detail) {
      progressListeners.forEach((listener) => listener(detail));
    },
    setDraftBackground(sectionId, background) {
      setDraft(draftBackgrounds, sectionId, background);
    },
    setDraftBackgroundShared(sectionId, shared) {
      setDraft(draftBackgroundShared, sectionId, shared);
    },
    setDraftIllustrationAnimation(sectionId, animation) {
      setDraft(draftAnimations, sectionId, animation);
    },
    setDraftIllustrationFadeInMs(sectionId, fadeInMs) {
      setDraft(draftFadeInMs, sectionId, fadeInMs);
    },
    setDraftIllustrationFadeOutMs(sectionId, fadeOutMs) {
      setDraft(draftFadeOutMs, sectionId, fadeOutMs);
    },
    setDraftIllustrationKind(sectionId, illustrationKind) {
      setDraft(draftIllustrationKinds, sectionId, illustrationKind);
    },
    setDraftIllustrationVisibility(sectionId, visibility) {
      setDraft(draftVisibilities, sectionId, visibility);
    },
    setDraftSectionContinuing(sectionId, continuing) {
      setDraft(draftContinuing, sectionId, continuing);
    },
    setDraftSectionOverlay(sectionId, isOverlay) {
      setDraft(draftOverlays, sectionId, isOverlay);
    },
    setDraftSectionStart(sectionId, startTime) {
      setDraft(draftSectionStarts, sectionId, startTime);
    },
    setDraftSectionWidthPercent(sectionId, sectionWidthPercent) {
      setDraft(draftSectionWidthPercents, sectionId, clampSectionWidthPercent(sectionWidthPercent));
    },
    setDraftTextBackgroundColor(sectionId, color) {
      setDraft(draftTextBackgroundColors, sectionId, color);
    },
    setDraftTextBackgroundPaddingPx(sectionId, paddingPx) {
      setDraft(draftTextBackgroundPaddingPx, sectionId, paddingPx);
    },
    setDraftTextColor(sectionId, textColor) {
      setDraft(draftTextColors, sectionId, textColor);
    },
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    subscribeProgress(listener) {
      progressListeners.add(listener);

      return () => {
        progressListeners.delete(listener);
      };
    },
    trackId,
  };
}
