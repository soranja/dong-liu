import type {
  IllustrationAnimation,
  IllustrationVisibility,
  LyricsColorPreset,
} from '../../src/shared/config/tuning';
import type { TextIllustrationKind } from '../../src/shared/ui/illustration-animations/kinds';

export type BackgroundSetting =
  | { mediaType: 'solid'; preset: LyricsColorPreset }
  | { alt?: string; mediaType: 'image'; src?: string }
  | { mediaType: 'video'; poster?: string; src?: string };

export type AnimationSetting =
  | Extract<IllustrationAnimation, { variant: 'instant' }>
  | (Omit<Extract<IllustrationAnimation, { variant: 'range' }>, 'animationLengthPercent'> & {
      animationLengthPercent: number;
    });

export type { IllustrationVisibility, TextIllustrationKind };

export type AnimationChange = {
  background: BackgroundSetting | null;
  backgroundShared?: boolean;
  continuing?: boolean;
  hasBackground: boolean;
  hasBackgroundShared: boolean;
  hasContinuing: boolean;
  hasIllustrationAnimation: boolean;
  hasIllustrationFadeIn: boolean;
  hasIllustrationFadeOut: boolean;
  hasIllustrationKind: boolean;
  hasIllustrationVisibility: boolean;
  hasOverlay: boolean;
  hasSectionWidth: boolean;
  hasTextBackgroundColor: boolean;
  hasTextBackgroundPaddingPx: boolean;
  hasTextColor: boolean;
  illustrationAnimation: AnimationSetting | null;
  illustrationFadeInMs?: number;
  illustrationFadeOutMs?: number;
  illustrationKind?: TextIllustrationKind;
  illustrationVisibility?: IllustrationVisibility;
  isOverlay?: boolean;
  sectionId: number;
  sectionWidthPercent?: number;
  timestamp?: string;
  textBackgroundColor?: LyricsColorPreset | null;
  textBackgroundPaddingPx?: number;
  textColor?: LyricsColorPreset | null;
};

export type IllustrationAnimationTuningPluginOptions = {
  tracks: Record<string, { lyricsExport: string; lyricsFile: string }>;
};

export type TuningTarget = {
  lyricsExport: string;
  lyricsFile: string;
  normalizedLyricsFile: string;
};
