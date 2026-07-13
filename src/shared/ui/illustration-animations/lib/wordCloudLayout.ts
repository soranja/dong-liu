import { getLyricWords } from "./lyricText";

export type PackedWord = {
  fontSize: number;
  fontWeight: number;
  height: number;
  index: number;
  left: number;
  rotation: 0 | -90;
  scaleX: number;
  scaleY: number;
  text: string;
  top: number;
  width: number;
};

type Rect = {
  height: number;
  left: number;
  top: number;
  width: number;
};

type WordDetails = {
  areaWeight: number;
  fontWeight: number;
  index: number;
  text: string;
  textWidthRatio: number;
};

const BASE_FONT_SIZE = 100;
const BASE_LINE_HEIGHT = 0.88;
const FONT_WEIGHTS = [300, 400, 500, 600, 700, 800, 900] as const;
const FIT_SAFETY_FACTOR = 0.94;
const HORIZONTAL_ROTATION_BIAS = 1.65;
const LAYOUT_FRAME_BUDGET_MS = 8;
const ROOM_WEIGHT_INFLUENCE = 0.5;
const ROW_COUNT_HORIZONTAL_BIAS = 1.45;
const BRACKETED_WORD_PATTERN = /\[[^\]]+\]/g;
let measureCanvas: HTMLCanvasElement | null = null;
let layoutFrame: number | null = null;
const pendingLayouts = new Set<() => void>();

function flushLayouts() {
  layoutFrame = null;
  const frameDeadline = performance.now() + LAYOUT_FRAME_BUDGET_MS;

  for (const layout of pendingLayouts) {
    pendingLayouts.delete(layout);
    layout();
    if (performance.now() >= frameDeadline) break;
  }

  if (pendingLayouts.size) layoutFrame = window.requestAnimationFrame(flushLayouts);
}

export function scheduleWordCloudLayout(layout: () => void) {
  pendingLayouts.add(layout);
  layoutFrame ??= window.requestAnimationFrame(flushLayouts);
}

export function cancelWordCloudLayout(layout: () => void) {
  pendingLayouts.delete(layout);
}

function getVariation(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;

  return value - Math.floor(value);
}

function getWords(text: string, sectionId: number, context: CanvasRenderingContext2D, fontFamily: string) {
  return getLyricWords(text.replace(BRACKETED_WORD_PATTERN, " ")).map((word, index): WordDetails => {
    const uppercaseWord = word.toLocaleUpperCase();
    const seed = sectionId * 97 + index * 37 + word.length * 13;
    const fontWeight = FONT_WEIGHTS[Math.floor(getVariation(seed + 1) * FONT_WEIGHTS.length)];
    context.font = `normal ${fontWeight} ${BASE_FONT_SIZE}px ${fontFamily}`;
    const textWidthRatio = Math.max(0.01, context.measureText(uppercaseWord).width / BASE_FONT_SIZE);

    return {
      areaWeight: textWidthRatio * (0.72 + getVariation(seed) * 0.65),
      fontWeight,
      index,
      text: uppercaseWord,
      textWidthRatio,
    };
  });
}

function getRows(words: WordDetails[], width: number, height: number) {
  if (words.length === 2) return words.map((word) => [word]);

  const rowCount = Math.max(
    1,
    Math.min(words.length, Math.round(Math.sqrt((words.length * height) / width) * ROW_COUNT_HORIZONTAL_BIAS)),
  );
  const rows: WordDetails[][] = [];
  let wordIndex = 0;
  let remainingWeight = words.reduce((sum, word) => sum + word.areaWeight, 0);

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const row: WordDetails[] = [];
    const remainingRows = rowCount - rowIndex;
    const targetWeight = remainingWeight / remainingRows;
    let rowWeight = 0;

    while (wordIndex < words.length) {
      const word = words[wordIndex];
      const wordsRemaining = words.length - wordIndex;
      const mustLeaveForLaterRows = remainingRows - 1;

      const wouldExceedTarget = remainingRows > 1 && rowWeight + word.areaWeight > targetWeight;
      if (row.length && (wordsRemaining <= mustLeaveForLaterRows || wouldExceedTarget)) {
        break;
      }

      row.push(word);
      rowWeight += word.areaWeight;
      wordIndex += 1;
    }

    rows.push(row);
    remainingWeight -= rowWeight;
  }

  return rows;
}

function getRooms(words: WordDetails[], width: number, height: number) {
  const rooms: Array<[WordDetails, Rect]> = [];
  const rows = getRows(words, width, height);
  const totalWeight = words.reduce((sum, word) => sum + word.areaWeight, 0);
  let top = 0;

  rows.forEach((row, rowIndex) => {
    const rowWeight = row.reduce((sum, word) => sum + word.areaWeight, 0);
    const weightedRowShare = rowWeight / totalWeight;
    const equalRowShare = 1 / rows.length;
    const rowShare = equalRowShare + (weightedRowShare - equalRowShare) * ROOM_WEIGHT_INFLUENCE;
    const rowHeight = rowIndex === rows.length - 1 ? height - top : height * rowShare;
    let left = 0;

    row.forEach((word, wordIndex) => {
      const weightedWordShare = word.areaWeight / rowWeight;
      const equalWordShare = 1 / row.length;
      const wordShare = equalWordShare + (weightedWordShare - equalWordShare) * ROOM_WEIGHT_INFLUENCE;
      const roomWidth = wordIndex === row.length - 1 ? width - left : width * wordShare;
      rooms.push([word, { height: rowHeight, left, top, width: roomWidth }]);
      left += roomWidth;
    });

    top += rowHeight;
  });

  return rooms;
}

function getFittedWord(word: WordDetails, rect: Rect, inset: number) {
  const availableWidth = Math.max(1, rect.width - inset * 2);
  const availableHeight = Math.max(1, rect.height - inset * 2);
  const horizontalSize = Math.min(availableWidth / word.textWidthRatio, availableHeight);
  const verticalSize = Math.min(availableHeight / word.textWidthRatio, availableWidth);
  const rotation = verticalSize > horizontalSize * HORIZONTAL_ROTATION_BIAS ? -90 : 0;
  const naturalWidth = word.textWidthRatio * BASE_FONT_SIZE;
  const naturalHeight = BASE_FONT_SIZE * BASE_LINE_HEIGHT;
  const scaleX =
    rotation === 0
      ? (availableWidth * FIT_SAFETY_FACTOR) / naturalWidth
      : (availableHeight * FIT_SAFETY_FACTOR) / naturalWidth;
  const scaleY =
    rotation === 0
      ? (availableHeight * FIT_SAFETY_FACTOR) / naturalHeight
      : (availableWidth * FIT_SAFETY_FACTOR) / naturalHeight;

  return {
    fontSize: BASE_FONT_SIZE,
    fontWeight: word.fontWeight,
    height: rect.height,
    index: word.index,
    left: rect.left,
    rotation,
    scaleX,
    scaleY,
    text: word.text,
    top: rect.top,
    width: rect.width,
  } satisfies PackedWord;
}

export function getPackedWords(
  text: string,
  sectionId: number,
  width: number,
  height: number,
  fontFamily: string,
  inset: number,
) {
  measureCanvas ??= document.createElement("canvas");
  const context = measureCanvas.getContext("2d");
  if (!context || width <= 0 || height <= 0) return [];

  const words = getWords(text, sectionId, context, fontFamily);
  if (!words.length) return [];

  return getRooms(words, width, height).map(([word, room]) => getFittedWord(word, room, inset));
}
