import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import type { LyricsSection } from "../../../entities/track/model/types";
import { setKineticWarpProgress } from "../../../shared/ui/illustration-animations/lib/kineticWarp";
import {
  getTimelineSectionDuration,
  getTimelineSectionProgress,
  getTimelineTrackState,
  getTimelineVisualSectionDuration,
  getTimelineVisualSectionProgress,
} from "../../../utils/generalTimeline";
import { isContinuedSection } from "../../../utils/continuing";
import {
  DEFAULT_INSTANT_ANIMATION,
  SINGLE_WORD_REVEAL_END_PERCENT,
  WORD_CLOUD_REVEAL_END_PERCENT,
  resolveIllustrationAnimation,
} from "../../../utils/tuning/illustrationAnimation";
import {
  getEffectiveIllustrationAnimation,
  getEffectiveIllustrationFadeInMs,
  getEffectiveIllustrationFadeOutMs,
  getEffectiveIllustrationVisibility,
  subscribeIllustrationAnimationTuning,
} from "../../../utils/tuning/illustrationAnimationTuningStore";
import { pauseSyncedVideos, syncSyncedVideos } from "../../../utils/timelineSyncedVideo";
import { subscribeLyricTimingTuning } from "../../../utils/tuning/lyricTimingTuningStore";
import { TIMELINE_PROGRESS_EVENT, type TimelineProgressDetail } from "../../../utils/tuning/timelineProgressEvent";

type GeneralTimelineOptions = {
  audioRef: RefObject<HTMLAudioElement | null>;
  duration: number;
  isVisible: boolean;
  lyrics: readonly LyricsSection[];
  onPrewarmProgress: (progress: number) => void;
  onTimelinePrepared: () => void;
  shouldPrewarm: boolean;
};

const PREWARM_SECTION_DWELL_MS = 12;

type TrackSlideMetric = {
  horizontalSize: number;
  horizontalStart: number;
  verticalSize: number;
  verticalStart: number;
};

type IllustrationProgressOptions = {
  fadeProgress?: number;
  shouldPlaySyncedVideo?: boolean;
  syncedVideoProgress?: number;
  sectionDuration?: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getTrackCoordinate(position: number, flowSlides: TrackSlideMetric[], isVertical: boolean) {
  if (!flowSlides.length) return 0;

  const slideIndex = clamp(Math.floor(position + 0.5), 0, flowSlides.length - 1);
  const slide = flowSlides[slideIndex];
  const localProgress = clamp(position - (slideIndex - 0.5), 0, 1);
  const start = isVertical ? slide.verticalStart : slide.horizontalStart;
  const size = isVertical ? slide.verticalSize : slide.horizontalSize;

  return start + size * localProgress;
}

function getIllustrationFadeOpacity(
  lyrics: readonly LyricsSection[],
  sectionIndex: number,
  progress: number,
  sectionDuration: number,
  disableFadeIn: boolean,
) {
  const section = lyrics[sectionIndex];
  const fadeInSeconds = disableFadeIn ? 0 : getEffectiveIllustrationFadeInMs(section) / 1000;
  const fadeOutSeconds = getEffectiveIllustrationFadeOutMs(section) / 1000;
  if (!sectionDuration || (!fadeInSeconds && !fadeOutSeconds)) return 1;

  const elapsed = progress * sectionDuration;
  const remaining = (1 - progress) * sectionDuration;
  const fadeInOpacity = fadeInSeconds ? elapsed / fadeInSeconds : 1;
  const fadeOutOpacity = fadeOutSeconds ? remaining / fadeOutSeconds : 1;

  return clamp(Math.min(fadeInOpacity, fadeOutOpacity), 0, 1);
}

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
  slide.style.setProperty("--illustration-fade-opacity", "0");
  clearWordCloud(slide);
  pauseSyncedVideos(slide);
}

function setIllustrationProgress(
  lyrics: readonly LyricsSection[],
  slide: HTMLElement | null,
  sectionIndex: number,
  sectionProgress: number,
  options: IllustrationProgressOptions = {},
) {
  if (!slide) return;

  const section = lyrics[sectionIndex];
  const animation = getEffectiveIllustrationAnimation(section);
  const fadeProgress = options.fadeProgress ?? sectionProgress;
  const sectionDuration = options.sectionDuration ?? 0;
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
  slide.style.setProperty(
    "--illustration-fade-opacity",
    String(
      getIllustrationFadeOpacity(
        lyrics,
        sectionIndex,
        fadeProgress,
        sectionDuration,
        Boolean(slide.querySelector("[data-timeline-synced-video]")),
      ),
    ),
  );
  if (words.length === 1) {
    setRevealedWordCount(slide, words, result.isObserved ? 1 : 0);
  } else if (words.length) {
    setWordCloudProgress(slide, result.progress);
  }
  if (hasKineticWarp) setKineticWarpProgress(slide, result.progress);
  syncSyncedVideos(slide, {
    progress: options.syncedVideoProgress ?? sectionProgress,
    sectionDuration,
    shouldPlay: Boolean(options.shouldPlaySyncedVideo),
  });
}

function syncInactiveIllustrations(
  lyrics: readonly LyricsSection[],
  slides: Array<HTMLElement | null>,
  activeIndex: number,
  duration: number,
) {
  slides.forEach((slide, index) => {
    if (!slide || index === activeIndex || isContinuedSection(lyrics, index)) return;

    const visibility = getEffectiveIllustrationVisibility(lyrics[index]);
    slide.dataset.illustrationVisibility = visibility;

    if (
      visibility === "adjacent" ||
      (visibility === "start-active" && index > activeIndex) ||
      (visibility === "active-end" && index < activeIndex)
    ) {
      const inactiveProgress = index < activeIndex ? 1 : 0;
      setIllustrationProgress(lyrics, slide, index, 1, {
        fadeProgress: inactiveProgress,
        sectionDuration: getTimelineSectionDuration(lyrics, index, duration),
        syncedVideoProgress: inactiveProgress,
      });
      return;
    }

    clearIllustrationProgress(slide);
  });
}

function dispatchTimelineProgress(
  lyrics: readonly LyricsSection[],
  activeIndex: number,
  sectionProgress: number,
  currentTime: number,
  duration: number,
) {
  if (!import.meta.env.DEV) return;

  const detail: TimelineProgressDetail = {
    activeIndex,
    currentTime,
    duration,
    progress: sectionProgress,
    sectionId: lyrics[activeIndex].sectionId,
  };
  window.dispatchEvent(new CustomEvent(TIMELINE_PROGRESS_EVENT, { detail }));
}

export function useGeneralTimeline({
  audioRef,
  duration,
  isVisible,
  lyrics,
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
    flowSlides: [] as TrackSlideMetric[],
    isVertical: false,
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

      const { activeIndex, isHighlighted, position, visualIndex } = getTimelineTrackState(lyrics, time, duration);
      const sectionProgress = getTimelineSectionProgress(lyrics, activeIndex, time, duration);
      const visualProgress = getTimelineVisualSectionProgress(lyrics, visualIndex, time, duration);
      const shouldPlaySyncedVideo = Boolean(audioRef.current && !audioRef.current.paused && !audioRef.current.ended);
      setCurrentSlide(visualIndex);
      dispatchTimelineProgress(lyrics, activeIndex, sectionProgress, time, duration);
      const previousRevealedSlide = revealedSlideRef.current;
      if (previousRevealedSlide !== visualIndex) {
        const previousVisibility =
          previousRevealedSlide === null
            ? "adjacent"
            : getEffectiveIllustrationVisibility(lyrics[previousRevealedSlide]);
        if (previousVisibility === "only-active") {
          clearIllustrationProgress(previousRevealedSlide === null ? null : slideRefs.current[previousRevealedSlide]);
        }
        revealedSlideRef.current = visualIndex;
      }
      setIllustrationProgress(lyrics, slideRefs.current[visualIndex], visualIndex, visualProgress, {
        fadeProgress: visualProgress,
        sectionDuration: getTimelineVisualSectionDuration(lyrics, visualIndex, duration),
        shouldPlaySyncedVideo,
      });
      syncInactiveIllustrations(lyrics, slideRefs.current, visualIndex, duration);

      const { flowSlides, isVertical, viewportCenterX, viewportCenterY } = trackMetricsRef.current;
      const coordinate = getTrackCoordinate(position, flowSlides, isVertical);
      const x = viewportCenterX - coordinate;
      const y = viewportCenterY - coordinate;
      track.style.transform = isVertical ? `translate3d(0, ${y}px, 0)` : `translate3d(${x}px, 0, 0)`;

      highlightSlide(isHighlighted ? visualIndex : null);
    },
    [audioRef, duration, highlightSlide, lyrics, setCurrentSlide],
  );

  useLayoutEffect(() => {
    const measureTrack = () => {
      const track = trackRef.current;
      const viewport = viewportRef.current;
      if (!track || !viewport) return;

      const viewportCenterX = viewport.clientWidth / 2;
      const viewportCenterY = viewport.clientHeight / 2;
      track.style.setProperty("--timeline-mobile-slide-height", `${viewport.clientHeight / 2}px`);

      const flowSlides = slideRefs.current
        .filter((slide): slide is HTMLElement => slide !== null && slide.dataset.overlay !== "true")
        .map((slide) => ({
          horizontalSize: slide.offsetWidth,
          horizontalStart: slide.offsetLeft,
          verticalSize: slide.offsetHeight,
          verticalStart: slide.offsetTop,
        }));
      trackMetricsRef.current = {
        flowSlides,
        isVertical: window.matchMedia("(max-width: 639px)").matches,
        viewportCenterX,
        viewportCenterY,
      };

      updateTrack(audioRef.current?.currentTime ?? 0);
    };

    const resizeObserver = new ResizeObserver(measureTrack);
    if (viewportRef.current) resizeObserver.observe(viewportRef.current);
    if (trackRef.current) resizeObserver.observe(trackRef.current);
    slideRefs.current.forEach((slide) => {
      if (slide && slide.dataset.overlay !== "true") resizeObserver.observe(slide);
    });
    measureTrack();

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

  useEffect(() => {
    if (isVisible) return;

    slideRefs.current.forEach(pauseSyncedVideos);
  }, [isVisible]);

  return { slideRefs, trackRef, viewportRef };
}
