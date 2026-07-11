import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { getActiveLyricsSection, getLyricLineParts, getLyricPlainText } from "@entities/track/lib/lyrics";
import type { TrackTuningAdapter } from "@entities/track/model/tuning";
import type { LyricsSection } from "@entities/track/model/types";
import { getSingleLineFontSize } from "@shared/lib/textFit";

type CaptionsFooterProps = {
  currentTime: number;
  footerRef: RefObject<HTMLElement | null>;
  isVisible: boolean;
  lyrics: readonly LyricsSection[];
  tuningAdapter?: TrackTuningAdapter;
};

const DEFAULT_FONT_SIZE = 18;
const MAX_FONT_SIZE = 32;
const MIN_FONT_SIZE = 6;
const LINE_HEIGHT = 1.2;

export const CaptionsFooter = ({ currentTime, footerRef, isVisible, lyrics, tuningAdapter }: CaptionsFooterProps) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const lineRef = useRef<HTMLParagraphElement | null>(null);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [, setTimingVersion] = useState(0);
  const activeSection = getActiveLyricsSection(lyrics, currentTime, tuningAdapter);
  const captionLines = useMemo(() => lyrics.map((section) => getLyricPlainText(section.line)), [lyrics]);
  const activeParts = useMemo(() => getLyricLineParts(activeSection.line), [activeSection.line]);

  useEffect(() => {
    return tuningAdapter?.subscribe(() => setTimingVersion((version) => version + 1));
  }, [tuningAdapter]);

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

      const nextFontSize = captionLines.reduce((smallestFontSize, text) => {
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
  }, [captionLines]);

  return (
    <footer
      ref={footerRef}
      className="fixed inset-x-0 bottom-0 z-20 flex h-16 items-center bg-(--color-bg) px-4 text-primary-text shadow-[0_-25px_50px_-12px_var(--color-footer-shadow)]"
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
          className="max-w-full whitespace-nowrap text-center [font-family:var(--font-unbounded)] tracking-wide text-primary-text transition-opacity"
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
