import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useCallback, useRef, type RefObject } from 'react';
import { useSyncedRef } from './useSyncedRef';

type AudioScrollSyncOptions = {
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

export function useAudioScrollSync(options: AudioScrollSyncOptions) {
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
    if (isPlaybackScrollActiveRef.current) syncPageScrollToAudio();
  }, [syncPageScrollToAudio]);

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
        ease: 'power2.out',
        overwrite: 'auto',
        scrollTo: { autoKill: false, y: progressScroll },
        onComplete: () => {
          pageTweenRef.current = null;
          releaseAutoScroll();
        },
        onInterrupt: releaseAutoScroll,
      });
    },
    [audioRef, getCachedMaxScroll, getIsEnabled, releaseAutoScroll, stopPageTween, syncPageScrollToAudio],
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

      let refreshFrame: number | null = null;

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
        id: 'audio-page-scroll',
        trigger: document.documentElement,
        start: 0,
        end: () => getMaxScroll(),
        invalidateOnRefresh: true,
        onRefresh: refreshMaxScroll,
      });
      window.addEventListener('scroll', handlePageScroll, { passive: true });

      const scheduleRefresh = () => {
        if (refreshFrame !== null) window.cancelAnimationFrame(refreshFrame);

        refreshFrame = window.requestAnimationFrame(() => {
          refreshFrame = null;
          ScrollTrigger.refresh();
          refreshMaxScroll();
        });
      };

      const resizeObserver = new ResizeObserver(scheduleRefresh);
      resizeObserver.observe(timelineRoot);

      ScrollTrigger.refresh();
      refreshMaxScroll();
      if (!getIsEnabled()) window.scrollTo({ top: 0 });

      return () => {
        if (refreshFrame !== null) window.cancelAnimationFrame(refreshFrame);
        resizeObserver.disconnect();
        window.removeEventListener('scroll', handlePageScroll);
        stopAudioTicker();
        stopPageTween();
        if (playbackScrollSyncFrameRef.current !== null) {
          window.cancelAnimationFrame(playbackScrollSyncFrameRef.current);
          playbackScrollSyncFrameRef.current = null;
        }
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
  };
}
