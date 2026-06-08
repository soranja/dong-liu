import { useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { getActiveLyricCue, getLyricLineParts, getLyricPlainText, LYRIC_CUES } from "../utils/lyrics";
import { getSingleLineFontSize } from "../utils/textFit";

type CaptionsFooterProps = {
  currentTime: number;
  footerRef: RefObject<HTMLElement | null>;
  isVisible: boolean;
};

const CAPTION_LINES = LYRIC_CUES.map((cue) => getLyricPlainText(cue.line));
const DEFAULT_FONT_SIZE = 18;
const MAX_FONT_SIZE = 32;
const MIN_FONT_SIZE = 6;
const LINE_HEIGHT = 1.2;

export const CaptionsFooter = ({ currentTime, footerRef, isVisible }: CaptionsFooterProps) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const lineRef = useRef<HTMLParagraphElement | null>(null);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const activeCue = getActiveLyricCue(currentTime);
  const activeParts = useMemo(() => getLyricLineParts(activeCue.line), [activeCue.line]);

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const line = lineRef.current;
    if (!wrapper || !line) return;

    const fitCaptions = () => {
      const wrapperStyles = getComputedStyle(wrapper);
      const lineStyles = getComputedStyle(line);
      const availableWidth =
        wrapper.clientWidth -
        Number.parseFloat(wrapperStyles.paddingLeft) -
        Number.parseFloat(wrapperStyles.paddingRight);
      const availableHeight =
        wrapper.clientHeight -
        Number.parseFloat(wrapperStyles.paddingTop) -
        Number.parseFloat(wrapperStyles.paddingBottom);
      const maxFontSize = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, availableHeight / LINE_HEIGHT));

      const nextFontSize = CAPTION_LINES.reduce((smallestFontSize, text) => {
        const normalFontSize = getSingleLineFontSize({
          availableWidth,
          fontFamily: lineStyles.fontFamily,
          fontStyle: lineStyles.fontStyle,
          fontWeight: lineStyles.fontWeight,
          letterSpacing: Number.parseFloat(lineStyles.letterSpacing) || 0,
          maxFontSize,
          minFontSize: MIN_FONT_SIZE,
          text,
        });
        const italicFontSize = getSingleLineFontSize({
          availableWidth,
          fontFamily: lineStyles.fontFamily,
          fontStyle: "italic",
          fontWeight: lineStyles.fontWeight,
          letterSpacing: Number.parseFloat(lineStyles.letterSpacing) || 0,
          maxFontSize,
          minFontSize: MIN_FONT_SIZE,
          text,
        });

        return Math.min(smallestFontSize, normalFontSize, italicFontSize);
      }, maxFontSize);

      setFontSize(Math.floor(nextFontSize));
    };

    fitCaptions();

    let isMounted = true;
    void document.fonts.ready.then(() => {
      if (isMounted) fitCaptions();
    });

    const resizeObserver = new ResizeObserver(fitCaptions);
    resizeObserver.observe(wrapper);
    window.addEventListener("resize", fitCaptions);

    return () => {
      isMounted = false;
      resizeObserver.disconnect();
      window.removeEventListener("resize", fitCaptions);
    };
  }, []);

  return (
    <footer
      ref={footerRef}
      className="fixed inset-x-0 bottom-0 z-20 flex h-16 items-center bg-(--color-bg) px-3 text-(--color-text) sm:px-4 shadow-[0_-25px_50px_-12px_var(--tw-shadow-color,rgb(0_0_0/0.25))]"
    >
      <div
        ref={wrapperRef}
        className="mx-auto flex h-full w-full max-w-7xl items-center justify-center overflow-hidden px-2"
      >
        <p
          ref={lineRef}
          aria-atomic="true"
          aria-hidden={!isVisible}
          aria-live="polite"
          className="max-w-full whitespace-nowrap text-center [font-family:var(--font-unbounded)] tracking-wide text-(--color-text) transition-opacity"
          data-captions-line
          style={{ fontSize, opacity: isVisible ? 1 : 0 }}
        >
          {activeParts.map((part, index) =>
            part.isItalic ? (
              <em key={`${index}-${part.text}`} className="italic">
                {part.text}
              </em>
            ) : (
              <span key={`${index}-${part.text}`}>{part.text}</span>
            ),
          )}
        </p>
      </div>
    </footer>
  );
};
