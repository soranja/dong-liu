import { useCallback, useEffect, useRef, useState } from "react";
import { clampSectionWidthPercent, clampSlideMotionDurationMs } from "../../../entities/track/model/layout";
import type { IllustrationVisibility } from "../../../entities/track/model/types";
import type { TextIllustrationKind } from "../../../shared/ui/illustration-animations/types";
import { usePendingTunerAutosave } from "./usePendingTunerAutosave";
import {
  areDirtyAnimationsEqual,
  getEffectiveAnimation,
  type DirtyAnimation,
  type DirtyAnimations,
} from "./animationSelection";
import type { IllustrationTuningSession } from "./session";
import {
  clampFadeDuration,
  clampTime,
  getCurrentAnimation,
  getCurrentContinuing,
  getCurrentEnterDurationMs,
  getCurrentExitDurationMs,
  getCurrentFadeInMs,
  getCurrentFadeOutMs,
  getCurrentIllustrationKind,
  getCurrentIllustrationVisibility,
  getCurrentNoSlideBy,
  getCurrentOverlay,
  getCurrentSectionWidthPercent,
  getDraftStartTime,
  getSavedAnimation,
  getSavedContinuing,
  getSavedEnterDurationMs,
  getSavedExitDurationMs,
  getSavedFadeInMs,
  getSavedFadeOutMs,
  getSavedIllustrationKind,
  getSavedIllustrationVisibility,
  getSavedNoSlideBy,
  getSavedOverlay,
  getSavedSectionWidthPercent,
  getSavedStartTime,
  LINE_TIMING_STEP_SECONDS,
  normalizeCachedSnapshot,
  readCachedSnapshots,
  writeCachedSnapshots,
  type DraftFadeDurations,
  type DraftContinuings,
  type DraftIllustrationKinds,
  type DraftIllustrationVisibilities,
  type DraftMotionDurations,
  type DraftNoSlideBys,
  type DraftOverlays,
  type DraftSectionWidthPercents,
  type DraftStartTimes,
  type PendingChange,
  type PendingChanges,
  type Snapshot,
  type Snapshots,
} from "./tunerAutosaveState";

export { LINE_TIMING_STEP_SECONDS } from "./tunerAutosaveState";

function isPendingForSelection(pendingChanges: PendingChanges, selectedSectionId: number, nextSectionId?: number) {
  return Boolean(pendingChanges[selectedSectionId] || (nextSectionId && pendingChanges[nextSectionId]));
}

export function useTunerAutosave(session: IllustrationTuningSession, selectedIndex: number, duration: number) {
  const cachedSnapshotsRef = useRef<Snapshots>(readCachedSnapshots(session.trackId));
  const [draftAnimations, setDraftAnimations] = useState<DirtyAnimations>({});
  const [draftContinuings, setDraftContinuings] = useState<DraftContinuings>({});
  const [draftEnterDurationMs, setDraftEnterDurationMs] = useState<DraftMotionDurations>({});
  const [draftExitDurationMs, setDraftExitDurationMs] = useState<DraftMotionDurations>({});
  const [draftFadeInMs, setDraftFadeInMs] = useState<DraftFadeDurations>({});
  const [draftFadeOutMs, setDraftFadeOutMs] = useState<DraftFadeDurations>({});
  const [draftIllustrationKinds, setDraftIllustrationKinds] = useState<DraftIllustrationKinds>({});
  const [draftIllustrationVisibilities, setDraftIllustrationVisibilities] = useState<DraftIllustrationVisibilities>({});
  const [draftNoSlideBys, setDraftNoSlideBys] = useState<DraftNoSlideBys>({});
  const [draftOverlays, setDraftOverlays] = useState<DraftOverlays>({});
  const [draftSectionWidthPercents, setDraftSectionWidthPercents] = useState<DraftSectionWidthPercents>({});
  const [draftStartTimes, setDraftStartTimes] = useState<DraftStartTimes>({});
  const [pendingChanges, setPendingChanges] = useState<PendingChanges>({});
  const selectedSection = session.lyrics[selectedIndex];
  const nextSection = session.lyrics[selectedIndex + 1];
  const { markResetPending, pokeSave, saveStatus, setSaveStatus } = usePendingTunerAutosave({
    pendingChanges,
    selectedSectionId: selectedSection.sectionId,
    setPendingChanges,
    trackId: session.trackId,
  });

  const getCurrentSnapshot = useCallback((): Snapshot => {
    const animation = getCurrentAnimation(session, draftAnimations, selectedSection.sectionId);

    return {
      animation,
      continuing: getCurrentContinuing(session, draftContinuings, selectedSection.sectionId),
      endTime: nextSection
        ? getDraftStartTime(session, draftStartTimes, selectedIndex + 1)
        : Number.isFinite(duration)
          ? duration
          : null,
      enterDuration: getCurrentEnterDurationMs(session, draftEnterDurationMs, selectedSection.sectionId),
      exitDuration: getCurrentExitDurationMs(session, draftExitDurationMs, selectedSection.sectionId),
      fadeInMs: getCurrentFadeInMs(session, draftFadeInMs, selectedSection.sectionId),
      fadeOutMs: getCurrentFadeOutMs(session, draftFadeOutMs, selectedSection.sectionId),
      illustrationKind: getCurrentIllustrationKind(session, draftIllustrationKinds, selectedSection.sectionId),
      illustrationVisibility: getCurrentIllustrationVisibility(
        session,
        draftIllustrationVisibilities,
        selectedSection.sectionId,
      ),
      isOverlay: getCurrentOverlay(session, draftOverlays, selectedSection.sectionId),
      noSlideBy: getCurrentNoSlideBy(session, draftNoSlideBys, selectedSection.sectionId),
      sectionWidthPercent: getCurrentSectionWidthPercent(session, draftSectionWidthPercents, selectedSection.sectionId),
      startTime: getDraftStartTime(session, draftStartTimes, selectedIndex),
    };
  }, [
    draftAnimations,
    draftContinuings,
    draftEnterDurationMs,
    draftExitDurationMs,
    draftFadeInMs,
    draftFadeOutMs,
    draftIllustrationKinds,
    draftIllustrationVisibilities,
    draftNoSlideBys,
    draftOverlays,
    draftSectionWidthPercents,
    draftStartTimes,
    duration,
    nextSection,
    selectedIndex,
    selectedSection.sectionId,
    session,
  ]);

  const getCachedSnapshot = useCallback((): Snapshot => {
    const cachedSnapshot = cachedSnapshotsRef.current[selectedSection.sectionId];
    if (cachedSnapshot) return normalizeCachedSnapshot(session, selectedSection.sectionId, cachedSnapshot);

    return {
      animation: getSavedAnimation(session.lyrics, selectedSection.sectionId),
      continuing: getSavedContinuing(session, selectedSection.sectionId),
      endTime: nextSection ? getSavedStartTime(session, nextSection.sectionId) : null,
      enterDuration: getSavedEnterDurationMs(session, selectedSection.sectionId),
      exitDuration: getSavedExitDurationMs(session, selectedSection.sectionId),
      fadeInMs: getSavedFadeInMs(session, selectedSection.sectionId),
      fadeOutMs: getSavedFadeOutMs(session, selectedSection.sectionId),
      illustrationKind: getSavedIllustrationKind(session, selectedSection.sectionId),
      illustrationVisibility: getSavedIllustrationVisibility(session, selectedSection.sectionId),
      isOverlay: getSavedOverlay(session, selectedSection.sectionId),
      noSlideBy: getSavedNoSlideBy(session, selectedSection.sectionId),
      sectionWidthPercent: getSavedSectionWidthPercent(session, selectedSection.sectionId),
      startTime: getSavedStartTime(session, selectedSection.sectionId),
    };
  }, [nextSection, selectedSection.sectionId, session]);

  const cacheSnapshot = useCallback(() => {
    if (!Object.hasOwn(cachedSnapshotsRef.current, selectedSection.sectionId)) {
      const nextSnapshots = { ...cachedSnapshotsRef.current, [selectedSection.sectionId]: getCachedSnapshot() };
      cachedSnapshotsRef.current = nextSnapshots;
      writeCachedSnapshots(session.trackId, nextSnapshots);
    }

    return getCachedSnapshot();
  }, [getCachedSnapshot, selectedSection.sectionId, session.trackId]);

  const registerSnapshot = useCallback(() => {
    const snapshot = getCurrentSnapshot();
    const nextSnapshots = { ...cachedSnapshotsRef.current, [selectedSection.sectionId]: snapshot };
    const hasPendingSave = isPendingForSelection(pendingChanges, selectedSection.sectionId, nextSection?.sectionId);

    cachedSnapshotsRef.current = nextSnapshots;
    writeCachedSnapshots(session.trackId, nextSnapshots);
    setSaveStatus({
      label: hasPendingSave ? "Pending autosave" : "Cached value",
      sectionId: selectedSection.sectionId,
    });
    if (hasPendingSave) pokeSave();
  }, [
    getCurrentSnapshot,
    nextSection,
    pendingChanges,
    pokeSave,
    selectedSection.sectionId,
    session.trackId,
    setSaveStatus,
  ]);

  useEffect(() => {
    cacheSnapshot();
  }, [cacheSnapshot]);

  const addPendingChange = useCallback((sectionId: number, change: PendingChange) => {
    setPendingChanges((current) => ({ ...current, [sectionId]: { ...current[sectionId], ...change } }));
  }, []);

  const setAnimation = useCallback(
    (animation: DirtyAnimation) => {
      cacheSnapshot();
      if (
        areDirtyAnimationsEqual(getCurrentAnimation(session, draftAnimations, selectedSection.sectionId), animation)
      ) {
        return;
      }

      setDraftAnimations((current) => ({ ...current, [selectedSection.sectionId]: animation }));
      session.setDraftIllustrationAnimation(selectedSection.sectionId, animation);
      addPendingChange(selectedSection.sectionId, { animation, hasAnimation: true });
      setSaveStatus({ label: "Pending autosave", sectionId: selectedSection.sectionId });
    },
    [addPendingChange, cacheSnapshot, draftAnimations, selectedSection.sectionId, session, setSaveStatus],
  );

  const setContinuing = useCallback(
    (continuing: boolean) => {
      cacheSnapshot();
      if (getCurrentContinuing(session, draftContinuings, selectedSection.sectionId) === continuing) return;

      setDraftContinuings((current) => ({ ...current, [selectedSection.sectionId]: continuing }));
      session.setDraftSectionContinuing(selectedSection.sectionId, continuing);
      addPendingChange(selectedSection.sectionId, { continuing, hasContinuing: true });
      setSaveStatus({ label: "Pending autosave", sectionId: selectedSection.sectionId });
    },
    [addPendingChange, cacheSnapshot, draftContinuings, selectedSection.sectionId, session, setSaveStatus],
  );

  const setIllustrationKind = useCallback(
    (illustrationKind: TextIllustrationKind) => {
      cacheSnapshot();
      if (getCurrentIllustrationKind(session, draftIllustrationKinds, selectedSection.sectionId) === illustrationKind) {
        return;
      }

      setDraftIllustrationKinds((current) => ({ ...current, [selectedSection.sectionId]: illustrationKind }));
      session.setDraftIllustrationKind(selectedSection.sectionId, illustrationKind);
      addPendingChange(selectedSection.sectionId, { hasIllustrationKind: true, illustrationKind });
      setSaveStatus({ label: "Pending autosave", sectionId: selectedSection.sectionId });
    },
    [addPendingChange, cacheSnapshot, draftIllustrationKinds, selectedSection.sectionId, session, setSaveStatus],
  );

  const setIllustrationVisibility = useCallback(
    (illustrationVisibility: IllustrationVisibility) => {
      cacheSnapshot();
      if (
        getCurrentOverlay(session, draftOverlays, selectedSection.sectionId) &&
        illustrationVisibility !== "only-active"
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
      setSaveStatus({ label: "Pending autosave", sectionId: selectedSection.sectionId });
    },
    [
      addPendingChange,
      cacheSnapshot,
      draftIllustrationVisibilities,
      draftOverlays,
      selectedSection.sectionId,
      session,
      setSaveStatus,
    ],
  );

  const setFadeInMs = useCallback(
    (fadeInMs: number) => {
      cacheSnapshot();
      const nextFadeInMs = clampFadeDuration(fadeInMs);
      if (getCurrentFadeInMs(session, draftFadeInMs, selectedSection.sectionId) === nextFadeInMs) return;

      setDraftFadeInMs((current) => ({ ...current, [selectedSection.sectionId]: nextFadeInMs }));
      session.setDraftIllustrationFadeInMs(selectedSection.sectionId, nextFadeInMs);
      addPendingChange(selectedSection.sectionId, { fadeInMs: nextFadeInMs, hasFadeInMs: true });
      setSaveStatus({ label: "Pending autosave", sectionId: selectedSection.sectionId });
    },
    [addPendingChange, cacheSnapshot, draftFadeInMs, selectedSection.sectionId, session, setSaveStatus],
  );

  const setFadeOutMs = useCallback(
    (fadeOutMs: number) => {
      cacheSnapshot();
      const nextFadeOutMs = clampFadeDuration(fadeOutMs);
      if (getCurrentFadeOutMs(session, draftFadeOutMs, selectedSection.sectionId) === nextFadeOutMs) return;

      setDraftFadeOutMs((current) => ({ ...current, [selectedSection.sectionId]: nextFadeOutMs }));
      session.setDraftIllustrationFadeOutMs(selectedSection.sectionId, nextFadeOutMs);
      addPendingChange(selectedSection.sectionId, { fadeOutMs: nextFadeOutMs, hasFadeOutMs: true });
      setSaveStatus({ label: "Pending autosave", sectionId: selectedSection.sectionId });
    },
    [addPendingChange, cacheSnapshot, draftFadeOutMs, selectedSection.sectionId, session, setSaveStatus],
  );

  const setOverlay = useCallback(
    (isOverlay: boolean) => {
      cacheSnapshot();
      if (getCurrentOverlay(session, draftOverlays, selectedSection.sectionId) === isOverlay) return;

      setDraftOverlays((current) => ({ ...current, [selectedSection.sectionId]: isOverlay }));
      session.setDraftSectionOverlay(selectedSection.sectionId, isOverlay);
      addPendingChange(selectedSection.sectionId, { hasOverlay: true, isOverlay });
      setSaveStatus({ label: "Pending autosave", sectionId: selectedSection.sectionId });
    },
    [addPendingChange, cacheSnapshot, draftOverlays, selectedSection.sectionId, session, setSaveStatus],
  );

  const setNoSlideBy = useCallback(
    (noSlideBy: boolean) => {
      cacheSnapshot();
      if (getCurrentNoSlideBy(session, draftNoSlideBys, selectedSection.sectionId) === noSlideBy) return;

      setDraftNoSlideBys((current) => ({ ...current, [selectedSection.sectionId]: noSlideBy }));
      session.setDraftSectionNoSlideBy(selectedSection.sectionId, noSlideBy);
      addPendingChange(selectedSection.sectionId, { hasNoSlideBy: true, noSlideBy });
      setSaveStatus({ label: "Pending autosave", sectionId: selectedSection.sectionId });
    },
    [addPendingChange, cacheSnapshot, draftNoSlideBys, selectedSection.sectionId, session, setSaveStatus],
  );

  const setEnterDurationMs = useCallback(
    (enterDurationMs: number) => {
      cacheSnapshot();
      const nextEnterDurationMs = clampSlideMotionDurationMs(enterDurationMs);
      if (getCurrentEnterDurationMs(session, draftEnterDurationMs, selectedSection.sectionId) === nextEnterDurationMs) {
        return;
      }

      setDraftEnterDurationMs((current) => ({ ...current, [selectedSection.sectionId]: nextEnterDurationMs }));
      session.setDraftSectionEnterDurationMs(selectedSection.sectionId, nextEnterDurationMs);
      addPendingChange(selectedSection.sectionId, {
        enterDuration: nextEnterDurationMs,
        hasEnterDuration: true,
      });
      setSaveStatus({ label: "Pending autosave", sectionId: selectedSection.sectionId });
    },
    [addPendingChange, cacheSnapshot, draftEnterDurationMs, selectedSection.sectionId, session, setSaveStatus],
  );

  const setExitDurationMs = useCallback(
    (exitDurationMs: number) => {
      cacheSnapshot();
      const nextExitDurationMs = clampSlideMotionDurationMs(exitDurationMs);
      if (getCurrentExitDurationMs(session, draftExitDurationMs, selectedSection.sectionId) === nextExitDurationMs) {
        return;
      }

      setDraftExitDurationMs((current) => ({ ...current, [selectedSection.sectionId]: nextExitDurationMs }));
      session.setDraftSectionExitDurationMs(selectedSection.sectionId, nextExitDurationMs);
      addPendingChange(selectedSection.sectionId, {
        exitDuration: nextExitDurationMs,
        hasExitDuration: true,
      });
      setSaveStatus({ label: "Pending autosave", sectionId: selectedSection.sectionId });
    },
    [addPendingChange, cacheSnapshot, draftExitDurationMs, selectedSection.sectionId, session, setSaveStatus],
  );

  const setSectionWidthPercent = useCallback(
    (sectionWidthPercent: number) => {
      cacheSnapshot();
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
      setSaveStatus({ label: "Pending autosave", sectionId: selectedSection.sectionId });
    },
    [addPendingChange, cacheSnapshot, draftSectionWidthPercents, selectedSection.sectionId, session, setSaveStatus],
  );

  const setStartTime = useCallback(
    (targetIndex: number, startTime: number) => {
      const targetSection = session.lyrics[targetIndex];
      if (!targetSection) return;

      cacheSnapshot();
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
      setSaveStatus({ label: "Pending autosave", sectionId: selectedSection.sectionId });
    },
    [addPendingChange, cacheSnapshot, draftStartTimes, duration, selectedSection.sectionId, session, setSaveStatus],
  );

  const resetSnapshot = useCallback(() => {
    const cachedSnapshot = cacheSnapshot();
    const currentSnapshot = getCurrentSnapshot();
    const animationChanged = !areDirtyAnimationsEqual(currentSnapshot.animation, cachedSnapshot.animation);
    const continuingChanged = currentSnapshot.continuing !== cachedSnapshot.continuing;
    const enterDurationChanged = currentSnapshot.enterDuration !== cachedSnapshot.enterDuration;
    const exitDurationChanged = currentSnapshot.exitDuration !== cachedSnapshot.exitDuration;
    const fadeInChanged = currentSnapshot.fadeInMs !== cachedSnapshot.fadeInMs;
    const fadeOutChanged = currentSnapshot.fadeOutMs !== cachedSnapshot.fadeOutMs;
    const illustrationKindChanged = currentSnapshot.illustrationKind !== cachedSnapshot.illustrationKind;
    const illustrationVisibilityChanged =
      currentSnapshot.illustrationVisibility !== cachedSnapshot.illustrationVisibility;
    const noSlideByChanged = currentSnapshot.noSlideBy !== cachedSnapshot.noSlideBy;
    const overlayChanged = currentSnapshot.isOverlay !== cachedSnapshot.isOverlay;
    const sectionWidthChanged = currentSnapshot.sectionWidthPercent !== cachedSnapshot.sectionWidthPercent;
    const startChanged = currentSnapshot.startTime !== cachedSnapshot.startTime;
    const endChanged = nextSection && currentSnapshot.endTime !== cachedSnapshot.endTime;
    if (
      !animationChanged &&
      !continuingChanged &&
      !enterDurationChanged &&
      !exitDurationChanged &&
      !fadeInChanged &&
      !fadeOutChanged &&
      !illustrationKindChanged &&
      !illustrationVisibilityChanged &&
      !noSlideByChanged &&
      !overlayChanged &&
      !sectionWidthChanged &&
      !startChanged &&
      !endChanged
    ) {
      setSaveStatus({ label: "Cached value", sectionId: selectedSection.sectionId });
      return;
    }

    setDraftAnimations((current) => ({ ...current, [selectedSection.sectionId]: cachedSnapshot.animation }));
    session.setDraftIllustrationAnimation(selectedSection.sectionId, cachedSnapshot.animation);
    addPendingChange(selectedSection.sectionId, { animation: cachedSnapshot.animation, hasAnimation: true });
    if (continuingChanged) {
      setDraftContinuings((current) => ({
        ...current,
        [selectedSection.sectionId]: cachedSnapshot.continuing,
      }));
      session.setDraftSectionContinuing(selectedSection.sectionId, cachedSnapshot.continuing);
      addPendingChange(selectedSection.sectionId, {
        continuing: cachedSnapshot.continuing,
        hasContinuing: true,
      });
    }

    if (enterDurationChanged) {
      setDraftEnterDurationMs((current) => ({
        ...current,
        [selectedSection.sectionId]: cachedSnapshot.enterDuration,
      }));
      session.setDraftSectionEnterDurationMs(selectedSection.sectionId, cachedSnapshot.enterDuration);
      addPendingChange(selectedSection.sectionId, {
        enterDuration: cachedSnapshot.enterDuration,
        hasEnterDuration: true,
      });
    }
    if (exitDurationChanged) {
      setDraftExitDurationMs((current) => ({
        ...current,
        [selectedSection.sectionId]: cachedSnapshot.exitDuration,
      }));
      session.setDraftSectionExitDurationMs(selectedSection.sectionId, cachedSnapshot.exitDuration);
      addPendingChange(selectedSection.sectionId, {
        exitDuration: cachedSnapshot.exitDuration,
        hasExitDuration: true,
      });
    }

    if (fadeInChanged) {
      setDraftFadeInMs((current) => ({ ...current, [selectedSection.sectionId]: cachedSnapshot.fadeInMs }));
      session.setDraftIllustrationFadeInMs(selectedSection.sectionId, cachedSnapshot.fadeInMs);
      addPendingChange(selectedSection.sectionId, {
        fadeInMs: cachedSnapshot.fadeInMs,
        hasFadeInMs: true,
      });
    }
    if (fadeOutChanged) {
      setDraftFadeOutMs((current) => ({ ...current, [selectedSection.sectionId]: cachedSnapshot.fadeOutMs }));
      session.setDraftIllustrationFadeOutMs(selectedSection.sectionId, cachedSnapshot.fadeOutMs);
      addPendingChange(selectedSection.sectionId, {
        fadeOutMs: cachedSnapshot.fadeOutMs,
        hasFadeOutMs: true,
      });
    }

    if (overlayChanged) {
      setDraftOverlays((current) => ({ ...current, [selectedSection.sectionId]: cachedSnapshot.isOverlay }));
      session.setDraftSectionOverlay(selectedSection.sectionId, cachedSnapshot.isOverlay);
      addPendingChange(selectedSection.sectionId, { hasOverlay: true, isOverlay: cachedSnapshot.isOverlay });
    }
    if (noSlideByChanged) {
      setDraftNoSlideBys((current) => ({ ...current, [selectedSection.sectionId]: cachedSnapshot.noSlideBy }));
      session.setDraftSectionNoSlideBy(selectedSection.sectionId, cachedSnapshot.noSlideBy);
      addPendingChange(selectedSection.sectionId, {
        hasNoSlideBy: true,
        noSlideBy: cachedSnapshot.noSlideBy,
      });
    }
    if (sectionWidthChanged) {
      setDraftSectionWidthPercents((current) => ({
        ...current,
        [selectedSection.sectionId]: cachedSnapshot.sectionWidthPercent,
      }));
      session.setDraftSectionWidthPercent(selectedSection.sectionId, cachedSnapshot.sectionWidthPercent);
      addPendingChange(selectedSection.sectionId, {
        hasSectionWidthPercent: true,
        sectionWidthPercent: cachedSnapshot.sectionWidthPercent,
      });
    }
    if (illustrationKindChanged && cachedSnapshot.illustrationKind !== "generic") {
      const cachedIllustrationKind: TextIllustrationKind = cachedSnapshot.illustrationKind;
      setDraftIllustrationKinds((current) => ({
        ...current,
        [selectedSection.sectionId]: cachedIllustrationKind,
      }));
      session.setDraftIllustrationKind(selectedSection.sectionId, cachedIllustrationKind);
      addPendingChange(selectedSection.sectionId, {
        hasIllustrationKind: true,
        illustrationKind: cachedIllustrationKind,
      });
    }
    if (illustrationVisibilityChanged) {
      setDraftIllustrationVisibilities((current) => ({
        ...current,
        [selectedSection.sectionId]: cachedSnapshot.illustrationVisibility,
      }));
      session.setDraftIllustrationVisibility(selectedSection.sectionId, cachedSnapshot.illustrationVisibility);
      addPendingChange(selectedSection.sectionId, {
        hasIllustrationVisibility: true,
        illustrationVisibility: cachedSnapshot.illustrationVisibility,
      });
    }

    if (startChanged) {
      setDraftStartTimes((current) => ({ ...current, [selectedSection.sectionId]: cachedSnapshot.startTime }));
      session.setDraftSectionStart(selectedSection.sectionId, cachedSnapshot.startTime);
      addPendingChange(selectedSection.sectionId, { timestamp: cachedSnapshot.startTime });
    }
    if (nextSection && cachedSnapshot.endTime !== null && endChanged) {
      setDraftStartTimes((current) => ({ ...current, [nextSection.sectionId]: cachedSnapshot.endTime ?? 0 }));
      session.setDraftSectionStart(nextSection.sectionId, cachedSnapshot.endTime);
      addPendingChange(nextSection.sectionId, { timestamp: cachedSnapshot.endTime });
    }

    markResetPending();
    setSaveStatus({ label: "Resetting", sectionId: selectedSection.sectionId });
  }, [
    addPendingChange,
    cacheSnapshot,
    getCurrentSnapshot,
    markResetPending,
    nextSection,
    selectedSection.sectionId,
    session,
    setSaveStatus,
  ]);

  const currentSnapshot = getCurrentSnapshot();
  const cachedSnapshot = getCachedSnapshot();
  const selectedUsesCachedSnapshot =
    areDirtyAnimationsEqual(currentSnapshot.animation, cachedSnapshot.animation) &&
    currentSnapshot.continuing === cachedSnapshot.continuing &&
    currentSnapshot.enterDuration === cachedSnapshot.enterDuration &&
    currentSnapshot.exitDuration === cachedSnapshot.exitDuration &&
    currentSnapshot.fadeInMs === cachedSnapshot.fadeInMs &&
    currentSnapshot.fadeOutMs === cachedSnapshot.fadeOutMs &&
    currentSnapshot.illustrationKind === cachedSnapshot.illustrationKind &&
    currentSnapshot.illustrationVisibility === cachedSnapshot.illustrationVisibility &&
    currentSnapshot.isOverlay === cachedSnapshot.isOverlay &&
    currentSnapshot.noSlideBy === cachedSnapshot.noSlideBy &&
    currentSnapshot.sectionWidthPercent === cachedSnapshot.sectionWidthPercent &&
    currentSnapshot.startTime === cachedSnapshot.startTime &&
    currentSnapshot.endTime === cachedSnapshot.endTime;
  const selectedSaveStatus =
    saveStatus.sectionId === selectedSection.sectionId
      ? saveStatus.label
      : selectedUsesCachedSnapshot
        ? "Cached value"
        : "Autosaved";

  return {
    hasNextSection: Boolean(nextSection),
    registerSnapshot,
    resetSnapshot,
    saveStatus: selectedSaveStatus,
    selectedAnimation: getEffectiveAnimation(session.lyrics, draftAnimations, selectedSection.sectionId),
    selectedContinuing: currentSnapshot.continuing,
    selectedEnterDurationMs: currentSnapshot.enterDuration,
    selectedExitDurationMs: currentSnapshot.exitDuration,
    selectedFadeInMs: currentSnapshot.fadeInMs,
    selectedFadeOutMs: currentSnapshot.fadeOutMs,
    selectedIllustrationKind: session.getIllustrationKind(selectedSection),
    selectedIllustrationVisibility: session.getIllustrationVisibility(selectedSection),
    selectedIsOverlay: currentSnapshot.isOverlay,
    selectedIsLocked: selectedIndex > 0 && session.getSectionContinuing(session.lyrics[selectedIndex - 1]),
    selectedNoSlideBy: currentSnapshot.noSlideBy,
    selectedSectionWidthPercent: currentSnapshot.sectionWidthPercent,
    selectedEndTime: currentSnapshot.endTime ?? currentSnapshot.startTime,
    selectedStartTime: currentSnapshot.startTime,
    setAnimation,
    setContinuing,
    setEnterDurationMs,
    setExitDurationMs,
    setFadeInMs,
    setFadeOutMs,
    setIllustrationKind,
    setIllustrationVisibility,
    setLineEndTime: (startTime: number) => setStartTime(selectedIndex + 1, startTime),
    setLineStartTime: (startTime: number) => setStartTime(selectedIndex, startTime),
    setNoSlideBy,
    setOverlay,
    setSectionWidthPercent,
  };
}
