import { getRangeAnimation } from '@entities/track/model/animation';
import { type IllustrationAnimation, type IllustrationVisibility } from '@entities/track/model/types';
import { ILLUSTRATION_VISIBILITIES, TUNING_PERCENT_MAX, TUNING_PERCENT_MIN } from '@shared/config/tuning';
import { SectionLayoutControls } from './SectionLayoutControls';

type DirtyAnimation = IllustrationAnimation | null;

type IllustrationAnimationControlsProps = {
  animationLengthPercent: number;
  canContinue: boolean;
  continuing: boolean;
  isOverlay: boolean;
  isRange: boolean;
  isVisibilityLocked: boolean;
  saveStatus: string;
  sectionWidthPercent: number;
  selectedAnimation: IllustrationAnimation | undefined;
  selectedVisibility: IllustrationVisibility;
  onContinuingChange: (continuing: boolean) => void;
  onLengthChange: (animationLengthPercent: number) => void;
  onOverlayChange: (isOverlay: boolean) => void;
  onRegisterSnapshot: () => void;
  onResetAnimation: () => void;
  onSectionWidthChange: (sectionWidthPercent: number) => void;
  onSelectAnimation: (animation: DirtyAnimation) => void;
  onVisibilityChange: (visibility: IllustrationVisibility) => void;
};

const TOGGLE_BUTTON_CLASS =
  'border border-border-strong bg-panel-raised px-3 py-2 font-mono text-xs uppercase data-[active=true]:bg-cream-white data-[active=true]:text-panel';
const VISIBILITY_LABELS = {
  adjacent: 'Adjacent',
  'only-active': 'Only active',
  'start-active': 'Start + active',
  'active-end': 'Active + end',
} satisfies Record<IllustrationVisibility, string>;
const VISIBILITY_OPTIONS = ILLUSTRATION_VISIBILITIES.map((value) => ({ label: VISIBILITY_LABELS[value], value }));

export const IllustrationAnimationControls = ({
  animationLengthPercent,
  canContinue,
  continuing,
  isOverlay,
  isRange,
  isVisibilityLocked,
  onContinuingChange,
  onLengthChange,
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
  const visibility = isVisibilityLocked ? 'only-active' : selectedVisibility;

  return (
    <>
      <div className="flex flex-col gap-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={continuing}
          className="flex min-h-10 w-full items-center justify-between gap-3 border border-border-soft bg-panel-chip px-3 py-2 font-mono text-xs uppercase text-text-muted disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!canContinue}
          onClick={() => onContinuingChange(!continuing)}
        >
          <span>Continuing</span>
          <span
            aria-hidden="true"
            className="h-4 w-4 border-2 border-text-muted bg-transparent data-[active=true]:bg-cream-white"
            data-active={continuing}
          />
        </button>

        <div>
          <p className="mb-2 font-mono text-[0.65rem] uppercase text-text-muted">Variant</p>
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              className={TOGGLE_BUTTON_CLASS}
              data-active={selectedAnimation?.variant !== 'range'}
              onClick={() => onSelectAnimation({ variant: 'instant' })}
            >
              Instant
            </button>
            <button
              type="button"
              className={TOGGLE_BUTTON_CLASS}
              data-active={selectedAnimation?.variant === 'range'}
              onClick={() => onSelectAnimation(getRangeAnimation(TUNING_PERCENT_MIN, TUNING_PERCENT_MAX))}
            >
              Range
            </button>
          </div>
        </div>

        <div>
          <p className="mb-2 font-mono text-[0.65rem] uppercase text-text-muted">Visibility</p>
          <div className="grid grid-cols-2 gap-1">
            {VISIBILITY_OPTIONS.map((option) => {
              const isDisabled = isVisibilityLocked && option.value !== 'only-active';

              return (
                <button
                  key={option.value}
                  type="button"
                  className={`${TOGGLE_BUTTON_CLASS} min-h-10 disabled:cursor-not-allowed disabled:opacity-40`}
                  data-active={visibility === option.value}
                  disabled={isDisabled}
                  title={isDisabled ? 'Overlay sections are always only-active' : undefined}
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
          className="flex min-h-10 w-full items-center justify-between gap-3 border border-border-soft bg-panel-chip px-3 py-2 font-mono text-xs uppercase text-text-muted"
          onClick={() => onOverlayChange(!isOverlay)}
        >
          <span>Overlay</span>
          <span
            aria-hidden="true"
            className="h-4 w-4 border-2 border-text-muted bg-transparent data-[active=true]:bg-cream-white"
            data-active={isOverlay}
          />
        </button>
      </div>

      <SectionLayoutControls onSectionWidthChange={onSectionWidthChange} sectionWidthPercent={sectionWidthPercent} />

      {isRange ? (
        <label className="block font-mono text-[0.65rem] uppercase text-text-muted">
          <span className="mb-1 flex justify-between">
            <span>Animation length</span>
            <span>{animationLengthPercent}%</span>
          </span>
          <input
            type="range"
            min={TUNING_PERCENT_MIN}
            max={TUNING_PERCENT_MAX}
            value={animationLengthPercent}
            className="w-full accent-pumpkin"
            onChange={(event) => onLengthChange(Number(event.currentTarget.value))}
          />
        </label>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="border border-border-strong px-3 py-2 font-mono text-xs uppercase"
          onClick={onResetAnimation}
        >
          Reset
        </button>
        <button
          type="button"
          className="border border-border-strong px-3 py-2 font-mono text-xs uppercase"
          onClick={onRegisterSnapshot}
        >
          Register
        </button>
      </div>
      <div>
        <p className="flex min-h-10 items-center justify-center border border-border-soft bg-panel-chip px-3 text-center font-mono text-xs uppercase leading-none text-text-muted">
          {saveStatus}
        </p>
      </div>
    </>
  );
};
