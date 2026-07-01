import { useEffect, useState } from "react";
import { RAM_BOX_LYRICS } from "../pages/ram-box/model/lyrics";
import { getTimelineSectionTime } from "../utils/generalTimeline";
import { getRangeValues } from "../utils/tuning/animationSelection";
import { DEFAULT_ANIMATION_LENGTH_PERCENT, getRangeAnimation } from "../utils/tuning/illustrationAnimation";
import { getTuningLoopBounds, type TuningLoopMode } from "../utils/tuning/looping";
import { TIMELINE_PROGRESS_EVENT, type TimelineProgressDetail } from "../utils/tuning/timelineProgressEvent";
import { useTunerAutosave } from "./useTunerAutosave";

type UseIllustrationAnimationTunerPanelOptions = {
  duration: number;
  isLoading: boolean;
  onSeek: (progress: number) => void;
};

const LOOP_SEEK_EPSILON_SECONDS = 0.05;
const TUNER_OPEN_STORAGE_KEY = "dong-liu:illustration-animation-tuner-open";
const INITIAL_ACTIVE_PROGRESS = {
  activeIndex: 0,
  currentTime: 0,
  duration: 0,
  progress: 0,
  sectionId: RAM_BOX_LYRICS[0].sectionId,
} satisfies TimelineProgressDetail;

function getInitialTunerOpen() {
  return typeof window !== "undefined" && window.sessionStorage.getItem(TUNER_OPEN_STORAGE_KEY) === "true";
}

function writeTunerOpen(isOpen: boolean) {
  window.sessionStorage.setItem(TUNER_OPEN_STORAGE_KEY, String(isOpen));
}

export function useIllustrationAnimationTunerPanel({
  duration,
  isLoading,
  onSeek,
}: UseIllustrationAnimationTunerPanelOptions) {
  const [activeProgress, setActiveProgress] = useState<TimelineProgressDetail>(INITIAL_ACTIVE_PROGRESS);
  const [followActive, setFollowActive] = useState(true);
  const [isOpen, setIsOpen] = useState(getInitialTunerOpen);
  const [loopMode, setLoopMode] = useState<TuningLoopMode>(0);
  const [playheadPreviewPercent, setPlayheadPreviewPercent] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedSection = RAM_BOX_LYRICS[selectedIndex];
  const tunerState = useTunerAutosave(selectedIndex, duration);
  const selectedAnimation = tunerState.selectedAnimation;
  const selectedRange = getRangeValues(selectedAnimation);
  const selectedAnimationLengthPercent = selectedRange.animationLengthPercent ?? DEFAULT_ANIMATION_LENGTH_PERCENT;
  const isSelectedActive = selectedIndex === activeProgress.activeIndex;
  const liveProgressPercent = isSelectedActive ? activeProgress.progress * 100 : 0;
  const playheadPercent = playheadPreviewPercent ?? liveProgressPercent;

  const setTunerOpen = (nextOpen: boolean | ((currentOpen: boolean) => boolean)) => {
    setIsOpen((currentOpen) => {
      const resolvedOpen = typeof nextOpen === "function" ? nextOpen(currentOpen) : nextOpen;
      writeTunerOpen(resolvedOpen);

      return resolvedOpen;
    });
  };

  useEffect(() => {
    if (!isLoading) return;

    setActiveProgress(INITIAL_ACTIVE_PROGRESS);
    setFollowActive(true);
    setIsOpen(false);
    setLoopMode(0);
    setPlayheadPreviewPercent(null);
    setSelectedIndex(0);
    writeTunerOpen(false);
  }, [isLoading]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "F4") return;

      event.preventDefault();
      if (!isLoading) setTunerOpen((current) => !current);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return;

    const handleProgress = (event: Event) => {
      const detail = (event as CustomEvent<TimelineProgressDetail>).detail;
      setActiveProgress((previous) => {
        if (previous.activeIndex !== detail.activeIndex) setPlayheadPreviewPercent(null);

        return detail;
      });
      if (followActive) setSelectedIndex(detail.activeIndex);
    };

    window.addEventListener(TIMELINE_PROGRESS_EVENT, handleProgress);
    return () => window.removeEventListener(TIMELINE_PROGRESS_EVENT, handleProgress);
  }, [followActive, isLoading]);

  useEffect(() => {
    if (isLoading || !isOpen || loopMode === 0) return;

    const bounds = getTuningLoopBounds(selectedIndex, loopMode, duration);
    if (!bounds) return;

    const isPastLoopEnd = activeProgress.currentTime >= bounds.endTime - LOOP_SEEK_EPSILON_SECONDS;
    const isBeforeLoopStart = activeProgress.currentTime < bounds.startTime - LOOP_SEEK_EPSILON_SECONDS;
    if (isPastLoopEnd || isBeforeLoopStart) onSeek((bounds.startTime / duration) * 100);
  }, [activeProgress.currentTime, duration, isLoading, isOpen, loopMode, onSeek, selectedIndex]);

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

    const nextTime = getTimelineSectionTime(RAM_BOX_LYRICS, nextIndex, 0, duration);
    onSeek((nextTime / duration) * 100);
  };

  const seekSelectedSection = (percent: number) => {
    setPlayheadPreviewPercent(percent);
    if (!duration || !Number.isFinite(duration)) return;

    const nextTime = getTimelineSectionTime(RAM_BOX_LYRICS, selectedIndex, percent / 100, duration);
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
    selectNextSection: () => selectSection(Math.min(RAM_BOX_LYRICS.length - 1, selectedIndex + 1)),
    selectPreviousSection: () => selectSection(Math.max(0, selectedIndex - 1)),
    tunerState,
  };
}
