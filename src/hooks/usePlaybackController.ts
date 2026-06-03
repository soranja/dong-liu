import { useEffect, useState, type RefObject } from "react";
import { installPlaybackScrollSeek } from "../utils/playbackScrollSeek";
import { useAudioGsapTimeline } from "./useAudioGsapTimeline";
import { usePlaybackKeyboard } from "./usePlaybackKeyboard";
import { useReplayCountdown } from "./useReplayCountdown";
import { useSyncedRef } from "./useSyncedRef";
import { useWaveformAudio } from "./useWaveformAudio";

type PlaybackControllerOptions = {
  audioRef: RefObject<HTMLAudioElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  playbackRef: RefObject<HTMLElement | null>;
  timelineRef: RefObject<HTMLElement | null>;
};

export function usePlaybackController({ audioRef, canvasRef, playbackRef, timelineRef }: PlaybackControllerOptions) {
  const [duration, setDuration] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [replayPromptVisible, setReplayPromptVisible] = useState(false);
  const [volume, setVolume] = useState(0.82);
  const hasStartedRef = useSyncedRef(hasStarted);
  const isPlayingRef = useSyncedRef(isPlaying);
  const replayPromptVisibleRef = useSyncedRef(replayPromptVisible);
  const replaySequence = useReplayCountdown(replayPromptVisible);
  const { getAudioGraph, startPainting, stopPainting } = useWaveformAudio({ audioRef, canvasRef, volume });
  const audioTimeline = useAudioGsapTimeline({
    audioRef,
    isEnabled: () => hasStartedRef.current && !replayPromptVisibleRef.current,
    onSeek: setProgress,
    timelineRef,
  });

  usePlaybackKeyboard({
    onTogglePlayback: () => void togglePlayback(),
    onVolumeStep: (step) => {
      setVolume((current) => Math.min(1, Math.max(0, current + step)));
    },
  });

  useEffect(() => {
    const audio = audioRef.current;
    const playback = playbackRef.current;
    if (!audio || !playback) return;

    return installPlaybackScrollSeek({
      audio,
      isEnabled: () => isPlayingRef.current,
      onSeek: setProgress,
      target: playback,
    });
  }, [audioRef, isPlayingRef, playbackRef]);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;

    const graph = await getAudioGraph();
    if (!graph) return;

    if (audio.paused) {
      if (!hasStarted) {
        audio.currentTime = 0;
        setProgress(0);
        window.scrollTo({ top: 0 });
      }

      hasStartedRef.current = true;
      replayPromptVisibleRef.current = false;
      setHasStarted(true);
      setReplayPromptVisible(false);
      await graph.context.resume();
      await audio.play();
      setIsPlaying(true);
      audioTimeline.startAudioSync();
      startPainting();
      return;
    }

    audio.pause();
    stopPainting();
    audioTimeline.stopAudioSync();
    audioTimeline.syncToAudio({ animatePage: true });
    setIsPlaying(false);
  }

  async function replayFromStart(autoplay: boolean) {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = 0;
    setProgress(0);
    replayPromptVisibleRef.current = false;
    setReplayPromptVisible(false);
    window.scrollTo({ top: 0 });

    if (!autoplay) {
      audio.pause();
      stopPainting();
      audioTimeline.stopAudioSync();
      hasStartedRef.current = false;
      setHasStarted(false);
      setIsPlaying(false);
      return;
    }

    const graph = await getAudioGraph();
    if (!graph) return;

    hasStartedRef.current = true;
    setHasStarted(true);
    await graph.context.resume();
    await audio.play();
    setIsPlaying(true);
    audioTimeline.startAudioSync();
    startPainting();
  }

  function seek(value: number) {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;

    audio.currentTime = (value / 100) * audio.duration;
    setProgress(value);
    audioTimeline.syncToAudio({ animatePage: audio.paused, continuePlaybackScroll: !audio.paused });
  }

  function handleEnded() {
    stopPainting();
    audioTimeline.stopAudioSync();
    setIsPlaying(false);
    setReplayPromptVisible(true);
    audioTimeline.syncToAudio({ animatePage: true });
  }

  function handleTimeUpdate() {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;

    setProgress((audio.currentTime / audio.duration) * 100);
    audioTimeline.syncVisualsToAudio();
  }

  return {
    duration,
    hasStarted,
    isPlaying,
    progress,
    replayPromptVisible,
    replaySequence,
    volume,
    handleEnded,
    handleTimeUpdate,
    replayFromStart,
    seek,
    setDuration,
    setVolume,
    togglePlayback,
  };
}
