import { RAM_BOX_LYRICS } from "../lyrics/ram-box-lyrics";
import { getActiveLyricsSectionIndex } from "../utils/lyrics";

type ShapeTimelineProps = {
  currentTime: number;
  isVisible: boolean;
};

const MIN_SHAPE_SIZE = 180;
const SHAPE_SIZE_RANGE = 260;
const GOLDEN_ANGLE = 137.508;
const SHAPES = [
  { borderRadius: "0", clipPath: "none", transform: "translate(-50%, -50%)" },
  { borderRadius: "9999px", clipPath: "none", transform: "translate(-50%, -50%)" },
  { borderRadius: "0", clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)", transform: "translate(-50%, -50%)" },
  {
    borderRadius: "0",
    clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
    transform: "translate(-50%, -50%)",
  },
  {
    borderRadius: "0",
    clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 56%, 79% 91%, 50% 70%, 21% 91%, 32% 56%, 2% 35%, 39% 35%)",
    transform: "translate(-50%, -50%)",
  },
] as const;

function getSeededUnit(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;

  return value - Math.floor(value);
}

function getShapeStyle(index: number) {
  const seed = index + 1;
  const shape = SHAPES[Math.floor(getSeededUnit(seed * 17) * SHAPES.length)];
  const size = Math.round(MIN_SHAPE_SIZE + getSeededUnit(seed * 19) * SHAPE_SIZE_RANGE);
  const hue = Math.round((seed * GOLDEN_ANGLE + getSeededUnit(seed) * 24) % 360);
  const saturation = Math.round(72 + getSeededUnit(seed * 3) * 18);
  const lightness = Math.round(46 + getSeededUnit(seed * 5) * 14);

  return {
    backgroundColor: `hsl(${hue} ${saturation}% ${lightness}%)`,
    borderRadius: shape.borderRadius,
    clipPath: shape.clipPath,
    height: size,
    width: size,
    transform: shape.transform,
  };
}

export const ShapeTimeline = ({ currentTime, isVisible }: ShapeTimelineProps) => {
  const activeIndex = getActiveLyricsSectionIndex(currentTime);
  const activeSection = RAM_BOX_LYRICS[activeIndex];
  const shapeStyle = getShapeStyle(activeIndex);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-10 overflow-hidden transition-opacity duration-150"
      data-shape-timeline
      style={{ opacity: isVisible ? 1 : 0 }}
    >
      <div
        key={activeSection.timestamp}
        className="absolute left-1/2 top-1/2 shadow-[0_30px_80px_rgb(0_0_0/0.35)]"
        data-active-timestamp={activeSection.timestamp}
        data-shape-timeline-shape
        style={shapeStyle}
      />
    </div>
  );
};
