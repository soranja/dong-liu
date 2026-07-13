import { useLayoutEffect, useMemo, useRef, type CSSProperties } from "react";
import { getLyricDisplayText, getLyricWords } from "./lib/lyricText";

import "./styles/blinking-words-text-animation.css";
import type { TextIllustrationProps } from "./types";

const MEASUREMENT_FONT_SIZE = 100;
const SECTION_WIDTH_FILL = 0.94;
const SECTION_HEIGHT_FILL = 0.8;

export const BlinkingWordsTextAnimation = ({ animation, onReady, sectionId, text }: TextIllustrationProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const displayText = useMemo(() => getLyricDisplayText(text), [text]);
  const words = useMemo(() => getLyricWords(text), [text]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    const fitWords = () => {
      if (cancelled || !container.clientWidth || !container.clientHeight) return;

      const context = document.createElement("canvas").getContext("2d");
      if (!context) return;

      const style = window.getComputedStyle(container);
      context.font = `600 ${MEASUREMENT_FONT_SIZE}px ${style.fontFamily}`;
      const availableWidth = container.clientWidth * SECTION_WIDTH_FILL;
      const availableHeight = container.clientHeight * SECTION_HEIGHT_FILL;

      container.querySelectorAll<HTMLElement>("[data-blinking-word]").forEach((word, index) => {
        const metrics = context.measureText(words[index].toLocaleUpperCase());
        const measuredHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
        const widthFit = metrics.width ? (availableWidth * MEASUREMENT_FONT_SIZE) / metrics.width : 1;
        const heightFit = measuredHeight ? (availableHeight * MEASUREMENT_FONT_SIZE) / measuredHeight : 1;
        const fontSize = Math.min(widthFit, heightFit);
        word.style.setProperty("--blinking-word-font-size", `${Math.max(1, fontSize)}px`);
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
    <div ref={containerRef} aria-label={displayText} className="blinking-words-text-animation">
      {words.map((word, index) => (
        <span key={`${sectionId}-${index}-${word}`} className="blinking-words-text-animation__room">
          <span
            aria-hidden="true"
            className="blinking-words-text-animation__word"
            data-blinking-word
            data-word-cloud-word
            data-word-start-percent={animation?.variant === "range" ? animation.wordStartPercents?.[index] : undefined}
            style={{ "--blinking-word-font-size": "1px" } as CSSProperties}
          >
            {word.toLocaleUpperCase()}
          </span>
        </span>
      ))}
    </div>
  );
};
