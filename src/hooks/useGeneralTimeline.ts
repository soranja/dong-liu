import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { getTimelineSectionProgress, getTimelineTrackState } from "../utils/generalTimeline";
import {
  DEFAULT_INSTANT_ANIMATION,
  SINGLE_WORD_REVEAL_END_PERCENT,
  WORD_CLOUD_REVEAL_END_PERCENT,
  resolveIllustrationAnimation,
} from "../utils/tuning/illustrationAnimation";
import {
  getEffectiveIllustrationAnimation,
  getEffectiveIllustrationVisibility,
  subscribeIllustrationAnimationTuning,
} from "../utils/tuning/illustrationAnimationTuningStore";
import { subscribeLyricTimingTuning } from "../utils/tuning/lyricTimingTuningStore";
import { setKineticWarpProgress } from "../utils/kineticWarp";
import { TIMELINE_PROGRESS_EVENT, type TimelineProgressDetail } from "../utils/tuning/timelineProgressEvent";
import { RAM_BOX_LYRICS } from "../lyrics/ram-box-lyrics";

type GeneralTimelineOptions = {
  audioRef: RefObject<HTMLAudioElement | null>;
  duration: number;
  isVisible: boolean;
  onPrewarmProgress: (progress: number) => void;
  onTimelinePrepared: () => void;
  shouldPrewarm: boolean;
};

const PREWARM_SECTION_DWELL_MS = 12;

function setRevealedWordCount(slide: HTMLElement, words: NodeListOf<HTMLElement>, revealedWordCount: number) {
  if (slide.dataset.revealedWordCount === String(revealedWordCount)) return;

  words.forEach((word, index) => {
    word.dataset.wordRevealed = index < revealedWordCount ? "true" : "false";
  });
  slide.dataset.revealedWordCount = String(revealedWordCount);
}

function clearWordCloud(slide: HTMLElement | null) {
  if (!slide) return;

  const words = slide.querySelectorAll<HTMLElement>("[data-word-cloud-word]");
  if (!words.length) return;

  setRevealedWordCount(slide, words, 0);
}

function setWordCloudProgress(slide: HTMLElement | null, progress: number) {
  if (!slide) return;

  const words = slide.querySelectorAll<HTMLElement>("[data-word-cloud-word]");
  if (!words.length) return;

  const revealedWordCount = Math.min(words.length, Math.floor(progress * words.length + Number.EPSILON));
  setRevealedWordCount(slide, words, revealedWordCount);
}

function clearIllustrationProgress(slide: HTMLElement | null) {
  if (!slide) return;

  slide.dataset.illustrationObserved = "false";
  slide.style.setProperty("--illustration-progress", "0");
  clearWordCloud(slide);
}

function setIllustrationProgress(slide: HTMLElement | null, sectionIndex: number, sectionProgress: number) {
  if (!slide) return;

  const section = RAM_BOX_LYRICS[sectionIndex];
  const animation = getEffectiveIllustrationAnimation(section);
  const words = slide.querySelectorAll<HTMLElement>("[data-word-cloud-word]");
  const hasKineticWarp = Boolean(slide.querySelector("[data-kinetic-warp-root]"));
  const defaultEndPercent = words.length
    ? words.length === 1
      ? SINGLE_WORD_REVEAL_END_PERCENT
      : WORD_CLOUD_REVEAL_END_PERCENT
    : undefined;
  const result =
    words.length && slide.dataset.overlay === "true" && !animation
      ? { isObserved: true, progress: 1 }
      : resolveIllustrationAnimation({
          animation: animation ?? (!words.length && !hasKineticWarp ? DEFAULT_INSTANT_ANIMATION : undefined),
          defaultEndPercent,
          sectionProgress,
        });

  slide.dataset.illustrationObserved = result.isObserved ? "true" : "false";
  slide.style.setProperty("--illustration-progress", String(result.progress));
  if (words.length === 1) {
    setRevealedWordCount(slide, words, result.isObserved ? 1 : 0);
  } else if (words.length) {
    setWordCloudProgress(slide, result.progress);
  }
  if (hasKineticWarp) setKineticWarpProgress(slide, result.progress);
}

function syncInactiveIllustrations(slides: Array<HTMLElement | null>, activeIndex: number) {
  slides.forEach((slide, index) => {
    if (!slide || index === activeIndex) return;

    const visibility = getEffectiveIllustrationVisibility(RAM_BOX_LYRICS[index]);
    slide.dataset.illustrationVisibility = visibility;

    if (visibility === "adjacent" || (visibility === "active-trailing" && index < activeIndex)) {
      setIllustrationProgress(slide, index, 1);
      return;
    }

    clearIllustrationProgress(slide);
  });
}

function dispatchTimelineProgress(activeIndex: number, sectionProgress: number, currentTime: number, duration: number) {
  if (!import.meta.env.DEV) return;

  const detail: TimelineProgressDetail = {
    activeIndex,
    currentTime,
    duration,
    progress: sectionProgress,
    sectionId: RAM_BOX_LYRICS[activeIndex].sectionId,
  };
  window.dispatchEvent(new CustomEvent(TIMELINE_PROGRESS_EVENT, { detail }));
}

export function useGeneralTimeline({
  audioRef,
  duration,
  isVisible,
  onPrewarmProgress,
  onTimelinePrepared,
  shouldPrewarm,
}: GeneralTimelineOptions) {
  const highlightedSlideRef = useRef<number | null>(null);
  const currentSlideRef = useRef<number | null>(null);
  const revealedSlideRef = useRef<number | null>(null);
  const slideRefs = useRef<Array<HTMLElement | null>>([]);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const trackMetricsRef = useRef({
    horizontalBorderOffset: 0,
    horizontalSlideSize: 0,
    isVertical: false,
    verticalBorderOffset: 0,
    verticalSlideSize: 0,
    viewportCenterX: 0,
    viewportCenterY: 0,
  });
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const highlightSlide = useCallback((nextIndex: number | null) => {
    if (highlightedSlideRef.current === nextIndex) return;

    const previousSlide = highlightedSlideRef.current === null ? null : slideRefs.current[highlightedSlideRef.current];
    if (previousSlide) previousSlide.dataset.active = "false";
    if (nextIndex !== null) slideRefs.current[nextIndex]?.setAttribute("data-active", "true");
    highlightedSlideRef.current = nextIndex;
  }, []);

  const setCurrentSlide = useCallback((nextIndex: number) => {
    if (currentSlideRef.current === nextIndex) return;

    if (currentSlideRef.current !== null) {
      const previousSlide = slideRefs.current[currentSlideRef.current];
      previousSlide?.setAttribute("data-current", "false");
      setKineticWarpProgress(previousSlide, 1);
    }

    slideRefs.current[nextIndex]?.setAttribute("data-current", "true");
    currentSlideRef.current = nextIndex;
  }, []);

  const updateTrack = useCallback(
    (time: number) => {
      const track = trackRef.current;
      if (!track) return;

      const { activeIndex, isHighlighted, position } = getTimelineTrackState(time, duration);
      const sectionProgress = getTimelineSectionProgress(activeIndex, time, duration);
      setCurrentSlide(activeIndex);
      dispatchTimelineProgress(activeIndex, sectionProgress, time, duration);
      const previousRevealedSlide = revealedSlideRef.current;
      if (previousRevealedSlide !== activeIndex) {
        const previousVisibility =
          previousRevealedSlide === null
            ? "adjacent"
            : getEffectiveIllustrationVisibility(RAM_BOX_LYRICS[previousRevealedSlide]);
        if (previousVisibility === "only-active") {
          clearIllustrationProgress(previousRevealedSlide === null ? null : slideRefs.current[previousRevealedSlide]);
        }
        revealedSlideRef.current = activeIndex;
      }
      setIllustrationProgress(slideRefs.current[activeIndex], activeIndex, sectionProgress);
      syncInactiveIllustrations(slideRefs.current, activeIndex);

      const offset = position + 0.5;
      const {
        horizontalBorderOffset,
        horizontalSlideSize,
        isVertical,
        verticalBorderOffset,
        verticalSlideSize,
        viewportCenterX,
        viewportCenterY,
      } = trackMetricsRef.current;

      const x = viewportCenterX - horizontalSlideSize * offset + horizontalBorderOffset;
      const y = viewportCenterY - verticalSlideSize * offset + verticalBorderOffset;
      track.style.transform = isVertical ? `translate3d(0, ${y}px, 0)` : `translate3d(${x}px, 0, 0)`;

      highlightSlide(isHighlighted ? activeIndex : null);
    },
    [duration, highlightSlide, setCurrentSlide],
  );

  useLayoutEffect(() => {
    const measureTrack = () => {
      const track = trackRef.current;
      const viewport = viewportRef.current;
      if (!track || !viewport) return;

      const viewportCenterX = viewport.clientWidth / 2;
      const viewportCenterY = viewport.clientHeight / 2;
      track.style.setProperty("--timeline-mobile-slide-height", `${viewport.clientHeight / 2}px`);

      const flowSlide = slideRefs.current.find((slide) => slide && slide.dataset.overlay !== "true");
      if (flowSlide) {
        trackMetricsRef.current = {
          horizontalBorderOffset: (flowSlide.offsetWidth - flowSlide.clientWidth - flowSlide.clientLeft) / 2,
          horizontalSlideSize: flowSlide.offsetWidth,
          isVertical: window.matchMedia("(max-width: 639px)").matches,
          verticalBorderOffset: (flowSlide.offsetHeight - flowSlide.clientHeight - flowSlide.clientTop) / 2,
          verticalSlideSize: flowSlide.offsetHeight,
          viewportCenterX,
          viewportCenterY,
        };
      }

      updateTrack(audioRef.current?.currentTime ?? 0);
    };

    measureTrack();

    const resizeObserver = new ResizeObserver(measureTrack);
    if (viewportRef.current) resizeObserver.observe(viewportRef.current);

    return () => resizeObserver.disconnect();
  }, [audioRef, updateTrack]);

  useEffect(() => {
    if (!shouldPrewarm) return;

    let cancelled = false;

    const nextPaint = () =>
      new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            window.setTimeout(resolve, PREWARM_SECTION_DWELL_MS);
          });
        });
      });

    const prewarmSections = async () => {
      const track = trackRef.current;
      const viewport = viewportRef.current;
      if (!track || !viewport) return;

      const sections = slideRefs.current
        .map((slide, index) => (slide ? { index, slide } : null))
        .filter((entry): entry is { index: number; slide: HTMLElement } => Boolean(entry));
      for (let index = 0; index < sections.length; index += 1) {
        if (cancelled) return;

        const { index: sectionIndex, slide } = sections[index];
        if (slide.dataset.overlay !== "true") {
          const x = viewport.clientWidth / 2 - slide.offsetLeft - slide.offsetWidth / 2;
          const y = viewport.clientHeight / 2 - slide.offsetTop - slide.offsetHeight / 2;
          track.style.transform = trackMetricsRef.current.isVertical
            ? `translate3d(0, ${y}px, 0)`
            : `translate3d(${x}px, 0, 0)`;
        }

        highlightSlide(sectionIndex);
        await nextPaint();
        onPrewarmProgress((index + 1) / sections.length);
      }

      if (cancelled) return;

      highlightSlide(null);
      updateTrack(audioRef.current?.currentTime ?? 0);
      onTimelinePrepared();
    };

    void prewarmSections();

    return () => {
      cancelled = true;
    };
  }, [audioRef, highlightSlide, onPrewarmProgress, onTimelinePrepared, shouldPrewarm, updateTrack]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const updateTimeline = () => {
      updateTrack(audioRef.current?.currentTime ?? 0);
    };
    const unsubscribeIllustrationAnimation = subscribeIllustrationAnimationTuning(updateTimeline);
    const unsubscribeLyricTiming = subscribeLyricTimingTuning(updateTimeline);

    return () => {
      unsubscribeIllustrationAnimation();
      unsubscribeLyricTiming();
    };
  }, [audioRef, updateTrack]);

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

  return { slideRefs, trackRef, viewportRef };
}
