type WaveformPosition = "left" | "center" | "right";

type DrawWaveformOptions = {
  backgroundColor: string;
  barWidth: number;
  canvas: HTMLCanvasElement;
  color: string;
  context: CanvasRenderingContext2D;
  frequencyData: Uint8Array;
  intensities: number[];
  position: WaveformPosition;
  smoothness: number;
};

function getDataPosition(index: number, barCount: number, dataLength: number, position: WaveformPosition) {
  if (position === "left") {
    return (index / Math.max(1, barCount - 1)) * (dataLength - 1);
  }

  if (position === "right") {
    return (1 - index / Math.max(1, barCount - 1)) * (dataLength - 1);
  }

  const halfBarCount = barCount / 2;
  const distanceFromCenter = Math.abs(index - halfBarCount + 0.5) / halfBarCount;
  return Math.pow(distanceFromCenter, 1.35) * (dataLength - 1);
}

function getFrequencyValue(data: Uint8Array, position: number, radius: number) {
  const center = Math.round(position);
  let total = 0;
  let samples = 0;

  for (let offset = -radius; offset <= radius; offset++) {
    const index = Math.min(data.length - 1, Math.max(0, center + offset));
    const weight = radius + 1 - Math.abs(offset);
    total += (data[index] ?? 0) * weight;
    samples += weight;
  }

  return total / samples / 255;
}

export function drawWaveform(options: DrawWaveformOptions) {
  const { backgroundColor, barWidth, canvas, color, context, frequencyData, intensities, position, smoothness } = options;
  // Limits the analyser bins to the musical range that reads best in the dock.
  const FREQUENCY_RANGE = 0.5;
  // Keeps raw frequency response neutral before easing and smoothing.
  const RESPONSE_GAIN = 1;
  const pixelRatio = window.devicePixelRatio || 1;
  const normalizedSmoothness = Math.min(1, Math.max(0, smoothness / 100));
  const frequencyRadius = Math.round(1 + normalizedSmoothness * 5);
  const neighborWeight = 0.08 + normalizedSmoothness * 0.18;
  const centerWeight = 1 - neighborWeight * 2;
  const attack = 0.9 - normalizedSmoothness * 0.7;
  const release = 0.9 - normalizedSmoothness * 0.82;
  const displayWidth = Math.floor(canvas.clientWidth * pixelRatio);
  const displayHeight = Math.floor(canvas.clientHeight * pixelRatio);

  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
  }

  const width = canvas.width;
  const height = canvas.height;
  const centerY = height * 0.5;
  const scaledBarWidth = barWidth * pixelRatio;
  const gap = Math.max(2 * pixelRatio, scaledBarWidth * 0.45);
  const barCount = Math.max(12, Math.floor(width / (scaledBarWidth + gap)));
  const normalizedBarCount = barCount % 2 === 0 ? barCount : barCount - 1;
  const frequencyRangeLength = Math.max(8, Math.floor(frequencyData.length * FREQUENCY_RANGE));
  const groupWidth = normalizedBarCount * scaledBarWidth + (normalizedBarCount - 1) * gap;
  const startX = (width - groupWidth) * 0.5;

  context.clearRect(0, 0, width, height);
  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, width, height);

  if (intensities.length !== normalizedBarCount) {
    intensities.length = normalizedBarCount;
    intensities.fill(0);
  }

  context.fillStyle = color;

  for (let index = 0; index < normalizedBarCount; index++) {
    const dataPosition = getDataPosition(index, normalizedBarCount, frequencyRangeLength, position);
    const value = getFrequencyValue(frequencyData, dataPosition, frequencyRadius);
    const leftValue = getFrequencyValue(
      frequencyData,
      getDataPosition(Math.max(0, index - 1), normalizedBarCount, frequencyRangeLength, position),
      frequencyRadius,
    );
    const rightValue = getFrequencyValue(
      frequencyData,
      getDataPosition(Math.min(normalizedBarCount - 1, index + 1), normalizedBarCount, frequencyRangeLength, position),
      frequencyRadius,
    );
    const spatialValue = value * centerWeight + (leftValue + rightValue) * neighborWeight;
    const easedValue = Math.min(1, Math.pow(spatialValue * RESPONSE_GAIN, 1.24));
    const previous = intensities[index] ?? 0;
    const amount = easedValue > previous ? attack : release;
    const smoothed = previous + (easedValue - previous) * amount;
    intensities[index] = smoothed;

    const x = startX + index * (scaledBarWidth + gap);
    const maxHeight = height * 0.47;
    const barHeight = Math.max(3 * pixelRatio, smoothed * maxHeight);
    const radius = Math.min(scaledBarWidth * 0.5, 8 * pixelRatio);

    context.beginPath();
    context.roundRect(x, centerY - barHeight, scaledBarWidth, barHeight * 2, radius);
    context.fill();
  }
}
