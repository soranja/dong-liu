import type { ReactNode } from 'react';

import type { IllustrationAnimation, IllustrationVisibility, LyricsColorPreset } from '@shared/config/tuning';
import type { TextIllustrationKind } from '@shared/ui/illustration-animations/kinds';

export type { IllustrationAnimation, IllustrationVisibility } from '@shared/config/tuning';

export type TrackSummary = {
  id: string;
  trackNo: number;
  route: `/tracks/${string}`;
  title: string;
  cover: {
    alt: string;
    src: string;
  };
};

export type LyricsMedia =
  | {
      alt: string;
      mediaType: 'image';
      src: string;
    }
  | {
      mediaType: 'video';
      poster?: string;
      src: string;
    };

export type LyricsBackgroundMedia =
  | {
      alt?: string;
      mediaType: 'image';
      src?: string;
    }
  | {
      mediaType: 'video';
      poster?: string;
      src?: string;
    };

export type LyricsBackground =
  | LyricsBackgroundMedia
  | {
      mediaType: 'solid';
      preset: LyricsColorPreset;
    };

export type CustomLyricsIllustration<TCustomIllustration> = {
  descriptor: TCustomIllustration;
  mediaType: 'custom';
};

export type LyricsIllustration<TCustomIllustration = unknown> =
  | CustomLyricsIllustration<TCustomIllustration>
  | LyricsMedia
  | string;

export type TextSizeLevel = 1 | 2 | 3 | 4 | 5;

export type LyricsSection<TCustomIllustration = unknown> = {
  background?: LyricsBackground;
  backgroundShared?: boolean;
  continuing?: boolean;
  fullBleedIllustration?: boolean;
  illustrateWith: LyricsIllustration<TCustomIllustration>;
  illustrationAnimation?: IllustrationAnimation;
  illustrationFadeInMs?: number;
  illustrationFadeOutMs?: number;
  illustrationKind?: TextIllustrationKind;
  illustrationVisibility?: IllustrationVisibility;
  isOverlay?: boolean;
  line: string;
  sectionId: number;
  sectionWidthPercent?: number;
  sizeLevel?: TextSizeLevel;
  timestamp: string;
  textBackgroundColor?: LyricsColorPreset;
  textBackgroundPaddingPx?: number;
  textColor?: LyricsColorPreset;
};

export type CustomIllustrationRenderer<TCustomIllustration> = (descriptor: TCustomIllustration) => ReactNode;
