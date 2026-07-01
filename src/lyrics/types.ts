import type { ReactNode } from "react";
import type { TextSizeLevel } from "../utils/textFit";

export type LyricsMedia =
  | {
      alt: string;
      mediaType: "image";
      src: string;
    }
  | {
      mediaType: "video";
      poster?: string;
      src: string;
    };

export type LyricsIllustration = LyricsMedia | ReactNode;

export type IllustrationAnimation =
  | {
      variant: "instant";
    }
  | {
      animationLengthPercent?: number;
      endPercent: number;
      startPercent: number;
      variant: "range";
    };

export type IllustrationVisibility = "adjacent" | "only-active" | "start-active" | "active-end";
export type TextIllustrationKind = "kinetic-warp" | "word-cloud";

export type LyricsSection = {
  continuing?: boolean;
  enterDuration: number;
  exitDuration: number;
  fullBleedIllustration?: boolean;
  illustrateWith: LyricsIllustration;
  illustrationAnimation?: IllustrationAnimation;
  illustrationFadeInMs?: number;
  illustrationFadeOutMs?: number;
  illustrationKind?: TextIllustrationKind;
  illustrationVisibility?: IllustrationVisibility;
  isOverlay?: boolean;
  line: string;
  noSlideBy?: boolean;
  offsetEnter: number;
  sectionId: number;
  sectionWidthPercent?: number;
  sizeLevel?: TextSizeLevel;
  timestamp: string;
};
