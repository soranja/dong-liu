export const TEXT_ILLUSTRATION_KINDS = ["word-cloud", "kinetic-warp"] as const;

export type TextIllustrationKind = (typeof TEXT_ILLUSTRATION_KINDS)[number];

export type TextIllustrationProps = {
  onReady: (sectionId: number) => void;
  sectionId: number;
  text: string;
};
