import { useIllustrationAnimationTunerPanel } from "../model/useIllustrationAnimationTunerPanel";
import type { IllustrationTuningSession } from "../model/session";
import { FadeTimingControls } from "./FadeTimingControls";
import { IllustrationAnimationControls } from "./IllustrationAnimationControls";
import { LineTimingControls } from "./LineTimingControls";
import { LoopModeControls } from "./LoopModeControls";
import { TuningProgressBar } from "./TuningProgressBar";
import { TunerSectionSelector } from "./TunerSectionSelector";
import { WordAnimationControls } from "./WordAnimationControls";
import "./illustration-tuning.css";

type IllustrationAnimationTunerProps = {
  duration: number;
  isLoading: boolean;
  isPlaying: boolean;
  onSeek: (progress: number) => void;
  session: IllustrationTuningSession;
};

export const IllustrationAnimationTuner = ({
  duration,
  isLoading,
  isPlaying,
  onSeek,
  session,
}: IllustrationAnimationTunerProps) => {
  const panel = useIllustrationAnimationTunerPanel({ duration, isLoading, onSeek, session });
  const { tunerState } = panel;

  if (!panel.isVisible) return null;

  return (
    <aside
      data-illustration-tuner
      data-scroll-seek-ignore="true"
      className={`fixed inset-y-0 right-0 z-50 h-screen w-[min(24rem,100vw)] overflow-y-auto border-l border-(--color-border-strong) bg-(--color-panel) p-4 text-primary-text shadow-[0_24px_80px_var(--color-footer-shadow)] transition-transform duration-75 ease-out ${isPlaying ? "translate-x-full" : "translate-x-0"}`}
    >
      <button
        type="button"
        className="ml-auto block px-2 font-mono text-sm text-(--color-text-muted)"
        onClick={() => panel.setTunerOpen(false)}
      >
        Close
      </button>

      <div className="mt-2 space-y-3">
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

        <fieldset disabled={tunerState.selectedIsLocked} className="disabled:opacity-40">
          <WordAnimationControls animation={panel.selectedAnimation} illustrationKind={tunerState.selectedIllustrationKind} onChange={tunerState.setAnimation} text={typeof panel.selectedSection.illustrateWith === "string" ? panel.selectedSection.illustrateWith : ""} />
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
            isOverlay={tunerState.selectedIsOverlay}
            isRange={panel.selectedAnimation?.variant === "range"}
            isVisibilityLocked={tunerState.selectedIsOverlay}
            noSlideBy={tunerState.selectedNoSlideBy}
            onContinuingChange={tunerState.setContinuing}
            onLengthChange={panel.setAnimationLength}
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
