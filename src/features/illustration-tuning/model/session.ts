import {
  getSavedTimelineIllustrationKind,
  parseLyricsTimestamp,
  type TimelineProgressDetail,
  type TrackTuningAdapter,
} from "@entities/track/model/tuning";
import {
  clampSectionWidthPercent,
  clampSlideMotionDurationMs,
  getSavedEnterDurationMs,
  getSavedExitDurationMs,
  getSavedNoSlideBy,
  getSavedSectionWidthPercent,
} from "@entities/track/model/layout";
import type { IllustrationAnimation, IllustrationVisibility, LyricsSection } from "@entities/track/model/types";
import type { TextIllustrationKind } from "@shared/ui/illustration-animations/types";

type DraftAnimation = IllustrationAnimation | null;
type SessionListener = () => void;
type ProgressListener = (detail: TimelineProgressDetail) => void;

export type IllustrationTuningSession = Omit<TrackTuningAdapter, "renderPanel"> & {
  lyrics: readonly LyricsSection[];
  setDraftIllustrationAnimation: (sectionId: number, animation: DraftAnimation) => void;
  setDraftIllustrationFadeInMs: (sectionId: number, fadeInMs: number) => void;
  setDraftIllustrationFadeOutMs: (sectionId: number, fadeOutMs: number) => void;
  setDraftIllustrationKind: (sectionId: number, illustrationKind: TextIllustrationKind) => void;
  setDraftIllustrationVisibility: (sectionId: number, visibility: IllustrationVisibility) => void;
  setDraftSectionContinuing: (sectionId: number, continuing: boolean) => void;
  setDraftSectionEnterDurationMs: (sectionId: number, enterDurationMs: number) => void;
  setDraftSectionExitDurationMs: (sectionId: number, exitDurationMs: number) => void;
  setDraftSectionNoSlideBy: (sectionId: number, noSlideBy: boolean) => void;
  setDraftSectionOverlay: (sectionId: number, isOverlay: boolean) => void;
  setDraftSectionStart: (sectionId: number, startTime: number) => void;
  setDraftSectionWidthPercent: (sectionId: number, sectionWidthPercent: number) => void;
  subscribeProgress: (listener: ProgressListener) => () => void;
  trackId: string;
};

export function createIllustrationTuningSession(
  trackId: string,
  lyrics: readonly LyricsSection[],
): IllustrationTuningSession {
  const draftAnimations = new Map<number, DraftAnimation>();
  const draftContinuing = new Map<number, boolean>();
  const draftEnterDurationMs = new Map<number, number>();
  const draftExitDurationMs = new Map<number, number>();
  const draftFadeInMs = new Map<number, number>();
  const draftFadeOutMs = new Map<number, number>();
  const draftIllustrationKinds = new Map<number, TextIllustrationKind>();
  const draftNoSlideBys = new Map<number, boolean>();
  const draftOverlays = new Map<number, boolean>();
  const draftSectionStarts = new Map<number, number>();
  const draftSectionWidthPercents = new Map<number, number>();
  const draftVisibilities = new Map<number, IllustrationVisibility>();
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
      if (typeof section.illustrateWith !== "string") return "generic";

      return draftIllustrationKinds.get(section.sectionId) ?? getSavedTimelineIllustrationKind(lyrics, section);
    },
    getIllustrationVisibility(section) {
      if (draftOverlays.get(section.sectionId) ?? Boolean(section.isOverlay)) return "only-active";

      return draftVisibilities.get(section.sectionId) ?? section.illustrationVisibility ?? "adjacent";
    },
    getSectionContinuing(section) {
      return draftContinuing.get(section.sectionId) ?? Boolean(section.continuing);
    },
    getSectionEnterDurationMs(section) {
      return draftEnterDurationMs.get(section.sectionId) ?? getSavedEnterDurationMs(section);
    },
    getSectionExitDurationMs(section) {
      return draftExitDurationMs.get(section.sectionId) ?? getSavedExitDurationMs(section);
    },
    getSectionNoSlideBy(section) {
      return draftNoSlideBys.get(section.sectionId) ?? getSavedNoSlideBy(section);
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
    lyrics,
    publishTimelineProgress(detail) {
      progressListeners.forEach((listener) => listener(detail));
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
    setDraftSectionEnterDurationMs(sectionId, enterDurationMs) {
      setDraft(draftEnterDurationMs, sectionId, clampSlideMotionDurationMs(enterDurationMs));
    },
    setDraftSectionExitDurationMs(sectionId, exitDurationMs) {
      setDraft(draftExitDurationMs, sectionId, clampSlideMotionDurationMs(exitDurationMs));
    },
    setDraftSectionNoSlideBy(sectionId, noSlideBy) {
      setDraft(draftNoSlideBys, sectionId, noSlideBy);
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
