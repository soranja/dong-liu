import { useEffect } from "react";
import { useSyncedRef } from "./useSyncedRef";

type PlaybackKeyboardOptions = {
  onSeekSection: (direction: -1 | 1) => void;
  onTogglePlayback: () => void;
  onVolumeStep: (step: number) => void;
};

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

export function usePlaybackKeyboard({ onSeekSection, onTogglePlayback, onVolumeStep }: PlaybackKeyboardOptions) {
  const seekSectionRef = useSyncedRef(onSeekSection);
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
        seekSectionRef.current(event.code === "ArrowRight" ? 1 : -1);
      }
    }

    window.addEventListener("keydown", handlePlaybackKey, { capture: true });

    return () => {
      window.removeEventListener("keydown", handlePlaybackKey, { capture: true });
    };
  }, [seekSectionRef, togglePlaybackRef, volumeStepRef]);
}
