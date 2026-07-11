import { LINE_TIMING_STEP_SECONDS } from "../model/useTunerAutosave";

type LineTimingControlsProps = {
  hasNextSection: boolean;
  selectedEndTime: number;
  selectedStartTime: number;
  onEndTimeChange: (time: number) => void;
  onStartTimeChange: (time: number) => void;
};

function formatTimeInput(time: number) {
  return Number.isFinite(time) ? time.toFixed(3) : "0.000";
}

export const LineTimingControls = ({
  hasNextSection,
  onEndTimeChange,
  onStartTimeChange,
  selectedEndTime,
  selectedStartTime,
}: LineTimingControlsProps) => (
  <div className="space-y-2">
    <p className="font-mono text-[0.65rem] uppercase text-(--color-text-muted)">Line time</p>
    <div className="grid grid-cols-2 gap-2">
      <label className="block font-mono text-[0.65rem] uppercase text-(--color-text-muted)">
        <span className="mb-1 block">Start</span>
        <input
          type="number"
          min="0"
          step={LINE_TIMING_STEP_SECONDS}
          value={formatTimeInput(selectedStartTime)}
          className="w-full border border-(--color-border-strong) bg-panel-raised px-2 py-2 text-(--color-text)"
          onChange={(event) => {
            if (event.currentTarget.value === "") return;
            onStartTimeChange(Number(event.currentTarget.value));
          }}
        />
      </label>
      <label className="block font-mono text-[0.65rem] uppercase text-(--color-text-muted)">
        <span className="mb-1 block">End</span>
        <input
          type="number"
          min="0"
          step={LINE_TIMING_STEP_SECONDS}
          value={formatTimeInput(selectedEndTime)}
          disabled={!hasNextSection}
          className="w-full border border-(--color-border-strong) bg-panel-raised px-2 py-2 text-(--color-text) disabled:opacity-40"
          onChange={(event) => {
            if (event.currentTarget.value === "") return;
            onEndTimeChange(Number(event.currentTarget.value));
          }}
        />
      </label>
    </div>
  </div>
);
