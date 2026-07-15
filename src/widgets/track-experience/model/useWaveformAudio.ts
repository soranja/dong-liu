import { useEffect, useRef, type RefObject } from 'react';
import { getCssVariable } from '@shared/lib/cssVariables';
import { drawWaveform } from '@shared/lib/waveform';

type AudioGraph = {
  analyser: AnalyserNode;
  context: AudioContext;
  gain: GainNode;
  source: MediaElementAudioSourceNode;
};

type ScratchVoice = {
  gain: GainNode;
  source: AudioBufferSourceNode;
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
const SCRATCH_CROSSFADE_SECONDS = 0.045;
const SCRATCH_FADE_IN_SECONDS = 0.3;
const SCRATCH_FADE_OUT_SECONDS = 0.8;
const SCRATCH_SOUND_SECONDS = 0.5;
const SCRATCH_LEVEL = 1;

export function useWaveformAudio({ audioRef, canvasRef, volume }: WaveformAudioOptions) {
  const animationRef = useRef<number | null>(null);
  const canvasContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawRestingWaveformRef = useRef<() => void>(() => {});
  const frequencyDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const graphRef = useRef<AudioGraph | null>(null);
  const decodedAudioRef = useRef<AudioBuffer | null>(null);
  const decodePromiseRef = useRef<Promise<AudioBuffer | null> | null>(null);
  const scratchSequenceRef = useRef(0);
  const scratchVoiceRef = useRef<ScratchVoice | null>(null);
  const intensityRef = useRef<number[]>([]);
  const waveformColorsRef = useRef({ backgroundColor: '', color: '' });

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
      stopScratchVoice();
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

    window.addEventListener('resize', scheduleRestingWaveform);

    return () => {
      if (restingFrame !== null) cancelAnimationFrame(restingFrame);
      resizeObserver.disconnect();
      window.removeEventListener('resize', scheduleRestingWaveform);
    };
  }, [canvasRef]);

  function stopPainting() {
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    startRestingWaveformDecay();
  }

  function readWaveformColors() {
    waveformColorsRef.current = {
      backgroundColor: getCssVariable('--color-panel'),
      color: getCssVariable('--color-accent'),
    };
  }

  function getCanvasContext() {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    if (canvasContextRef.current?.canvas !== canvas) {
      canvasContextRef.current = canvas.getContext('2d');
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
      position: 'center',
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

  function stopScratchVoice() {
    const voice = scratchVoiceRef.current;
    if (!voice) return;

    try {
      voice.source.stop();
    } catch {
      // The source may already have naturally finished.
    }
    voice.source.disconnect();
    voice.gain.disconnect();
    scratchVoiceRef.current = null;
  }

  function crossfadeScratchVoice(now: number) {
    const voice = scratchVoiceRef.current;
    if (!voice) return;

    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + SCRATCH_CROSSFADE_SECONDS);
    voice.source.stop(now + SCRATCH_CROSSFADE_SECONDS);
    scratchVoiceRef.current = null;
  }

  async function prepareScratchAudio() {
    if (decodedAudioRef.current) return decodedAudioRef.current;
    if (decodePromiseRef.current) return decodePromiseRef.current;

    decodePromiseRef.current = (async () => {
      const audio = audioRef.current;
      const graph = await getAudioGraph();
      const sourceUrl = audio?.currentSrc || audio?.src;
      if (!graph || !sourceUrl) return null;

      try {
        const response = await fetch(sourceUrl);
        if (!response.ok) return null;
        const decoded = await graph.context.decodeAudioData(await response.arrayBuffer());
        decodedAudioRef.current = decoded;
        return decoded;
      } catch {
        return null;
      }
    })();

    return decodePromiseRef.current;
  }

  async function scratch(fromTime: number, toTime: number) {
    const sequence = ++scratchSequenceRef.current;
    const graph = await getAudioGraph();
    if (!graph) return;
    await graph.context.resume();

    const decoded = await prepareScratchAudio();
    if (!decoded || sequence !== scratchSequenceRef.current) return;

    const direction = Math.sign(toTime - fromTime);
    if (!direction) return;

    const playbackRate = Math.min(2.2, Math.max(0.7, 0.65 + Math.sqrt(Math.abs(toTime - fromTime)) * 0.65));
    const duration = Math.min(SCRATCH_SOUND_SECONDS * playbackRate, decoded.duration);
    const startTime = Math.min(decoded.duration - duration, Math.max(0, direction > 0 ? fromTime : toTime));
    const frameCount = Math.max(1, Math.floor(duration * decoded.sampleRate));
    const grain = graph.context.createBuffer(decoded.numberOfChannels, frameCount, decoded.sampleRate);
    const sourceFrame = Math.floor(startTime * decoded.sampleRate);

    for (let channel = 0; channel < decoded.numberOfChannels; channel += 1) {
      const sourceData = decoded.getChannelData(channel);
      const grainData = grain.getChannelData(channel);
      for (let frame = 0; frame < frameCount; frame += 1) {
        const directedFrame = direction > 0 ? frame : frameCount - frame - 1;
        grainData[frame] = sourceData[Math.min(sourceData.length - 1, sourceFrame + directedFrame)] ?? 0;
      }
    }

    const source = graph.context.createBufferSource();
    const scratchGain = graph.context.createGain();
    const now = graph.context.currentTime;
    const audibleDuration = duration / playbackRate;
    crossfadeScratchVoice(now);
    source.buffer = grain;
    source.playbackRate.value = playbackRate;
    scratchGain.gain.setValueAtTime(0.0001, now);
    scratchGain.gain.exponentialRampToValueAtTime(SCRATCH_LEVEL, now + SCRATCH_FADE_IN_SECONDS);
    scratchGain.gain.setValueAtTime(SCRATCH_LEVEL, now + audibleDuration - SCRATCH_FADE_OUT_SECONDS);
    scratchGain.gain.exponentialRampToValueAtTime(0.0001, now + audibleDuration);
    source.connect(scratchGain);
    scratchGain.connect(graph.gain);
    scratchVoiceRef.current = { gain: scratchGain, source };
    source.onended = () => {
      source.disconnect();
      scratchGain.disconnect();
      if (scratchVoiceRef.current?.source === source) scratchVoiceRef.current = null;
    };
    source.start(now);
  }

  function startPainting() {
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);

    readWaveformColors();
    animationRef.current = requestAnimationFrame(paint);
  }

  return {
    getAudioGraph,
    prepareScratchAudio,
    scratch,
    startPainting,
    stopPainting,
  };
}
