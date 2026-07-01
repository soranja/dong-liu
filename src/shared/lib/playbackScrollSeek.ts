type PlaybackScrollSeekOptions = {
  isEnabled: () => boolean;
  onSeekStep: (seconds: number) => void;
  target: HTMLElement;
  wheelTarget?: Window;
};

const WHEEL_SEEK_STEP_SECONDS = 1;
const TOUCH_SECONDS_PER_PIXEL = 0.035;

function getWheelPixels(event: WheelEvent) {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16;
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * window.innerHeight;

  return event.deltaY;
}

function shouldIgnoreGesture(eventTarget: EventTarget | null) {
  if (!(eventTarget instanceof Element)) return false;

  return Boolean(eventTarget.closest("button,input,select,textarea,[data-scroll-seek-ignore='true']"));
}

function shouldIgnoreWheel(eventTarget: EventTarget | null) {
  if (!(eventTarget instanceof Element)) return false;

  return Boolean(
    eventTarget.closest("button,input:not([type='range']),select,textarea,[data-scroll-seek-ignore='true']"),
  );
}

export function installPlaybackScrollSeek(options: PlaybackScrollSeekOptions) {
  const { isEnabled, onSeekStep, target, wheelTarget = window } = options;
  let lastTouchY: number | null = null;

  function handleWheel(event: WheelEvent) {
    if (!isEnabled() || shouldIgnoreWheel(event.target)) return;

    const wheelPixels = getWheelPixels(event);
    if (!wheelPixels) return;

    event.preventDefault();
    onSeekStep(Math.sign(wheelPixels) * WHEEL_SEEK_STEP_SECONDS);
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
    onSeekStep((lastTouchY - touchY) * TOUCH_SECONDS_PER_PIXEL);
    lastTouchY = touchY;
  }

  function handleTouchEnd() {
    lastTouchY = null;
  }

  wheelTarget.addEventListener("wheel", handleWheel, { passive: false });
  target.addEventListener("touchstart", handleTouchStart, { passive: true });
  target.addEventListener("touchmove", handleTouchMove, { passive: false });
  target.addEventListener("touchend", handleTouchEnd);
  target.addEventListener("touchcancel", handleTouchEnd);

  return () => {
    wheelTarget.removeEventListener("wheel", handleWheel);
    target.removeEventListener("touchstart", handleTouchStart);
    target.removeEventListener("touchmove", handleTouchMove);
    target.removeEventListener("touchend", handleTouchEnd);
    target.removeEventListener("touchcancel", handleTouchEnd);
  };
}
