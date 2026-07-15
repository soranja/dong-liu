import { useEffect, useRef, type RefObject } from 'react';
import { getCssVariable } from '@shared/lib/cssVariables';
import { drawWaveform } from '@shared/lib/waveform';

type WaveformPainterOptions = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  getAnalyser: () => AnalyserNode | null;
};

const RESTING_FREQUENCY_BIN_COUNT = 1024;
const WAVEFORM_BAR_WIDTH = 5;
const WAVEFORM_DECAY_DURATION_MS = 1000;
const WAVEFORM_DECAY_REST_INTENSITY = 0.01;
const WAVEFORM_DECAY_SMOOTHNESS = 500;
const WAVEFORM_SMOOTHNESS = 40;

export function useWaveformPainter({ canvasRef, getAnalyser }: WaveformPainterOptions) {
  const animationRef = useRef<number | null>(null);
  const canvasContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawRestingWaveformRef = useRef<() => void>(() => {});
  const frequencyDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const intensityRef = useRef<number[]>([]);
  const waveformColorsRef = useRef({ backgroundColor: '', color: '' });

  useEffect(
    () => () => {
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
      canvasContextRef.current = null;
    },
    [],
  );

  useEffect(() => {
    let restingFrame: number | null = null;
    const scheduleRestingWaveform = () => {
      if (restingFrame !== null) cancelAnimationFrame(restingFrame);
      readWaveformColors();
      restingFrame = requestAnimationFrame(() => {
        restingFrame = null;
        if (animationRef.current === null) drawRestingWaveformRef.current();
      });
    };

    scheduleRestingWaveform();
    const resizeObserver = new ResizeObserver(scheduleRestingWaveform);
    if (canvasRef.current) resizeObserver.observe(canvasRef.current);
    window.addEventListener('resize', scheduleRestingWaveform);

    return () => {
      if (restingFrame !== null) cancelAnimationFrame(restingFrame);
      resizeObserver.disconnect();
      window.removeEventListener('resize', scheduleRestingWaveform);
    };
  }, [canvasRef]);

  function readWaveformColors() {
    waveformColorsRef.current = {
      backgroundColor: getCssVariable('--color-panel'),
      color: getCssVariable('--color-accent'),
    };
  }

  function getCanvasContext() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    if (canvasContextRef.current?.canvas !== canvas) canvasContextRef.current = canvas.getContext('2d');

    return canvasContextRef.current;
  }

  function drawWaveformFrame(frequencyData: Uint8Array, smoothness = WAVEFORM_SMOOTHNESS) {
    const canvas = canvasRef.current;
    const context = getCanvasContext();
    if (!canvas || !context) return false;

    drawWaveform({
      ...waveformColorsRef.current,
      barWidth: WAVEFORM_BAR_WIDTH,
      canvas,
      context,
      frequencyData,
      intensities: intensityRef.current,
      position: 'center',
      smoothness,
    });
    return true;
  }

  function getFrequencyData() {
    const binCount =
      getAnalyser()?.frequencyBinCount ?? frequencyDataRef.current?.length ?? RESTING_FREQUENCY_BIN_COUNT;
    if (frequencyDataRef.current?.length !== binCount) frequencyDataRef.current = new Uint8Array(binCount);

    return frequencyDataRef.current;
  }

  function drawRestingWaveform() {
    const data = getFrequencyData();
    data.fill(0);
    intensityRef.current.length = 0;
    drawWaveformFrame(data);
  }
  drawRestingWaveformRef.current = drawRestingWaveform;

  function startRestingWaveformDecay() {
    const data = getFrequencyData();
    data.fill(0);
    let decayStartTime: number | null = null;

    function decay(timestamp: number) {
      decayStartTime ??= timestamp;
      if (!drawWaveformFrame(data, WAVEFORM_DECAY_SMOOTHNESS)) {
        animationRef.current = null;
        return;
      }

      const isDecaying =
        timestamp - decayStartTime < WAVEFORM_DECAY_DURATION_MS &&
        intensityRef.current.some((intensity) => intensity > WAVEFORM_DECAY_REST_INTENSITY);
      if (isDecaying) {
        animationRef.current = requestAnimationFrame(decay);
        return;
      }

      animationRef.current = null;
      drawRestingWaveform();
    }

    animationRef.current = requestAnimationFrame(decay);
  }

  function paint() {
    const analyser = getAnalyser();
    if (!analyser) {
      stopPainting();
      return;
    }

    const data = getFrequencyData();
    analyser.getByteFrequencyData(data);
    if (!drawWaveformFrame(data)) {
      stopPainting();
      return;
    }

    animationRef.current = requestAnimationFrame(paint);
  }

  function startPainting() {
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    readWaveformColors();
    animationRef.current = requestAnimationFrame(paint);
  }

  function stopPainting() {
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    startRestingWaveformDecay();
  }

  return { startPainting, stopPainting };
}
