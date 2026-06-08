import { useLayoutEffect, useRef, useState } from "react";
import { getActiveLyricCueIndex, LYRIC_CUES } from "../utils/lyrics";
import { getLyricMaxFontSize, getSingleLineFontSize } from "../utils/textFit";

type LyricsTimelineProps = {
  currentTime: number;
  headerHeight: number;
  isVisible: boolean;
};

const DEFAULT_FONT_SIZE = 96;
const MIN_FONT_SIZE = 14;

export const LyricsTimeline = ({ currentTime, headerHeight, isVisible }: LyricsTimelineProps) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const lineRef = useRef<HTMLDivElement | null>(null);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const activeIndex = getActiveLyricCueIndex(currentTime);
  const activeCue = LYRIC_CUES[activeIndex];

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const line = lineRef.current;
    if (!wrapper || !line) return;

    const fitLine = () => {
      const wrapperStyles = getComputedStyle(wrapper);
      const lineStyles = getComputedStyle(line);
      const availableWidth =
        wrapper.clientWidth -
        Number.parseFloat(wrapperStyles.paddingLeft) -
        Number.parseFloat(wrapperStyles.paddingRight);
      const maxFontSize = Math.min(
        getLyricMaxFontSize(activeCue.sizeLevel),
        Math.max(MIN_FONT_SIZE, window.innerHeight - headerHeight) * 0.72,
      );

      setFontSize(
        getSingleLineFontSize({
          availableWidth,
          fontFamily: lineStyles.fontFamily,
          fontStyle: lineStyles.fontStyle,
          fontWeight: lineStyles.fontWeight,
          letterSpacing: Number.parseFloat(lineStyles.letterSpacing) || 0,
          maxFontSize,
          minFontSize: MIN_FONT_SIZE,
          text: activeCue.line,
        }),
      );
    };

    fitLine();

    const resizeObserver = new ResizeObserver(fitLine);
    resizeObserver.observe(wrapper);
    window.addEventListener("resize", fitLine);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", fitLine);
    };
  }, [activeCue.line, activeCue.sizeLevel, headerHeight]);

  return (
    <div
      aria-hidden={!isVisible}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-10 flex items-center justify-center overflow-hidden px-3 text-center text-(--color-text)"
      data-lyrics-timeline
      style={{ opacity: isVisible ? 1 : 0, top: headerHeight }}
    >
      <span className="sr-only" aria-live="polite">
        {isVisible ? activeCue.line : ""}
      </span>

      <div ref={wrapperRef} className="mx-auto w-[94vw] max-w-[86rem] px-2">
        <div
          ref={lineRef}
          className="whitespace-nowrap font-mono font-bold leading-[1.2] tracking-normal text-(--color-text)"
          data-active="true"
          data-lyrics-line
          data-size-level={activeCue.sizeLevel}
          style={{ fontSize }}
        >
          {activeCue.line}
        </div>
      </div>
    </div>
  );
};
