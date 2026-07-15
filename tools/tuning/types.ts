export type AnimationSetting =
  | { variant: 'instant' }
  | {
      animationLengthPercent: number;
      endPercent: number;
      startPercent: number;
      variant: 'range';
      wordStartPercents?: number[];
    };

export type IllustrationVisibility = 'adjacent' | 'only-active' | 'start-active' | 'active-end';
export type TextIllustrationKind =
  | 'blinking-words'
  | 'kinetic-warp'
  | 'vertical-typewriter'
  | 'word-cloud'
  | 'word-train';

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
