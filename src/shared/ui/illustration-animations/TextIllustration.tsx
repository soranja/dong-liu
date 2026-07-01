import type { ComponentType } from "react";

import { KineticWarpTextAnimation } from "./KineticWarpTextAnimation";
import { LyricsWordCloud } from "./LyricsWordCloud";
import type { TextIllustrationKind, TextIllustrationProps } from "./types";

const TEXT_ILLUSTRATIONS = {
  "kinetic-warp": KineticWarpTextAnimation,
  "word-cloud": LyricsWordCloud,
} satisfies Record<TextIllustrationKind, ComponentType<TextIllustrationProps>>;

type TextIllustrationComponentProps = TextIllustrationProps & {
  kind: TextIllustrationKind;
};

export const TextIllustration = ({ kind, ...props }: TextIllustrationComponentProps) => {
  const Illustration = TEXT_ILLUSTRATIONS[kind];

  return <Illustration {...props} />;
};
