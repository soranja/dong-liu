export const TEXT_ILLUSTRATION_KINDS = [
  'word-cloud',
  'blinking-words',
  'kinetic-warp',
  'vertical-typewriter',
  'word-train',
] as const;

export type TextIllustrationKind = (typeof TEXT_ILLUSTRATION_KINDS)[number];
