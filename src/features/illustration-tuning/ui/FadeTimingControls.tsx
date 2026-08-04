import { FADE_TIMING_MAX_MS } from "../model/tunerAutosaveState";

type FadeTimingControlsProps = {
  fadeInMs: number;
  fadeOutMs: number;
  onFadeInChange: (fadeInMs: number) => void;
  onFadeOutChange: (fadeOutMs: number) => void;
};

const FADE_TIMING_STEP_MS = 50;
const FADE_TIMING_TICKS = [0, 250, 500, 750, FADE_TIMING_MAX_MS];

export const FadeTimingControls = ({
  fadeInMs,
  fadeOutMs,
  onFadeInChange,
  onFadeOutChange,
}: FadeTimingControlsProps) => (
  <div className="space-y-2">
    <p className="font-mono text-[0.65rem] uppercase text-text-muted">Fade</p>
    {[
      { label: "Fade in", onChange: onFadeInChange, value: fadeInMs },
      { label: "Fade out", onChange: onFadeOutChange, value: fadeOutMs },
    ].map((control) => (
      <label key={control.label} className="block font-mono text-[0.65rem] uppercase text-text-muted">
        <span className="mb-1 flex justify-between">
          <span>{control.label}</span>
          <span>{control.value}ms</span>
        </span>
        <input
          type="range"
          min="0"
          max={FADE_TIMING_MAX_MS}
          step={FADE_TIMING_STEP_MS}
          value={control.value}
          list="illustration-fade-ticks"
          className="w-full accent-pumpkin"
          onChange={(event) => control.onChange(Number(event.currentTarget.value))}
        />
      </label>
    ))}
    <datalist id="illustration-fade-ticks">
      {FADE_TIMING_TICKS.map((tick) => (
        <option key={tick} value={tick} />
      ))}
    </datalist>
  </div>
);
