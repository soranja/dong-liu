import type { ReactNode } from "react";

import type { TextIllustrationKind } from "../../../shared/ui/illustration-animations/types";

export type TrackSummary = {
  id: string;
  route: `/tracks/${string}`;
  slug: string;
  title: string;
};

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

export type CustomLyricsIllustration<TCustomIllustration> = {
  descriptor: TCustomIllustration;
  mediaType: "custom";
};

export type LyricsIllustration<TCustomIllustration = unknown> =
  | CustomLyricsIllustration<TCustomIllustration>
  | LyricsMedia
  | string;

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
export type TextSizeLevel = 1 | 2 | 3 | 4 | 5;

export type LyricsSection<TCustomIllustration = unknown> = {
  continuing?: boolean;
  enterDuration: number;
  exitDuration: number;
  fullBleedIllustration?: boolean;
  illustrateWith: LyricsIllustration<TCustomIllustration>;
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

export type CustomIllustrationRenderer<TCustomIllustration> = (descriptor: TCustomIllustration) => ReactNode;
