import type { ComponentType } from "react";

import { BlinkingWordsTextAnimation } from "./BlinkingWordsTextAnimation";
import { KineticWarpTextAnimation } from "./KineticWarpTextAnimation";
import { LyricsWordCloud } from "./LyricsWordCloud";
import { VerticalTypewriterTextAnimation } from "./VerticalTypewriterTextAnimation";
import type { TextIllustrationKind, TextIllustrationProps } from "./types";

const TEXT_ILLUSTRATIONS = {
  "blinking-words": BlinkingWordsTextAnimation,
  "kinetic-warp": KineticWarpTextAnimation,
  "vertical-typewriter": VerticalTypewriterTextAnimation,
  "word-cloud": LyricsWordCloud,
} satisfies Record<TextIllustrationKind, ComponentType<TextIllustrationProps>>;

type TextIllustrationComponentProps = TextIllustrationProps & {
  kind: TextIllustrationKind;
};

export const TextIllustration = ({ kind, ...props }: TextIllustrationComponentProps) => {
  const Illustration = TEXT_ILLUSTRATIONS[kind];

  return <Illustration {...props} />;
};
