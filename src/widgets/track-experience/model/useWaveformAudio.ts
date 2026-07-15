import { useEffect, useRef, type RefObject } from 'react';
import { useWaveformPainter } from './useWaveformPainter';

type AudioGraph = {
  analyser: AnalyserNode;
  context: AudioContext;
  gain: GainNode;
  source: MediaElementAudioSourceNode;
};

type ScratchVoice = { gain: GainNode; source: AudioBufferSourceNode };

type WaveformAudioOptions = {
  audioRef: RefObject<HTMLAudioElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  volume: number;
};

const SCRATCH_CROSSFADE_SECONDS = 0.045;
const SCRATCH_FADE_IN_SECONDS = 0.3;
const SCRATCH_FADE_OUT_SECONDS = 0.8;
const SCRATCH_SOUND_SECONDS = 0.5;
const SCRATCH_LEVEL = 1;

export function useWaveformAudio({ audioRef, canvasRef, volume }: WaveformAudioOptions) {
  const graphRef = useRef<AudioGraph | null>(null);
  const decodedAudioRef = useRef<AudioBuffer | null>(null);
  const decodePromiseRef = useRef<Promise<AudioBuffer | null> | null>(null);
  const scratchSequenceRef = useRef(0);
  const scratchVoiceRef = useRef<ScratchVoice | null>(null);
  const { startPainting, stopPainting } = useWaveformPainter({
    canvasRef,
    getAnalyser: () => graphRef.current?.analyser ?? null,
  });

  useEffect(() => {
    const audio = audioRef.current;
    const graph = graphRef.current;
    if (audio) audio.volume = 1;
    if (graph) graph.gain.gain.value = volume;
  }, [audioRef, volume]);

  useEffect(
    () => () => {
      stopScratchVoice();
      void graphRef.current?.context.close();
    },
    [],
  );

  async function getAudioGraph() {
    const audio = audioRef.current;
    if (!audio) return null;
    if (graphRef.current) return graphRef.current;

    const context = new AudioContext();
    const source = context.createMediaElementSource(audio);
    const analyser = context.createAnalyser();
    const gain = context.createGain();
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

  return { getAudioGraph, prepareScratchAudio, scratch, startPainting, stopPainting };
}
