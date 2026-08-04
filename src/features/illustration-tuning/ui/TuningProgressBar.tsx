import { useRef, useState, type PointerEvent } from 'react';
import { getAnimationLengthPercent, getRangeAnimationEndPercent } from '@entities/track/model/animation';
import {
  ANIMATION_END_PERCENT_MIN,
  ANIMATION_START_PERCENT_MAX,
  TUNING_PERCENT_MAX,
  TUNING_PERCENT_MIN,
} from '@shared/config/tuning';

type DragTarget = 'end' | 'playhead' | 'start';

type TuningProgressBarProps = {
  animationLengthPercent: number;
  endPercent: number;
  isRange: boolean;
  isSelectedActive: boolean;
  playheadPercent: number;
  startPercent: number;
  onPlayheadChange: (percent: number) => void;
  onPlayheadRelease: () => void;
  onRangeChange: (startPercent: number, endPercent: number) => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export const TuningProgressBar = ({
  animationLengthPercent,
  endPercent,
  isRange,
  isSelectedActive,
  onPlayheadChange,
  onPlayheadRelease,
  onRangeChange,
  playheadPercent,
  startPercent,
}: TuningProgressBarProps) => {
  const barRef = useRef<HTMLDivElement | null>(null);
  const [dragTarget, setDragTarget] = useState<DragTarget | null>(null);

  const getPercent = (clientX: number) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect?.width) return TUNING_PERCENT_MIN;

    return clamp(
      Math.round(((clientX - rect.left) / rect.width) * TUNING_PERCENT_MAX),
      TUNING_PERCENT_MIN,
      TUNING_PERCENT_MAX,
    );
  };

  const updateDrag = (target: DragTarget, percent: number) => {
    if (target === 'playhead') {
      onPlayheadChange(percent);
      return;
    }
    if (!isRange) return;
    if (target === 'start') {
      onRangeChange(clamp(percent, TUNING_PERCENT_MIN, ANIMATION_START_PERCENT_MAX), endPercent);
    }
    if (target === 'end') {
      onRangeChange(startPercent, clamp(percent, ANIMATION_END_PERCENT_MIN, TUNING_PERCENT_MAX));
    }
  };

  const startDrag = (target: DragTarget, event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    barRef.current?.setPointerCapture(event.pointerId);
    setDragTarget(target);
    updateDrag(target, getPercent(event.clientX));
  };

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragTarget) return;

    updateDrag(dragTarget, getPercent(event.clientX));
  };

  const stopDrag = () => {
    if (dragTarget === 'playhead') onPlayheadRelease();
    setDragTarget(null);
  };
  const firstSegmentEnd = Math.min(ANIMATION_START_PERCENT_MAX, endPercent);
  const secondSegmentStart = Math.max(ANIMATION_START_PERCENT_MAX, startPercent);
  const clampedAnimationLengthPercent = getAnimationLengthPercent(animationLengthPercent);
  const animationEndPercent = getRangeAnimationEndPercent(startPercent, endPercent, clampedAnimationLengthPercent);

  return (
    <div className="space-y-2">
      <div className="flex justify-between font-mono text-[0.65rem] uppercase text-text-muted">
        <span>
          Start {TUNING_PERCENT_MIN}-{ANIMATION_START_PERCENT_MAX}
        </span>
        <span>
          End {ANIMATION_END_PERCENT_MIN}-{TUNING_PERCENT_MAX}
        </span>
      </div>
      <div
        ref={barRef}
        className="relative pb-1 pt-1"
        onPointerMove={moveDrag}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
      >
        <div className="relative mb-3 h-8">
          <span className="absolute top-1/2 right-0 left-0 h-px -translate-y-1/2 bg-border-strong" />
          <button
            type="button"
            aria-label="Drag playback playhead"
            className="absolute top-0 h-8 w-4 -translate-x-1/2 cursor-ew-resize"
            style={{ left: `${playheadPercent}%`, opacity: isSelectedActive ? 1 : 0.55 }}
            onPointerDown={(event) => startDrag('playhead', event)}
          >
            <span className="absolute top-0 bottom-0 left-1/2 border-l-2 border-pumpkin" />
          </button>
        </div>

        <div className="relative h-8 border border-border-strong bg-(--color-tuner-cut)">
          <span
            className="absolute inset-y-0 bg-(--color-tuner-start)"
            style={{ left: `${startPercent}%`, width: `${Math.max(0, firstSegmentEnd - startPercent)}%` }}
          />
          <span
            className="absolute inset-y-0 bg-(--color-tuner-end)"
            style={{ left: `${secondSegmentStart}%`, width: `${Math.max(0, endPercent - secondSegmentStart)}%` }}
          />
          {isRange ? (
            <>
              <span
                className="absolute bottom-0 h-1 bg-pumpkin"
                style={{ left: `${startPercent}%`, width: `${Math.max(0, animationEndPercent - startPercent)}%` }}
              />
              <span
                className="absolute top-[-0.25rem] bottom-[-0.25rem] border-l-2 border-pumpkin"
                style={{ left: `${animationEndPercent}%` }}
              />
              <button
                type="button"
                aria-label="Drag animation start"
                className="absolute top-[-0.25rem] h-10 w-4 -translate-x-1/2 cursor-ew-resize"
                style={{ left: `${startPercent}%` }}
                onPointerDown={(event) => startDrag('start', event)}
              >
                <span className="absolute top-0 bottom-0 left-1/2 border-l-2 border-cream-white" />
              </button>
              <button
                type="button"
                aria-label="Drag animation end"
                className="absolute top-[-0.25rem] h-10 w-4 -translate-x-1/2 cursor-ew-resize"
                style={{ left: `${endPercent}%` }}
                onPointerDown={(event) => startDrag('end', event)}
              >
                <span className="absolute top-0 bottom-0 left-1/2 border-l-2 border-toxic-carrot" />
              </button>
            </>
          ) : null}
        </div>
      </div>
      <div className="flex justify-between font-mono text-[0.65rem] text-text-muted">
        <span>{TUNING_PERCENT_MIN}%</span>
        <span>
          Playhead {Math.round(playheadPercent)}%{isRange ? ` / Length ${clampedAnimationLengthPercent}%` : ''}
        </span>
        <span>{TUNING_PERCENT_MAX}%</span>
      </div>
    </div>
  );
};
