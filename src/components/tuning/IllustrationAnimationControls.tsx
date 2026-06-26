import type { IllustrationAnimation, IllustrationVisibility } from "../../lyrics/types";
import { getRangeAnimation } from "../../utils/tuning/illustrationAnimation";

type DirtyAnimation = IllustrationAnimation | null;

type IllustrationAnimationControlsProps = {
  animationLengthPercent: number;
  isOverlay: boolean;
  isRange: boolean;
  saveStatus: string;
  selectedAnimation: IllustrationAnimation | undefined;
  selectedVisibility: IllustrationVisibility;
  onLengthChange: (animationLengthPercent: number) => void;
  onRegisterSnapshot: () => void;
  onResetAnimation: () => void;
  onSelectAnimation: (animation: DirtyAnimation) => void;
  onVisibilityChange: (visibility: IllustrationVisibility) => void;
};

const TOGGLE_BUTTON_CLASS =
  "border border-(--color-border-strong) bg-(--color-panel-raised) px-3 py-2 font-mono text-xs uppercase data-[active=true]:bg-(--color-control) data-[active=true]:text-(--color-panel)";

export const IllustrationAnimationControls = ({
  animationLengthPercent,
  isOverlay,
  isRange,
  onLengthChange,
  onRegisterSnapshot,
  onResetAnimation,
  onSelectAnimation,
  onVisibilityChange,
  saveStatus,
  selectedAnimation,
  selectedVisibility,
}: IllustrationAnimationControlsProps) => {
  const visibility = isOverlay ? "only-active" : selectedVisibility;

  return (
    <>
      <div className="flex flex-col gap-3">
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
          <div className="flex flex-wrap w-full gap-1">
            <button
              type="button"
              className={`${TOGGLE_BUTTON_CLASS} disabled:cursor-not-allowed disabled:opacity-40 w-full`}
              data-active={visibility === "adjacent"}
              disabled={isOverlay}
              title={isOverlay ? "Overlay sections are always only-active" : undefined}
              onClick={() => onVisibilityChange("adjacent")}
            >
              Adjacent
            </button>
            <button
              type="button"
              className={`${TOGGLE_BUTTON_CLASS} w-full`}
              data-active={visibility === "only-active"}
              onClick={() => onVisibilityChange("only-active")}
            >
              Only active
            </button>
            <button
              type="button"
              className={`${TOGGLE_BUTTON_CLASS} disabled:cursor-not-allowed disabled:opacity-40 w-full`}
              data-active={visibility === "active-trailing"}
              disabled={isOverlay}
              title={isOverlay ? "Overlay sections are always only-active" : undefined}
              onClick={() => onVisibilityChange("active-trailing")}
            >
              Active + end
            </button>
          </div>
          {isOverlay ? (
            <p className="mt-1 font-mono text-[0.6rem] uppercase text-(--color-text-muted)">
              Overlay — locked to only-active
            </p>
          ) : null}
        </div>
      </div>

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
