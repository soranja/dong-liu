import { SECTION_WIDTH_STEP_PERCENT } from '@entities/track/model/layout';
import { TUNING_PERCENT_MAX, TUNING_PERCENT_MIN } from '@shared/config/tuning';

type SectionLayoutControlsProps = {
  sectionWidthPercent: number;
  onSectionWidthChange: (sectionWidthPercent: number) => void;
};

export const SectionLayoutControls = ({ onSectionWidthChange, sectionWidthPercent }: SectionLayoutControlsProps) => (
  <div className="space-y-2">
    <label className="block font-mono text-[0.65rem] uppercase text-text-muted">
      <span className="mb-1 flex justify-between">
        <span>Section width</span>
        <span>{sectionWidthPercent}%</span>
      </span>
      <input
        type="range"
        min={TUNING_PERCENT_MIN}
        max={TUNING_PERCENT_MAX}
        step={SECTION_WIDTH_STEP_PERCENT}
        value={sectionWidthPercent}
        className="w-full accent-pumpkin"
        onChange={(event) => onSectionWidthChange(Number(event.currentTarget.value))}
      />
    </label>
  </div>
);
