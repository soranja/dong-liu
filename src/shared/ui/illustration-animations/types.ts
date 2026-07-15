export const TEXT_ILLUSTRATION_KINDS = [
  "word-cloud",
  "blinking-words",
  "kinetic-warp",
  "vertical-typewriter",
  "word-train",
] as const;

export type TextIllustrationKind = (typeof TEXT_ILLUSTRATION_KINDS)[number];

export type TextIllustrationProps = {
  animation?: import("@entities/track/model/types").IllustrationAnimation;
  onReady: (sectionId: number) => void;
  sectionId: number;
  text: string;
};
