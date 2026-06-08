import lyrics from "../audio/ram_box_lyrics.json";
import type { TextSizeLevel } from "./textFit";

export type LyricCue = {
  line: string;
  sizeLevel?: TextSizeLevel;
  time: number;
  timestamp: string;
};

export type LyricLinePart = {
  isItalic: boolean;
  text: string;
};

export type LyricTimestamp = Pick<LyricCue, "time" | "timestamp">;

export const LYRIC_CUES = [...(lyrics as LyricCue[])].sort((first, second) => first.time - second.time);

export function extractLyricTimestamps(cues: readonly LyricCue[]): LyricTimestamp[] {
  return cues.map(({ time, timestamp }) => ({ time, timestamp }));
}

export const LYRIC_TIMESTAMPS = extractLyricTimestamps(LYRIC_CUES);

export function getActiveLyricCueIndex(currentTime: number) {
  const safeTime = Number.isFinite(currentTime) ? Math.max(0, currentTime) : 0;

  for (let index = LYRIC_CUES.length - 1; index >= 0; index -= 1) {
    if (safeTime >= LYRIC_CUES[index].time) return index;
  }

  return 0;
}

export function getActiveLyricCue(currentTime: number) {
  return LYRIC_CUES[getActiveLyricCueIndex(currentTime)];
}

export function getLyricLineParts(line: string) {
  const parts: LyricLinePart[] = [];
  const italicPattern = /\*([^*]+)\*/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = italicPattern.exec(line))) {
    if (match.index > cursor) {
      parts.push({ isItalic: false, text: line.slice(cursor, match.index) });
    }

    parts.push({ isItalic: true, text: match[0] });
    cursor = match.index + match[0].length;
  }

  if (cursor < line.length) {
    parts.push({ isItalic: false, text: line.slice(cursor) });
  }

  return parts.length ? parts : [{ isItalic: false, text: line }];
}

export function getLyricPlainText(line: string) {
  return getLyricLineParts(line)
    .map((part) => part.text)
    .join("");
}
