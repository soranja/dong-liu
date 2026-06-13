import { RAM_BOX_LYRICS } from "../lyrics/ram-box-lyrics";

export type LyricLinePart = {
  isItalic: boolean;
  text: string;
};

const SECTION_START_TIMES = RAM_BOX_LYRICS.map(({ timestamp }) => {
  const [minutes, seconds] = timestamp.split(":").map(Number);

  return minutes * 60 + seconds;
});

export function getLyricsSectionStart(index: number) {
  return SECTION_START_TIMES[index];
}

export function getActiveLyricsSectionIndex(currentTime: number) {
  for (let index = RAM_BOX_LYRICS.length - 1; index >= 0; index -= 1) {
    if (currentTime >= SECTION_START_TIMES[index]) return index;
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
