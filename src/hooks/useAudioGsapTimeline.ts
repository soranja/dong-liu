import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useCallback, useRef, type RefObject } from "react";
import { useSyncedRef } from "./useSyncedRef";

type AudioGsapTimelineOptions = {
  audioRef: RefObject<HTMLAudioElement | null>;
  isEnabled: () => boolean;
  isTimelineReady: boolean;
  onManualScroll: () => void;
  onSeek?: (progress: number) => void;
  timelineRef: RefObject<HTMLElement | null>;
};

type SyncToAudioOptions = {
  animatePage?: boolean;
  continuePlaybackScroll?: boolean;
};

const PLAYBACK_SCROLL_EPSILON_PX = 0.05;
const PROGRAMMATIC_SCROLL_EPSILON_PX = 1;

gsap.registerPlugin(useGSAP, ScrollToPlugin, ScrollTrigger);

function clampProgress(value: number) {
  return Math.min(1, Math.max(0, value));
}

function getAudioProgress(audio: HTMLAudioElement | null) {
  if (!audio?.duration || !Number.isFinite(audio.duration)) return 0;

  return clampProgress(audio.currentTime / audio.duration);
}

function getMaxScroll() {
  return ScrollTrigger.maxScroll(window);
}

function getPageScrollProgress(maxScroll: number) {
  if (!maxScroll) return 0;

  return clampProgress(window.scrollY / maxScroll);
}

export function useAudioGsapTimeline(options: AudioGsapTimelineOptions) {
  const { audioRef, isEnabled, isTimelineReady, onManualScroll, onSeek, timelineRef } = options;
  const isEnabledRef = useSyncedRef(isEnabled);
  const onManualScrollRef = useSyncedRef(onManualScroll);
  const onSeekRef = useSyncedRef(onSeek);
  const maxScrollRef = useRef(0);
  const lastPlaybackScrollPositionRef = useRef<number | null>(null);
  const pageTweenRef = useRef<gsap.core.Tween | null>(null);
  const playbackScrollSyncFrameRef = useRef<number | null>(null);
  const releaseAutoScrollRef = useRef<gsap.core.Tween | null>(null);
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);
  const timelineRefInternal = useRef<gsap.core.Timeline | null>(null);
  const isAutoScrollingRef = useRef(false);
  const isPlaybackScrollActiveRef = useRef(false);
  const isTickerActiveRef = useRef(false);

  const getIsEnabled = useCallback(() => isEnabledRef.current(), [isEnabledRef]);

  const getCachedMaxScroll = useCallback(() => {
    maxScrollRef.current ||= getMaxScroll();

    return maxScrollRef.current;
  }, []);

  const refreshMaxScroll = useCallback(() => {
    maxScrollRef.current = getMaxScroll();

    return maxScrollRef.current;
  }, []);

  const syncAudioToPageScroll = useCallback(() => {
    const audio = audioRef.current;
    if (!audio?.duration || !Number.isFinite(audio.duration)) return;

    const progress = getPageScrollProgress(getCachedMaxScroll());
    audio.currentTime = progress * audio.duration;
    timelineRefInternal.current?.progress(progress);
    onSeekRef.current?.(progress * 100);
  }, [audioRef, getCachedMaxScroll, onSeekRef]);

  const releaseAutoScroll = useCallback(() => {
    releaseAutoScrollRef.current?.kill();
    releaseAutoScrollRef.current = gsap.delayedCall(0, () => {
      releaseAutoScrollRef.current = null;
      if (isPlaybackScrollActiveRef.current) return;
      isAutoScrollingRef.current = false;
    });
  }, []);

  const stopPlaybackScroll = useCallback(() => {
    isPlaybackScrollActiveRef.current = false;
    lastPlaybackScrollPositionRef.current = null;
  }, []);

  const stopPageTween = useCallback(() => {
    pageTweenRef.current?.kill();
    pageTweenRef.current = null;
    releaseAutoScrollRef.current?.kill();
    releaseAutoScrollRef.current = null;
    stopPlaybackScroll();
    isAutoScrollingRef.current = false;
  }, [stopPlaybackScroll]);

  const syncVisualsToAudio = useCallback(() => {
    timelineRefInternal.current?.progress(getAudioProgress(audioRef.current));
  }, [audioRef]);

  const syncPageScrollToAudio = useCallback(() => {
    if (!getIsEnabled()) return;

    const audio = audioRef.current;
    if (!audio?.duration || !Number.isFinite(audio.duration) || audio.paused) {
      stopPlaybackScroll();
      releaseAutoScroll();
      return;
    }

    const maxScroll = getCachedMaxScroll();
    if (!maxScroll) return;

    const targetScroll = maxScroll * getAudioProgress(audio);
    isAutoScrollingRef.current = true;

    if (Math.abs(window.scrollY - targetScroll) <= PLAYBACK_SCROLL_EPSILON_PX) return;

    window.scrollTo({ top: targetScroll });
    lastPlaybackScrollPositionRef.current = window.scrollY;
  }, [audioRef, getCachedMaxScroll, getIsEnabled, releaseAutoScroll, stopPlaybackScroll]);

  const trackAudioProgress = useCallback(() => {
    syncVisualsToAudio();
    if (isPlaybackScrollActiveRef.current) syncPageScrollToAudio();
  }, [syncPageScrollToAudio, syncVisualsToAudio]);

  const stopAudioTicker = useCallback(() => {
    if (!isTickerActiveRef.current) return;

    gsap.ticker.remove(trackAudioProgress);
    isTickerActiveRef.current = false;
  }, [trackAudioProgress]);

  const startAudioTicker = useCallback(() => {
    if (isTickerActiveRef.current) return;

    isTickerActiveRef.current = true;
    gsap.ticker.add(trackAudioProgress);
  }, [trackAudioProgress]);

  const syncToAudio = useCallback(
    ({ animatePage = false, continuePlaybackScroll = false }: SyncToAudioOptions = {}) => {
      const audio = audioRef.current;
      if (!audio) return;

      syncVisualsToAudio();

      if (!getIsEnabled()) {
        stopPageTween();
        return;
      }

      const maxScroll = getCachedMaxScroll();
      if (!maxScroll) return;

      const hasFiniteDuration = Boolean(audio.duration && Number.isFinite(audio.duration));
      const shouldContinuePlaybackScroll = continuePlaybackScroll && !audio.paused && hasFiniteDuration;
      const progress = getAudioProgress(audio);
      const progressScroll = maxScroll * progress;

      stopPageTween();
      isAutoScrollingRef.current = true;

      if (shouldContinuePlaybackScroll) {
        isPlaybackScrollActiveRef.current = true;
        syncPageScrollToAudio();
        return;
      }

      const duration = animatePage ? 0.36 : 0;

      if (duration <= 0) {
        window.scrollTo({ top: progressScroll });
        scrollTriggerRef.current?.update();
        releaseAutoScroll();
        return;
      }

      pageTweenRef.current = gsap.to(window, {
        duration,
        ease: "power2.out",
        overwrite: "auto",
        scrollTo: { autoKill: false, y: progressScroll },
        onUpdate: syncVisualsToAudio,
        onComplete: () => {
          pageTweenRef.current = null;
          releaseAutoScroll();
        },
        onInterrupt: releaseAutoScroll,
      });
    },
    [
      audioRef,
      getCachedMaxScroll,
      getIsEnabled,
      releaseAutoScroll,
      stopPageTween,
      syncPageScrollToAudio,
      syncVisualsToAudio,
    ],
  );

  const syncPlaybackScrollAfterLayout = useCallback(() => {
    if (playbackScrollSyncFrameRef.current !== null) window.cancelAnimationFrame(playbackScrollSyncFrameRef.current);

    playbackScrollSyncFrameRef.current = window.requestAnimationFrame(() => {
      playbackScrollSyncFrameRef.current = null;
      ScrollTrigger.refresh();
      refreshMaxScroll();
      if (!audioRef.current?.paused) syncToAudio({ continuePlaybackScroll: true });
    });
  }, [audioRef, refreshMaxScroll, syncToAudio]);

  useGSAP(
    () => {
      if (!isTimelineReady) return;

      const timelineRoot = timelineRef.current;
      if (!timelineRoot) return;

      const sections = gsap.utils.toArray<HTMLElement>("[data-audio-section]", timelineRoot);
      const contents = gsap.utils.toArray<HTMLElement>("[data-audio-content]", timelineRoot);
      const segment = sections.length ? 1 / sections.length : 1;
      const timeline = gsap.timeline({ defaults: { ease: "none" }, paused: true });
      let refreshFrame: number | null = null;

      timeline.to({}, { duration: 1 });
      if (contents.length) gsap.set(contents, { autoAlpha: 0, y: 36, scale: 0.98 });

      sections.forEach((section, index) => {
        const start = index * segment;
        const content = section.querySelector<HTMLElement>("[data-audio-content]");

        timeline.addLabel(`section-${index + 1}`, start);
        timeline.fromTo(
          section,
          { filter: "saturate(1) brightness(1)" },
          { duration: segment * 0.55, filter: "saturate(1) brightness(1)" },
          start,
        );

        if (!content) return;

        timeline.to(
          content,
          { autoAlpha: 1, duration: segment * 0.18, scale: 1, y: 0, ease: "power2.out" },
          start + segment * 0.08,
        );
        timeline.to(
          content,
          { autoAlpha: 0, duration: segment * 0.16, scale: 1.02, y: -28, ease: "power1.in" },
          start + segment * 0.74,
        );
      });

      timelineRefInternal.current = timeline;

      const handlePageScroll = () => {
        const audio = audioRef.current;
        if (!getIsEnabled() || !audio?.duration || !Number.isFinite(audio.duration)) return;

        const lastPlaybackScrollPosition = lastPlaybackScrollPositionRef.current;
        const isPlaybackScrollUpdate =
          isPlaybackScrollActiveRef.current &&
          lastPlaybackScrollPosition !== null &&
          Math.abs(window.scrollY - lastPlaybackScrollPosition) <= PROGRAMMATIC_SCROLL_EPSILON_PX;
        if (isPlaybackScrollUpdate || (isAutoScrollingRef.current && !isPlaybackScrollActiveRef.current)) return;

        stopPlaybackScroll();
        isAutoScrollingRef.current = false;
        onManualScrollRef.current();
        syncAudioToPageScroll();
      };

      scrollTriggerRef.current = ScrollTrigger.create({
        id: "audio-page-scroll",
        trigger: document.documentElement,
        start: 0,
        end: () => getMaxScroll(),
        invalidateOnRefresh: true,
        onRefresh: refreshMaxScroll,
      });
      window.addEventListener("scroll", handlePageScroll, { passive: true });

      const scheduleRefresh = () => {
        if (refreshFrame !== null) window.cancelAnimationFrame(refreshFrame);

        refreshFrame = window.requestAnimationFrame(() => {
          refreshFrame = null;
          ScrollTrigger.refresh();
          refreshMaxScroll();
          syncVisualsToAudio();
        });
      };

      const resizeObserver = new ResizeObserver(scheduleRefresh);
      resizeObserver.observe(timelineRoot);

      syncVisualsToAudio();
      ScrollTrigger.refresh();
      refreshMaxScroll();
      if (!getIsEnabled()) window.scrollTo({ top: 0 });

      return () => {
        if (refreshFrame !== null) window.cancelAnimationFrame(refreshFrame);
        resizeObserver.disconnect();
        window.removeEventListener("scroll", handlePageScroll);
        stopAudioTicker();
        stopPageTween();
        if (playbackScrollSyncFrameRef.current !== null) {
          window.cancelAnimationFrame(playbackScrollSyncFrameRef.current);
          playbackScrollSyncFrameRef.current = null;
        }
        timeline.kill();
        timelineRefInternal.current = null;
        scrollTriggerRef.current?.kill();
        scrollTriggerRef.current = null;
      };
    },
    {
      dependencies: [
        audioRef,
        getIsEnabled,
        isTimelineReady,
        onManualScrollRef,
        onSeekRef,
        refreshMaxScroll,
        syncAudioToPageScroll,
        stopAudioTicker,
        stopPlaybackScroll,
        stopPageTween,
        syncVisualsToAudio,
        timelineRef,
      ],
      scope: timelineRef,
    },
  );

  return {
    refresh: () => {
      ScrollTrigger.refresh();
      refreshMaxScroll();
    },
    startAudioSync: () => {
      refreshMaxScroll();
      startAudioTicker();
      syncToAudio({ continuePlaybackScroll: true });
      syncPlaybackScrollAfterLayout();
    },
    stopAudioSync: () => {
      stopAudioTicker();
      stopPageTween();
    },
    syncToAudio,
    syncVisualsToAudio,
  };
}
