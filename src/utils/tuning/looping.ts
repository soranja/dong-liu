import { RAM_BOX_LYRICS } from "../../pages/ram-box/model/lyrics";
import { getTimelineSectionTime } from "../generalTimeline";

export type TuningLoopMode = 0 | 1 | 3 | 5;

export const TUNING_LOOP_MODES = [0, 1, 3, 5] as const satisfies ReadonlyArray<TuningLoopMode>;

function getLoopRadius(loopMode: TuningLoopMode) {
  if (loopMode === 5) return 2;
  if (loopMode === 3) return 1;

  return 0;
}

export function getTuningLoopBounds(selectedIndex: number, loopMode: TuningLoopMode, duration: number) {
  if (loopMode === 0 || !duration || !Number.isFinite(duration)) return null;

  const radius = getLoopRadius(loopMode);
  const anchorIndex = Math.min(RAM_BOX_LYRICS.length - 1, Math.max(0, selectedIndex));
  const startIndex = Math.max(0, anchorIndex - radius);
  const endIndex = Math.min(RAM_BOX_LYRICS.length - 1, anchorIndex + radius);

  return {
    endIndex,
    endTime: getTimelineSectionTime(RAM_BOX_LYRICS, endIndex, 1, duration),
    startIndex,
    startTime: getTimelineSectionTime(RAM_BOX_LYRICS, startIndex, 0, duration),
  };
}
