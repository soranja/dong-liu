import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useCallback, useRef, type RefObject } from "react";
import { useSyncedRef } from "./useSyncedRef";

type AudioGsapTimelineOptions = {
  audioRef: RefObject<HTMLAudioElement | null>;
  isEnabled: () => boolean;
  onSeek?: (progress: number) => void;
  timelineRef: RefObject<HTMLElement | null>;
};

type SyncToAudioOptions = {
  animatePage?: boolean;
  continuePlaybackScroll?: boolean;
};

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

export function useAudioGsapTimeline(options: AudioGsapTimelineOptions) {
  const { audioRef, isEnabled, onSeek, timelineRef } = options;
  const isEnabledRef = useSyncedRef(isEnabled);
  const onSeekRef = useSyncedRef(onSeek);
  const pageTweenRef = useRef<gsap.core.Tween | null>(null);
  const releaseAutoScrollRef = useRef<gsap.core.Tween | null>(null);
  const resumePlaybackScrollRef = useRef<gsap.core.Tween | null>(null);
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);
  const timelineRefInternal = useRef<gsap.core.Timeline | null>(null);
  const isAutoScrollingRef = useRef(false);
  const isTickerActiveRef = useRef(false);

  const getIsEnabled = useCallback(() => isEnabledRef.current(), [isEnabledRef]);

  const releaseAutoScroll = useCallback(() => {
    releaseAutoScrollRef.current?.kill();
    releaseAutoScrollRef.current = gsap.delayedCall(0, () => {
      isAutoScrollingRef.current = false;
      releaseAutoScrollRef.current = null;
    });
  }, []);

  const stopPageTween = useCallback(() => {
    pageTweenRef.current?.kill();
    pageTweenRef.current = null;
    releaseAutoScrollRef.current?.kill();
    releaseAutoScrollRef.current = null;
    isAutoScrollingRef.current = false;
  }, []);

  const syncVisualsToAudio = useCallback(() => {
    timelineRefInternal.current?.progress(getAudioProgress(audioRef.current));
  }, [audioRef]);

  const trackAudioProgress = useCallback(() => {
    syncVisualsToAudio();
  }, [syncVisualsToAudio]);

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

      const maxScroll = getMaxScroll();
      if (!maxScroll) return;

      const progress = getAudioProgress(audio);
      const targetScroll = continuePlaybackScroll && !audio.paused ? maxScroll : maxScroll * progress;
      const duration =
        continuePlaybackScroll && !audio.paused
          ? Math.max(0.05, audio.duration - audio.currentTime)
          : animatePage
            ? 0.36
            : 0;

      stopPageTween();
      isAutoScrollingRef.current = true;

      if (duration <= 0) {
        window.scrollTo({ top: targetScroll });
        scrollTriggerRef.current?.update();
        releaseAutoScroll();
        return;
      }

      pageTweenRef.current = gsap.to(window, {
        duration,
        ease: continuePlaybackScroll && !audio.paused ? "none" : "power2.out",
        overwrite: "auto",
        scrollTo: { autoKill: false, y: targetScroll },
        onUpdate: syncVisualsToAudio,
        onComplete: () => {
          pageTweenRef.current = null;
          releaseAutoScroll();
        },
        onInterrupt: releaseAutoScroll,
      });
    },
    [audioRef, getIsEnabled, releaseAutoScroll, stopPageTween, syncVisualsToAudio],
  );

  const resumePlaybackScrollSoon = useCallback(() => {
    resumePlaybackScrollRef.current?.kill();
    resumePlaybackScrollRef.current = gsap.delayedCall(0.18, () => {
      resumePlaybackScrollRef.current = null;
      if (!audioRef.current?.paused) syncToAudio({ continuePlaybackScroll: true });
    });
  }, [audioRef, syncToAudio]);

  useGSAP(
    () => {
      const timelineRoot = timelineRef.current;
      if (!timelineRoot) return;

      const sections = gsap.utils.toArray<HTMLElement>("[data-audio-section]", timelineRoot);
      const contents = gsap.utils.toArray<HTMLElement>("[data-audio-content]", timelineRoot);
      const segment = sections.length ? 1 / sections.length : 1;
      const timeline = gsap.timeline({ defaults: { ease: "none" }, paused: true });

      timeline.to({}, { duration: 1 });
      gsap.set(contents, { autoAlpha: 0, y: 36, scale: 0.98 });

      sections.forEach((section, index) => {
        const start = index * segment;
        const content = section.querySelector<HTMLElement>("[data-audio-content]");

        timeline.addLabel(`section-${index + 1}`, start);
        timeline.fromTo(
          section,
          { filter: "saturate(0.92) brightness(0.96)" },
          { duration: segment * 0.55, filter: "saturate(1.12) brightness(1.04)" },
          start,
        );

        if (!content) return;

        timeline.to(content, { autoAlpha: 1, duration: segment * 0.18, scale: 1, y: 0, ease: "power2.out" }, start + segment * 0.08);
        timeline.to(content, { autoAlpha: 0, duration: segment * 0.16, scale: 1.02, y: -28, ease: "power1.in" }, start + segment * 0.74);
      });

      timelineRefInternal.current = timeline;

      scrollTriggerRef.current = ScrollTrigger.create({
        id: "audio-page-scroll",
        trigger: timelineRoot,
        start: "top top",
        end: () => getMaxScroll(),
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const audio = audioRef.current;
          if (!audio || !getIsEnabled() || isAutoScrollingRef.current || !audio.duration || !Number.isFinite(audio.duration)) return;

          const progress = clampProgress(self.progress);
          audio.currentTime = progress * audio.duration;
          timeline.progress(progress);
          onSeekRef.current?.(progress * 100);
          if (!audio.paused) resumePlaybackScrollSoon();
        },
      });

      const observer = ScrollTrigger.observe({
        target: window,
        type: "wheel,touch,pointer",
        onChangeY: () => {
          if (!getIsEnabled() || !isAutoScrollingRef.current) return;

          stopPageTween();
          resumePlaybackScrollSoon();
        },
      });

      syncVisualsToAudio();
      ScrollTrigger.refresh();
      if (!getIsEnabled()) window.scrollTo({ top: 0 });

      return () => {
        observer.kill();
        stopAudioTicker();
        stopPageTween();
        resumePlaybackScrollRef.current?.kill();
        timeline.kill();
        timelineRefInternal.current = null;
        scrollTriggerRef.current?.kill();
        scrollTriggerRef.current = null;
      };
    },
    { dependencies: [audioRef, getIsEnabled, onSeekRef, resumePlaybackScrollSoon, stopAudioTicker, stopPageTween, syncVisualsToAudio, timelineRef], scope: timelineRef },
  );

  return {
    refresh: () => ScrollTrigger.refresh(),
    startAudioSync: () => {
      startAudioTicker();
      syncToAudio({ continuePlaybackScroll: true });
    },
    stopAudioSync: () => {
      stopAudioTicker();
      stopPageTween();
    },
    syncToAudio,
    syncVisualsToAudio,
  };
}
