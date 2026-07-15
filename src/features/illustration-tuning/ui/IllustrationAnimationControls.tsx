import { getRangeAnimation } from "@entities/track/model/animation";
import type { IllustrationAnimation, IllustrationVisibility } from "@entities/track/model/types";
import { SectionLayoutControls } from "./SectionLayoutControls";

type DirtyAnimation = IllustrationAnimation | null;

type IllustrationAnimationControlsProps = {
  animationLengthPercent: number;
  canContinue: boolean;
  continuing: boolean;
  isOverlay: boolean;
  isRange: boolean;
  isVisibilityLocked: boolean;
  noSlideBy: boolean;
  saveStatus: string;
  sectionWidthPercent: number;
  selectedAnimation: IllustrationAnimation | undefined;
  selectedVisibility: IllustrationVisibility;
  onContinuingChange: (continuing: boolean) => void;
  onLengthChange: (animationLengthPercent: number) => void;
  onNoSlideByChange: (noSlideBy: boolean) => void;
  onOverlayChange: (isOverlay: boolean) => void;
  onRegisterSnapshot: () => void;
  onResetAnimation: () => void;
  onSectionWidthChange: (sectionWidthPercent: number) => void;
  onSelectAnimation: (animation: DirtyAnimation) => void;
  onVisibilityChange: (visibility: IllustrationVisibility) => void;
};

const TOGGLE_BUTTON_CLASS =
  "border border-(--color-border-strong) bg-panel-raised px-3 py-2 font-mono text-xs uppercase data-[active=true]:bg-(--color-control) data-[active=true]:text-(--color-panel)";
const VISIBILITY_OPTIONS = [
  { label: "Adjacent", value: "adjacent" },
  { label: "Only active", value: "only-active" },
  { label: "Start + active", value: "start-active" },
  { label: "Active + end", value: "active-end" },
] satisfies Array<{ label: string; value: IllustrationVisibility }>;

export const IllustrationAnimationControls = ({
  animationLengthPercent,
  canContinue,
  continuing,
  isOverlay,
  isRange,
  isVisibilityLocked,
  noSlideBy,
  onContinuingChange,
  onLengthChange,
  onNoSlideByChange,
  onOverlayChange,
  onRegisterSnapshot,
  onResetAnimation,
  onSectionWidthChange,
  onSelectAnimation,
  onVisibilityChange,
  saveStatus,
  sectionWidthPercent,
  selectedAnimation,
  selectedVisibility,
}: IllustrationAnimationControlsProps) => {
  const visibility = isVisibilityLocked ? "only-active" : selectedVisibility;

  return (
    <>
      <div className="flex flex-col gap-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={continuing}
          className="flex min-h-10 w-full items-center justify-between gap-3 border border-(--color-border-soft) bg-(--color-panel-chip) px-3 py-2 font-mono text-xs uppercase text-(--color-text-muted) disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!canContinue}
          onClick={() => onContinuingChange(!continuing)}
        >
          <span>Continuing</span>
          <span
            aria-hidden="true"
            className="h-4 w-4 border-2 border-(--color-text-muted) bg-transparent data-[active=true]:bg-(--color-control)"
            data-active={continuing}
          />
        </button>

        <div>
          <p className="mb-2 font-mono text-[0.65rem] uppercase text-(--color-text-muted)">Variant</p>
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              className={TOGGLE_BUTTON_CLASS}
              data-active={selectedAnimation?.variant !== "range"}
              onClick={() => onSelectAnimation({ variant: "instant" })}
            >
              Instant
            </button>
            <button
              type="button"
              className={TOGGLE_BUTTON_CLASS}
              data-active={selectedAnimation?.variant === "range"}
              onClick={() => onSelectAnimation(getRangeAnimation(0, 100))}
            >
              Range
            </button>
          </div>
        </div>

        <div>
          <p className="mb-2 font-mono text-[0.65rem] uppercase text-(--color-text-muted)">Visibility</p>
          <div className="grid grid-cols-2 gap-1">
            {VISIBILITY_OPTIONS.map((option) => {
              const isDisabled = isVisibilityLocked && option.value !== "only-active";

              return (
                <button
                  key={option.value}
                  type="button"
                  className={`${TOGGLE_BUTTON_CLASS} min-h-10 disabled:cursor-not-allowed disabled:opacity-40`}
                  data-active={visibility === option.value}
                  disabled={isDisabled}
                  title={isDisabled ? "Overlay sections are always only-active" : undefined}
                  onClick={() => onVisibilityChange(option.value)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          role="checkbox"
          aria-checked={isOverlay}
          className="flex min-h-10 w-full items-center justify-between gap-3 border border-(--color-border-soft) bg-(--color-panel-chip) px-3 py-2 font-mono text-xs uppercase text-(--color-text-muted)"
          onClick={() => onOverlayChange(!isOverlay)}
        >
          <span>Overlay</span>
          <span
            aria-hidden="true"
            className="h-4 w-4 border-2 border-(--color-text-muted) bg-transparent data-[active=true]:bg-(--color-control)"
            data-active={isOverlay}
          />
        </button>
      </div>

      <SectionLayoutControls
        noSlideBy={noSlideBy}
        onNoSlideByChange={onNoSlideByChange}
        onSectionWidthChange={onSectionWidthChange}
        sectionWidthPercent={sectionWidthPercent}
      />

      {isRange ? (
        <label className="block font-mono text-[0.65rem] uppercase text-(--color-text-muted)">
          <span className="mb-1 flex justify-between">
            <span>Animation length</span>
            <span>{animationLengthPercent}%</span>
          </span>
          <input
            type="range"
            min="0"
            max="100"
            value={animationLengthPercent}
            className="w-full accent-(--color-tuner-length)"
            onChange={(event) => onLengthChange(Number(event.currentTarget.value))}
          />
        </label>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="border border-(--color-border-strong) px-3 py-2 font-mono text-xs uppercase"
          onClick={onResetAnimation}
        >
          Reset
        </button>
        <button
          type="button"
          className="border border-(--color-border-strong) px-3 py-2 font-mono text-xs uppercase"
          onClick={onRegisterSnapshot}
        >
          Register
        </button>
      </div>
      <div>
        <p className="flex min-h-10 items-center justify-center border border-(--color-border-soft) bg-(--color-panel-chip) px-3 text-center font-mono text-xs uppercase leading-none text-(--color-text-muted)">
          {saveStatus}
        </p>
      </div>
    </>
  );
};
