import { useEffect } from "react";
import { useSyncedRef } from "./useSyncedRef";

type PlaybackKeyboardOptions = {
  onTogglePlayback: () => void;
  onVolumeStep: (step: number) => void;
};

export function usePlaybackKeyboard({ onTogglePlayback, onVolumeStep }: PlaybackKeyboardOptions) {
  const togglePlaybackRef = useSyncedRef(onTogglePlayback);
  const volumeStepRef = useSyncedRef(onVolumeStep);

  useEffect(() => {
    function handlePlaybackKey(event: KeyboardEvent) {
      if (event.repeat) return;

      if (event.code === "Space") {
        event.preventDefault();
        event.stopPropagation();
        togglePlaybackRef.current();
        return;
      }

      if (event.code === "ArrowUp" || event.code === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (event.code === "ArrowLeft" || event.code === "ArrowRight") {
        event.preventDefault();
        event.stopPropagation();
        volumeStepRef.current(event.code === "ArrowRight" ? 0.05 : -0.05);
      }
    }

    window.addEventListener("keydown", handlePlaybackKey, { capture: true });

    return () => {
      window.removeEventListener("keydown", handlePlaybackKey, { capture: true });
    };
  }, [togglePlaybackRef, volumeStepRef]);
}
