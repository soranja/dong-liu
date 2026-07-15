import type { IllustrationAnimation, IllustrationVisibility } from '../../src/shared/config/tuning';
import type { TextIllustrationKind } from '../../src/shared/ui/illustration-animations/kinds';

export type AnimationSetting =
  | Extract<IllustrationAnimation, { variant: 'instant' }>
  | (Omit<Extract<IllustrationAnimation, { variant: 'range' }>, 'animationLengthPercent'> & {
      animationLengthPercent: number;
    });

export type { IllustrationVisibility, TextIllustrationKind };

export type AnimationChange = {
  continuing?: boolean;
  hasContinuing: boolean;
  hasIllustrationAnimation: boolean;
  hasIllustrationFadeIn: boolean;
  hasIllustrationFadeOut: boolean;
  hasIllustrationKind: boolean;
  hasIllustrationVisibility: boolean;
  hasOverlay: boolean;
  hasSectionWidth: boolean;
  illustrationAnimation: AnimationSetting | null;
  illustrationFadeInMs?: number;
  illustrationFadeOutMs?: number;
  illustrationKind?: TextIllustrationKind;
  illustrationVisibility?: IllustrationVisibility;
  isOverlay?: boolean;
  sectionId: number;
  sectionWidthPercent?: number;
  timestamp?: string;
};

export type IllustrationAnimationTuningPluginOptions = {
  tracks: Record<string, { lyricsExport: string; lyricsFile: string }>;
};

export type TuningTarget = {
  lyricsExport: string;
  lyricsFile: string;
  normalizedLyricsFile: string;
};
