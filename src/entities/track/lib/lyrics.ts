import { getLyricDisplayText } from '@shared/ui/illustration-animations/lib/lyricText';
import type { LyricsSection } from '../model/types';
import { resolveSectionStart, type TrackTuningAdapter } from '../model/tuning';

type LyricLinePart = {
  isItalic: boolean;
  text: string;
};

export function getLyricsSectionStart(
  lyrics: readonly LyricsSection[],
  index: number,
  tuningAdapter?: TrackTuningAdapter,
) {
  const section = lyrics[index];
  if (!section) return 0;

  return resolveSectionStart(section, tuningAdapter);
}

function getActiveLyricsSectionIndex(
  lyrics: readonly LyricsSection[],
  currentTime: number,
  tuningAdapter?: TrackTuningAdapter,
) {
  for (let index = lyrics.length - 1; index >= 0; index -= 1) {
    if (currentTime >= getLyricsSectionStart(lyrics, index, tuningAdapter)) return index;
  }

  return 0;
}

export function getActiveLyricsSection(
  lyrics: readonly LyricsSection[],
  currentTime: number,
  tuningAdapter?: TrackTuningAdapter,
) {
  return lyrics[getActiveLyricsSectionIndex(lyrics, currentTime, tuningAdapter)];
}

export function getLyricLineParts(line: string) {
  const parts: LyricLinePart[] = [];
  const italicPattern = /\*([^*]+)\*/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = italicPattern.exec(line))) {
    if (match.index > cursor) {
      parts.push({ isItalic: false, text: getLyricDisplayText(line.slice(cursor, match.index)) });
    }

    parts.push({ isItalic: true, text: getLyricDisplayText(match[0]) });
    cursor = match.index + match[0].length;
  }

  if (cursor < line.length) {
    parts.push({ isItalic: false, text: getLyricDisplayText(line.slice(cursor)) });
  }

  return parts.length ? parts : [{ isItalic: false, text: getLyricDisplayText(line) }];
}

export function getLyricPlainText(line: string) {
  return getLyricLineParts(line)
    .map((part) => part.text)
    .join('');
}
