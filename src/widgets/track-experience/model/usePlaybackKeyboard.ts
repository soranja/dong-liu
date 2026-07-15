import { useEffect } from "react";
import { useSyncedRef } from "./useSyncedRef";

type PlaybackKeyboardOptions = {
  onSeekStep: (step: number) => void;
  onTogglePlayback: () => void;
  onVolumeStep: (step: number) => void;
};

const KEYBOARD_SEEK_STEP_MS = 1000;
const KEYBOARD_VOLUME_STEP = 0.05;

function blurActiveElement() {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
}

function isTextEntryTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(
      target.closest(
        "textarea,[contenteditable]:not([contenteditable='false']),input:not([type='range']):not([type='button']):not([type='submit']):not([type='reset']):not([type='checkbox']):not([type='radio'])",
      ),
    )
  );
}

export function usePlaybackKeyboard({ onSeekStep, onTogglePlayback, onVolumeStep }: PlaybackKeyboardOptions) {
  const seekStepRef = useSyncedRef(onSeekStep);
  const togglePlaybackRef = useSyncedRef(onTogglePlayback);
  const volumeStepRef = useSyncedRef(onVolumeStep);

  useEffect(() => {
    function handlePlaybackKey(event: KeyboardEvent) {
      if (event.code === "Space") {
        if (isTextEntryTarget(event.target)) return;
        if (event.repeat) return;

        blurActiveElement();
        event.preventDefault();
        event.stopPropagation();
        togglePlaybackRef.current();
        return;
      }

      if (event.code === "ArrowUp" || event.code === "ArrowDown") {
        blurActiveElement();
        event.preventDefault();
        event.stopPropagation();
        volumeStepRef.current(event.code === "ArrowUp" ? KEYBOARD_VOLUME_STEP : -KEYBOARD_VOLUME_STEP);
        return;
      }

      if (event.code === "ArrowLeft" || event.code === "ArrowRight") {
        blurActiveElement();
        event.preventDefault();
        event.stopPropagation();
        const seekStepSeconds = KEYBOARD_SEEK_STEP_MS / 1000;
        seekStepRef.current(event.code === "ArrowRight" ? seekStepSeconds : -seekStepSeconds);
      }
    }

    window.addEventListener("keydown", handlePlaybackKey, { capture: true });

    return () => {
      window.removeEventListener("keydown", handlePlaybackKey, { capture: true });
    };
  }, [seekStepRef, togglePlaybackRef, volumeStepRef]);
}
