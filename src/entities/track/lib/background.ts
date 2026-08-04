import type { TrackTuningAdapter } from '../model/tuning';
import type { LyricsBackground, LyricsSection } from '../model/types';

export function supportsBackground(section: LyricsSection) {
  return !(typeof section.illustrateWith === 'object' && section.illustrateWith.mediaType === 'custom');
}

export function getBackgroundSectionIndex(
  lyrics: readonly LyricsSection[],
  index: number,
  tuningAdapter?: TrackTuningAdapter,
) {
  if (!supportsBackground(lyrics[index])) return index;

  let backgroundIndex = index;
  while (
    backgroundIndex > 0 &&
    supportsBackground(lyrics[backgroundIndex - 1]) &&
    (tuningAdapter?.getBackgroundShared(lyrics[backgroundIndex - 1]) ??
      Boolean(lyrics[backgroundIndex - 1].backgroundShared))
  ) {
    backgroundIndex -= 1;
  }

  return backgroundIndex;
}

export function resolveBackground(
  lyrics: readonly LyricsSection[],
  index: number,
  tuningAdapter?: TrackTuningAdapter,
): LyricsBackground | undefined {
  const backgroundIndex = getBackgroundSectionIndex(lyrics, index, tuningAdapter);
  const section = lyrics[backgroundIndex];
  if (!supportsBackground(section)) return undefined;

  return tuningAdapter?.getBackground(section) ?? section.background;
}
