import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { getBackgroundSectionIndex, resolveBackground } from "@entities/track/lib/background";
import {
  resolveIllustrationVisibility,
  type TrackTuningAdapter,
} from "@entities/track/model/tuning";
import type { LyricsBackground, LyricsSection } from "@entities/track/model/types";
import {
  getTimelineSectionProgress,
  getTimelineTrackState,
  getTimelineVisualSectionDuration,
  getTimelineVisualSectionProgress,
} from "@entities/track/lib/generalTimeline";
import { pauseSyncedVideos, syncLoopingVideos } from "@shared/lib/timelineSyncedVideo";
import { setKineticWarpProgress } from "@shared/ui/illustration-animations/lib/kineticWarp";
import {
  clearIllustrationProgress,
  setIllustrationProgress,
  syncInactiveIllustrations,
} from "./generalTimelineIllustrations";

type GeneralTimelineOptions = {
  audioRef: RefObject<HTMLAudioElement | null>;
  duration: number;
  isVisible: boolean;
  lyrics: readonly LyricsSection[];
  onActiveSectionChange: (index: number) => void;
  onPrewarmProgress: (progress: number) => void;
  onTimelinePrepared: () => void;
  shouldPrewarm: boolean;
  tuningAdapter?: TrackTuningAdapter;
};

const PREWARM_SECTION_DWELL_MS = 12;

type TrackSlideMetric = {
  horizontalSize: number;
  horizontalStart: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getTrackCoordinate(position: number, flowSlides: TrackSlideMetric[]) {
  if (!flowSlides.length) return 0;

  const slideIndex = clamp(Math.floor(position + 0.5), 0, flowSlides.length - 1);
  const slide = flowSlides[slideIndex];
  const localProgress = clamp(position - (slideIndex - 0.5), 0, 1);
  return slide.horizontalStart + slide.horizontalSize * localProgress;
}

function publishTimelineProgress(
  lyrics: readonly LyricsSection[],
  activeIndex: number,
  sectionProgress: number,
  currentTime: number,
  duration: number,
  tuningAdapter?: TrackTuningAdapter,
) {
  tuningAdapter?.publishTimelineProgress({
    activeIndex,
    currentTime,
    duration,
    progress: sectionProgress,
    sectionId: lyrics[activeIndex].sectionId,
  });
}

export function useGeneralTimeline({
  audioRef,
  duration,
  isVisible,
  lyrics,
  onActiveSectionChange,
  onPrewarmProgress,
  onTimelinePrepared,
  shouldPrewarm,
  tuningAdapter,
}: GeneralTimelineOptions) {
  const highlightedSlideRef = useRef<number | null>(null);
  const currentBackgroundRef = useRef<number | null>(null);
  const currentSlideRef = useRef<number | null>(null);
  const revealedSlideRef = useRef<number | null>(null);
  const slideRefs = useRef<Array<HTMLElement | null>>([]);
  const backgroundRefs = useRef<Array<HTMLElement | null>>([]);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const trackMetricsRef = useRef({
    flowSlides: [] as TrackSlideMetric[],
    viewportCenterX: 0,
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
    onActiveSectionChange(nextIndex);
  }, [onActiveSectionChange]);

  const setCurrentBackground = useCallback(
    (nextIndex: number | null, background: LyricsBackground | undefined, shouldPlay: boolean) => {
      if (currentBackgroundRef.current !== nextIndex) {
        const previous =
          currentBackgroundRef.current === null ? null : backgroundRefs.current[currentBackgroundRef.current];
        previous?.setAttribute("data-active", "false");
        previous?.querySelector("video")?.pause();

        const next = nextIndex === null ? null : backgroundRefs.current[nextIndex];
        next?.setAttribute("data-active", "true");
        const nextVideo = next?.querySelector("video");
        if (nextVideo) nextVideo.currentTime = 0;
        currentBackgroundRef.current = nextIndex;
      }

      const element = nextIndex === null ? null : backgroundRefs.current[nextIndex];
      if (element && background) {
        const previousType = element.dataset.backgroundType;
        element.dataset.backgroundType = background.mediaType;
        element.dataset.backgroundPreset = background.mediaType === "solid" ? background.preset : "";
        if (previousType !== background.mediaType && background.mediaType === "video") {
          const nextVideo = element.querySelector("video");
          if (nextVideo) nextVideo.currentTime = 0;
        }
      }

      const video = element?.querySelector("video");
      if (!video) return;
      if (background?.mediaType === "video" && shouldPlay) void video.play().catch(() => undefined);
      else video.pause();
    },
    [],
  );

  const updateTrack = useCallback(
    (time: number) => {
      const track = trackRef.current;
      if (!track) return;

      const { activeIndex, isHighlighted, position, visualIndex } = getTimelineTrackState(
        lyrics,
        time,
        duration,
        tuningAdapter,
      );
      const sectionProgress = getTimelineSectionProgress(lyrics, activeIndex, time, duration, tuningAdapter);
      const visualProgress = getTimelineVisualSectionProgress(lyrics, visualIndex, time, duration, tuningAdapter);
      const shouldPlaySyncedVideo = Boolean(audioRef.current && !audioRef.current.paused && !audioRef.current.ended);
      const background = resolveBackground(lyrics, activeIndex, tuningAdapter);
      const backgroundIndex = background ? getBackgroundSectionIndex(lyrics, activeIndex, tuningAdapter) : null;
      setCurrentBackground(backgroundIndex, background, shouldPlaySyncedVideo);
      setCurrentSlide(visualIndex);
      publishTimelineProgress(lyrics, activeIndex, sectionProgress, time, duration, tuningAdapter);
      const previousRevealedSlide = revealedSlideRef.current;
      if (previousRevealedSlide !== visualIndex) {
        const previousVisibility =
          previousRevealedSlide === null
            ? "adjacent"
            : resolveIllustrationVisibility(lyrics[previousRevealedSlide], tuningAdapter);
        if (previousVisibility === "only-active") {
          clearIllustrationProgress(previousRevealedSlide === null ? null : slideRefs.current[previousRevealedSlide]);
        }
        revealedSlideRef.current = visualIndex;
      }
      setIllustrationProgress(
        lyrics,
        slideRefs.current[visualIndex],
        visualIndex,
        visualProgress,
        {
          fadeProgress: visualProgress,
          sectionDuration: getTimelineVisualSectionDuration(lyrics, visualIndex, duration, tuningAdapter),
          shouldPlaySyncedVideo,
        },
        tuningAdapter,
      );
      syncInactiveIllustrations(lyrics, slideRefs.current, visualIndex, duration, tuningAdapter);
      syncLoopingVideos(track, time);

      const { flowSlides, viewportCenterX } = trackMetricsRef.current;
      const coordinate = getTrackCoordinate(position, flowSlides);
      const x = viewportCenterX - coordinate;
      track.style.transform = `translate3d(${x}px, 0, 0)`;

      highlightSlide(isHighlighted ? visualIndex : null);
    },
    [audioRef, duration, highlightSlide, lyrics, setCurrentBackground, setCurrentSlide, tuningAdapter],
  );

  useLayoutEffect(() => {
    const measureTrack = () => {
      const track = trackRef.current;
      const viewport = viewportRef.current;
      if (!track || !viewport) return;

      const viewportCenterX = viewport.clientWidth / 2;
      const flowSlides = slideRefs.current
        .filter((slide): slide is HTMLElement => slide !== null && slide.dataset.overlay !== "true")
        .map((slide) => ({
          horizontalSize: slide.offsetWidth,
          horizontalStart: slide.offsetLeft,
        }));
      trackMetricsRef.current = {
        flowSlides,
        viewportCenterX,
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
        .map((slide, index) => (slide?.dataset.resident === "true" ? { index, slide } : null))
        .filter((entry): entry is { index: number; slide: HTMLElement } => Boolean(entry));
      for (let index = 0; index < sections.length; index += 1) {
        if (cancelled) return;

        const { index: sectionIndex, slide } = sections[index];
        if (slide.dataset.overlay !== "true") {
          const x = viewport.clientWidth / 2 - slide.offsetLeft - slide.offsetWidth / 2;
          track.style.transform = `translate3d(${x}px, 0, 0)`;
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
    const updateTimeline = () => {
      updateTrack(audioRef.current?.currentTime ?? 0);
    };
    return tuningAdapter?.subscribe(updateTimeline);
  }, [audioRef, tuningAdapter, updateTrack]);

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
    backgroundRefs.current.forEach((background) => background?.querySelector("video")?.pause());
  }, [isVisible]);

  return { backgroundRefs, slideRefs, trackRef, viewportRef };
}
