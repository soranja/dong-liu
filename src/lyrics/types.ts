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

export type LyricsSection = {
  enterDuration: number;
  exitDuration: number;
  illustrateWith: LyricsIllustration;
  isOverlay?: boolean;
  line: string;
  offsetEnter: number;
  sectionId: number;
  sizeLevel?: TextSizeLevel;
  slideBy?: boolean;
  timestamp: string;
};
