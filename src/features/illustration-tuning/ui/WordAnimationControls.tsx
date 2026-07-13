import { useRef, useState, type PointerEvent } from "react";
import type { IllustrationAnimation } from "@entities/track/model/types";
import { getLyricWords } from "@shared/ui/illustration-animations/lib/lyricText";
import type { TextIllustrationKind } from "@shared/ui/illustration-animations/types";

type RangeAnimation = Extract<IllustrationAnimation, { variant: "range" }>;
type Props = {
  animation: IllustrationAnimation | null | undefined;
  illustrationKind: TextIllustrationKind | "generic";
  onChange: (animation: IllustrationAnimation) => void;
  text: string;
};
type WordControlProps = {
  onChange: (animation: IllustrationAnimation) => void;
  rangeAnimation: RangeAnimation;
  words: string[];
};

const COLORS = ["#7c8178", "#8b392b", "#566e79", "#76617b", "#7a653d", "#486d5d"];

function getMinimumWordGap(wordCount: number) {
  return Math.min(1, 100 / Math.max(1, wordCount));
}

function getWordStarts(wordCount: number, savedStarts: number[] | undefined): number[] {
  const minimumGap = getMinimumWordGap(wordCount);
  const starts = Array.from({ length: wordCount }, (_, index) => {
    const savedStart = savedStarts?.[index];
    return typeof savedStart === "number" && Number.isFinite(savedStart)
      ? savedStart
      : Math.round((index / wordCount) * 100);
  });
  if (starts.length) starts[0] = 0;

  for (let index = 1; index < starts.length; index += 1) {
    const min = (starts[index - 1] ?? 0) + minimumGap;
    const max = 100 - minimumGap * (starts.length - index);
    starts[index] = Math.max(min, Math.min(max, starts[index] ?? min));
  }

  return starts;
}

function formatPercent(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

const BlinkingWordsTimingControls = ({ onChange, rangeAnimation, words }: WordControlProps) => {
  const barRef = useRef<HTMLDivElement>(null);
  const [draggedBoundary, setDraggedBoundary] = useState<number | null>(null);
  const minimumGap = getMinimumWordGap(words.length);
  const starts = getWordStarts(words.length, rangeAnimation.wordStartPercents);

  const updateBoundary = (index: number, value: number) => {
    const next = [...starts];
    next[index] = Math.max(
      (next[index - 1] ?? 0) + minimumGap,
      Math.min(index + 1 < next.length ? (next[index + 1] ?? 100) - minimumGap : 100 - minimumGap, value),
    );
    onChange({ ...rangeAnimation, wordStartPercents: next });
  };
  const getPercent = (clientX: number) => {
    const bar = barRef.current?.getBoundingClientRect();
    if (!bar?.width) return 0;

    return Math.round(((clientX - bar.left) / bar.width) * 100);
  };
  const startDrag = (index: number, event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    barRef.current?.setPointerCapture(event.pointerId);
    setDraggedBoundary(index);
    updateBoundary(index, getPercent(event.clientX));
  };

  return (
    <section className="border border-(--color-border-strong) bg-(--color-panel-soft) p-3">
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
        <div className="absolute inset-x-0 top-0 flex h-8 overflow-hidden border border-(--color-border-strong)">
          {words.map((word, index) => {
            const end = starts[index + 1] ?? 100;
            const start = starts[index] ?? 0;

            return (
              <div
                key={`${index}-${word}`}
                className="flex min-w-0 items-center justify-center border-r border-(--color-panel) px-1 font-mono text-[0.6rem] uppercase text-white last:border-r-0"
                style={{ backgroundColor: COLORS[index % COLORS.length] ?? COLORS[0], width: `${end - start}%` }}
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
              aria-label={`${words[index - 1] ?? ""} / ${words[index] ?? ""} boundary at ${formatPercent(start)}%`}
              aria-orientation="horizontal"
              aria-valuemax={index + 1 < starts.length ? (starts[index + 1] ?? 100) - minimumGap : 100 - minimumGap}
              aria-valuemin={(starts[index - 1] ?? 0) + minimumGap}
              aria-valuenow={start}
              className="word-timing-boundary absolute top-0 z-10 h-8 w-3 -translate-x-1/2 cursor-ew-resize bg-(--color-accent)"
              onKeyDown={(event) => {
                const min = (starts[index - 1] ?? 0) + minimumGap;
                const max = index + 1 < starts.length ? (starts[index + 1] ?? 100) - minimumGap : 100 - minimumGap;
                const nextValue =
                  event.key === "ArrowLeft"
                    ? start - minimumGap
                    : event.key === "ArrowRight"
                      ? start + minimumGap
                      : event.key === "Home"
                        ? min
                        : event.key === "End"
                          ? max
                          : null;
                if (nextValue === null) return;
                event.preventDefault();
                updateBoundary(index, nextValue);
              }}
              onPointerDown={(event) => startDrag(index, event)}
              role="slider"
              style={{ left: `${start}%` }}
              title={`${words[index - 1] ?? ""} / ${words[index] ?? ""}: ${formatPercent(start)}%`}
              type="button"
            />
          );
        })}
        <div className="absolute inset-x-0 top-10 font-mono text-[0.62rem] text-(--color-text-muted)">
          <span className="absolute left-0">0%</span>
          {starts.slice(1).map((start, index) => (
            <span key={index} className="absolute -translate-x-1/2" style={{ left: `${start}%` }}>
              {formatPercent(start)}%
            </span>
          ))}
          <span className="absolute right-0">100%</span>
        </div>
      </div>
    </section>
  );
};

export const WordAnimationControls = ({ animation, illustrationKind, onChange, text }: Props) => {
  if (illustrationKind !== "blinking-words") return null;
  const words = getLyricWords(text);
  if (!words.length) return null;
  const rangeAnimation =
    animation?.variant === "range"
      ? animation
      : { animationLengthPercent: 100, endPercent: 100, startPercent: 0, variant: "range" as const };

  return <BlinkingWordsTimingControls onChange={onChange} rangeAnimation={rangeAnimation} words={words} />;
};
