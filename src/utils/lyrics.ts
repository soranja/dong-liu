import { RAM_BOX_LYRICS } from "../lyrics/ram-box-lyrics";
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

const SECTION_START_TIMES = RAM_BOX_LYRICS.map(({ timestamp }) => parseLyricsTimestamp(timestamp));

export function getLyricsSectionStart(index: number) {
  const sectionId = RAM_BOX_LYRICS[index]?.sectionId;
  if (!sectionId) return SECTION_START_TIMES[index] ?? 0;

  return getDraftLyricSectionStart(sectionId) ?? SECTION_START_TIMES[index] ?? 0;
}

function getActiveLyricsSectionIndex(currentTime: number) {
  for (let index = RAM_BOX_LYRICS.length - 1; index >= 0; index -= 1) {
    if (currentTime >= getLyricsSectionStart(index)) return index;
  }

  return 0;
}

export function getActiveLyricsSection(currentTime: number) {
  return RAM_BOX_LYRICS[getActiveLyricsSectionIndex(currentTime)];
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
