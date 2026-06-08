import { useLayoutEffect, useState, type RefObject } from "react";
import { useSyncedRef } from "./useSyncedRef";

type LayoutRefs = {
  footerRef: RefObject<HTMLElement | null>;
  hasStarted: boolean;
  headerRef: RefObject<HTMLElement | null>;
  replayPromptVisible: boolean;
};

const DEFAULT_HEADER_HEIGHT = 72;
const DEFAULT_FOOTER_HEIGHT = DEFAULT_HEADER_HEIGHT;

function getInitialLayoutHeights() {
  if (typeof window === "undefined") {
    return { footer: DEFAULT_FOOTER_HEIGHT, header: DEFAULT_HEADER_HEIGHT, section: 616 };
  }

  return {
    footer: DEFAULT_FOOTER_HEIGHT,
    header: DEFAULT_HEADER_HEIGHT,
    section: Math.max(320, window.innerHeight - DEFAULT_HEADER_HEIGHT - DEFAULT_FOOTER_HEIGHT),
  };
}

function scrollPageToTop() {
  window.scrollTo({ top: 0 });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

export function useLayoutHeights({ footerRef, hasStarted, headerRef, replayPromptVisible }: LayoutRefs) {
  const hasStartedRef = useSyncedRef(hasStarted);
  const [layoutHeights, setLayoutHeights] = useState(getInitialLayoutHeights);

  useLayoutEffect(() => {
    const previousScrollRestoration = history.scrollRestoration;
    history.scrollRestoration = "manual";
    document.body.style.overflow = "hidden";
    scrollPageToTop();
    const scrollTopFrame = window.requestAnimationFrame(() => {
      if (!hasStartedRef.current) scrollPageToTop();
    });

    const handlePageShow = () => {
      if (!hasStartedRef.current) scrollPageToTop();
    };

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      history.scrollRestoration = previousScrollRestoration;
      document.body.style.overflow = "";
      window.cancelAnimationFrame(scrollTopFrame);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [hasStartedRef]);

  useLayoutEffect(() => {
    const updateLayoutHeights = () => {
      const header = Math.round(headerRef.current?.getBoundingClientRect().height ?? DEFAULT_HEADER_HEIGHT);
      const footer = Math.round(footerRef.current?.getBoundingClientRect().height ?? DEFAULT_FOOTER_HEIGHT);
      const section = Math.max(320, window.innerHeight - header - footer);

      setLayoutHeights((current) => {
        if (current.footer === footer && current.header === header && current.section === section) return current;

        return { footer, header, section };
      });

      if (!hasStartedRef.current) scrollPageToTop();
    };

    updateLayoutHeights();

    const resizeObserver = new ResizeObserver(updateLayoutHeights);
    if (headerRef.current) resizeObserver.observe(headerRef.current);
    if (footerRef.current) resizeObserver.observe(footerRef.current);

    window.addEventListener("resize", updateLayoutHeights);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateLayoutHeights);
    };
  }, [footerRef, hasStartedRef, headerRef]);

  useLayoutEffect(() => {
    if (hasStarted && !replayPromptVisible) {
      document.body.style.overflow = "";
      return;
    }

    if (!hasStarted) scrollPageToTop();
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [hasStarted, replayPromptVisible]);

  return layoutHeights;
}
