export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00.000";

  const totalMilliseconds = Math.max(0, Math.floor(seconds * 1000));
  const minutes = Math.floor(totalMilliseconds / 60000);
  const paddedSeconds = Math.floor((totalMilliseconds % 60000) / 1000)
    .toString()
    .padStart(2, "0");
  const paddedMilliseconds = (totalMilliseconds % 1000).toString().padStart(3, "0");

  return `${minutes}:${paddedSeconds}.${paddedMilliseconds}`;
}

export function blurControl(element: HTMLElement) {
  window.requestAnimationFrame(() => element.blur());
}
