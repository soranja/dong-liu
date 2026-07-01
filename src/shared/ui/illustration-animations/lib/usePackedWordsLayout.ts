import { useLayoutEffect, useRef, useState } from "react";
import { cancelWordCloudLayout, getPackedWords, scheduleWordCloudLayout, type PackedWord } from "./wordCloudLayout";

type PackedWordsLayoutOptions = {
  onReady: (sectionId: number) => void;
  sectionId: number;
  text: string;
};

const RESIZE_LAYOUT_THRESHOLD_PX = 8;

export function usePackedWordsLayout({ onReady, sectionId, text }: PackedWordsLayoutOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const didReportReadyRef = useRef(false);
  const layoutMetricsRef = useRef({ fontFamily: "", height: 0, width: 0 });
  const [words, setWords] = useState<PackedWord[]>([]);

  useLayoutEffect(() => {
    if (!words.length || didReportReadyRef.current) return;

    didReportReadyRef.current = true;
    onReady(sectionId);
  }, [onReady, sectionId, words.length]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    layoutMetricsRef.current = { fontFamily: "", height: 0, width: 0 };

    const layoutWords = () => {
      if (disposed) return;

      const width = Math.round(container.clientWidth);
      const height = Math.round(container.clientHeight);
      if (width < 16 || height < 16) return;

      const fontFamily = getComputedStyle(container).fontFamily;
      const previousMetrics = layoutMetricsRef.current;
      const dimensionsAreStable =
        Math.abs(previousMetrics.width - width) < RESIZE_LAYOUT_THRESHOLD_PX &&
        Math.abs(previousMetrics.height - height) < RESIZE_LAYOUT_THRESHOLD_PX;
      if (previousMetrics.fontFamily === fontFamily && dimensionsAreStable) return;

      const inset = Math.min(8, Math.max(2, Math.min(width, height) * 0.008));
      const nextWords = getPackedWords(text, sectionId, width, height, fontFamily, inset);
      layoutMetricsRef.current = { fontFamily, height, width };
      setWords(nextWords);
      container.style.setProperty("--room-inset", `${inset}px`);
      if (!nextWords.length && !didReportReadyRef.current) {
        didReportReadyRef.current = true;
        onReady(sectionId);
      }
    };
    const scheduleLayout = () => {
      if (disposed) return;
      scheduleWordCloudLayout(layoutWords);
    };

    const resizeObserver = new ResizeObserver(scheduleLayout);
    void document.fonts.ready.then(() => {
      if (disposed) return;

      scheduleLayout();
      resizeObserver.observe(container);
    });

    return () => {
      disposed = true;
      cancelWordCloudLayout(layoutWords);
      resizeObserver.disconnect();
    };
  }, [onReady, sectionId, text]);

  return { containerRef, words };
}
