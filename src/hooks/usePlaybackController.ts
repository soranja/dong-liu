import { useEffect, useRef, useState, type RefObject } from "react";
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

type SeekOptions = {
  animatePage?: boolean;
  continuePlaybackScroll?: boolean;
};

const PLAYBACK_END_EPSILON_SECONDS = 0.2;
const KEYBOARD_SEEK_RESUME_DELAY_MS = 80;
const PLAYBACK_UI_UPDATE_INTERVAL_MS = 100;

function isAtPlaybackEnd(audio: HTMLAudioElement) {
  return (
    audio.ended ||
    Boolean(
      audio.duration &&
      Number.isFinite(audio.duration) &&
      audio.currentTime >= audio.duration - PLAYBACK_END_EPSILON_SECONDS,
    )
  );
}

export function usePlaybackController({ audioRef, canvasRef, playbackRef, timelineRef }: PlaybackControllerOptions) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [replayPromptVisible, setReplayPromptVisible] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const keyboardSeekResumeActiveRef = useRef(false);
  const keyboardSeekResumeSequenceRef = useRef(0);
  const keyboardSeekResumeTimeoutRef = useRef<number | null>(null);
  const playbackFrameRef = useRef<number | null>(null);
  const playbackUiUpdateTimeRef = useRef(0);
  const hasStartedRef = useSyncedRef(hasStarted);
  const isPlayingRef = useSyncedRef(isPlaying);
  const replayPromptVisibleRef = useSyncedRef(replayPromptVisible);
  const replaySequence = useReplayCountdown(replayPromptVisible);
  const { getAudioGraph, startPainting, stopPainting } = useWaveformAudio({ audioRef, canvasRef, volume });
  const audioTimeline = useAudioGsapTimeline({
    audioRef,
    isEnabled: () => hasStartedRef.current && !replayPromptVisibleRef.current,
    onSeek: (nextProgress) => {
      setProgress(nextProgress);
      setCurrentTime(audioRef.current?.currentTime ?? 0);
    },
    timelineRef,
  });

  usePlaybackKeyboard({
    onSeekStep: (step) => seekBySeconds(step),
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
      onSeek: (nextProgress) => {
        setProgress(nextProgress);
        setCurrentTime(audio.currentTime);
      },
      target: playback,
    });
  }, [audioRef, isPlayingRef, playbackRef]);

  useEffect(
    () => () => {
      clearKeyboardSeekResume();
      stopPlaybackFrameLoop();
    },
    [],
  );

  function syncPlaybackStateFromAudio() {
    const audio = audioRef.current;
    if (!audio) return;

    setCurrentTime(audio.currentTime);
    if (audio.duration && Number.isFinite(audio.duration)) setProgress((audio.currentTime / audio.duration) * 100);
  }

  function schedulePlaybackFrame() {
    if (playbackFrameRef.current !== null) return;

    playbackFrameRef.current = window.requestAnimationFrame(updatePlaybackFrame);
  }

  function updatePlaybackFrame(timestamp: number) {
    playbackFrameRef.current = null;

    if (timestamp - playbackUiUpdateTimeRef.current >= PLAYBACK_UI_UPDATE_INTERVAL_MS) {
      playbackUiUpdateTimeRef.current = timestamp;
      syncPlaybackStateFromAudio();
    }

    if (!audioRef.current?.paused) schedulePlaybackFrame();
  }

  function startPlaybackFrameLoop() {
    syncPlaybackStateFromAudio();
    playbackUiUpdateTimeRef.current = performance.now();
    schedulePlaybackFrame();
  }

  function stopPlaybackFrameLoop() {
    playbackUiUpdateTimeRef.current = 0;
    if (playbackFrameRef.current === null) return;

    window.cancelAnimationFrame(playbackFrameRef.current);
    playbackFrameRef.current = null;
  }

  function clearKeyboardSeekResume() {
    keyboardSeekResumeSequenceRef.current += 1;
    keyboardSeekResumeActiveRef.current = false;

    if (keyboardSeekResumeTimeoutRef.current === null) return;

    window.clearTimeout(keyboardSeekResumeTimeoutRef.current);
    keyboardSeekResumeTimeoutRef.current = null;
  }

  function scheduleKeyboardSeekResume() {
    clearKeyboardSeekResume();
    const resumeSequence = keyboardSeekResumeSequenceRef.current + 1;
    keyboardSeekResumeSequenceRef.current = resumeSequence;
    keyboardSeekResumeActiveRef.current = true;

    keyboardSeekResumeTimeoutRef.current = window.setTimeout(() => {
      keyboardSeekResumeTimeoutRef.current = null;
      void resumeKeyboardSeekPlayback(resumeSequence);
    }, KEYBOARD_SEEK_RESUME_DELAY_MS);
  }

  async function resumeKeyboardSeekPlayback(resumeSequence: number) {
    const audio = audioRef.current;
    if (!audio || replayPromptVisibleRef.current || isAtPlaybackEnd(audio)) {
      if (resumeSequence === keyboardSeekResumeSequenceRef.current) keyboardSeekResumeActiveRef.current = false;
      return;
    }

    const graph = await getAudioGraph();
    if (resumeSequence !== keyboardSeekResumeSequenceRef.current) return;
    if (!graph) {
      keyboardSeekResumeActiveRef.current = false;
      return;
    }

    try {
      await graph.context.resume();
      await audio.play();
      if (resumeSequence !== keyboardSeekResumeSequenceRef.current) {
        audio.pause();
        return;
      }

      keyboardSeekResumeActiveRef.current = false;
      setIsPlaying(true);
      startPlaybackFrameLoop();
      audioTimeline.startAudioSync();
      startPainting();
    } catch {
      if (resumeSequence !== keyboardSeekResumeSequenceRef.current) return;

      keyboardSeekResumeActiveRef.current = false;
      setIsPlaying(false);
      stopPlaybackFrameLoop();
      stopPainting();
      audioTimeline.stopAudioSync();
      audioTimeline.syncToAudio({ animatePage: true });
    }
  }

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;

    if (keyboardSeekResumeActiveRef.current) {
      clearKeyboardSeekResume();
      stopPlaybackFrameLoop();
      stopPainting();
      audioTimeline.stopAudioSync();
      audioTimeline.syncToAudio({ animatePage: true });
      setIsPlaying(false);
      return;
    }

    if (audio.paused) {
      if (replayPromptVisibleRef.current || isAtPlaybackEnd(audio)) {
        await replayFromStart(true);
        return;
      }

      const graph = await getAudioGraph();
      if (!graph) return;

      if (!hasStarted) {
        audio.currentTime = 0;
        setCurrentTime(0);
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
      startPlaybackFrameLoop();
      audioTimeline.startAudioSync();
      startPainting();
      return;
    }

    clearKeyboardSeekResume();
    audio.pause();
    stopPlaybackFrameLoop();
    syncPlaybackStateFromAudio();
    stopPainting();
    audioTimeline.stopAudioSync();
    audioTimeline.syncToAudio({ animatePage: true });
    setIsPlaying(false);
  }

  async function replayFromStart(autoplay: boolean) {
    const audio = audioRef.current;
    if (!audio) return;

    clearKeyboardSeekResume();
    audio.currentTime = 0;
    setCurrentTime(0);
    setProgress(0);
    replayPromptVisibleRef.current = false;
    setReplayPromptVisible(false);
    window.scrollTo({ top: 0 });

    if (!autoplay) {
      audio.pause();
      stopPlaybackFrameLoop();
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
    startPlaybackFrameLoop();
    audioTimeline.startAudioSync();
    startPainting();
  }

  function seek(value: number, options: SeekOptions = {}) {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;

    hasStartedRef.current = true;
    replayPromptVisibleRef.current = false;
    setHasStarted(true);
    setReplayPromptVisible(false);

    const nextTime = (value / 100) * audio.duration;
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
    setProgress(value);
    audioTimeline.syncToAudio({
      animatePage: options.animatePage ?? audio.paused,
      continuePlaybackScroll: options.continuePlaybackScroll ?? !audio.paused,
    });
  }

  function seekBySeconds(seconds: number) {
    const audio = audioRef.current;
    if (!audio || !audio.duration || !Number.isFinite(audio.duration)) return;

    const shouldResumePlayback = !audio.paused || keyboardSeekResumeActiveRef.current;
    if (shouldResumePlayback) {
      clearKeyboardSeekResume();
      audio.pause();
      stopPlaybackFrameLoop();
      audioTimeline.stopAudioSync();
    }

    const nextTime = Math.min(audio.duration, Math.max(0, audio.currentTime + seconds));
    seek((nextTime / audio.duration) * 100, {
      animatePage: false,
      continuePlaybackScroll: false,
    });

    if (shouldResumePlayback) scheduleKeyboardSeekResume();
  }

  function handleEnded() {
    const audio = audioRef.current;

    clearKeyboardSeekResume();
    stopPlaybackFrameLoop();
    stopPainting();
    audioTimeline.stopAudioSync();
    setIsPlaying(false);
    setCurrentTime(audio?.duration || audio?.currentTime || 0);
    setReplayPromptVisible(true);
    audioTimeline.syncToAudio({ animatePage: true });
  }

  function handleTimeUpdate() {
    syncPlaybackStateFromAudio();
    audioTimeline.syncVisualsToAudio();
  }

  return {
    currentTime,
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
