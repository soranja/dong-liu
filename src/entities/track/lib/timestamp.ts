export function parseLyricsTimestamp(timestamp: string) {
  const parts = timestamp.split(':');
  if (parts.length !== 2) return Number.NaN;

  const [minutes, seconds] = parts.map(Number);
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || minutes < 0 || seconds < 0 || seconds >= 60) {
    return Number.NaN;
  }

  return minutes * 60 + seconds;
}

export function formatLyricsTimestamp(time: number) {
  const boundedTime = Math.max(0, time);
  const minutes = Math.floor(boundedTime / 60);
  const seconds = boundedTime - minutes * 60;

  return `${String(minutes).padStart(2, '0')}:${seconds.toFixed(3).padStart(6, '0')}`;
}
