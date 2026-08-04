import { useCallback, useState } from 'react';
import { getBackgroundSectionIndex, resolveBackground, supportsBackground } from '@entities/track/lib/background';
import { clampSectionWidthPercent } from '@entities/track/model/layout';
import { ILLUSTRATION_TUNING_ENDPOINT } from '@shared/config/tuning';
import type { LyricsColorPreset } from '@shared/config/tuning';
import type { IllustrationVisibility, LyricsBackground } from '@entities/track/model/types';
import type { TextIllustrationKind } from '@shared/ui/illustration-animations/types';
import {
  areDirtyAnimationsEqual,
  getEffectiveAnimation,
  getSavedAnimation,
  type DirtyAnimation,
  type DirtyAnimations,
} from './animationSelection';
import type { IllustrationTuningSession } from './session';
import {
  areBackgroundsEqual,
  clampFadeDuration,
  clampTextBackgroundPaddingPx,
  clampTime,
  getCurrentAnimation,
  getCurrentBackground,
  getCurrentBackgroundShared,
  getCurrentContinuing,
  getCurrentFadeInMs,
  getCurrentFadeOutMs,
  getCurrentIllustrationKind,
  getCurrentIllustrationVisibility,
  getCurrentOverlay,
  getCurrentSectionWidthPercent,
  getCurrentTextBackgroundColor,
  getCurrentTextBackgroundPaddingPx,
  getCurrentTextColor,
  getDraftStartTime,
  getSavedBackground,
  getSavedBackgroundShared,
  getSavedContinuing,
  getSavedFadeInMs,
  getSavedFadeOutMs,
  getSavedIllustrationKind,
  getSavedIllustrationVisibility,
  getSavedOverlay,
  getSavedSectionWidthPercent,
  getSavedStartTime,
  getSavedTextBackgroundColor,
  getSavedTextBackgroundPaddingPx,
  getSavedTextColor,
  LINE_TIMING_STEP_SECONDS,
  createSaveBody,
  type DraftBackgrounds,
  type DraftBackgroundShared,
  type DraftFadeDurations,
  type DraftContinuings,
  type DraftIllustrationKinds,
  type DraftIllustrationVisibilities,
  type DraftOverlays,
  type DraftSectionWidthPercents,
  type DraftStartTimes,
  type DraftTextBackgroundColors,
  type DraftTextBackgroundPaddingPx,
  type DraftTextColors,
  type PendingChange,
  type PendingChanges,
  type Snapshot,
  type SaveStatus,
} from './tunerAutosaveState';

export function useTunerAutosave(session: IllustrationTuningSession, selectedIndex: number, duration: number) {
  const [draftBackgrounds, setDraftBackgrounds] = useState<DraftBackgrounds>({});
  const [draftBackgroundShared, setDraftBackgroundShared] = useState<DraftBackgroundShared>({});
  const [draftAnimations, setDraftAnimations] = useState<DirtyAnimations>({});
  const [draftContinuings, setDraftContinuings] = useState<DraftContinuings>({});
  const [draftFadeInMs, setDraftFadeInMs] = useState<DraftFadeDurations>({});
  const [draftFadeOutMs, setDraftFadeOutMs] = useState<DraftFadeDurations>({});
  const [draftIllustrationKinds, setDraftIllustrationKinds] = useState<DraftIllustrationKinds>({});
  const [draftIllustrationVisibilities, setDraftIllustrationVisibilities] = useState<DraftIllustrationVisibilities>({});
  const [draftOverlays, setDraftOverlays] = useState<DraftOverlays>({});
  const [draftSectionWidthPercents, setDraftSectionWidthPercents] = useState<DraftSectionWidthPercents>({});
  const [draftStartTimes, setDraftStartTimes] = useState<DraftStartTimes>({});
  const [draftTextBackgroundColors, setDraftTextBackgroundColors] = useState<DraftTextBackgroundColors>({});
  const [draftTextBackgroundPaddingPx, setDraftTextBackgroundPaddingPx] =
    useState<DraftTextBackgroundPaddingPx>({});
  const [draftTextColors, setDraftTextColors] = useState<DraftTextColors>({});
  const [pendingChanges, setPendingChanges] = useState<PendingChanges>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('Registered');
  const selectedSection = session.lyrics[selectedIndex];
  const nextSection = session.lyrics[selectedIndex + 1];

  const registerSnapshot = useCallback(async () => {
    const changes = Object.entries(pendingChanges);
    if (!changes.length) return;

    setSaveStatus('Registering');
    try {
      const response = await fetch(ILLUSTRATION_TUNING_ENDPOINT, {
        body: createSaveBody(session.trackId, changes),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      if (!response.ok) throw new Error('Register failed');
      setSaveStatus('Registered');
      window.location.reload();
    } catch {
      setSaveStatus('Register failed');
    }
  }, [pendingChanges, session.trackId]);

  const addPendingChange = useCallback((sectionId: number, change: PendingChange) => {
    setPendingChanges((current) => ({ ...current, [sectionId]: { ...current[sectionId], ...change } }));
  }, []);

  const setBackground = useCallback(
    (background: LyricsBackground | null) => {
      if (
        areBackgroundsEqual(getCurrentBackground(session, draftBackgrounds, selectedSection.sectionId), background)
      ) {
        return;
      }

      setDraftBackgrounds((current) => ({ ...current, [selectedSection.sectionId]: background }));
      session.setDraftBackground(selectedSection.sectionId, background);
      addPendingChange(selectedSection.sectionId, { background, hasBackground: true });
      setSaveStatus('Unsaved changes');
    },
    [addPendingChange, draftBackgrounds, selectedSection.sectionId, session],
  );

  const setBackgroundShared = useCallback(
    (shared: boolean) => {
      if (getCurrentBackgroundShared(session, draftBackgroundShared, selectedSection.sectionId) === shared) return;

      setDraftBackgroundShared((current) => ({ ...current, [selectedSection.sectionId]: shared }));
      session.setDraftBackgroundShared(selectedSection.sectionId, shared);
      addPendingChange(selectedSection.sectionId, { backgroundShared: shared, hasBackgroundShared: true });
      setSaveStatus('Unsaved changes');
    },
    [addPendingChange, draftBackgroundShared, selectedSection.sectionId, session],
  );

  const setTextColor = useCallback(
    (textColor: LyricsColorPreset | null) => {
      if (getCurrentTextColor(session, draftTextColors, selectedSection.sectionId) === textColor) return;

      setDraftTextColors((current) => ({ ...current, [selectedSection.sectionId]: textColor }));
      session.setDraftTextColor(selectedSection.sectionId, textColor);
      addPendingChange(selectedSection.sectionId, { hasTextColor: true, textColor });
      setSaveStatus('Unsaved changes');
    },
    [addPendingChange, draftTextColors, selectedSection.sectionId, session],
  );

  const setTextBackgroundColor = useCallback(
    (textBackgroundColor: LyricsColorPreset | null) => {
      if (
        getCurrentTextBackgroundColor(session, draftTextBackgroundColors, selectedSection.sectionId) ===
        textBackgroundColor
      ) {
        return;
      }

      setDraftTextBackgroundColors((current) => ({
        ...current,
        [selectedSection.sectionId]: textBackgroundColor,
      }));
      session.setDraftTextBackgroundColor(selectedSection.sectionId, textBackgroundColor);
      addPendingChange(selectedSection.sectionId, { hasTextBackgroundColor: true, textBackgroundColor });
      setSaveStatus('Unsaved changes');
    },
    [addPendingChange, draftTextBackgroundColors, selectedSection.sectionId, session],
  );

  const setTextBackgroundPaddingPx = useCallback(
    (textBackgroundPaddingPx: number) => {
      const nextPaddingPx = clampTextBackgroundPaddingPx(textBackgroundPaddingPx);
      if (
        getCurrentTextBackgroundPaddingPx(session, draftTextBackgroundPaddingPx, selectedSection.sectionId) ===
        nextPaddingPx
      ) {
        return;
      }

      setDraftTextBackgroundPaddingPx((current) => ({
        ...current,
        [selectedSection.sectionId]: nextPaddingPx,
      }));
      session.setDraftTextBackgroundPaddingPx(selectedSection.sectionId, nextPaddingPx);
      addPendingChange(selectedSection.sectionId, {
        hasTextBackgroundPaddingPx: true,
        textBackgroundPaddingPx: nextPaddingPx,
      });
      setSaveStatus('Unsaved changes');
    },
    [addPendingChange, draftTextBackgroundPaddingPx, selectedSection.sectionId, session],
  );

  const setAnimation = useCallback(
    (animation: DirtyAnimation) => {
      if (
        areDirtyAnimationsEqual(getCurrentAnimation(session, draftAnimations, selectedSection.sectionId), animation)
      ) {
        return;
      }

      setDraftAnimations((current) => ({ ...current, [selectedSection.sectionId]: animation }));
      session.setDraftIllustrationAnimation(selectedSection.sectionId, animation);
      addPendingChange(selectedSection.sectionId, { animation, hasAnimation: true });
      setSaveStatus('Unsaved changes');
    },
    [addPendingChange, draftAnimations, selectedSection.sectionId, session],
  );

  const setContinuing = useCallback(
    (continuing: boolean) => {
      if (getCurrentContinuing(session, draftContinuings, selectedSection.sectionId) === continuing) return;

      setDraftContinuings((current) => ({ ...current, [selectedSection.sectionId]: continuing }));
      session.setDraftSectionContinuing(selectedSection.sectionId, continuing);
      addPendingChange(selectedSection.sectionId, { continuing, hasContinuing: true });
      setSaveStatus('Unsaved changes');
    },
    [addPendingChange, draftContinuings, selectedSection.sectionId, session],
  );

  const setIllustrationKind = useCallback(
    (illustrationKind: TextIllustrationKind) => {
      if (getCurrentIllustrationKind(session, draftIllustrationKinds, selectedSection.sectionId) === illustrationKind) {
        return;
      }

      setDraftIllustrationKinds((current) => ({ ...current, [selectedSection.sectionId]: illustrationKind }));
      session.setDraftIllustrationKind(selectedSection.sectionId, illustrationKind);
      addPendingChange(selectedSection.sectionId, { hasIllustrationKind: true, illustrationKind });
      setSaveStatus('Unsaved changes');
    },
    [addPendingChange, draftIllustrationKinds, selectedSection.sectionId, session],
  );

  const setIllustrationVisibility = useCallback(
    (illustrationVisibility: IllustrationVisibility) => {
      if (
        getCurrentOverlay(session, draftOverlays, selectedSection.sectionId) &&
        illustrationVisibility !== 'only-active'
      ) {
        return;
      }
      if (
        getCurrentIllustrationVisibility(session, draftIllustrationVisibilities, selectedSection.sectionId) ===
        illustrationVisibility
      ) {
        return;
      }

      setDraftIllustrationVisibilities((current) => ({
        ...current,
        [selectedSection.sectionId]: illustrationVisibility,
      }));
      session.setDraftIllustrationVisibility(selectedSection.sectionId, illustrationVisibility);
      addPendingChange(selectedSection.sectionId, { hasIllustrationVisibility: true, illustrationVisibility });
      setSaveStatus('Unsaved changes');
    },
    [addPendingChange, draftIllustrationVisibilities, draftOverlays, selectedSection.sectionId, session],
  );

  const setFadeInMs = useCallback(
    (fadeInMs: number) => {
      const nextFadeInMs = clampFadeDuration(fadeInMs);
      if (getCurrentFadeInMs(session, draftFadeInMs, selectedSection.sectionId) === nextFadeInMs) return;

      setDraftFadeInMs((current) => ({ ...current, [selectedSection.sectionId]: nextFadeInMs }));
      session.setDraftIllustrationFadeInMs(selectedSection.sectionId, nextFadeInMs);
      addPendingChange(selectedSection.sectionId, { fadeInMs: nextFadeInMs, hasFadeInMs: true });
      setSaveStatus('Unsaved changes');
    },
    [addPendingChange, draftFadeInMs, selectedSection.sectionId, session],
  );

  const setFadeOutMs = useCallback(
    (fadeOutMs: number) => {
      const nextFadeOutMs = clampFadeDuration(fadeOutMs);
      if (getCurrentFadeOutMs(session, draftFadeOutMs, selectedSection.sectionId) === nextFadeOutMs) return;

      setDraftFadeOutMs((current) => ({ ...current, [selectedSection.sectionId]: nextFadeOutMs }));
      session.setDraftIllustrationFadeOutMs(selectedSection.sectionId, nextFadeOutMs);
      addPendingChange(selectedSection.sectionId, { fadeOutMs: nextFadeOutMs, hasFadeOutMs: true });
      setSaveStatus('Unsaved changes');
    },
    [addPendingChange, draftFadeOutMs, selectedSection.sectionId, session],
  );

  const setOverlay = useCallback(
    (isOverlay: boolean) => {
      if (getCurrentOverlay(session, draftOverlays, selectedSection.sectionId) === isOverlay) return;

      setDraftOverlays((current) => ({ ...current, [selectedSection.sectionId]: isOverlay }));
      session.setDraftSectionOverlay(selectedSection.sectionId, isOverlay);
      addPendingChange(selectedSection.sectionId, { hasOverlay: true, isOverlay });
      setSaveStatus('Unsaved changes');
    },
    [addPendingChange, draftOverlays, selectedSection.sectionId, session],
  );

  const setSectionWidthPercent = useCallback(
    (sectionWidthPercent: number) => {
      const nextSectionWidthPercent = clampSectionWidthPercent(sectionWidthPercent);
      if (
        getCurrentSectionWidthPercent(session, draftSectionWidthPercents, selectedSection.sectionId) ===
        nextSectionWidthPercent
      ) {
        return;
      }

      setDraftSectionWidthPercents((current) => ({
        ...current,
        [selectedSection.sectionId]: nextSectionWidthPercent,
      }));
      session.setDraftSectionWidthPercent(selectedSection.sectionId, nextSectionWidthPercent);
      addPendingChange(selectedSection.sectionId, {
        hasSectionWidthPercent: true,
        sectionWidthPercent: nextSectionWidthPercent,
      });
      setSaveStatus('Unsaved changes');
    },
    [addPendingChange, draftSectionWidthPercents, selectedSection.sectionId, session],
  );

  const setStartTime = useCallback(
    (targetIndex: number, startTime: number) => {
      const targetSection = session.lyrics[targetIndex];
      if (!targetSection) return;

      const previousStart = targetIndex > 0 ? getDraftStartTime(session, draftStartTimes, targetIndex - 1) : 0;
      const nextStart =
        targetIndex < session.lyrics.length - 1
          ? getDraftStartTime(session, draftStartTimes, targetIndex + 1)
          : Number.isFinite(duration) && duration > 0
            ? duration
            : Number.MAX_SAFE_INTEGER;
      const min = targetIndex > 0 ? previousStart + LINE_TIMING_STEP_SECONDS : 0;
      const max = Math.max(min, nextStart - LINE_TIMING_STEP_SECONDS);
      const nextTime = clampTime(startTime, min, max);

      setDraftStartTimes((current) => ({ ...current, [targetSection.sectionId]: nextTime }));
      session.setDraftSectionStart(targetSection.sectionId, nextTime);
      addPendingChange(targetSection.sectionId, { timestamp: nextTime });
      setSaveStatus('Unsaved changes');
    },
    [addPendingChange, draftStartTimes, duration, session],
  );

  const currentSnapshot: Snapshot = {
    animation: getCurrentAnimation(session, draftAnimations, selectedSection.sectionId),
    background: getCurrentBackground(session, draftBackgrounds, selectedSection.sectionId),
    backgroundShared: getCurrentBackgroundShared(session, draftBackgroundShared, selectedSection.sectionId),
    continuing: getCurrentContinuing(session, draftContinuings, selectedSection.sectionId),
    endTime: nextSection
      ? getDraftStartTime(session, draftStartTimes, selectedIndex + 1)
      : Number.isFinite(duration)
        ? duration
        : null,
    fadeInMs: getCurrentFadeInMs(session, draftFadeInMs, selectedSection.sectionId),
    fadeOutMs: getCurrentFadeOutMs(session, draftFadeOutMs, selectedSection.sectionId),
    illustrationKind: getCurrentIllustrationKind(session, draftIllustrationKinds, selectedSection.sectionId),
    illustrationVisibility: getCurrentIllustrationVisibility(
      session,
      draftIllustrationVisibilities,
      selectedSection.sectionId,
    ),
    isOverlay: getCurrentOverlay(session, draftOverlays, selectedSection.sectionId),
    sectionWidthPercent: getCurrentSectionWidthPercent(session, draftSectionWidthPercents, selectedSection.sectionId),
    startTime: getDraftStartTime(session, draftStartTimes, selectedIndex),
    textBackgroundColor: getCurrentTextBackgroundColor(
      session,
      draftTextBackgroundColors,
      selectedSection.sectionId,
    ),
    textBackgroundPaddingPx: getCurrentTextBackgroundPaddingPx(
      session,
      draftTextBackgroundPaddingPx,
      selectedSection.sectionId,
    ),
    textColor: getCurrentTextColor(session, draftTextColors, selectedSection.sectionId),
  };
  const cachedSnapshot: Snapshot = {
    animation: getSavedAnimation(session.lyrics, selectedSection.sectionId),
    background: getSavedBackground(session, selectedSection.sectionId),
    backgroundShared: getSavedBackgroundShared(session, selectedSection.sectionId),
    continuing: getSavedContinuing(session, selectedSection.sectionId),
    endTime: nextSection ? getSavedStartTime(session, nextSection.sectionId) : null,
    fadeInMs: getSavedFadeInMs(session, selectedSection.sectionId),
    fadeOutMs: getSavedFadeOutMs(session, selectedSection.sectionId),
    illustrationKind: getSavedIllustrationKind(session, selectedSection.sectionId),
    illustrationVisibility: getSavedIllustrationVisibility(session, selectedSection.sectionId),
    isOverlay: getSavedOverlay(session, selectedSection.sectionId),
    sectionWidthPercent: getSavedSectionWidthPercent(session, selectedSection.sectionId),
    startTime: getSavedStartTime(session, selectedSection.sectionId),
    textBackgroundColor: getSavedTextBackgroundColor(session, selectedSection.sectionId),
    textBackgroundPaddingPx: getSavedTextBackgroundPaddingPx(session, selectedSection.sectionId),
    textColor: getSavedTextColor(session, selectedSection.sectionId),
  };
  const selectedUsesCachedSnapshot =
    areDirtyAnimationsEqual(currentSnapshot.animation, cachedSnapshot.animation) &&
    areBackgroundsEqual(currentSnapshot.background, cachedSnapshot.background) &&
    currentSnapshot.backgroundShared === cachedSnapshot.backgroundShared &&
    currentSnapshot.continuing === cachedSnapshot.continuing &&
    currentSnapshot.fadeInMs === cachedSnapshot.fadeInMs &&
    currentSnapshot.fadeOutMs === cachedSnapshot.fadeOutMs &&
    currentSnapshot.illustrationKind === cachedSnapshot.illustrationKind &&
    currentSnapshot.illustrationVisibility === cachedSnapshot.illustrationVisibility &&
    currentSnapshot.isOverlay === cachedSnapshot.isOverlay &&
    currentSnapshot.sectionWidthPercent === cachedSnapshot.sectionWidthPercent &&
    currentSnapshot.startTime === cachedSnapshot.startTime &&
    currentSnapshot.endTime === cachedSnapshot.endTime &&
    currentSnapshot.textBackgroundColor === cachedSnapshot.textBackgroundColor &&
    currentSnapshot.textBackgroundPaddingPx === cachedSnapshot.textBackgroundPaddingPx &&
    currentSnapshot.textColor === cachedSnapshot.textColor;
  const selectedSaveStatus =
    selectedUsesCachedSnapshot && !Object.keys(pendingChanges).length ? saveStatus : 'Unsaved changes';

  const resetAllDrafts = useCallback(() => {
    setDraftBackgrounds({});
    setDraftBackgroundShared({});
    setDraftAnimations({});
    setDraftContinuings({});
    setDraftFadeInMs({});
    setDraftFadeOutMs({});
    setDraftIllustrationKinds({});
    setDraftIllustrationVisibilities({});
    setDraftOverlays({});
    setDraftSectionWidthPercents({});
    setDraftStartTimes({});
    setDraftTextBackgroundColors({});
    setDraftTextBackgroundPaddingPx({});
    setDraftTextColors({});
    setPendingChanges({});
    session.clearDrafts();
    setSaveStatus('Reset');
  }, [session]);

  return {
    hasNextSection: Boolean(nextSection),
    registerSnapshot,
    resetSnapshot: resetAllDrafts,
    saveStatus: selectedSaveStatus,
    selectedBackground: resolveBackground(session.lyrics, selectedIndex, session) ?? null,
    selectedBackgroundIsInherited:
      getBackgroundSectionIndex(session.lyrics, selectedIndex, session) !== selectedIndex,
    selectedBackgroundShared: currentSnapshot.backgroundShared,
    selectedAnimation: getEffectiveAnimation(session.lyrics, draftAnimations, selectedSection.sectionId),
    selectedContinuing: currentSnapshot.continuing,
    selectedFadeInMs: currentSnapshot.fadeInMs,
    selectedFadeOutMs: currentSnapshot.fadeOutMs,
    selectedIllustrationKind: session.getIllustrationKind(selectedSection),
    selectedIllustrationVisibility: session.getIllustrationVisibility(selectedSection),
    selectedIsOverlay: currentSnapshot.isOverlay,
    selectedIsLocked: selectedIndex > 0 && session.getSectionContinuing(session.lyrics[selectedIndex - 1]),
    selectedSupportsBackground: supportsBackground(selectedSection),
    selectedSectionWidthPercent: currentSnapshot.sectionWidthPercent,
    selectedEndTime: currentSnapshot.endTime ?? currentSnapshot.startTime,
    selectedStartTime: currentSnapshot.startTime,
    selectedTextBackgroundColor: currentSnapshot.textBackgroundColor,
    selectedTextBackgroundPaddingPx: currentSnapshot.textBackgroundPaddingPx,
    selectedTextColor: currentSnapshot.textColor,
    setAnimation,
    setBackground,
    setBackgroundShared,
    setContinuing,
    setFadeInMs,
    setFadeOutMs,
    setIllustrationKind,
    setIllustrationVisibility,
    setLineEndTime: (startTime: number) => setStartTime(selectedIndex + 1, startTime),
    setLineStartTime: (startTime: number) => setStartTime(selectedIndex, startTime),
    setOverlay,
    setSectionWidthPercent,
    setTextBackgroundColor,
    setTextBackgroundPaddingPx,
    setTextColor,
  };
}
