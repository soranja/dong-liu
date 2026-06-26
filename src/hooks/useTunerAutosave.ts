import { useCallback, useEffect, useRef, useState } from "react";
import { RAM_BOX_LYRICS } from "../lyrics/ram-box-lyrics";
import type { IllustrationVisibility, TextIllustrationKind } from "../lyrics/types";
import { formatLyricsTimestamp, parseLyricsTimestamp } from "../utils/lyrics";
import {
  areDirtyAnimationsEqual,
  getDirtyAnimation,
  getEffectiveAnimation,
  getSavedAnimation,
  type DirtyAnimation,
  type DirtyAnimations,
} from "../utils/tuning/animationSelection";
import {
  getEffectiveIllustrationVisibility,
  setDraftIllustrationAnimation,
  setDraftIllustrationVisibility,
} from "../utils/tuning/illustrationAnimationTuningStore";
import {
  getEffectiveTimelineIllustrationKind,
  getSavedTimelineIllustrationKind,
  setDraftTimelineIllustrationKind,
  type TimelineIllustrationKind,
} from "../utils/tuning/illustrationKind";
import { setDraftLyricSectionStart } from "../utils/tuning/lyricTimingTuningStore";

type DraftIllustrationKinds = Record<number, TextIllustrationKind>;
type DraftIllustrationVisibilities = Record<number, IllustrationVisibility>;
type DraftStartTimes = Record<number, number>;
type PendingChange = {
  animation?: DirtyAnimation;
  hasAnimation?: boolean;
  hasIllustrationKind?: boolean;
  hasIllustrationVisibility?: boolean;
  illustrationKind?: TextIllustrationKind;
  illustrationVisibility?: IllustrationVisibility;
  timestamp?: number;
};
type PendingChanges = Record<number, PendingChange>;
type Snapshot = {
  animation: DirtyAnimation;
  endTime: number | null;
  illustrationKind: TimelineIllustrationKind;
  illustrationVisibility: IllustrationVisibility;
  startTime: number;
};
type Snapshots = Record<number, Snapshot>;
type SaveStatus =
  | "Autosave failed"
  | "Autosaved"
  | "Autosaving"
  | "Cached value"
  | "Pending autosave"
  | "Resetting";
type StatusState = {
  label: SaveStatus;
  sectionId: number | null;
};

const SAVE_ENDPOINT = "/__dong-liu/illustration-animation-settings";
const AUTOSAVE_DELAY_MS = 300;
const CACHED_SNAPSHOTS_STORAGE_KEY = "dong-liu:tuner-cached-snapshots";
export const LINE_TIMING_STEP_SECONDS = 0.005;

function getSavedStartTime(sectionId: number) {
  const timestamp = RAM_BOX_LYRICS.find((section) => section.sectionId === sectionId)?.timestamp;

  return timestamp ? parseLyricsTimestamp(timestamp) : 0;
}

function getSavedIllustrationKind(sectionId: number) {
  const section = RAM_BOX_LYRICS.find((candidate) => candidate.sectionId === sectionId);

  return section ? getSavedTimelineIllustrationKind(section) : "generic";
}

function getSavedIllustrationVisibility(sectionId: number) {
  return RAM_BOX_LYRICS.find((section) => section.sectionId === sectionId)?.illustrationVisibility ?? "adjacent";
}

function getCurrentAnimation(draftAnimations: DirtyAnimations, sectionId: number) {
  const draftAnimation = getDirtyAnimation(draftAnimations, sectionId);

  return draftAnimation !== undefined ? draftAnimation : getSavedAnimation(sectionId);
}

function normalizeCachedAnimation(animation: DirtyAnimation) {
  const cachedVariant = (animation as { variant?: string } | null)?.variant;

  return cachedVariant === "static" ? ({ variant: "instant" } satisfies DirtyAnimation) : animation;
}

function getCurrentIllustrationVisibility(
  draftIllustrationVisibilities: DraftIllustrationVisibilities,
  sectionId: number,
) {
  return draftIllustrationVisibilities[sectionId] ?? getSavedIllustrationVisibility(sectionId);
}

function getCurrentIllustrationKind(draftIllustrationKinds: DraftIllustrationKinds, sectionId: number) {
  const section = RAM_BOX_LYRICS.find((candidate) => candidate.sectionId === sectionId);
  if (!section || typeof section.illustrateWith !== "string") return "generic";

  return draftIllustrationKinds[sectionId] ?? getSavedTimelineIllustrationKind(section);
}

function getDraftStartTime(draftStartTimes: DraftStartTimes, index: number) {
  const sectionId = RAM_BOX_LYRICS[index]?.sectionId;
  if (!sectionId) return 0;

  return draftStartTimes[sectionId] ?? getSavedStartTime(sectionId);
}

function readCachedSnapshots() {
  if (typeof window === "undefined") return {};

  try {
    return JSON.parse(window.sessionStorage.getItem(CACHED_SNAPSHOTS_STORAGE_KEY) ?? "{}") as Snapshots;
  } catch {
    return {};
  }
}

function writeCachedSnapshots(snapshots: Snapshots) {
  window.sessionStorage.setItem(CACHED_SNAPSHOTS_STORAGE_KEY, JSON.stringify(snapshots));
}

function roundToStep(time: number) {
  return Math.round(time / LINE_TIMING_STEP_SECONDS) * LINE_TIMING_STEP_SECONDS;
}

function clampTime(time: number, min: number, max: number) {
  return Math.min(max, Math.max(min, roundToStep(time)));
}

function arePendingChangesEqual(left: PendingChange | undefined, right: PendingChange | undefined) {
  if (!left || !right) return left === right;
  if (left.timestamp !== right.timestamp) return false;
  if (left.hasAnimation !== right.hasAnimation) return false;
  if (left.hasIllustrationKind !== right.hasIllustrationKind) return false;
  if (left.hasIllustrationKind && left.illustrationKind !== right.illustrationKind) return false;
  if (left.hasIllustrationVisibility !== right.hasIllustrationVisibility) return false;
  if (left.hasIllustrationVisibility && left.illustrationVisibility !== right.illustrationVisibility) return false;
  if (!left.hasAnimation) return true;

  return areDirtyAnimationsEqual(left.animation, right.animation);
}

export function useTunerAutosave(selectedIndex: number, duration: number) {
  const cachedSnapshotsRef = useRef<Snapshots>(readCachedSnapshots());
  const isSavingRef = useRef(false);
  const [draftAnimations, setDraftAnimations] = useState<DirtyAnimations>({});
  const [draftIllustrationKinds, setDraftIllustrationKinds] = useState<DraftIllustrationKinds>({});
  const [draftIllustrationVisibilities, setDraftIllustrationVisibilities] = useState<DraftIllustrationVisibilities>({});
  const [draftStartTimes, setDraftStartTimes] = useState<DraftStartTimes>({});
  const [pendingChanges, setPendingChanges] = useState<PendingChanges>({});
  const [resetPending, setResetPending] = useState(false);
  const [saveStatus, setSaveStatus] = useState<StatusState>({ label: "Cached value", sectionId: null });
  const [saveTick, setSaveTick] = useState(0);
  const selectedSection = RAM_BOX_LYRICS[selectedIndex];
  const nextSection = RAM_BOX_LYRICS[selectedIndex + 1];

  const getCurrentSnapshot = useCallback((): Snapshot => {
    return {
      animation: getCurrentAnimation(draftAnimations, selectedSection.sectionId),
      endTime: nextSection
        ? getDraftStartTime(draftStartTimes, selectedIndex + 1)
        : Number.isFinite(duration)
          ? duration
          : null,
      illustrationKind: getCurrentIllustrationKind(draftIllustrationKinds, selectedSection.sectionId),
      illustrationVisibility: getCurrentIllustrationVisibility(
        draftIllustrationVisibilities,
        selectedSection.sectionId,
      ),
      startTime: getDraftStartTime(draftStartTimes, selectedIndex),
    };
  }, [
    draftAnimations,
    draftIllustrationKinds,
    draftIllustrationVisibilities,
    draftStartTimes,
    duration,
    nextSection,
    selectedIndex,
    selectedSection.sectionId,
  ]);

  const getCachedSnapshot = useCallback((): Snapshot => {
    const cachedSnapshot = cachedSnapshotsRef.current[selectedSection.sectionId];
    if (cachedSnapshot) {
      return {
        ...cachedSnapshot,
        animation: normalizeCachedAnimation(cachedSnapshot.animation),
        illustrationKind: cachedSnapshot.illustrationKind ?? getSavedIllustrationKind(selectedSection.sectionId),
        illustrationVisibility:
          cachedSnapshot.illustrationVisibility ?? getSavedIllustrationVisibility(selectedSection.sectionId),
      };
    }

    return {
      animation: getSavedAnimation(selectedSection.sectionId),
      endTime: nextSection ? getSavedStartTime(nextSection.sectionId) : null,
      illustrationKind: getSavedIllustrationKind(selectedSection.sectionId),
      illustrationVisibility: getSavedIllustrationVisibility(selectedSection.sectionId),
      startTime: getSavedStartTime(selectedSection.sectionId),
    };
  }, [nextSection, selectedSection.sectionId]);

  const cacheSnapshot = useCallback(() => {
    if (!Object.hasOwn(cachedSnapshotsRef.current, selectedSection.sectionId)) {
      const snapshot = getCachedSnapshot();
      const nextSnapshots = { ...cachedSnapshotsRef.current, [selectedSection.sectionId]: snapshot };
      cachedSnapshotsRef.current = nextSnapshots;
      writeCachedSnapshots(nextSnapshots);
    }

    return cachedSnapshotsRef.current[selectedSection.sectionId];
  }, [getCachedSnapshot, selectedSection.sectionId]);

  const registerSnapshot = useCallback(() => {
    const snapshot = getCurrentSnapshot();
    const nextSnapshots = { ...cachedSnapshotsRef.current, [selectedSection.sectionId]: snapshot };
    const hasPendingSave = Boolean(
      pendingChanges[selectedSection.sectionId] || (nextSection && pendingChanges[nextSection.sectionId]),
    );

    cachedSnapshotsRef.current = nextSnapshots;
    writeCachedSnapshots(nextSnapshots);
    setSaveStatus({
      label: hasPendingSave ? "Pending autosave" : "Cached value",
      sectionId: selectedSection.sectionId,
    });
  }, [getCurrentSnapshot, nextSection, pendingChanges, selectedSection.sectionId]);

  useEffect(() => {
    cacheSnapshot();
  }, [cacheSnapshot]);

  useEffect(() => {
    const changes = Object.entries(pendingChanges);
    if (!changes.length || isSavingRef.current) return;

    const isResetSave = resetPending;
    setSaveStatus({ label: isResetSave ? "Resetting" : "Pending autosave", sectionId: selectedSection.sectionId });
    const timeout = window.setTimeout(() => {
      const saveChanges = async () => {
        isSavingRef.current = true;
        setSaveStatus({ label: isResetSave ? "Resetting" : "Autosaving", sectionId: selectedSection.sectionId });
        const savedChanges = Object.fromEntries(changes) as PendingChanges;
        try {
          const response = await fetch(SAVE_ENDPOINT, {
            body: JSON.stringify({
              changes: changes.map(([sectionId, change]) => ({
                ...(change.hasAnimation ? { illustrationAnimation: change.animation } : {}),
                ...(change.hasIllustrationKind ? { illustrationKind: change.illustrationKind } : {}),
                ...(change.hasIllustrationVisibility
                  ? { illustrationVisibility: change.illustrationVisibility }
                  : {}),
                ...(change.timestamp !== undefined ? { timestamp: formatLyricsTimestamp(change.timestamp) } : {}),
                sectionId: Number(sectionId),
              })),
            }),
            headers: { "Content-Type": "application/json" },
            method: "POST",
          });

          if (!response.ok) throw new Error("Autosave failed");
        } catch {
          setSaveStatus({ label: "Autosave failed", sectionId: selectedSection.sectionId });
          isSavingRef.current = false;
          return;
        }

        setPendingChanges((current) => {
          const next = { ...current };
          Object.entries(savedChanges).forEach(([sectionId, change]) => {
            const numericSectionId = Number(sectionId);
            if (arePendingChangesEqual(current[numericSectionId], change)) delete next[numericSectionId];
          });

          return next;
        });
        setResetPending(false);
        setSaveStatus({ label: isResetSave ? "Cached value" : "Autosaved", sectionId: selectedSection.sectionId });
        isSavingRef.current = false;
        setSaveTick((tick) => tick + 1);
      };

      void saveChanges();
    }, AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(timeout);
  }, [pendingChanges, resetPending, saveTick, selectedSection.sectionId]);

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
    [addPendingChange, cacheSnapshot, draftAnimations, selectedSection.sectionId],
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
    [addPendingChange, cacheSnapshot, draftIllustrationKinds, selectedSection.sectionId],
  );

  const setIllustrationVisibility = useCallback(
    (illustrationVisibility: IllustrationVisibility) => {
      cacheSnapshot();
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
    [addPendingChange, cacheSnapshot, draftIllustrationVisibilities, selectedSection.sectionId],
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
    [addPendingChange, cacheSnapshot, draftStartTimes, duration, selectedSection.sectionId],
  );

  const resetSnapshot = useCallback(() => {
    const cachedSnapshot = cacheSnapshot();
    const currentSnapshot = getCurrentSnapshot();
    const animationChanged = !areDirtyAnimationsEqual(currentSnapshot.animation, cachedSnapshot.animation);
    const illustrationKindChanged = currentSnapshot.illustrationKind !== cachedSnapshot.illustrationKind;
    const illustrationVisibilityChanged =
      currentSnapshot.illustrationVisibility !== cachedSnapshot.illustrationVisibility;
    const startChanged = currentSnapshot.startTime !== cachedSnapshot.startTime;
    const endChanged = nextSection && currentSnapshot.endTime !== cachedSnapshot.endTime;
    if (!animationChanged && !illustrationKindChanged && !illustrationVisibilityChanged && !startChanged && !endChanged) {
      setSaveStatus({ label: "Cached value", sectionId: selectedSection.sectionId });
      return;
    }

    setDraftAnimations((current) => ({ ...current, [selectedSection.sectionId]: cachedSnapshot.animation }));
    setDraftIllustrationAnimation(selectedSection.sectionId, cachedSnapshot.animation);
    addPendingChange(selectedSection.sectionId, { animation: cachedSnapshot.animation, hasAnimation: true });
    const cachedIllustrationKind = cachedSnapshot.illustrationKind;
    if (illustrationKindChanged && cachedIllustrationKind !== "generic") {
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

    setResetPending(true);
    setSaveStatus({ label: "Resetting", sectionId: selectedSection.sectionId });
  }, [addPendingChange, cacheSnapshot, getCurrentSnapshot, nextSection, selectedSection.sectionId]);

  const currentSnapshot = getCurrentSnapshot();
  const cachedSnapshot = getCachedSnapshot();
  const selectedUsesCachedSnapshot =
    areDirtyAnimationsEqual(currentSnapshot.animation, cachedSnapshot.animation) &&
    currentSnapshot.illustrationKind === cachedSnapshot.illustrationKind &&
    currentSnapshot.illustrationVisibility === cachedSnapshot.illustrationVisibility &&
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
    selectedIllustrationKind: getEffectiveTimelineIllustrationKind(selectedSection),
    selectedIllustrationVisibility: getEffectiveIllustrationVisibility(selectedSection),
    selectedEndTime: currentSnapshot.endTime ?? currentSnapshot.startTime,
    selectedStartTime: currentSnapshot.startTime,
    setAnimation,
    setIllustrationKind,
    setIllustrationVisibility,
    setLineEndTime: (startTime: number) => setStartTime(selectedIndex + 1, startTime),
    setLineStartTime: (startTime: number) => setStartTime(selectedIndex, startTime),
  };
}
