import { SECTION_WIDTH_STEP_PERCENT } from "@entities/track/model/layout";

type SectionLayoutControlsProps = {
  noSlideBy: boolean;
  sectionWidthPercent: number;
  onNoSlideByChange: (noSlideBy: boolean) => void;
  onSectionWidthChange: (sectionWidthPercent: number) => void;
};

export const SectionLayoutControls = ({
  noSlideBy,
  onNoSlideByChange,
  onSectionWidthChange,
  sectionWidthPercent,
}: SectionLayoutControlsProps) => (
  <div className="space-y-2">
    <label className="block font-mono text-[0.65rem] uppercase text-(--color-text-muted)">
      <span className="mb-1 flex justify-between">
        <span>Section width</span>
        <span>{sectionWidthPercent}%</span>
      </span>
      <input
        type="range"
        min="0"
        max="100"
        step={SECTION_WIDTH_STEP_PERCENT}
        value={sectionWidthPercent}
        className="w-full accent-(--color-tuner-length)"
        onChange={(event) => onSectionWidthChange(Number(event.currentTarget.value))}
      />
    </label>

    <button
      type="button"
      role="checkbox"
      aria-checked={noSlideBy}
      className="flex min-h-10 w-full items-center justify-between gap-3 border border-(--color-border-soft) bg-(--color-panel-chip) px-3 py-2 font-mono text-xs uppercase text-(--color-text-muted)"
      onClick={() => onNoSlideByChange(!noSlideBy)}
    >
      <span>No slide by</span>
      <span
        aria-hidden="true"
        className="h-4 w-4 border-2 border-(--color-text-muted) bg-transparent data-[active=true]:bg-(--color-control)"
        data-active={noSlideBy}
      />
    </button>
  </div>
);
