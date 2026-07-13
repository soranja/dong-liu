import { useLayoutEffect, useMemo, useRef, type CSSProperties } from "react";
import { getLyricDisplayText, getLyricWords } from "./lib/lyricText";

import "./styles/vertical-typewriter-text-animation.css";
import type { TextIllustrationProps } from "./types";

const MEASUREMENT_FONT_SIZE = 100;

export const VerticalTypewriterTextAnimation = ({ animation, onReady, sectionId, text }: TextIllustrationProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const displayText = useMemo(() => getLyricDisplayText(text), [text]);
  const words = useMemo(() => getLyricWords(text), [text]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    const fitWords = () => {
      if (cancelled) return;

      const context = document.createElement("canvas").getContext("2d");
      if (!context) return;

      const { fontFamily } = window.getComputedStyle(container);
      context.font = `600 ${MEASUREMENT_FONT_SIZE}px ${fontFamily}`;
      const containerStyle = window.getComputedStyle(container);
      const rooms = Array.from(
        container.querySelectorAll<HTMLElement>(".vertical-typewriter-text-animation__room"),
      );
      const heightFitSizes = rooms.map((room, index) => {
        const measuredWidth = context.measureText((words[index] ?? "").toLocaleUpperCase()).width;
        return measuredWidth ? (room.clientHeight * 0.995 * MEASUREMENT_FONT_SIZE) / measuredWidth : 1;
      });
      const gap = Number.parseFloat(containerStyle.columnGap) || 0;
      const horizontalPadding =
        (Number.parseFloat(containerStyle.paddingLeft) || 0) + (Number.parseFloat(containerStyle.paddingRight) || 0);
      const availableWidth = container.clientWidth - horizontalPadding - gap * Math.max(0, rooms.length - 1);
      const heightFitWidth = heightFitSizes.reduce((total, fontSize) => total + fontSize * 0.88, 0);
      const sharedScale = heightFitWidth ? Math.min(1, availableWidth / heightFitWidth) : 1;

      rooms.forEach((room, index) => {
        const fontSize = Math.max(1, heightFitSizes[index] ?? 1);

        room.style.setProperty("--vertical-typewriter-font-size", `${fontSize}px`);
        room.style.setProperty("--vertical-typewriter-thickness-scale", String(sharedScale));
        room.style.setProperty("--vertical-typewriter-room-width", `${fontSize * 0.88 * sharedScale}px`);
      });

      onReady(sectionId);
    };

    const resizeObserver = new ResizeObserver(fitWords);
    resizeObserver.observe(container);
    void document.fonts.ready.then(fitWords);

    return () => {
      cancelled = true;
      resizeObserver.disconnect();
    };
  }, [onReady, sectionId, words]);

  return (
    <div
      ref={containerRef}
      aria-label={displayText}
      className="vertical-typewriter-text-animation"
      data-section-id={sectionId}
      data-vertical-typewriter-root
      style={
        {
          "--vertical-typewriter-word-count": Math.max(1, words.length),
        } as CSSProperties
      }
    >
      {words.map((word, wordIndex) => (
        <span
          key={`${sectionId}-${wordIndex}-${word}`}
          className="vertical-typewriter-text-animation__room"
          style={
            {
              "--vertical-typewriter-word-length": Math.max(1, Array.from(word).length),
            } as CSSProperties
          }
        >
          <span aria-hidden="true" className="vertical-typewriter-text-animation__word">
            {Array.from(word).map((letter, letterIndex) => (
              <span
                key={`${letterIndex}-${letter}`}
                className="vertical-typewriter-text-animation__letter"
                data-word-cloud-word
                data-word-index={wordIndex}
                data-word-letter-index={letterIndex}
                data-word-letter-count={Array.from(word).length}
                data-word-start-percent={animation?.variant === "range" ? animation.wordStartPercents?.[wordIndex] : undefined}
              >
                {letter}
              </span>
            ))}
          </span>
        </span>
      ))}
    </div>
  );
};
