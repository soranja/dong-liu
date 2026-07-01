import { TUNING_LOOP_MODES, type TuningLoopMode } from "../model/looping";

type LoopModeControlsProps = {
  loopMode: TuningLoopMode;
  onLoopModeChange: (loopMode: TuningLoopMode) => void;
};

const LOOP_LABELS: Record<TuningLoopMode, string> = {
  0: "No loop",
  1: "1 section",
  3: "3 sections",
  5: "5 sections",
};

export const LoopModeControls = ({ loopMode, onLoopModeChange }: LoopModeControlsProps) => (
  <div>
    <p className="mb-2 font-mono text-[0.65rem] uppercase text-(--color-text-muted)">Loop playback</p>
    <div className="grid grid-cols-4 gap-1" role="radiogroup" aria-label="Loop playback range">
      {TUNING_LOOP_MODES.map((option) => (
        <label
          key={option}
          className="border border-(--color-border-strong) bg-(--color-panel-raised) px-2 py-2 text-center font-mono text-[0.65rem] uppercase data-[active=true]:bg-(--color-control) data-[active=true]:text-(--color-panel)"
          data-active={loopMode === option}
        >
          <input
            type="radio"
            name="illustration-tuner-loop-mode"
            className="sr-only"
            checked={loopMode === option}
            onChange={() => onLoopModeChange(option)}
          />
          {LOOP_LABELS[option]}
        </label>
      ))}
    </div>
  </div>
);
