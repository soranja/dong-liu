import { useEffect, useRef, useState, type RefObject } from "react";
import { installPlaybackScrollSeek } from "../../../utils/playbackScrollSeek";
import { useAudioGsapTimeline } from "./useAudioGsapTimeline";
import { usePlaybackKeyboard } from "./usePlaybackKeyboard";
import { useReplayCountdown } from "./useReplayCountdown";
import { useSyncedRef } from "./useSyncedRef";
import { useWaveformAudio } from "./useWaveformAudio";

type PlaybackControllerOptions = {
  audioRef: RefObject<HTMLAudioElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  isReady: boolean;
  playbackRef: RefObject<HTMLElement | null>;
  timelineRef: RefObject<HTMLElement | null>;
};

type SeekOptions = {
  animatePage?: boolean;
  continuePlaybackScroll?: boolean;
};

const PLAYBACK_END_EPSILON_SECONDS = 0.2;
const KEYBOARD_SEEK_RESUME_DELAY_MS = 80;
const POINTER_SEEK_RESUME_DELAY_MS = 300;
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

export function usePlaybackController({
  audioRef,
  canvasRef,
  isReady,
  playbackRef,
  timelineRef,
}: PlaybackControllerOptions) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [replayPromptVisible, setReplayPromptVisible] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const seekResumeActiveRef = useRef(false);
  const seekResumeSequenceRef = useRef(0);
  const seekResumeTimeoutRef = useRef<number | null>(null);
  const playbackFrameRef = useRef<number | null>(null);
  const playbackUiUpdateTimeRef = useRef(0);
  const hasStartedRef = useSyncedRef(hasStarted);
  const isReadyRef = useSyncedRef(isReady);
  const replayPromptVisibleRef = useSyncedRef(replayPromptVisible);
  const replaySequence = useReplayCountdown(replayPromptVisible);
  const { getAudioGraph, startPainting, stopPainting } = useWaveformAudio({ audioRef, canvasRef, volume });
  const audioTimeline = useAudioGsapTimeline({
    audioRef,
    isEnabled: () => isReadyRef.current && hasStartedRef.current && !replayPromptVisibleRef.current,
    isTimelineReady: isReady,
    onManualScroll: interruptManualScroll,
    onSeek: (nextProgress) => {
      setProgress(nextProgress);
      setCurrentTime(audioRef.current?.currentTime ?? 0);
    },
    timelineRef,
  });
  const seekBySecondsRef = useSyncedRef(seekBySeconds);

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
      isEnabled: () => isReadyRef.current && hasStartedRef.current,
      onSeekStep: (step) => seekBySecondsRef.current(step, POINTER_SEEK_RESUME_DELAY_MS),
      target: playback,
      wheelTarget: window,
    });
  }, [audioRef, hasStartedRef, isReadyRef, playbackRef, seekBySecondsRef]);

  useEffect(
    () => () => {
      clearSeekResume();
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

  function clearSeekResume() {
    seekResumeSequenceRef.current += 1;
    seekResumeActiveRef.current = false;

    if (seekResumeTimeoutRef.current === null) return;

    window.clearTimeout(seekResumeTimeoutRef.current);
    seekResumeTimeoutRef.current = null;
  }

  function scheduleSeekResume(delayMs: number) {
    clearSeekResume();
    const resumeSequence = seekResumeSequenceRef.current + 1;
    seekResumeSequenceRef.current = resumeSequence;
    seekResumeActiveRef.current = true;

    seekResumeTimeoutRef.current = window.setTimeout(() => {
      seekResumeTimeoutRef.current = null;
      void resumeSeekPlayback(resumeSequence);
    }, delayMs);
  }

  async function resumeSeekPlayback(resumeSequence: number) {
    const audio = audioRef.current;
    const hasEnded =
      audio?.ended ||
      Boolean(audio?.duration && Number.isFinite(audio.duration) && audio.currentTime >= audio.duration);
    if (!audio || replayPromptVisibleRef.current || hasEnded) {
      if (resumeSequence === seekResumeSequenceRef.current) seekResumeActiveRef.current = false;
      return;
    }

    const graph = await getAudioGraph();
    if (resumeSequence !== seekResumeSequenceRef.current) return;
    if (!graph) {
      seekResumeActiveRef.current = false;
      return;
    }

    try {
      await graph.context.resume();
      await audio.play();
      if (resumeSequence !== seekResumeSequenceRef.current) {
        audio.pause();
        return;
      }

      seekResumeActiveRef.current = false;
      setIsPlaying(true);
      startPlaybackFrameLoop();
      audioTimeline.startAudioSync();
      startPainting();
    } catch {
      if (resumeSequence !== seekResumeSequenceRef.current) return;

      seekResumeActiveRef.current = false;
      setIsPlaying(false);
      stopPlaybackFrameLoop();
      stopPainting();
      audioTimeline.stopAudioSync();
      audioTimeline.syncToAudio({ animatePage: true });
    }
  }

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || !isReadyRef.current) return;

    if (seekResumeActiveRef.current) {
      clearSeekResume();
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

    clearSeekResume();
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
    if (!audio || !isReadyRef.current) return;

    clearSeekResume();
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
    if (!audio || !audio.duration || !isReadyRef.current) return;

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

  function seekBySeconds(seconds: number, resumeDelayMs = KEYBOARD_SEEK_RESUME_DELAY_MS) {
    const audio = audioRef.current;
    if (!audio || !audio.duration || !Number.isFinite(audio.duration) || !isReadyRef.current) return;

    const shouldResumePlayback = interruptPlaybackForSeek();

    const nextTime = Math.min(audio.duration, Math.max(0, audio.currentTime + seconds));
    seek((nextTime / audio.duration) * 100, {
      animatePage: false,
      continuePlaybackScroll: false,
    });

    if (nextTime >= audio.duration) {
      handleEnded();
      return;
    }

    if (shouldResumePlayback) scheduleSeekResume(resumeDelayMs);
  }

  function scrub(value: number) {
    const audio = audioRef.current;
    if (!audio || !audio.duration || !Number.isFinite(audio.duration) || !isReadyRef.current) return;

    const shouldResumePlayback = interruptPlaybackForSeek();

    seek(value, {
      animatePage: false,
      continuePlaybackScroll: false,
    });

    if (value >= 100) {
      handleEnded();
      return;
    }

    if (shouldResumePlayback) scheduleSeekResume(POINTER_SEEK_RESUME_DELAY_MS);
  }

  function interruptPlaybackForSeek() {
    const audio = audioRef.current;
    if (!audio) return false;

    const shouldResumePlayback = !audio.paused || seekResumeActiveRef.current;
    if (!shouldResumePlayback) return false;

    clearSeekResume();
    audio.pause();
    stopPlaybackFrameLoop();
    stopPainting();
    audioTimeline.stopAudioSync();
    setIsPlaying(false);
    return true;
  }

  function interruptManualScroll() {
    if (interruptPlaybackForSeek()) scheduleSeekResume(POINTER_SEEK_RESUME_DELAY_MS);
  }

  function handleEnded() {
    const audio = audioRef.current;

    clearSeekResume();
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
    scrub,
    seek,
    setDuration,
    setVolume,
    togglePlayback,
  };
}
