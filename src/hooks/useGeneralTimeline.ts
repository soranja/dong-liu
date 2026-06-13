import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { RAM_BOX_LYRICS } from "../lyrics/ram-box-lyrics";
import { getTimelineTrackState } from "../utils/generalTimeline";
import { getLyricMaxFontSize, getSingleLineFontSize } from "../utils/textFit";

type GeneralTimelineOptions = {
  audioRef: RefObject<HTMLAudioElement | null>;
  currentTime: number;
  duration: number;
  isVisible: boolean;
};

const MIN_FONT_SIZE = 1;

export function useGeneralTimeline({ audioRef, currentTime, duration, isVisible }: GeneralTimelineOptions) {
  const contentRefs = useRef<Array<HTMLDivElement | null>>([]);
  const highlightedSlideRef = useRef<number | null>(null);
  const slideRefs = useRef<Array<HTMLElement | null>>([]);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const trackMetricsRef = useRef({
    horizontalBorderOffset: 0,
    horizontalSlideSize: 0,
    verticalBorderOffset: 0,
    verticalSlideSize: 0,
  });
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const updateTrack = useCallback(
    (time: number) => {
      const track = trackRef.current;
      const viewport = viewportRef.current;
      if (!track || !viewport) return;

      const { activeIndex, isHighlighted, position } = getTimelineTrackState(time, duration);
      const offset = position + 0.5;
      const { horizontalBorderOffset, horizontalSlideSize, verticalBorderOffset, verticalSlideSize } =
        trackMetricsRef.current;

      track.style.setProperty(
        "--timeline-track-x",
        `${viewport.clientWidth / 2 - horizontalSlideSize * offset + horizontalBorderOffset}px`,
      );
      track.style.setProperty(
        "--timeline-track-y",
        `${viewport.clientHeight / 2 - verticalSlideSize * offset + verticalBorderOffset}px`,
      );

      const nextIndex = isHighlighted ? activeIndex : null;
      if (highlightedSlideRef.current === nextIndex) return;

      const previousSlide =
        highlightedSlideRef.current === null ? null : slideRefs.current[highlightedSlideRef.current];
      if (previousSlide) previousSlide.dataset.active = "false";
      if (nextIndex !== null) slideRefs.current[nextIndex]?.setAttribute("data-active", "true");
      highlightedSlideRef.current = nextIndex;
    },
    [duration],
  );

  useLayoutEffect(() => {
    const fitText = () => {
      const track = trackRef.current;
      const viewport = viewportRef.current;
      if (!track || !viewport) return;

      track.style.setProperty("--timeline-mobile-slide-height", `${viewport.clientHeight / 2}px`);

      const flowSlide = slideRefs.current.find((slide) => slide && slide.dataset.overlay !== "true");
      if (flowSlide) {
        trackMetricsRef.current = {
          horizontalBorderOffset: (flowSlide.offsetWidth - flowSlide.clientWidth - flowSlide.clientLeft) / 2,
          horizontalSlideSize: flowSlide.offsetWidth,
          verticalBorderOffset: (flowSlide.offsetHeight - flowSlide.clientHeight - flowSlide.clientTop) / 2,
          verticalSlideSize: flowSlide.offsetHeight,
        };
      }

      RAM_BOX_LYRICS.forEach((section, index) => {
        if (typeof section.illustrateWith !== "string") return;

        const content = contentRefs.current[index];
        const slide = slideRefs.current[index];
        if (!content || !slide) return;

        const contentStyles = getComputedStyle(content);
        const slideStyles = getComputedStyle(slide);
        const availableWidth =
          slide.clientWidth - Number.parseFloat(slideStyles.paddingLeft) - Number.parseFloat(slideStyles.paddingRight);
        const maxFontSize = Math.min(getLyricMaxFontSize(section.sizeLevel), slide.clientHeight * 0.68);

        content.style.fontSize = `${getSingleLineFontSize({
          availableWidth,
          fontFamily: contentStyles.fontFamily,
          fontStyle: contentStyles.fontStyle,
          fontWeight: contentStyles.fontWeight,
          letterSpacing: Number.parseFloat(contentStyles.letterSpacing) || 0,
          maxFontSize,
          minFontSize: MIN_FONT_SIZE,
          text: section.illustrateWith,
        })}px`;
      });

      updateTrack(audioRef.current?.currentTime ?? 0);
    };

    fitText();
    void document.fonts.ready.then(fitText);

    const resizeObserver = new ResizeObserver(fitText);
    if (viewportRef.current) resizeObserver.observe(viewportRef.current);

    return () => resizeObserver.disconnect();
  }, [audioRef, updateTrack]);

  useLayoutEffect(() => {
    updateTrack(audioRef.current?.currentTime ?? currentTime);
  }, [audioRef, currentTime, updateTrack]);

  useEffect(() => {
    if (!isVisible) return;

    let frame: number;
    const update = () => {
      updateTrack(audioRef.current?.currentTime ?? 0);
      frame = window.requestAnimationFrame(update);
    };

    frame = window.requestAnimationFrame(update);

    return () => window.cancelAnimationFrame(frame);
  }, [audioRef, isVisible, updateTrack]);

  return { contentRefs, slideRefs, trackRef, viewportRef };
}
