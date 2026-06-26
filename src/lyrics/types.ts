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

export type IllustrationVisibility = "adjacent" | "only-active" | "active-trailing";
export type TextIllustrationKind = "kinetic-warp" | "word-cloud";

export type LyricsSection = {
  enterDuration: number;
  exitDuration: number;
  illustrateWith: LyricsIllustration;
  illustrationAnimation?: IllustrationAnimation;
  illustrationKind?: TextIllustrationKind;
  illustrationVisibility?: IllustrationVisibility;
  isOverlay?: boolean;
  line: string;
  offsetEnter: number;
  sectionId: number;
  sizeLevel?: TextSizeLevel;
  slideBy?: boolean;
  timestamp: string;
};
