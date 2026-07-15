import { useCallback, useState } from 'react';
import { clampSectionWidthPercent } from '@entities/track/model/layout';
import { ILLUSTRATION_TUNING_ENDPOINT } from '@shared/config/tuning';
import type { IllustrationVisibility } from '@entities/track/model/types';
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
  clampFadeDuration,
  clampTime,
  getCurrentAnimation,
  getCurrentContinuing,
  getCurrentFadeInMs,
  getCurrentFadeOutMs,
  getCurrentIllustrationKind,
  getCurrentIllustrationVisibility,
  getCurrentOverlay,
  getCurrentSectionWidthPercent,
  getDraftStartTime,
  getSavedContinuing,
  getSavedFadeInMs,
  getSavedFadeOutMs,
  getSavedIllustrationKind,
  getSavedIllustrationVisibility,
  getSavedOverlay,
  getSavedSectionWidthPercent,
  getSavedStartTime,
  LINE_TIMING_STEP_SECONDS,
  createSaveBody,
  type DraftFadeDurations,
  type DraftContinuings,
  type DraftIllustrationKinds,
  type DraftIllustrationVisibilities,
  type DraftOverlays,
  type DraftSectionWidthPercents,
  type DraftStartTimes,
  type PendingChange,
  type PendingChanges,
  type Snapshot,
  type SaveStatus,
} from './tunerAutosaveState';

export function useTunerAutosave(session: IllustrationTuningSession, selectedIndex: number, duration: number) {
  const [draftAnimations, setDraftAnimations] = useState<DirtyAnimations>({});
  const [draftContinuings, setDraftContinuings] = useState<DraftContinuings>({});
  const [draftFadeInMs, setDraftFadeInMs] = useState<DraftFadeDurations>({});
  const [draftFadeOutMs, setDraftFadeOutMs] = useState<DraftFadeDurations>({});
  const [draftIllustrationKinds, setDraftIllustrationKinds] = useState<DraftIllustrationKinds>({});
  const [draftIllustrationVisibilities, setDraftIllustrationVisibilities] = useState<DraftIllustrationVisibilities>({});
  const [draftOverlays, setDraftOverlays] = useState<DraftOverlays>({});
  const [draftSectionWidthPercents, setDraftSectionWidthPercents] = useState<DraftSectionWidthPercents>({});
  const [draftStartTimes, setDraftStartTimes] = useState<DraftStartTimes>({});
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
  };
  const cachedSnapshot: Snapshot = {
    animation: getSavedAnimation(session.lyrics, selectedSection.sectionId),
    continuing: getSavedContinuing(session, selectedSection.sectionId),
    endTime: nextSection ? getSavedStartTime(session, nextSection.sectionId) : null,
    fadeInMs: getSavedFadeInMs(session, selectedSection.sectionId),
    fadeOutMs: getSavedFadeOutMs(session, selectedSection.sectionId),
    illustrationKind: getSavedIllustrationKind(session, selectedSection.sectionId),
    illustrationVisibility: getSavedIllustrationVisibility(session, selectedSection.sectionId),
    isOverlay: getSavedOverlay(session, selectedSection.sectionId),
    sectionWidthPercent: getSavedSectionWidthPercent(session, selectedSection.sectionId),
    startTime: getSavedStartTime(session, selectedSection.sectionId),
  };
  const selectedUsesCachedSnapshot =
    areDirtyAnimationsEqual(currentSnapshot.animation, cachedSnapshot.animation) &&
    currentSnapshot.continuing === cachedSnapshot.continuing &&
    currentSnapshot.fadeInMs === cachedSnapshot.fadeInMs &&
    currentSnapshot.fadeOutMs === cachedSnapshot.fadeOutMs &&
    currentSnapshot.illustrationKind === cachedSnapshot.illustrationKind &&
    currentSnapshot.illustrationVisibility === cachedSnapshot.illustrationVisibility &&
    currentSnapshot.isOverlay === cachedSnapshot.isOverlay &&
    currentSnapshot.sectionWidthPercent === cachedSnapshot.sectionWidthPercent &&
    currentSnapshot.startTime === cachedSnapshot.startTime &&
    currentSnapshot.endTime === cachedSnapshot.endTime;
  const selectedSaveStatus =
    selectedUsesCachedSnapshot && !Object.keys(pendingChanges).length ? saveStatus : 'Unsaved changes';

  const resetAllDrafts = useCallback(() => {
    setDraftAnimations({});
    setDraftContinuings({});
    setDraftFadeInMs({});
    setDraftFadeOutMs({});
    setDraftIllustrationKinds({});
    setDraftIllustrationVisibilities({});
    setDraftOverlays({});
    setDraftSectionWidthPercents({});
    setDraftStartTimes({});
    setPendingChanges({});
    session.clearDrafts();
    setSaveStatus('Reset');
  }, [session]);

  return {
    hasNextSection: Boolean(nextSection),
    registerSnapshot,
    resetSnapshot: resetAllDrafts,
    saveStatus: selectedSaveStatus,
    selectedAnimation: getEffectiveAnimation(session.lyrics, draftAnimations, selectedSection.sectionId),
    selectedContinuing: currentSnapshot.continuing,
    selectedFadeInMs: currentSnapshot.fadeInMs,
    selectedFadeOutMs: currentSnapshot.fadeOutMs,
    selectedIllustrationKind: session.getIllustrationKind(selectedSection),
    selectedIllustrationVisibility: session.getIllustrationVisibility(selectedSection),
    selectedIsOverlay: currentSnapshot.isOverlay,
    selectedIsLocked: selectedIndex > 0 && session.getSectionContinuing(session.lyrics[selectedIndex - 1]),
    selectedSectionWidthPercent: currentSnapshot.sectionWidthPercent,
    selectedEndTime: currentSnapshot.endTime ?? currentSnapshot.startTime,
    selectedStartTime: currentSnapshot.startTime,
    setAnimation,
    setContinuing,
    setFadeInMs,
    setFadeOutMs,
    setIllustrationKind,
    setIllustrationVisibility,
    setLineEndTime: (startTime: number) => setStartTime(selectedIndex + 1, startTime),
    setLineStartTime: (startTime: number) => setStartTime(selectedIndex, startTime),
    setOverlay,
    setSectionWidthPercent,
  };
}
