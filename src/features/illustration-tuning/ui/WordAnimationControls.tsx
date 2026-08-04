import { useRef, useState, type PointerEvent } from 'react';
import { DEFAULT_ANIMATION_LENGTH_PERCENT } from '@entities/track/model/animation';
import type { IllustrationAnimation } from '@entities/track/model/types';
import { TUNING_PERCENT_MAX, TUNING_PERCENT_MIN } from '@shared/config/tuning';
import { getLyricWords } from '@shared/ui/illustration-animations/lib/lyricText';
import type { TextIllustrationKind } from '@shared/ui/illustration-animations/types';

type RangeAnimation = Extract<IllustrationAnimation, { variant: 'range' }>;
type Props = {
  animation: IllustrationAnimation | null | undefined;
  illustrationKind: TextIllustrationKind | 'generic';
  onChange: (animation: IllustrationAnimation) => void;
  text: string;
};
type WordControlProps = {
  onChange: (animation: IllustrationAnimation) => void;
  rangeAnimation: RangeAnimation;
  words: string[];
};

function getMinimumWordGap(wordCount: number) {
  return Math.min(1, TUNING_PERCENT_MAX / Math.max(1, wordCount));
}

function getWordStarts(wordCount: number, savedStarts: number[] | undefined): number[] {
  const minimumGap = getMinimumWordGap(wordCount);
  const starts = Array.from({ length: wordCount }, (_, index) => {
    const savedStart = savedStarts?.[index];
    return typeof savedStart === 'number' && Number.isFinite(savedStart)
      ? savedStart
      : Math.round((index / wordCount) * TUNING_PERCENT_MAX);
  });
  if (starts.length) starts[0] = TUNING_PERCENT_MIN;

  for (let index = 1; index < starts.length; index += 1) {
    const min = (starts[index - 1] ?? TUNING_PERCENT_MIN) + minimumGap;
    const max = TUNING_PERCENT_MAX - minimumGap * (starts.length - index);
    starts[index] = Math.max(min, Math.min(max, starts[index] ?? min));
  }

  return starts;
}

function formatPercent(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

const WordTimingControls = ({ onChange, rangeAnimation, words }: WordControlProps) => {
  const barRef = useRef<HTMLDivElement>(null);
  const [draggedBoundary, setDraggedBoundary] = useState<number | null>(null);
  const minimumGap = getMinimumWordGap(words.length);
  const starts = getWordStarts(words.length, rangeAnimation.wordStartPercents);

  const updateBoundary = (index: number, value: number) => {
    const next = [...starts];
    next[index] = Math.max(
      (next[index - 1] ?? TUNING_PERCENT_MIN) + minimumGap,
      Math.min(
        index + 1 < next.length
          ? (next[index + 1] ?? TUNING_PERCENT_MAX) - minimumGap
          : TUNING_PERCENT_MAX - minimumGap,
        value,
      ),
    );
    onChange({ ...rangeAnimation, wordStartPercents: next });
  };
  const getPercent = (clientX: number) => {
    const bar = barRef.current?.getBoundingClientRect();
    if (!bar?.width) return TUNING_PERCENT_MIN;

    return Math.round(((clientX - bar.left) / bar.width) * TUNING_PERCENT_MAX);
  };
  const startDrag = (index: number, event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    barRef.current?.setPointerCapture(event.pointerId);
    setDraggedBoundary(index);
    updateBoundary(index, getPercent(event.clientX));
  };

  return (
    <section className="border border-border-strong p-3">
      <div
        ref={barRef}
        className="relative h-16 touch-none"
        data-word-timing-bar
        onLostPointerCapture={() => setDraggedBoundary(null)}
        onPointerCancel={() => setDraggedBoundary(null)}
        onPointerMove={(event) => {
          if (draggedBoundary === null) return;
          updateBoundary(draggedBoundary, getPercent(event.clientX));
        }}
        onPointerUp={() => setDraggedBoundary(null)}
      >
        <div className="absolute inset-x-0 top-0 flex h-8 overflow-hidden border border-border-strong">
          {words.map((word, index) => {
            const end = starts[index + 1] ?? TUNING_PERCENT_MAX;
            const start = starts[index] ?? TUNING_PERCENT_MIN;

            return (
              <div
                key={`${index}-${word}`}
                className="flex min-w-0 items-center justify-center border-r border-panel px-1 font-mono text-[0.6rem] uppercase text-cream-white last:border-r-0"
                data-word-timing-segment
                style={{ width: `${end - start}%` }}
                title={`${word}: ${formatPercent(start)}–${formatPercent(end)}%`}
              >
                <span className="overflow-hidden text-ellipsis whitespace-pre">{word}</span>
              </div>
            );
          })}
        </div>
        {starts.slice(1).map((start, offset) => {
          const index = offset + 1;

          return (
            <button
              key={index}
              aria-label={`${words[index - 1] ?? ''} / ${words[index] ?? ''} boundary at ${formatPercent(start)}%`}
              aria-orientation="horizontal"
              aria-valuemax={
                index + 1 < starts.length
                  ? (starts[index + 1] ?? TUNING_PERCENT_MAX) - minimumGap
                  : TUNING_PERCENT_MAX - minimumGap
              }
              aria-valuemin={(starts[index - 1] ?? TUNING_PERCENT_MIN) + minimumGap}
              aria-valuenow={start}
              className="word-timing-boundary absolute top-0 z-10 h-8 w-3 -translate-x-1/2 cursor-ew-resize bg-toxic-carrot"
              onKeyDown={(event) => {
                const min = (starts[index - 1] ?? TUNING_PERCENT_MIN) + minimumGap;
                const max =
                  index + 1 < starts.length
                    ? (starts[index + 1] ?? TUNING_PERCENT_MAX) - minimumGap
                    : TUNING_PERCENT_MAX - minimumGap;
                const nextValue =
                  event.key === 'ArrowLeft'
                    ? start - minimumGap
                    : event.key === 'ArrowRight'
                      ? start + minimumGap
                      : event.key === 'Home'
                        ? min
                        : event.key === 'End'
                          ? max
                          : null;
                if (nextValue === null) return;
                event.preventDefault();
                updateBoundary(index, nextValue);
              }}
              onPointerDown={(event) => startDrag(index, event)}
              role="slider"
              style={{ left: `${start}%` }}
              title={`${words[index - 1] ?? ''} / ${words[index] ?? ''}: ${formatPercent(start)}%`}
              type="button"
            />
          );
        })}
        <div className="absolute inset-x-0 top-10 font-mono text-[0.62rem] text-text-muted">
          <span className="absolute left-0">{TUNING_PERCENT_MIN}%</span>
          {starts.slice(1).map((start, index) => (
            <span key={index} className="absolute -translate-x-1/2" style={{ left: `${start}%` }}>
              {formatPercent(start)}%
            </span>
          ))}
          <span className="absolute right-0">{TUNING_PERCENT_MAX}%</span>
        </div>
      </div>
    </section>
  );
};

export const WordAnimationControls = ({ animation, illustrationKind, onChange, text }: Props) => {
  if (illustrationKind !== 'blinking-words' && illustrationKind !== 'word-cloud') return null;
  const words = getLyricWords(text);
  if (!words.length) return null;
  const rangeAnimation =
    animation?.variant === 'range'
      ? animation
      : {
          animationLengthPercent: DEFAULT_ANIMATION_LENGTH_PERCENT,
          endPercent: TUNING_PERCENT_MAX,
          startPercent: TUNING_PERCENT_MIN,
          variant: 'range' as const,
        };

  return <WordTimingControls onChange={onChange} rangeAnimation={rangeAnimation} words={words} />;
};
