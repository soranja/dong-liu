import { useCallback, useEffect, useState } from "react";
import { getTimelineSectionTime } from "@entities/track/lib/generalTimeline";
import { DEFAULT_ANIMATION_LENGTH_PERCENT, getRangeAnimation } from "@entities/track/model/animation";
import type { TimelineProgressDetail } from "@entities/track/model/tuning";
import { getRangeValues } from "./animationSelection";
import { getTuningLoopBounds, type TuningLoopMode } from "./looping";
import type { IllustrationTuningSession } from "./session";
import { useTunerAutosave } from "./useTunerAutosave";

type UseIllustrationAnimationTunerPanelOptions = {
  duration: number;
  isLoading: boolean;
  onSeek: (progress: number) => void;
  session: IllustrationTuningSession;
};

const LOOP_SEEK_EPSILON_SECONDS = 0.05;
const TUNER_OPEN_STORAGE_KEY = "dong-liu:illustration-animation-tuner-open";

function getTunerOpenStorageKey(trackId: string) {
  return `${TUNER_OPEN_STORAGE_KEY}:${trackId}`;
}

function getInitialTunerOpen(trackId: string) {
  return typeof window !== "undefined" && window.sessionStorage.getItem(getTunerOpenStorageKey(trackId)) === "true";
}

function writeTunerOpen(trackId: string, isOpen: boolean) {
  window.sessionStorage.setItem(getTunerOpenStorageKey(trackId), String(isOpen));
}

function getInitialActiveProgress(session: IllustrationTuningSession): TimelineProgressDetail {
  return {
    activeIndex: 0,
    currentTime: 0,
    duration: 0,
    progress: 0,
    sectionId: session.lyrics[0]?.sectionId ?? 0,
  };
}

export function useIllustrationAnimationTunerPanel({
  duration,
  isLoading,
  onSeek,
  session,
}: UseIllustrationAnimationTunerPanelOptions) {
  const [activeProgress, setActiveProgress] = useState<TimelineProgressDetail>(() => getInitialActiveProgress(session));
  const [followActive, setFollowActive] = useState(true);
  const [isOpen, setIsOpen] = useState(() => getInitialTunerOpen(session.trackId));
  const [loopMode, setLoopMode] = useState<TuningLoopMode>(0);
  const [playheadPreviewPercent, setPlayheadPreviewPercent] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedSection = session.lyrics[selectedIndex];
  const tunerState = useTunerAutosave(session, selectedIndex, duration);
  const selectedAnimation = tunerState.selectedAnimation;
  const selectedRange = getRangeValues(selectedAnimation);
  const selectedAnimationLengthPercent = selectedRange.animationLengthPercent ?? DEFAULT_ANIMATION_LENGTH_PERCENT;
  const isSelectedActive = selectedIndex === activeProgress.activeIndex;
  const liveProgressPercent = isSelectedActive ? activeProgress.progress * 100 : 0;
  const playheadPercent = playheadPreviewPercent ?? liveProgressPercent;

  const setTunerOpen = useCallback(
    (nextOpen: boolean | ((currentOpen: boolean) => boolean)) => {
      setIsOpen((currentOpen) => {
        const resolvedOpen = typeof nextOpen === "function" ? nextOpen(currentOpen) : nextOpen;
        writeTunerOpen(session.trackId, resolvedOpen);

        return resolvedOpen;
      });
    },
    [session.trackId],
  );

  useEffect(() => {
    if (!isLoading) return;

    setActiveProgress(getInitialActiveProgress(session));
    setFollowActive(true);
    setIsOpen(false);
    setLoopMode(0);
    setPlayheadPreviewPercent(null);
    setSelectedIndex(0);
    writeTunerOpen(session.trackId, false);
  }, [isLoading, session]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "F4") return;

      event.preventDefault();
      if (!isLoading) setTunerOpen((current) => !current);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLoading, setTunerOpen]);

  useEffect(() => {
    if (isLoading) return;

    const handleProgress = (detail: TimelineProgressDetail) => {
      setActiveProgress((previous) => {
        if (previous.activeIndex !== detail.activeIndex) setPlayheadPreviewPercent(null);

        return detail;
      });
      if (followActive) setSelectedIndex(detail.activeIndex);
    };

    return session.subscribeProgress(handleProgress);
  }, [followActive, isLoading, session]);

  useEffect(() => {
    if (isLoading || !isOpen || loopMode === 0) return;

    const bounds = getTuningLoopBounds(session.lyrics, selectedIndex, loopMode, duration, session);
    if (!bounds) return;

    const isPastLoopEnd = activeProgress.currentTime >= bounds.endTime - LOOP_SEEK_EPSILON_SECONDS;
    const isBeforeLoopStart = activeProgress.currentTime < bounds.startTime - LOOP_SEEK_EPSILON_SECONDS;
    if (isPastLoopEnd || isBeforeLoopStart) onSeek((bounds.startTime / duration) * 100);
  }, [activeProgress.currentTime, duration, isLoading, isOpen, loopMode, onSeek, selectedIndex, session]);

  const setRangeAnimation = (startPercent: number, endPercent: number) => {
    tunerState.setAnimation(getRangeAnimation(startPercent, endPercent, selectedAnimationLengthPercent));
  };

  const setAnimationLength = (animationLengthPercent: number) => {
    tunerState.setAnimation(
      getRangeAnimation(selectedRange.startPercent, selectedRange.endPercent, animationLengthPercent),
    );
  };

  const setFollowActiveSection = (nextFollowActive: boolean) => {
    setFollowActive(nextFollowActive);
    setPlayheadPreviewPercent(null);
    if (nextFollowActive) setSelectedIndex(activeProgress.activeIndex);
  };

  const setAnchoredLoopMode = (nextLoopMode: TuningLoopMode) => {
    setLoopMode(nextLoopMode);
    if (nextLoopMode === 0) {
      setFollowActiveSection(true);
      return;
    }

    setFollowActive(false);
    setPlayheadPreviewPercent(null);
  };

  const selectSection = (nextIndex: number) => {
    setFollowActive(false);
    setPlayheadPreviewPercent(0);
    setSelectedIndex(nextIndex);
    if (!duration || !Number.isFinite(duration)) return;

    const nextTime = getTimelineSectionTime(session.lyrics, nextIndex, 0, duration, session);
    onSeek((nextTime / duration) * 100);
  };

  const seekSelectedSection = (percent: number) => {
    setPlayheadPreviewPercent(percent);
    if (!duration || !Number.isFinite(duration)) return;

    const nextTime = getTimelineSectionTime(session.lyrics, selectedIndex, percent / 100, duration, session);
    onSeek((nextTime / duration) * 100);
  };

  return {
    followActive,
    isSelectedActive,
    isVisible: !isLoading && isOpen,
    loopMode,
    playheadPercent,
    releasePlayheadPreview: () => setPlayheadPreviewPercent(null),
    selectedAnimation,
    selectedAnimationLengthPercent,
    selectedRange,
    selectedSection,
    setAnchoredLoopMode,
    setAnimationLength,
    setFollowActiveSection,
    setRangeAnimation,
    setTunerOpen,
    seekSelectedSection,
    selectNextSection: () => selectSection(Math.min(session.lyrics.length - 1, selectedIndex + 1)),
    selectPreviousSection: () => selectSection(Math.max(0, selectedIndex - 1)),
    tunerState,
  };
}
