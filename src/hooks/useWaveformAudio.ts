import { useEffect, useRef, type RefObject } from "react";
import { getCssVariable } from "../utils/cssVariables";
import { drawWaveform } from "../utils/waveform";

type AudioGraph = {
  analyser: AnalyserNode;
  context: AudioContext;
  gain: GainNode;
  source: MediaElementAudioSourceNode;
};

type WaveformAudioOptions = {
  audioRef: RefObject<HTMLAudioElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  volume: number;
};

const RESTING_FREQUENCY_BIN_COUNT = 1024;
const WAVEFORM_BAR_WIDTH = 5;
const WAVEFORM_DECAY_DURATION_MS = 1000;
const WAVEFORM_DECAY_REST_INTENSITY = 0.01;
const WAVEFORM_DECAY_SMOOTHNESS = 500;
const WAVEFORM_SMOOTHNESS = 40;

export function useWaveformAudio({ audioRef, canvasRef, volume }: WaveformAudioOptions) {
  const animationRef = useRef<number | null>(null);
  const canvasContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawRestingWaveformRef = useRef<() => void>(() => {});
  const frequencyDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const graphRef = useRef<AudioGraph | null>(null);
  const intensityRef = useRef<number[]>([]);
  const waveformColorsRef = useRef({ backgroundColor: "", color: "" });

  useEffect(() => {
    const audio = audioRef.current;
    const graph = graphRef.current;

    if (audio) audio.volume = 1;
    if (graph) graph.gain.gain.value = volume;
  }, [audioRef, volume]);

  useEffect(() => {
    return () => {
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
      canvasContextRef.current = null;
      void graphRef.current?.context.close();
    };
  }, []);

  useEffect(() => {
    let restingFrame: number | null = null;

    const paintRestingWaveform = () => {
      restingFrame = null;
      if (animationRef.current !== null) return;

      drawRestingWaveformRef.current();
    };

    const scheduleRestingWaveform = () => {
      if (restingFrame !== null) cancelAnimationFrame(restingFrame);

      readWaveformColors();
      restingFrame = requestAnimationFrame(paintRestingWaveform);
    };

    scheduleRestingWaveform();

    const resizeObserver = new ResizeObserver(scheduleRestingWaveform);
    if (canvasRef.current) resizeObserver.observe(canvasRef.current);

    window.addEventListener("resize", scheduleRestingWaveform);

    return () => {
      if (restingFrame !== null) cancelAnimationFrame(restingFrame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleRestingWaveform);
    };
  }, [canvasRef]);

  function stopPainting() {
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    startRestingWaveformDecay();
  }

  function readWaveformColors() {
    waveformColorsRef.current = {
      backgroundColor: getCssVariable("--color-panel"),
      color: getCssVariable("--color-accent"),
    };
  }

  function getCanvasContext() {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    if (canvasContextRef.current?.canvas !== canvas) {
      canvasContextRef.current = canvas.getContext("2d");
    }

    return canvasContextRef.current;
  }

  function drawWaveformFrame(frequencyData: Uint8Array, smoothness = WAVEFORM_SMOOTHNESS) {
    const canvas = canvasRef.current;
    const context = getCanvasContext();

    if (!canvas || !context) return false;

    const colors = waveformColorsRef.current;

    // Shapes the waveform bars to match the header's visual language.
    drawWaveform({
      backgroundColor: colors.backgroundColor,
      barWidth: WAVEFORM_BAR_WIDTH,
      canvas,
      color: colors.color,
      context,
      frequencyData,
      intensities: intensityRef.current,
      position: "center",
      smoothness,
    });

    return true;
  }

  function getRestingFrequencyData() {
    const binCount =
      graphRef.current?.analyser.frequencyBinCount ?? frequencyDataRef.current?.length ?? RESTING_FREQUENCY_BIN_COUNT;

    if (frequencyDataRef.current?.length !== binCount) {
      frequencyDataRef.current = new Uint8Array(binCount);
    } else {
      frequencyDataRef.current.fill(0);
    }

    return frequencyDataRef.current;
  }

  function drawRestingWaveform() {
    const data = getRestingFrequencyData();

    intensityRef.current.length = 0;
    drawWaveformFrame(data);
  }

  drawRestingWaveformRef.current = drawRestingWaveform;

  function startRestingWaveformDecay() {
    const data = getRestingFrequencyData();
    let decayStartTime: number | null = null;

    function decay(timestamp: number) {
      decayStartTime ??= timestamp;

      if (!drawWaveformFrame(data, WAVEFORM_DECAY_SMOOTHNESS)) {
        animationRef.current = null;
        return;
      }

      const elapsed = timestamp - decayStartTime;
      const hasVisibleIntensity = intensityRef.current.some((intensity) => intensity > WAVEFORM_DECAY_REST_INTENSITY);

      if (elapsed < WAVEFORM_DECAY_DURATION_MS && hasVisibleIntensity) {
        animationRef.current = requestAnimationFrame(decay);
        return;
      }

      animationRef.current = null;
      drawRestingWaveform();
    }

    animationRef.current = requestAnimationFrame(decay);
  }

  function paint() {
    const graph = graphRef.current;

    if (!graph) {
      stopPainting();
      return;
    }

    if (frequencyDataRef.current?.length !== graph.analyser.frequencyBinCount) {
      frequencyDataRef.current = new Uint8Array(graph.analyser.frequencyBinCount);
    }

    const data = frequencyDataRef.current;
    graph.analyser.getByteFrequencyData(data);

    if (!drawWaveformFrame(data)) {
      stopPainting();
      return;
    }

    animationRef.current = requestAnimationFrame(paint);
  }

  async function getAudioGraph() {
    const audio = audioRef.current;
    if (!audio) return null;

    if (graphRef.current) return graphRef.current;

    const context = new AudioContext();
    const source = context.createMediaElementSource(audio);
    const analyser = context.createAnalyser();
    const gain = context.createGain();

    // Sets analyser resolution for a compact header waveform.
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.35;
    gain.gain.value = volume;
    source.connect(analyser);
    analyser.connect(gain);
    gain.connect(context.destination);

    graphRef.current = { analyser, context, gain, source };
    return graphRef.current;
  }

  function startPainting() {
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);

    readWaveformColors();
    animationRef.current = requestAnimationFrame(paint);
  }

  return {
    getAudioGraph,
    startPainting,
    stopPainting,
  };
}
