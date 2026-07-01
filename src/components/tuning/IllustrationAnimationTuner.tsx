import { useIllustrationAnimationTunerPanel } from "../../hooks/useIllustrationAnimationTunerPanel";
import { FadeTimingControls } from "./FadeTimingControls";
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

export const IllustrationAnimationTuner = ({
  duration,
  isLoading,
  isPlaying,
  onSeek,
}: IllustrationAnimationTunerProps) => {
  const panel = useIllustrationAnimationTunerPanel({ duration, isLoading, onSeek });
  const { tunerState } = panel;

  if (!panel.isVisible) return null;

  return (
    <aside
      data-scroll-seek-ignore="true"
      className={`fixed inset-y-0 right-0 z-50 h-screen w-[min(24rem,100vw)] overflow-y-auto border-l border-(--color-border-strong) bg-(--color-panel) p-4 text-(--color-text) shadow-[0_24px_80px_var(--color-footer-shadow)] transition-transform duration-75 ease-out ${isPlaying ? "translate-x-full" : "translate-x-0"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[0.65rem] uppercase text-(--color-text-muted)">Illustration tuner</p>
          <h2 className="mt-1 font-mono text-lg font-bold uppercase leading-tight">F4 animation timing</h2>
        </div>
        <button
          type="button"
          className="px-2 font-mono text-sm text-(--color-text-muted)"
          onClick={() => panel.setTunerOpen(false)}
        >
          Close
        </button>
      </div>

      <div className="mt-4 space-y-3">
        <TunerSectionSelector
          followActive={panel.followActive}
          illustrationKind={tunerState.selectedIllustrationKind}
          isLocked={tunerState.selectedIsLocked}
          onFollowActiveChange={panel.setFollowActiveSection}
          onIllustrationKindChange={tunerState.setIllustrationKind}
          onNext={panel.selectNextSection}
          onPrevious={panel.selectPreviousSection}
          selectedSection={panel.selectedSection}
        />

        <fieldset disabled={tunerState.selectedIsLocked} className="disabled:opacity-40">
          <TuningProgressBar
            animationLengthPercent={panel.selectedAnimationLengthPercent}
            endPercent={panel.selectedRange.endPercent}
            isRange={panel.selectedAnimation?.variant === "range"}
            isSelectedActive={panel.isSelectedActive}
            onPlayheadChange={panel.seekSelectedSection}
            onPlayheadRelease={panel.releasePlayheadPreview}
            onRangeChange={panel.setRangeAnimation}
            playheadPercent={panel.playheadPercent}
            startPercent={panel.selectedRange.startPercent}
          />
        </fieldset>

        <LoopModeControls loopMode={panel.loopMode} onLoopModeChange={panel.setAnchoredLoopMode} />

        <LineTimingControls
          hasNextSection={tunerState.hasNextSection}
          onEndTimeChange={tunerState.setLineEndTime}
          onStartTimeChange={tunerState.setLineStartTime}
          selectedEndTime={tunerState.selectedEndTime}
          selectedStartTime={tunerState.selectedStartTime}
        />

        <fieldset disabled={tunerState.selectedIsLocked} className="space-y-3 disabled:opacity-40">
          <FadeTimingControls
            fadeInMs={tunerState.selectedFadeInMs}
            fadeOutMs={tunerState.selectedFadeOutMs}
            onFadeInChange={tunerState.setFadeInMs}
            onFadeOutChange={tunerState.setFadeOutMs}
          />

          <IllustrationAnimationControls
            animationLengthPercent={panel.selectedAnimationLengthPercent}
            canContinue={tunerState.hasNextSection}
            continuing={tunerState.selectedContinuing}
            enterDurationMs={tunerState.selectedEnterDurationMs}
            exitDurationMs={tunerState.selectedExitDurationMs}
            isOverlay={tunerState.selectedIsOverlay}
            isRange={panel.selectedAnimation?.variant === "range"}
            isVisibilityLocked={tunerState.selectedIsOverlay}
            noSlideBy={tunerState.selectedNoSlideBy}
            onContinuingChange={tunerState.setContinuing}
            onLengthChange={panel.setAnimationLength}
            onEnterDurationChange={tunerState.setEnterDurationMs}
            onExitDurationChange={tunerState.setExitDurationMs}
            onNoSlideByChange={tunerState.setNoSlideBy}
            onOverlayChange={tunerState.setOverlay}
            onRegisterSnapshot={tunerState.registerSnapshot}
            onResetAnimation={tunerState.resetSnapshot}
            onSectionWidthChange={tunerState.setSectionWidthPercent}
            onSelectAnimation={tunerState.setAnimation}
            onVisibilityChange={tunerState.setIllustrationVisibility}
            saveStatus={tunerState.saveStatus}
            sectionWidthPercent={tunerState.selectedSectionWidthPercent}
            selectedAnimation={panel.selectedAnimation}
            selectedVisibility={tunerState.selectedIllustrationVisibility}
          />
        </fieldset>
      </div>
    </aside>
  );
};
