import type { LyricsSection } from "../entities/track/model/types";
import { getDraftLyricSectionStart } from "./tuning/lyricTimingTuningStore";

type LyricLinePart = {
  isItalic: boolean;
  text: string;
};

export function parseLyricsTimestamp(timestamp: string) {
  const [minutes, seconds] = timestamp.split(":").map(Number);

  return minutes * 60 + seconds;
}

export function formatLyricsTimestamp(time: number) {
  const boundedTime = Math.max(0, time);
  const minutes = Math.floor(boundedTime / 60);
  const seconds = boundedTime - minutes * 60;

  return `${String(minutes).padStart(2, "0")}:${seconds.toFixed(3).padStart(6, "0")}`;
}

export function getLyricsSectionStart(lyrics: readonly LyricsSection[], index: number) {
  const section = lyrics[index];
  if (!section) return 0;

  return getDraftLyricSectionStart(section.sectionId) ?? parseLyricsTimestamp(section.timestamp);
}

function getActiveLyricsSectionIndex(lyrics: readonly LyricsSection[], currentTime: number) {
  for (let index = lyrics.length - 1; index >= 0; index -= 1) {
    if (currentTime >= getLyricsSectionStart(lyrics, index)) return index;
  }

  return 0;
}

export function getActiveLyricsSection(lyrics: readonly LyricsSection[], currentTime: number) {
  return lyrics[getActiveLyricsSectionIndex(lyrics, currentTime)];
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
