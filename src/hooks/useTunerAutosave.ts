import { useCallback, useEffect, useRef, useState } from "react";
import type { IllustrationVisibility } from "../entities/track/model/types";
import { RAM_BOX_LYRICS } from "../pages/ram-box/model/lyrics";
import type { TextIllustrationKind } from "../shared/ui/illustration-animations/types";
import { usePendingTunerAutosave } from "./usePendingTunerAutosave";
import {
  areDirtyAnimationsEqual,
  getEffectiveAnimation,
  type DirtyAnimation,
  type DirtyAnimations,
} from "../utils/tuning/animationSelection";
import {
  getEffectiveIllustrationVisibility,
  getEffectiveSectionContinuing,
  setDraftIllustrationFadeInMs,
  setDraftIllustrationFadeOutMs,
  setDraftIllustrationAnimation,
  setDraftIllustrationVisibility,
  setDraftSectionContinuing,
  setDraftSectionEnterDurationMs,
  setDraftSectionExitDurationMs,
  setDraftSectionNoSlideBy,
  setDraftSectionOverlay,
  setDraftSectionWidthPercent,
} from "../utils/tuning/illustrationAnimationTuningStore";
import {
  getEffectiveTimelineIllustrationKind,
  setDraftTimelineIllustrationKind,
} from "../utils/tuning/illustrationKind";
import { setDraftLyricSectionStart } from "../utils/tuning/lyricTimingTuningStore";
import { clampSectionWidthPercent, clampSlideMotionDurationMs } from "../utils/tuning/sectionLayout";
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
} from "../utils/tuning/tunerAutosaveState";

export { LINE_TIMING_STEP_SECONDS } from "../utils/tuning/tunerAutosaveState";

function isPendingForSelection(pendingChanges: PendingChanges, selectedSectionId: number, nextSectionId?: number) {
  return Boolean(pendingChanges[selectedSectionId] || (nextSectionId && pendingChanges[nextSectionId]));
}

export function useTunerAutosave(selectedIndex: number, duration: number) {
  const cachedSnapshotsRef = useRef<Snapshots>(readCachedSnapshots());
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
  const selectedSection = RAM_BOX_LYRICS[selectedIndex];
  const nextSection = RAM_BOX_LYRICS[selectedIndex + 1];
  const { markResetPending, pokeSave, saveStatus, setSaveStatus } = usePendingTunerAutosave({
    pendingChanges,
    selectedSectionId: selectedSection.sectionId,
    setPendingChanges,
  });

  const getCurrentSnapshot = useCallback((): Snapshot => {
    const animation = getCurrentAnimation(draftAnimations, selectedSection.sectionId);

    return {
      animation,
      continuing: getCurrentContinuing(draftContinuings, selectedSection.sectionId),
      endTime: nextSection
        ? getDraftStartTime(draftStartTimes, selectedIndex + 1)
        : Number.isFinite(duration)
          ? duration
          : null,
      enterDuration: getCurrentEnterDurationMs(draftEnterDurationMs, selectedSection.sectionId),
      exitDuration: getCurrentExitDurationMs(draftExitDurationMs, selectedSection.sectionId),
      fadeInMs: getCurrentFadeInMs(draftFadeInMs, selectedSection.sectionId),
      fadeOutMs: getCurrentFadeOutMs(draftFadeOutMs, selectedSection.sectionId),
      illustrationKind: getCurrentIllustrationKind(draftIllustrationKinds, selectedSection.sectionId),
      illustrationVisibility: getCurrentIllustrationVisibility(
        draftIllustrationVisibilities,
        selectedSection.sectionId,
      ),
      isOverlay: getCurrentOverlay(draftOverlays, selectedSection.sectionId),
      noSlideBy: getCurrentNoSlideBy(draftNoSlideBys, selectedSection.sectionId),
      sectionWidthPercent: getCurrentSectionWidthPercent(draftSectionWidthPercents, selectedSection.sectionId),
      startTime: getDraftStartTime(draftStartTimes, selectedIndex),
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
  ]);

  const getCachedSnapshot = useCallback((): Snapshot => {
    const cachedSnapshot = cachedSnapshotsRef.current[selectedSection.sectionId];
    if (cachedSnapshot) return normalizeCachedSnapshot(selectedSection.sectionId, cachedSnapshot);

    return {
      animation: getSavedAnimation(selectedSection.sectionId),
      continuing: getSavedContinuing(selectedSection.sectionId),
      endTime: nextSection ? getSavedStartTime(nextSection.sectionId) : null,
      enterDuration: getSavedEnterDurationMs(selectedSection.sectionId),
      exitDuration: getSavedExitDurationMs(selectedSection.sectionId),
      fadeInMs: getSavedFadeInMs(selectedSection.sectionId),
      fadeOutMs: getSavedFadeOutMs(selectedSection.sectionId),
      illustrationKind: getSavedIllustrationKind(selectedSection.sectionId),
      illustrationVisibility: getSavedIllustrationVisibility(selectedSection.sectionId),
      isOverlay: getSavedOverlay(selectedSection.sectionId),
      noSlideBy: getSavedNoSlideBy(selectedSection.sectionId),
      sectionWidthPercent: getSavedSectionWidthPercent(selectedSection.sectionId),
      startTime: getSavedStartTime(selectedSection.sectionId),
    };
  }, [nextSection, selectedSection.sectionId]);

  const cacheSnapshot = useCallback(() => {
    if (!Object.hasOwn(cachedSnapshotsRef.current, selectedSection.sectionId)) {
      const nextSnapshots = { ...cachedSnapshotsRef.current, [selectedSection.sectionId]: getCachedSnapshot() };
      cachedSnapshotsRef.current = nextSnapshots;
      writeCachedSnapshots(nextSnapshots);
    }

    return getCachedSnapshot();
  }, [getCachedSnapshot, selectedSection.sectionId]);

  const registerSnapshot = useCallback(() => {
    const snapshot = getCurrentSnapshot();
    const nextSnapshots = { ...cachedSnapshotsRef.current, [selectedSection.sectionId]: snapshot };
    const hasPendingSave = isPendingForSelection(pendingChanges, selectedSection.sectionId, nextSection?.sectionId);

    cachedSnapshotsRef.current = nextSnapshots;
    writeCachedSnapshots(nextSnapshots);
    setSaveStatus({
      label: hasPendingSave ? "Pending autosave" : "Cached value",
      sectionId: selectedSection.sectionId,
    });
    if (hasPendingSave) pokeSave();
  }, [getCurrentSnapshot, nextSection, pendingChanges, pokeSave, selectedSection.sectionId, setSaveStatus]);

  useEffect(() => {
    cacheSnapshot();
  }, [cacheSnapshot]);

  const addPendingChange = useCallback((sectionId: number, change: PendingChange) => {
    setPendingChanges((current) => ({ ...current, [sectionId]: { ...current[sectionId], ...change } }));
  }, []);

  const setAnimation = useCallback(
    (animation: DirtyAnimation) => {
      cacheSnapshot();
      if (areDirtyAnimationsEqual(getCurrentAnimation(draftAnimations, selectedSection.sectionId), animation)) return;

      setDraftAnimations((current) => ({ ...current, [selectedSection.sectionId]: animation }));
      setDraftIllustrationAnimation(selectedSection.sectionId, animation);
      addPendingChange(selectedSection.sectionId, { animation, hasAnimation: true });
      setSaveStatus({ label: "Pending autosave", sectionId: selectedSection.sectionId });
    },
    [addPendingChange, cacheSnapshot, draftAnimations, selectedSection.sectionId, setSaveStatus],
  );

  const setContinuing = useCallback(
    (continuing: boolean) => {
      cacheSnapshot();
      if (getCurrentContinuing(draftContinuings, selectedSection.sectionId) === continuing) return;

      setDraftContinuings((current) => ({ ...current, [selectedSection.sectionId]: continuing }));
      setDraftSectionContinuing(selectedSection.sectionId, continuing);
      addPendingChange(selectedSection.sectionId, { continuing, hasContinuing: true });
      setSaveStatus({ label: "Pending autosave", sectionId: selectedSection.sectionId });
    },
    [addPendingChange, cacheSnapshot, draftContinuings, selectedSection.sectionId, setSaveStatus],
  );

  const setIllustrationKind = useCallback(
    (illustrationKind: TextIllustrationKind) => {
      cacheSnapshot();
      if (getCurrentIllustrationKind(draftIllustrationKinds, selectedSection.sectionId) === illustrationKind) return;

      setDraftIllustrationKinds((current) => ({ ...current, [selectedSection.sectionId]: illustrationKind }));
      setDraftTimelineIllustrationKind(selectedSection.sectionId, illustrationKind);
      addPendingChange(selectedSection.sectionId, { hasIllustrationKind: true, illustrationKind });
      setSaveStatus({ label: "Pending autosave", sectionId: selectedSection.sectionId });
    },
    [addPendingChange, cacheSnapshot, draftIllustrationKinds, selectedSection.sectionId, setSaveStatus],
  );

  const setIllustrationVisibility = useCallback(
    (illustrationVisibility: IllustrationVisibility) => {
      cacheSnapshot();
      if (getCurrentOverlay(draftOverlays, selectedSection.sectionId) && illustrationVisibility !== "only-active") {
        return;
      }
      if (
        getCurrentIllustrationVisibility(draftIllustrationVisibilities, selectedSection.sectionId) ===
        illustrationVisibility
      ) {
        return;
      }

      setDraftIllustrationVisibilities((current) => ({
        ...current,
        [selectedSection.sectionId]: illustrationVisibility,
      }));
      setDraftIllustrationVisibility(selectedSection.sectionId, illustrationVisibility);
      addPendingChange(selectedSection.sectionId, { hasIllustrationVisibility: true, illustrationVisibility });
      setSaveStatus({ label: "Pending autosave", sectionId: selectedSection.sectionId });
    },
    [
      addPendingChange,
      cacheSnapshot,
      draftIllustrationVisibilities,
      draftOverlays,
      selectedSection.sectionId,
      setSaveStatus,
    ],
  );

  const setFadeInMs = useCallback(
    (fadeInMs: number) => {
      cacheSnapshot();
      const nextFadeInMs = clampFadeDuration(fadeInMs);
      if (getCurrentFadeInMs(draftFadeInMs, selectedSection.sectionId) === nextFadeInMs) return;

      setDraftFadeInMs((current) => ({ ...current, [selectedSection.sectionId]: nextFadeInMs }));
      setDraftIllustrationFadeInMs(selectedSection.sectionId, nextFadeInMs);
      addPendingChange(selectedSection.sectionId, { fadeInMs: nextFadeInMs, hasFadeInMs: true });
      setSaveStatus({ label: "Pending autosave", sectionId: selectedSection.sectionId });
    },
    [addPendingChange, cacheSnapshot, draftFadeInMs, selectedSection.sectionId, setSaveStatus],
  );

  const setFadeOutMs = useCallback(
    (fadeOutMs: number) => {
      cacheSnapshot();
      const nextFadeOutMs = clampFadeDuration(fadeOutMs);
      if (getCurrentFadeOutMs(draftFadeOutMs, selectedSection.sectionId) === nextFadeOutMs) return;

      setDraftFadeOutMs((current) => ({ ...current, [selectedSection.sectionId]: nextFadeOutMs }));
      setDraftIllustrationFadeOutMs(selectedSection.sectionId, nextFadeOutMs);
      addPendingChange(selectedSection.sectionId, { fadeOutMs: nextFadeOutMs, hasFadeOutMs: true });
      setSaveStatus({ label: "Pending autosave", sectionId: selectedSection.sectionId });
    },
    [addPendingChange, cacheSnapshot, draftFadeOutMs, selectedSection.sectionId, setSaveStatus],
  );

  const setOverlay = useCallback(
    (isOverlay: boolean) => {
      cacheSnapshot();
      if (getCurrentOverlay(draftOverlays, selectedSection.sectionId) === isOverlay) return;

      setDraftOverlays((current) => ({ ...current, [selectedSection.sectionId]: isOverlay }));
      setDraftSectionOverlay(selectedSection.sectionId, isOverlay);
      addPendingChange(selectedSection.sectionId, { hasOverlay: true, isOverlay });
      setSaveStatus({ label: "Pending autosave", sectionId: selectedSection.sectionId });
    },
    [addPendingChange, cacheSnapshot, draftOverlays, selectedSection.sectionId, setSaveStatus],
  );

  const setNoSlideBy = useCallback(
    (noSlideBy: boolean) => {
      cacheSnapshot();
      if (getCurrentNoSlideBy(draftNoSlideBys, selectedSection.sectionId) === noSlideBy) return;

      setDraftNoSlideBys((current) => ({ ...current, [selectedSection.sectionId]: noSlideBy }));
      setDraftSectionNoSlideBy(selectedSection.sectionId, noSlideBy);
      addPendingChange(selectedSection.sectionId, { hasNoSlideBy: true, noSlideBy });
      setSaveStatus({ label: "Pending autosave", sectionId: selectedSection.sectionId });
    },
    [addPendingChange, cacheSnapshot, draftNoSlideBys, selectedSection.sectionId, setSaveStatus],
  );

  const setEnterDurationMs = useCallback(
    (enterDurationMs: number) => {
      cacheSnapshot();
      const nextEnterDurationMs = clampSlideMotionDurationMs(enterDurationMs);
      if (getCurrentEnterDurationMs(draftEnterDurationMs, selectedSection.sectionId) === nextEnterDurationMs) return;

      setDraftEnterDurationMs((current) => ({ ...current, [selectedSection.sectionId]: nextEnterDurationMs }));
      setDraftSectionEnterDurationMs(selectedSection.sectionId, nextEnterDurationMs);
      addPendingChange(selectedSection.sectionId, {
        enterDuration: nextEnterDurationMs,
        hasEnterDuration: true,
      });
      setSaveStatus({ label: "Pending autosave", sectionId: selectedSection.sectionId });
    },
    [addPendingChange, cacheSnapshot, draftEnterDurationMs, selectedSection.sectionId, setSaveStatus],
  );

  const setExitDurationMs = useCallback(
    (exitDurationMs: number) => {
      cacheSnapshot();
      const nextExitDurationMs = clampSlideMotionDurationMs(exitDurationMs);
      if (getCurrentExitDurationMs(draftExitDurationMs, selectedSection.sectionId) === nextExitDurationMs) return;

      setDraftExitDurationMs((current) => ({ ...current, [selectedSection.sectionId]: nextExitDurationMs }));
      setDraftSectionExitDurationMs(selectedSection.sectionId, nextExitDurationMs);
      addPendingChange(selectedSection.sectionId, {
        exitDuration: nextExitDurationMs,
        hasExitDuration: true,
      });
      setSaveStatus({ label: "Pending autosave", sectionId: selectedSection.sectionId });
    },
    [addPendingChange, cacheSnapshot, draftExitDurationMs, selectedSection.sectionId, setSaveStatus],
  );

  const setSectionWidthPercent = useCallback(
    (sectionWidthPercent: number) => {
      cacheSnapshot();
      const nextSectionWidthPercent = clampSectionWidthPercent(sectionWidthPercent);
      if (
        getCurrentSectionWidthPercent(draftSectionWidthPercents, selectedSection.sectionId) === nextSectionWidthPercent
      ) {
        return;
      }

      setDraftSectionWidthPercents((current) => ({
        ...current,
        [selectedSection.sectionId]: nextSectionWidthPercent,
      }));
      setDraftSectionWidthPercent(selectedSection.sectionId, nextSectionWidthPercent);
      addPendingChange(selectedSection.sectionId, {
        hasSectionWidthPercent: true,
        sectionWidthPercent: nextSectionWidthPercent,
      });
      setSaveStatus({ label: "Pending autosave", sectionId: selectedSection.sectionId });
    },
    [addPendingChange, cacheSnapshot, draftSectionWidthPercents, selectedSection.sectionId, setSaveStatus],
  );

  const setStartTime = useCallback(
    (targetIndex: number, startTime: number) => {
      const targetSection = RAM_BOX_LYRICS[targetIndex];
      if (!targetSection) return;

      cacheSnapshot();
      const previousStart = targetIndex > 0 ? getDraftStartTime(draftStartTimes, targetIndex - 1) : 0;
      const nextStart =
        targetIndex < RAM_BOX_LYRICS.length - 1
          ? getDraftStartTime(draftStartTimes, targetIndex + 1)
          : Number.isFinite(duration) && duration > 0
            ? duration
            : Number.MAX_SAFE_INTEGER;
      const min = targetIndex > 0 ? previousStart + LINE_TIMING_STEP_SECONDS : 0;
      const max = Math.max(min, nextStart - LINE_TIMING_STEP_SECONDS);
      const nextTime = clampTime(startTime, min, max);

      setDraftStartTimes((current) => ({ ...current, [targetSection.sectionId]: nextTime }));
      setDraftLyricSectionStart(targetSection.sectionId, nextTime);
      addPendingChange(targetSection.sectionId, { timestamp: nextTime });
      setSaveStatus({ label: "Pending autosave", sectionId: selectedSection.sectionId });
    },
    [addPendingChange, cacheSnapshot, draftStartTimes, duration, selectedSection.sectionId, setSaveStatus],
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
    setDraftIllustrationAnimation(selectedSection.sectionId, cachedSnapshot.animation);
    addPendingChange(selectedSection.sectionId, { animation: cachedSnapshot.animation, hasAnimation: true });
    if (continuingChanged) {
      setDraftContinuings((current) => ({
        ...current,
        [selectedSection.sectionId]: cachedSnapshot.continuing,
      }));
      setDraftSectionContinuing(selectedSection.sectionId, cachedSnapshot.continuing);
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
      setDraftSectionEnterDurationMs(selectedSection.sectionId, cachedSnapshot.enterDuration);
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
      setDraftSectionExitDurationMs(selectedSection.sectionId, cachedSnapshot.exitDuration);
      addPendingChange(selectedSection.sectionId, {
        exitDuration: cachedSnapshot.exitDuration,
        hasExitDuration: true,
      });
    }

    if (fadeInChanged) {
      setDraftFadeInMs((current) => ({ ...current, [selectedSection.sectionId]: cachedSnapshot.fadeInMs }));
      setDraftIllustrationFadeInMs(selectedSection.sectionId, cachedSnapshot.fadeInMs);
      addPendingChange(selectedSection.sectionId, {
        fadeInMs: cachedSnapshot.fadeInMs,
        hasFadeInMs: true,
      });
    }
    if (fadeOutChanged) {
      setDraftFadeOutMs((current) => ({ ...current, [selectedSection.sectionId]: cachedSnapshot.fadeOutMs }));
      setDraftIllustrationFadeOutMs(selectedSection.sectionId, cachedSnapshot.fadeOutMs);
      addPendingChange(selectedSection.sectionId, {
        fadeOutMs: cachedSnapshot.fadeOutMs,
        hasFadeOutMs: true,
      });
    }

    if (overlayChanged) {
      setDraftOverlays((current) => ({ ...current, [selectedSection.sectionId]: cachedSnapshot.isOverlay }));
      setDraftSectionOverlay(selectedSection.sectionId, cachedSnapshot.isOverlay);
      addPendingChange(selectedSection.sectionId, { hasOverlay: true, isOverlay: cachedSnapshot.isOverlay });
    }
    if (noSlideByChanged) {
      setDraftNoSlideBys((current) => ({ ...current, [selectedSection.sectionId]: cachedSnapshot.noSlideBy }));
      setDraftSectionNoSlideBy(selectedSection.sectionId, cachedSnapshot.noSlideBy);
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
      setDraftSectionWidthPercent(selectedSection.sectionId, cachedSnapshot.sectionWidthPercent);
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
      setDraftTimelineIllustrationKind(selectedSection.sectionId, cachedIllustrationKind);
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
      setDraftIllustrationVisibility(selectedSection.sectionId, cachedSnapshot.illustrationVisibility);
      addPendingChange(selectedSection.sectionId, {
        hasIllustrationVisibility: true,
        illustrationVisibility: cachedSnapshot.illustrationVisibility,
      });
    }

    if (startChanged) {
      setDraftStartTimes((current) => ({ ...current, [selectedSection.sectionId]: cachedSnapshot.startTime }));
      setDraftLyricSectionStart(selectedSection.sectionId, cachedSnapshot.startTime);
      addPendingChange(selectedSection.sectionId, { timestamp: cachedSnapshot.startTime });
    }
    if (nextSection && cachedSnapshot.endTime !== null && endChanged) {
      setDraftStartTimes((current) => ({ ...current, [nextSection.sectionId]: cachedSnapshot.endTime ?? 0 }));
      setDraftLyricSectionStart(nextSection.sectionId, cachedSnapshot.endTime);
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
    selectedAnimation: getEffectiveAnimation(draftAnimations, selectedSection.sectionId),
    selectedContinuing: currentSnapshot.continuing,
    selectedEnterDurationMs: currentSnapshot.enterDuration,
    selectedExitDurationMs: currentSnapshot.exitDuration,
    selectedFadeInMs: currentSnapshot.fadeInMs,
    selectedFadeOutMs: currentSnapshot.fadeOutMs,
    selectedIllustrationKind: getEffectiveTimelineIllustrationKind(RAM_BOX_LYRICS, selectedSection),
    selectedIllustrationVisibility: getEffectiveIllustrationVisibility(selectedSection),
    selectedIsOverlay: currentSnapshot.isOverlay,
    selectedIsLocked: selectedIndex > 0 && getEffectiveSectionContinuing(RAM_BOX_LYRICS[selectedIndex - 1]),
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
