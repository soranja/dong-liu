type PlaybackScrollSeekOptions = {
  audio: HTMLAudioElement;
  isEnabled: () => boolean;
  onSeek?: (progress: number) => void;
  target: HTMLElement;
};

const WHEEL_SECONDS_PER_PIXEL = 0.012;
const TOUCH_SECONDS_PER_PIXEL = 0.035;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getWheelPixels(event: WheelEvent) {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16;
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * window.innerHeight;

  return event.deltaY;
}

function shouldIgnoreGesture(eventTarget: EventTarget | null) {
  if (!(eventTarget instanceof Element)) return false;

  return Boolean(eventTarget.closest("button,input,select,textarea,[data-scroll-seek-ignore='true']"));
}

export function installPlaybackScrollSeek(options: PlaybackScrollSeekOptions) {
  const { audio, isEnabled, onSeek, target } = options;
  let lastTouchY: number | null = null;

  function seekBy(seconds: number) {
    if (!audio.duration || !Number.isFinite(audio.duration)) return;

    audio.currentTime = clamp(audio.currentTime + seconds, 0, audio.duration);
    onSeek?.((audio.currentTime / audio.duration) * 100);
  }

  function handleWheel(event: WheelEvent) {
    if (!isEnabled() || shouldIgnoreGesture(event.target)) return;

    event.preventDefault();
    const seconds = clamp(getWheelPixels(event) * WHEEL_SECONDS_PER_PIXEL, -6, 6);
    seekBy(seconds);
  }

  function handleTouchStart(event: TouchEvent) {
    if (!isEnabled() || shouldIgnoreGesture(event.target)) {
      lastTouchY = null;
      return;
    }

    lastTouchY = event.touches[0]?.clientY ?? null;
  }

  function handleTouchMove(event: TouchEvent) {
    if (!isEnabled() || shouldIgnoreGesture(event.target) || lastTouchY === null) return;

    const touchY = event.touches[0]?.clientY;
    if (touchY === undefined) return;

    event.preventDefault();
    seekBy((lastTouchY - touchY) * TOUCH_SECONDS_PER_PIXEL);
    lastTouchY = touchY;
  }

  function handleTouchEnd() {
    lastTouchY = null;
  }

  target.addEventListener("wheel", handleWheel, { passive: false });
  target.addEventListener("touchstart", handleTouchStart, { passive: true });
  target.addEventListener("touchmove", handleTouchMove, { passive: false });
  target.addEventListener("touchend", handleTouchEnd);
  target.addEventListener("touchcancel", handleTouchEnd);

  return () => {
    target.removeEventListener("wheel", handleWheel);
    target.removeEventListener("touchstart", handleTouchStart);
    target.removeEventListener("touchmove", handleTouchMove);
    target.removeEventListener("touchend", handleTouchEnd);
    target.removeEventListener("touchcancel", handleTouchEnd);
  };
}
