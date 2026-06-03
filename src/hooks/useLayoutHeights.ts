import { useEffect, useLayoutEffect, useState, type RefObject } from "react";
import { useSyncedRef } from "./useSyncedRef";

type LayoutRefs = {
  hasStarted: boolean;
  headerRef: RefObject<HTMLElement | null>;
  playbackRef: RefObject<HTMLElement | null>;
  replayPromptVisible: boolean;
};

export function useLayoutHeights({ hasStarted, headerRef, playbackRef, replayPromptVisible }: LayoutRefs) {
  const hasStartedRef = useSyncedRef(hasStarted);
  const [layoutHeights, setLayoutHeights] = useState({ header: 64, playback: 148, section: 520 });

  useLayoutEffect(() => {
    const previousScrollRestoration = history.scrollRestoration;
    history.scrollRestoration = "manual";
    document.body.style.overflow = "hidden";
    window.scrollTo({ top: 0 });
    const scrollTopFrame = window.requestAnimationFrame(() => {
      if (!hasStartedRef.current) window.scrollTo({ top: 0 });
    });

    const handlePageShow = () => {
      if (!hasStartedRef.current) window.scrollTo({ top: 0 });
    };

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      history.scrollRestoration = previousScrollRestoration;
      document.body.style.overflow = "";
      window.cancelAnimationFrame(scrollTopFrame);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [hasStartedRef]);

  useEffect(() => {
    const updateLayoutHeights = () => {
      const header = Math.round(headerRef.current?.getBoundingClientRect().height ?? 64);
      const playback = Math.round(playbackRef.current?.getBoundingClientRect().height ?? 148);
      const section = Math.max(320, window.innerHeight - header - playback);

      setLayoutHeights((current) => {
        if (current.header === header && current.playback === playback && current.section === section) return current;

        return { header, playback, section };
      });
    };

    updateLayoutHeights();

    const resizeObserver = new ResizeObserver(updateLayoutHeights);
    if (headerRef.current) resizeObserver.observe(headerRef.current);
    if (playbackRef.current) resizeObserver.observe(playbackRef.current);

    window.addEventListener("resize", updateLayoutHeights);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateLayoutHeights);
    };
  }, [headerRef, playbackRef]);

  useEffect(() => {
    if (hasStarted && !replayPromptVisible) {
      document.body.style.overflow = "";
      return;
    }

    if (!hasStarted) window.scrollTo({ top: 0 });
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [hasStarted, replayPromptVisible]);

  return layoutHeights;
}
