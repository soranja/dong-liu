import type { TrackTuningAdapter } from "../../../entities/track/model/tuning";
import type { LyricsSection } from "../../../entities/track/model/types";
import { getTimelineSectionTime } from "../../../utils/generalTimeline";

export type TuningLoopMode = 0 | 1 | 3 | 5;

export const TUNING_LOOP_MODES = [0, 1, 3, 5] as const satisfies ReadonlyArray<TuningLoopMode>;

function getLoopRadius(loopMode: TuningLoopMode) {
  if (loopMode === 5) return 2;
  if (loopMode === 3) return 1;

  return 0;
}

export function getTuningLoopBounds(
  lyrics: readonly LyricsSection[],
  selectedIndex: number,
  loopMode: TuningLoopMode,
  duration: number,
  tuningAdapter?: TrackTuningAdapter,
) {
  if (loopMode === 0 || !duration || !Number.isFinite(duration)) return null;

  const radius = getLoopRadius(loopMode);
  const anchorIndex = Math.min(lyrics.length - 1, Math.max(0, selectedIndex));
  const startIndex = Math.max(0, anchorIndex - radius);
  const endIndex = Math.min(lyrics.length - 1, anchorIndex + radius);

  return {
    endIndex,
    endTime: getTimelineSectionTime(lyrics, endIndex, 1, duration, tuningAdapter),
    startIndex,
    startTime: getTimelineSectionTime(lyrics, startIndex, 0, duration, tuningAdapter),
  };
}
