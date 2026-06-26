import { useEffect, useState } from "react";

export function usePreloadedAudio(sourceUrl: string) {
  const [source, setSource] = useState<string | undefined>();

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;
    let disposed = false;

    const loadAudio = async () => {
      try {
        const response = await fetch(sourceUrl, { cache: "force-cache", signal: controller.signal });
        if (!response.ok) throw new Error(`Unable to preload audio: ${response.status}`);

        const blob = await response.blob();
        if (disposed) return;

        objectUrl = URL.createObjectURL(blob);
        setSource(objectUrl);
      } catch (error) {
        if (disposed || (error instanceof DOMException && error.name === "AbortError")) return;

        // Keep playback available if full preloading is blocked by the host.
        setSource(sourceUrl);
      }
    };

    void loadAudio();

    return () => {
      disposed = true;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sourceUrl]);

  return source;
}
