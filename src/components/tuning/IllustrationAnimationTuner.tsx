import { useEffect, useState } from "react";
import { useTunerAutosave } from "../../hooks/useTunerAutosave";
import { RAM_BOX_LYRICS } from "../../lyrics/ram-box-lyrics";
import { getTimelineSectionTime } from "../../utils/generalTimeline";
import { getRangeValues } from "../../utils/tuning/animationSelection";
import { DEFAULT_ANIMATION_LENGTH_PERCENT, getRangeAnimation } from "../../utils/tuning/illustrationAnimation";
import { getTuningLoopBounds, type TuningLoopMode } from "../../utils/tuning/looping";
import { TIMELINE_PROGRESS_EVENT, type TimelineProgressDetail } from "../../utils/tuning/timelineProgressEvent";
import { IllustrationAnimationControls } from "./IllustrationAnimationControls";
import { LineTimingControls } from "./LineTimingControls";
import { LoopModeControls } from "./LoopModeControls";
import { TuningProgressBar } from "./TuningProgressBar";
import { TunerSectionSelector } from "./TunerSectionSelector";

type IllustrationAnimationTunerProps = {
  duration: number;
  isLoading: boolean;
  isPlaying: boolean;
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
export const IllustrationAnimationTuner = ({ duration, isLoading, isPlaying, onSeek }: IllustrationAnimationTunerProps) => {
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
      if (isLoading) return;

      setTunerOpen((current) => !current);
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
    tunerState.setAnimation(getRangeAnimation(selectedRange.startPercent, selectedRange.endPercent, animationLengthPercent));
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

    const nextTime = getTimelineSectionTime(nextIndex, 0, duration);
    onSeek((nextTime / duration) * 100);
  };

  const selectPreviousSection = () => {
    selectSection(Math.max(0, selectedIndex - 1));
  };

  const selectNextSection = () => {
    selectSection(Math.min(RAM_BOX_LYRICS.length - 1, selectedIndex + 1));
  };

  const seekSelectedSection = (percent: number) => {
    setPlayheadPreviewPercent(percent);
    if (!duration || !Number.isFinite(duration)) return;

    const nextTime = getTimelineSectionTime(selectedIndex, percent / 100, duration);
    onSeek((nextTime / duration) * 100);
  };

  if (isLoading || !isOpen) return null;

  return (
    <aside
      className={`fixed inset-y-0 right-0 z-50 h-screen w-[min(24rem,100vw)] overflow-y-auto border-l border-(--color-border-strong) bg-(--color-panel) p-4 text-(--color-text) shadow-[0_24px_80px_var(--color-footer-shadow)] transition-transform duration-75 ease-out ${isPlaying ? "translate-x-full" : "translate-x-0"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[0.65rem] uppercase text-(--color-text-muted)">Illustration tuner</p>
          <h2 className="mt-1 font-mono text-lg font-bold uppercase leading-tight">F4 animation timing</h2>
        </div>
        <button type="button" className="px-2 font-mono text-sm text-(--color-text-muted)" onClick={() => setTunerOpen(false)}>
          Close
        </button>
      </div>

      <div className="mt-4 space-y-3">
        <TunerSectionSelector
          followActive={followActive}
          illustrationKind={tunerState.selectedIllustrationKind}
          onFollowActiveChange={setFollowActiveSection}
          onIllustrationKindChange={tunerState.setIllustrationKind}
          onNext={selectNextSection}
          onPrevious={selectPreviousSection}
          selectedSection={selectedSection}
        />

        <TuningProgressBar
          animationLengthPercent={selectedAnimationLengthPercent}
          endPercent={selectedRange.endPercent}
          isRange={selectedAnimation?.variant === "range"}
          isSelectedActive={isSelectedActive}
          onPlayheadChange={seekSelectedSection}
          onPlayheadRelease={() => setPlayheadPreviewPercent(null)}
          onRangeChange={setRangeAnimation}
          playheadPercent={playheadPercent}
          startPercent={selectedRange.startPercent}
        />

        <LoopModeControls loopMode={loopMode} onLoopModeChange={setAnchoredLoopMode} />

        <LineTimingControls
          hasNextSection={tunerState.hasNextSection}
          onEndTimeChange={tunerState.setLineEndTime}
          onStartTimeChange={tunerState.setLineStartTime}
          selectedEndTime={tunerState.selectedEndTime}
          selectedStartTime={tunerState.selectedStartTime}
        />

        <IllustrationAnimationControls
          animationLengthPercent={selectedAnimationLengthPercent}
          isOverlay={Boolean(selectedSection.isOverlay)}
          isRange={selectedAnimation?.variant === "range"}
          onLengthChange={setAnimationLength}
          onRegisterSnapshot={tunerState.registerSnapshot}
          onResetAnimation={tunerState.resetSnapshot}
          onSelectAnimation={tunerState.setAnimation}
          onVisibilityChange={tunerState.setIllustrationVisibility}
          saveStatus={tunerState.saveStatus}
          selectedAnimation={selectedAnimation}
          selectedVisibility={tunerState.selectedIllustrationVisibility}
        />
      </div>
    </aside>
  );
};
