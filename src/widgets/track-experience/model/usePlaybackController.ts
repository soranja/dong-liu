import { useEffect, useState, type RefObject } from 'react';
import { installPlaybackScrollSeek } from '@shared/lib/playbackScrollSeek';
import { useAudioScrollSync } from './useAudioScrollSync';
import { useDelayedPlaybackResume } from './useDelayedPlaybackResume';
import { usePlaybackKeyboard } from './usePlaybackKeyboard';
import { usePlaybackProgress } from './usePlaybackProgress';
import { useReplayCountdown } from './useReplayCountdown';
import { useSyncedRef } from './useSyncedRef';
import { useWaveformAudio } from './useWaveformAudio';

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
const POINTER_SEEK_RESUME_DELAY_MS = 500;

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
  const [duration, setDuration] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [replayPromptVisible, setReplayPromptVisible] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const {
    currentTime,
    progress,
    setCurrentTime,
    setProgress,
    start: startPlaybackFrameLoop,
    stop: stopPlaybackFrameLoop,
    sync: syncPlaybackStateFromAudio,
  } = usePlaybackProgress(audioRef);
  const hasStartedRef = useSyncedRef(hasStarted);
  const isReadyRef = useSyncedRef(isReady);
  const replayPromptVisibleRef = useSyncedRef(replayPromptVisible);
  const replaySequence = useReplayCountdown(replayPromptVisible);
  const { getAudioGraph, prepareScratchAudio, scratch, startPainting, stopPainting } = useWaveformAudio({
    audioRef,
    canvasRef,
    volume,
  });
  const audioScrollSync = useAudioScrollSync({
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
  const seekResume = useDelayedPlaybackResume(resumeSeekPlayback);
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

  async function resumeSeekPlayback(resumeSequence: number) {
    const audio = audioRef.current;
    const hasEnded =
      audio?.ended ||
      Boolean(audio?.duration && Number.isFinite(audio.duration) && audio.currentTime >= audio.duration);
    if (!audio || replayPromptVisibleRef.current || hasEnded) {
      seekResume.finish(resumeSequence);
      return;
    }

    const graph = await getAudioGraph();
    if (!seekResume.isCurrent(resumeSequence)) return;
    if (!graph) {
      seekResume.finish(resumeSequence);
      return;
    }

    try {
      await graph.context.resume();
      void prepareScratchAudio();
      await audio.play();
      if (!seekResume.isCurrent(resumeSequence)) {
        audio.pause();
        return;
      }

      seekResume.finish(resumeSequence);
      setIsPlaying(true);
      startPlaybackFrameLoop();
      audioScrollSync.startAudioSync();
      startPainting();
    } catch {
      if (!seekResume.isCurrent(resumeSequence)) return;

      seekResume.finish(resumeSequence);
      setIsPlaying(false);
      stopPlaybackFrameLoop();
      stopPainting();
      audioScrollSync.stopAudioSync();
      audioScrollSync.syncToAudio({ animatePage: true });
    }
  }

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || !isReadyRef.current) return;

    if (seekResume.isActive()) {
      seekResume.clear();
      stopPlaybackFrameLoop();
      stopPainting();
      audioScrollSync.stopAudioSync();
      audioScrollSync.syncToAudio({ animatePage: true });
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
      void prepareScratchAudio();
      await audio.play();
      setIsPlaying(true);
      startPlaybackFrameLoop();
      audioScrollSync.startAudioSync();
      startPainting();
      return;
    }

    seekResume.clear();
    audio.pause();
    stopPlaybackFrameLoop();
    syncPlaybackStateFromAudio();
    stopPainting();
    audioScrollSync.stopAudioSync();
    audioScrollSync.syncToAudio({ animatePage: true });
    setIsPlaying(false);
  }

  async function replayFromStart(autoplay: boolean) {
    const audio = audioRef.current;
    if (!audio || !isReadyRef.current) return;

    seekResume.clear();
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
      audioScrollSync.stopAudioSync();
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
    void prepareScratchAudio();
    await audio.play();
    setIsPlaying(true);
    startPlaybackFrameLoop();
    audioScrollSync.startAudioSync();
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
    audioScrollSync.syncToAudio({
      animatePage: options.animatePage ?? audio.paused,
      continuePlaybackScroll: options.continuePlaybackScroll ?? !audio.paused,
    });
  }

  function seekBySeconds(seconds: number, resumeDelayMs = KEYBOARD_SEEK_RESUME_DELAY_MS) {
    const audio = audioRef.current;
    if (!audio || !audio.duration || !Number.isFinite(audio.duration) || !isReadyRef.current) return;

    const shouldResumePlayback = interruptPlaybackForSeek();
    const previousTime = audio.currentTime;
    const nextTime = Math.min(audio.duration, Math.max(0, audio.currentTime + seconds));
    seek((nextTime / audio.duration) * 100, {
      animatePage: false,
      continuePlaybackScroll: false,
    });
    void scratch(previousTime, nextTime);

    if (nextTime >= audio.duration) {
      handleEnded();
      return;
    }

    if (shouldResumePlayback) seekResume.schedule(resumeDelayMs);
  }

  function scrub(value: number) {
    const audio = audioRef.current;
    if (!audio || !audio.duration || !Number.isFinite(audio.duration) || !isReadyRef.current) return;

    const shouldResumePlayback = interruptPlaybackForSeek();
    const previousTime = audio.currentTime;
    const nextTime = (value / 100) * audio.duration;
    seek(value, {
      animatePage: false,
      continuePlaybackScroll: false,
    });
    void scratch(previousTime, nextTime);

    if (value >= 100) {
      handleEnded();
      return;
    }

    if (shouldResumePlayback) seekResume.schedule(POINTER_SEEK_RESUME_DELAY_MS);
  }

  function interruptPlaybackForSeek() {
    const audio = audioRef.current;
    if (!audio) return false;

    const shouldResumePlayback = !audio.paused || seekResume.isActive();
    if (!shouldResumePlayback) return false;

    seekResume.clear();
    audio.pause();
    stopPlaybackFrameLoop();
    stopPainting();
    audioScrollSync.stopAudioSync();
    setIsPlaying(false);
    return true;
  }

  function interruptManualScroll() {
    if (interruptPlaybackForSeek()) seekResume.schedule(POINTER_SEEK_RESUME_DELAY_MS);
  }

  function handleEnded() {
    const audio = audioRef.current;

    seekResume.clear();
    stopPlaybackFrameLoop();
    stopPainting();
    audioScrollSync.stopAudioSync();
    setIsPlaying(false);
    setCurrentTime(audio?.duration || audio?.currentTime || 0);
    setReplayPromptVisible(true);
    audioScrollSync.syncToAudio({ animatePage: true });
  }

  function handleTimeUpdate() {
    syncPlaybackStateFromAudio();
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
