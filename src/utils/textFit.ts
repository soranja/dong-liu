export type TextSizeLevel = 1 | 2 | 3 | 4 | 5;

type SingleLineTextFitOptions = {
  availableWidth: number;
  fontFamily: string;
  fontStyle: string;
  fontWeight: string;
  letterSpacing: number;
  maxFontSize: number;
  minFontSize: number;
  text: string;
};

let measureCanvas: HTMLCanvasElement | null = null;

function getMeasureContext() {
  measureCanvas ??= document.createElement("canvas");

  return measureCanvas.getContext("2d");
}

function getFontWidth(options: SingleLineTextFitOptions, fontSize: number) {
  const context = getMeasureContext();
  if (!context) return 0;

  context.font = `${options.fontStyle} ${options.fontWeight} ${fontSize}px ${options.fontFamily}`;
  const textWidth = context.measureText(options.text).width;
  const letterSpacingWidth = Math.max(0, options.text.length - 1) * options.letterSpacing;

  return textWidth + letterSpacingWidth;
}

export function getSingleLineFontSize(options: SingleLineTextFitOptions) {
  if (!options.text || options.availableWidth <= 0) return options.minFontSize;

  let low = options.minFontSize;
  let high = Math.max(options.minFontSize, options.maxFontSize);

  for (let iteration = 0; iteration < 12; iteration += 1) {
    const mid = (low + high) / 2;

    if (getFontWidth(options, mid) <= options.availableWidth) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return Math.floor(low);
}
