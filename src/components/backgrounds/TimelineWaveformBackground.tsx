import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { RAM_BOX_LYRICS } from "../../lyrics/ram-box-lyrics";
import { getActiveLyricsSectionIndex, getLyricsSectionStart } from "../../utils/lyrics";

type TimelineWaveformBackgroundProps = {
  audioRef: RefObject<HTMLAudioElement | null>;
  currentTime: number;
  footerHeight: number;
  headerHeight: number;
};

const DOT_GAP = 5;
const SAMPLES_PER_POINT = 512;
const WAVEFORM_BASELINE_VIEWBOX_PADDING = 4;
const WAVEFORM_HEIGHT_VH = 20;
const WAVEFORM_VIEWBOX_HEIGHT = 100;
const WAVEFORM_VIEWBOX_HEIGHT_WITH_PADDING = WAVEFORM_VIEWBOX_HEIGHT + WAVEFORM_BASELINE_VIEWBOX_PADDING;
const WAVEFORM_VIEWBOX_Y = -WAVEFORM_BASELINE_VIEWBOX_PADDING;
const audioBufferCache = new Map<string, Promise<AudioBuffer>>();

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function getSectionRawPeaks(audioBuffer: AudioBuffer, startTime: number, endTime: number, pointCount: number) {
  const startSample = Math.floor(
    (clamp(startTime, 0, audioBuffer.duration) / audioBuffer.duration) * audioBuffer.length,
  );
  const endSample = Math.max(
    startSample + 1,
    Math.floor((clamp(endTime, 0, audioBuffer.duration) / audioBuffer.duration) * audioBuffer.length),
  );

  return Array.from({ length: pointCount }, (_, pointIndex) => {
    const pointStart = Math.floor(startSample + ((endSample - startSample) * pointIndex) / pointCount);
    const pointEnd = Math.max(
      pointStart + 1,
      Math.floor(startSample + ((endSample - startSample) * (pointIndex + 1)) / pointCount),
    );
    const sampleStep = Math.max(1, Math.floor((pointEnd - pointStart) / SAMPLES_PER_POINT));
    let peak = 0;

    for (let channelIndex = 0; channelIndex < audioBuffer.numberOfChannels; channelIndex += 1) {
      const channel = audioBuffer.getChannelData(channelIndex);

      for (let sampleIndex = pointStart; sampleIndex < pointEnd; sampleIndex += sampleStep) {
        const sample = channel[sampleIndex] ?? 0;
        if (Math.abs(sample) > Math.abs(peak)) peak = sample;
      }
    }

    return peak;
  });
}

function getWaveformPaths(peaks: readonly number[], referencePeak: number, width: number) {
  const baselineY = WAVEFORM_VIEWBOX_HEIGHT;
  const verticalRange = WAVEFORM_VIEWBOX_HEIGHT;
  const points = peaks.map((peak, index) => {
    const x = (index / Math.max(1, peaks.length - 1)) * width;
    const normalizedPeak = Math.min(1, Math.pow(Math.abs(peak) / referencePeak, 0.5));
    const y = baselineY - normalizedPeak * verticalRange;

    return { x: x.toFixed(1), y: y.toFixed(1) };
  });

  return {
    dotsPath: points.map(({ x, y }) => `M${x},${y}h0`).join(" "),
    linePath: points.map(({ x, y }, index) => `${index === 0 ? "M" : "L"}${x},${y}`).join(" "),
  };
}

function getSectionReferencePeak(peaks: readonly number[]) {
  const sortedPeaks = peaks.map(Math.abs).sort((left, right) => left - right);
  const referenceIndex = Math.floor((sortedPeaks.length - 1) * 0.9);

  return Math.max(0.001, sortedPeaks[referenceIndex] ?? 0);
}

function buildWaveformSections(audioBuffer: AudioBuffer, width: number, pointCount: number) {
  const rawSections = RAM_BOX_LYRICS.map((section, index) => {
    const startTime = getLyricsSectionStart(index);
    const nextStartTime = index < RAM_BOX_LYRICS.length - 1 ? getLyricsSectionStart(index + 1) : audioBuffer.duration;
    const currentEndTime = Math.max(startTime, nextStartTime - section.exitDuration / 1000 - 0.01);
    const endTime = startTime + (currentEndTime - startTime) * 0.8;

    return {
      endTime,
      peaks: getSectionRawPeaks(audioBuffer, startTime, endTime, pointCount),
      startTime,
    };
  });

  return rawSections.map(({ endTime, peaks, startTime }) => ({
    ...getWaveformPaths(peaks, getSectionReferencePeak(peaks), width),
    endTime,
    startTime,
  }));
}

function getAudioBuffer(source: string) {
  const cached = audioBufferCache.get(source);
  if (cached) return cached;

  const audioBuffer = fetch(source)
    .then((response) => {
      if (!response.ok) throw new Error(`Unable to load waveform audio: ${response.status}`);
      return response.arrayBuffer();
    })
    .then(async (audioData) => {
      const audioContext = new AudioContext();

      try {
        return await audioContext.decodeAudioData(audioData);
      } finally {
        void audioContext.close();
      }
    });

  audioBufferCache.set(source, audioBuffer);
  return audioBuffer;
}

function useAudioBuffer(audioRef: RefObject<HTMLAudioElement | null>) {
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let isActive = true;
    const loadWaveform = () => {
      const source = audio.currentSrc || audio.src;
      if (!source) return;

      void getAudioBuffer(source)
        .then((nextAudioBuffer) => {
          if (isActive) setAudioBuffer(nextAudioBuffer);
        })
        .catch(() => {
          // The background remains usable if the browser cannot decode the audio source.
        });
    };

    loadWaveform();
    audio.addEventListener("loadedmetadata", loadWaveform, { once: true });

    return () => {
      isActive = false;
      audio.removeEventListener("loadedmetadata", loadWaveform);
    };
  }, [audioRef]);

  return audioBuffer;
}

export const TimelineWaveformBackground = ({
  audioRef,
  currentTime,
  footerHeight,
  headerHeight,
}: TimelineWaveformBackgroundProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const audioBuffer = useAudioBuffer(audioRef);
  const pointCount = Math.max(2, Math.floor(viewportWidth / DOT_GAP) + 1);
  const waveformSections = useMemo(
    () => (audioBuffer && viewportWidth ? buildWaveformSections(audioBuffer, viewportWidth, pointCount) : []),
    [audioBuffer, pointCount, viewportWidth],
  );
  const activeSectionIndex = getActiveLyricsSectionIndex(currentTime);
  const activeSection = RAM_BOX_LYRICS[activeSectionIndex];
  const waveform = waveformSections[activeSectionIndex];

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => setViewportWidth(container.clientWidth);
    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  const sectionDuration = waveform ? waveform.endTime - waveform.startTime : 0;
  const progress =
    waveform && sectionDuration > 0 ? clamp((currentTime - waveform.startTime) / sectionDuration, 0, 1) : 1;
  const completedWidth = progress * viewportWidth;
  const completedClipId = `background-waveform-completed-${activeSection.sectionId}`;
  const pendingClipId = `background-waveform-pending-${activeSection.sectionId}`;

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 z-0 flex items-end overflow-hidden bg-(--color-bg)"
      data-timeline-waveform-background
      style={{ bottom: footerHeight, top: headerHeight }}
    >
      {waveform ? (
        <svg
          className="w-screen shrink-0 overflow-visible opacity-90"
          preserveAspectRatio="none"
          style={{ height: `${WAVEFORM_HEIGHT_VH}vh`, transform: "scaleY(-1)" }}
          viewBox={`0 ${WAVEFORM_VIEWBOX_Y} ${viewportWidth} ${WAVEFORM_VIEWBOX_HEIGHT_WITH_PADDING}`}
        >
          <defs>
            <clipPath id={completedClipId}>
              <rect height={WAVEFORM_VIEWBOX_HEIGHT_WITH_PADDING} width={completedWidth} y={WAVEFORM_VIEWBOX_Y} />
            </clipPath>
            <clipPath id={pendingClipId}>
              <rect
                height={WAVEFORM_VIEWBOX_HEIGHT_WITH_PADDING}
                width={viewportWidth - completedWidth}
                x={completedWidth}
                y={WAVEFORM_VIEWBOX_Y}
              />
            </clipPath>
          </defs>
          <path
            clipPath={`url(#${pendingClipId})`}
            d={waveform.dotsPath}
            fill="none"
            stroke="var(--color-text-muted)"
            strokeLinecap="round"
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
          />
          <path
            clipPath={`url(#${completedClipId})`}
            d={waveform.linePath}
            fill="none"
            stroke="var(--color-accent)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="4"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ) : null}
    </div>
  );
};
