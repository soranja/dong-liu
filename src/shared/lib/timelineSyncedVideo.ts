const SYNCED_VIDEO_SELECTOR = "[data-timeline-synced-video]";
const LOOPING_VIDEO_SELECTOR = "[data-timeline-looping-video]";
const VIDEO_MAX_PLAYBACK_RATE = 16;
const VIDEO_MIN_PLAYBACK_RATE = 0.0625;
const VIDEO_END_FRAME_OFFSET_SECONDS = 0.001;
const VIDEO_PAUSED_SYNC_DRIFT_SECONDS = 0.01;
const VIDEO_SYNC_DRIFT_SECONDS = 0.08;
const LOCKED_VIDEO_FRAME_RATE = 12;
const LOCKED_VIDEO_FRAME_OFFSET_SECONDS = 0.001;

type SyncSyncedVideosOptions = {
  progress: number;
  sectionDuration: number;
  shouldPlay: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function pauseSyncedVideos(slide: HTMLElement | null) {
  if (!slide) return;

  slide.querySelectorAll<HTMLVideoElement>(SYNCED_VIDEO_SELECTOR).forEach((video) => {
    video.pause();
  });
}

export function syncLoopingVideos(root: HTMLElement | null, timelineTime: number) {
  if (!root) return;

  const videos = Array.from(root.querySelectorAll<HTMLVideoElement>(LOOPING_VIDEO_SELECTOR));
  const master = videos.find((video) => Number.isFinite(video.duration) && video.duration > 0);
  if (!master) return;

  const loopStartTime = Number(master.dataset.timelineLoopStart || 0);
  const loopTime = Math.max(0, timelineTime - loopStartTime);
  const frameCount = Math.max(1, Math.round(master.duration * LOCKED_VIDEO_FRAME_RATE));
  const frameIndex = Math.min(frameCount - 1, Math.floor(loopTime * LOCKED_VIDEO_FRAME_RATE));
  const targetTime = frameIndex / LOCKED_VIDEO_FRAME_RATE + LOCKED_VIDEO_FRAME_OFFSET_SECONDS;
  videos.forEach((video) => {
    const videoDuration = Number.isFinite(video.duration) ? video.duration : 0;
    if (!videoDuration) return;

    video.pause();
    const currentFrameIndex = Math.floor(video.currentTime * LOCKED_VIDEO_FRAME_RATE);
    if (currentFrameIndex !== frameIndex) video.currentTime = Math.min(targetTime, videoDuration);
  });
}

export function syncSyncedVideos(
  slide: HTMLElement | null,
  { progress, sectionDuration, shouldPlay }: SyncSyncedVideosOptions,
) {
  if (!slide) return;

  slide.querySelectorAll<HTMLVideoElement>(SYNCED_VIDEO_SELECTOR).forEach((video) => {
    const videoDuration = Number.isFinite(video.duration) ? video.duration : 0;
    if (!videoDuration) {
      video.pause();
      return;
    }

    const rawTargetTime = videoDuration * clamp(progress, 0, 1);
    const isAtEnd = rawTargetTime >= videoDuration - VIDEO_SYNC_DRIFT_SECONDS;
    const targetTime = isAtEnd ? Math.max(0, videoDuration - VIDEO_END_FRAME_OFFSET_SECONDS) : rawTargetTime;
    const driftTolerance = shouldPlay ? VIDEO_SYNC_DRIFT_SECONDS : VIDEO_PAUSED_SYNC_DRIFT_SECONDS;
    if (isAtEnd || Math.abs(video.currentTime - targetTime) > driftTolerance) {
      video.currentTime = clamp(targetTime, 0, videoDuration);
    }

    if (!shouldPlay || isAtEnd) {
      video.pause();
      return;
    }

    const playbackRate = sectionDuration
      ? clamp(videoDuration / sectionDuration, VIDEO_MIN_PLAYBACK_RATE, VIDEO_MAX_PLAYBACK_RATE)
      : 1;
    if (video.playbackRate !== playbackRate) video.playbackRate = playbackRate;
    if (video.paused) void video.play().catch(() => undefined);
  });
}
