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

export function useWaveformAudio({ audioRef, canvasRef, volume }: WaveformAudioOptions) {
  const animationRef = useRef<number | null>(null);
  const frequencyDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const graphRef = useRef<AudioGraph | null>(null);
  const intensityRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef(0);

  useEffect(() => {
    const audio = audioRef.current;
    const graph = graphRef.current;

    if (audio) audio.volume = 1;
    if (graph) graph.gain.gain.value = volume;
  }, [audioRef, volume]);

  useEffect(() => {
    return () => {
      stopPainting();
      void graphRef.current?.context.close();
    };
  }, []);

  function stopPainting() {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    lastFrameTimeRef.current = 0;
  }

  function paint(timestamp: number) {
    // Caps canvas drawing to the display frame rate target.
    const FRAME_INTERVAL = 1000 / 60;
    const canvas = canvasRef.current;
    const graph = graphRef.current;
    const canvasContext = canvas?.getContext("2d");

    if (!canvas || !graph || !canvasContext) {
      stopPainting();
      return;
    }

    const elapsed = timestamp - lastFrameTimeRef.current;
    if (lastFrameTimeRef.current && elapsed < FRAME_INTERVAL) {
      animationRef.current = requestAnimationFrame(paint);
      return;
    }

    lastFrameTimeRef.current = timestamp - (elapsed % FRAME_INTERVAL);

    if (frequencyDataRef.current?.length !== graph.analyser.frequencyBinCount) {
      frequencyDataRef.current = new Uint8Array(graph.analyser.frequencyBinCount);
    }

    const data = frequencyDataRef.current;
    graph.analyser.getByteFrequencyData(data);

    // Shapes the waveform bars to match the dock's visual language.
    drawWaveform({
      backgroundColor: getCssVariable("--color-bg"),
      barWidth: 7,
      canvas,
      color: getCssVariable("--color-accent"),
      context: canvasContext,
      frequencyData: data,
      intensities: intensityRef.current,
      position: "center",
      smoothness: 62,
    });

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

    // Sets analyser resolution for a compact dock waveform.
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.88;
    gain.gain.value = volume;
    source.connect(analyser);
    analyser.connect(gain);
    gain.connect(context.destination);

    graphRef.current = { analyser, context, gain, source };
    return graphRef.current;
  }

  function startPainting() {
    if (!animationRef.current) animationRef.current = requestAnimationFrame(paint);
  }

  return {
    getAudioGraph,
    startPainting,
    stopPainting,
  };
}
